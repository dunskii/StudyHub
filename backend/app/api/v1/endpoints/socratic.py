"""Socratic tutor endpoints for AI-powered tutoring.

These endpoints handle:
- Chat interactions with the Socratic tutor
- Conversation history retrieval
- Flashcard generation
- Text summarisation

All chat endpoints require authentication and verify session ownership.
"""
from __future__ import annotations

import json
import logging
import time
from collections import defaultdict
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import AuthenticatedUser
from app.schemas import (
    ChatHistoryMessage,
    ChatHistoryResponse,
    ChatRequest,
    ChatResponse,
    FlashcardItem,
    FlashcardRequest,
    FlashcardResponse,
    SummariseRequest,
    SummariseResponse,
)
from app.services.claude_service import ClaudeService, TaskType, get_claude_service
from app.services.session_service import SessionService
from app.services.ai_interaction_service import AIInteractionService
from app.services.moderation_service import get_moderation_service
from app.services.tutor_prompts import TutorPromptFactory, Stage
from app.models.session import Session
from app.models.student import Student
from app.models.subject import Subject
from app.models.curriculum_outcome import CurriculumOutcome

logger = logging.getLogger(__name__)

router = APIRouter()


# =============================================================================
# Chat Rate Limiter
# =============================================================================


class ChatRateLimiter:
    """Rate limiter for chat messages to prevent AI abuse.

    Limits messages per student to prevent excessive API costs.
    """

    def __init__(
        self,
        max_messages: int = 30,
        window_seconds: int = 60,
    ):
        """Initialise the chat rate limiter.

        Args:
            max_messages: Maximum messages per window (default 30/min).
            window_seconds: Time window in seconds.
        """
        self.max_messages = max_messages
        self.window_seconds = window_seconds
        self._messages: dict[str, list[float]] = defaultdict(list)

    def _cleanup_old(self, key: str, now: float) -> None:
        """Remove messages outside the current window."""
        cutoff = now - self.window_seconds
        self._messages[key] = [t for t in self._messages[key] if t > cutoff]

    def check_limit(self, student_id: UUID) -> None:
        """Check if a student is rate limited.

        Args:
            student_id: The student ID.

        Raises:
            HTTPException: If rate limited.
        """
        key = str(student_id)
        now = time.time()
        self._cleanup_old(key, now)

        if len(self._messages[key]) >= self.max_messages:
            remaining = int(self.window_seconds - (now - self._messages[key][0]))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many messages. Please wait {remaining} seconds.",
                headers={"Retry-After": str(remaining)},
            )

    def record_message(self, student_id: UUID) -> None:
        """Record a message for rate limiting.

        Args:
            student_id: The student ID.
        """
        key = str(student_id)
        self._messages[key].append(time.time())


# Global chat rate limiter instance
chat_rate_limiter = ChatRateLimiter(
    max_messages=30,  # 30 messages per minute
    window_seconds=60,
)


# =============================================================================
# Helper Functions
# =============================================================================


async def verify_session_ownership(
    session: Session,
    current_user: AuthenticatedUser,
    db: AsyncSession,
) -> Student:
    """Verify the current user owns the student who owns the session.

    Args:
        session: The session to verify.
        current_user: The authenticated user.
        db: Database session.

    Returns:
        The verified Student.

    Raises:
        HTTPException: 404 if student not found, 403 if not owner.
    """
    student = await db.get(Student, session.student_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )
    if student.parent_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own children's sessions",
        )
    return student


async def get_session_with_context(
    session_id: UUID,
    db: AsyncSession,
) -> tuple[Session, Student, Subject | None]:
    """Get session with related student and subject.

    Args:
        session_id: The session ID.
        db: Database session.

    Returns:
        Tuple of (Session, Student, Subject or None).

    Raises:
        HTTPException: If session or student not found.
    """
    session_service = SessionService(db)
    session = await session_service.get_session(session_id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    student = await db.get(Student, session.student_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    subject = None
    if session.subject_id:
        subject = await db.get(Subject, session.subject_id)

    return session, student, subject


def year_to_stage(year: int | None) -> Stage:
    """Convert year level to curriculum stage."""
    if year is None:
        return Stage.STAGE_4
    if year <= 0:
        return Stage.EARLY_STAGE_1
    if year <= 2:
        return Stage.STAGE_1
    if year <= 4:
        return Stage.STAGE_2
    if year <= 6:
        return Stage.STAGE_3
    if year <= 8:
        return Stage.STAGE_4
    if year <= 10:
        return Stage.STAGE_5
    return Stage.STAGE_6


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    claude_service: Annotated[ClaudeService, Depends(get_claude_service)],
) -> ChatResponse:
    """Send a message to the Socratic tutor and receive a response.

    The tutor uses the Socratic method to guide students through questions
    rather than giving direct answers.

    Requires authentication. Session must belong to current user's student.
    Rate limited to 30 messages per minute per student.

    Args:
        request: Chat request with session_id and message.
        current_user: The authenticated parent.
        db: Database session.
        claude_service: Claude AI service.

    Returns:
        ChatResponse with AI response and metadata.
    """
    # Get session context
    session, student, subject = await get_session_with_context(request.session_id, db)

    # Verify ownership
    await verify_session_ownership(session, current_user, db)

    # Check rate limit
    chat_rate_limiter.check_limit(student.id)

    # Check moderation on student message
    moderation = get_moderation_service()
    mod_result = moderation.check_student_message(request.message)

    if mod_result.should_block:
        # Don't process, return suggested response
        ai_service = AIInteractionService(db)
        interaction = await ai_service.log_interaction(
            session_id=session.id,
            student_id=student.id,
            user_message=request.message,
            ai_response=mod_result.suggested_response or "I can only help with your studies.",
            model_used="blocked",
            task_type="tutor_chat",
            subject_id=session.subject_id,
            flagged=True,
            flag_reason=mod_result.flag_reason,
        )

        return ChatResponse(
            response=mod_result.suggested_response or "I can only help with your studies.",
            model_used="blocked",
            input_tokens=0,
            output_tokens=0,
            estimated_cost_usd=0.0,
            interaction_id=interaction.id,
            flagged=True,
        )

    # Determine subject code
    subject_code = request.subject_code
    if not subject_code and subject:
        subject_code = subject.code

    if not subject_code:
        subject_code = "MATH"  # Default fallback

    # Get student stage from year level
    stage = year_to_stage(student.year_level)

    # Get outcome context if provided
    outcome_description = None
    strand = None
    if request.outcome_code:
        from sqlalchemy import select
        result = await db.execute(
            select(CurriculumOutcome).where(
                CurriculumOutcome.code == request.outcome_code
            )
        )
        outcome = result.scalar_one_or_none()
        if outcome:
            outcome_description = outcome.description
            strand = outcome.strand

    # Build the system prompt
    system_prompt = TutorPromptFactory.get_prompt_for_subject(
        subject_code=subject_code,
        stage=stage,
        pathway=student.pathway,
        outcome_code=request.outcome_code,
        outcome_description=outcome_description,
        strand=strand,
        student_name=student.display_name,
    )

    # Get conversation history for context
    ai_service = AIInteractionService(db)
    history = await ai_service.get_recent_context(
        session_id=session.id,
        limit=10,
    )

    # Add current message
    messages = history + [{"role": "user", "content": request.message}]

    # Call Claude
    try:
        ai_response = await claude_service.chat(
            system_prompt=system_prompt,
            messages=messages,
            task_type=TaskType.TUTOR_CHAT,
        )
    except Exception as e:
        logger.error("Claude API error", extra={"error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI tutor temporarily unavailable. Please try again.",
        )

    # Check AI response for safety
    response_mod = moderation.check_ai_response(ai_response.content)

    # Build curriculum context for logging
    curriculum_context = None
    if request.outcome_code:
        curriculum_context = {
            "outcomeCode": request.outcome_code,
            "stage": stage.value,
            "strand": strand,
        }

    # Log the interaction
    interaction = await ai_service.log_interaction(
        session_id=session.id,
        student_id=student.id,
        user_message=request.message,
        ai_response=ai_response.content,
        model_used=ai_response.model_used,
        task_type="tutor_chat",
        input_tokens=ai_response.input_tokens,
        output_tokens=ai_response.output_tokens,
        estimated_cost_usd=ai_response.estimated_cost_usd,
        subject_id=session.subject_id,
        curriculum_context=curriculum_context,
        flagged=mod_result.should_flag or response_mod.should_flag,
        flag_reason=mod_result.flag_reason or response_mod.flag_reason,
    )

    # Update session with outcome if provided
    if request.outcome_code:
        session_service = SessionService(db)
        await session_service.add_outcome_to_session(session.id, request.outcome_code)

    # Record message for rate limiting (only on success)
    chat_rate_limiter.record_message(student.id)

    return ChatResponse(
        response=ai_response.content,
        model_used=ai_response.model_used,
        input_tokens=ai_response.input_tokens,
        output_tokens=ai_response.output_tokens,
        estimated_cost_usd=ai_response.estimated_cost_usd,
        interaction_id=interaction.id,
        flagged=mod_result.should_flag or response_mod.should_flag,
    )


@router.get("/history/{session_id}", response_model=ChatHistoryResponse)
async def get_chat_history(
    session_id: UUID,
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 100,
    offset: int = 0,
) -> ChatHistoryResponse:
    """Get chat history for a session.

    Requires authentication. Session must belong to current user's student.

    Args:
        session_id: The session ID.
        current_user: The authenticated parent.
        db: Database session.
        limit: Maximum messages to return.
        offset: Offset for pagination.

    Returns:
        ChatHistoryResponse with messages.
    """
    # Verify session exists
    session_service = SessionService(db)
    session = await session_service.get_session(session_id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    # Verify ownership
    await verify_session_ownership(session, current_user, db)

    # Get interactions
    ai_service = AIInteractionService(db)
    interactions, total = await ai_service.get_session_interactions(
        session_id=session_id,
        limit=limit,
        offset=offset,
    )

    # Convert to message format
    messages: list[ChatHistoryMessage] = []
    for interaction in interactions:
        messages.append(ChatHistoryMessage(
            role="user",
            content=interaction.user_message,
            timestamp=interaction.created_at,
            flagged=interaction.flagged,
        ))
        messages.append(ChatHistoryMessage(
            role="assistant",
            content=interaction.ai_response,
            timestamp=interaction.created_at,
            flagged=interaction.flagged,
        ))

    return ChatHistoryResponse(
        session_id=session_id,
        messages=messages,
        total_messages=total * 2,  # Each interaction = 2 messages
    )


@router.post("/flashcards", response_model=FlashcardResponse)
async def generate_flashcards(
    request: FlashcardRequest,
    current_user: AuthenticatedUser,
    claude_service: Annotated[ClaudeService, Depends(get_claude_service)],
) -> FlashcardResponse:
    """Generate flashcards from provided text.

    Uses Claude to extract key concepts and create question-answer pairs.
    Requires authentication.

    Args:
        request: FlashcardRequest with source text.
        current_user: The authenticated parent.
        claude_service: Claude AI service.

    Returns:
        FlashcardResponse with generated flashcards.
    """
    try:
        ai_response = await claude_service.generate_flashcards(
            text=request.text,
            subject_context=request.subject_code,
            num_cards=request.num_cards,
        )
    except Exception as e:
        logger.error("Flashcard generation error", extra={"error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to generate flashcards. Please try again.",
        )

    # Parse the JSON response
    try:
        flashcard_data = json.loads(ai_response.content)
        flashcards = [
            FlashcardItem(front=card["front"], back=card["back"])
            for card in flashcard_data
        ]
    except (json.JSONDecodeError, KeyError) as e:
        logger.error("Failed to parse flashcard response", extra={"error": str(e)})
        # Try to extract manually if JSON parsing fails
        flashcards = []

    return FlashcardResponse(
        flashcards=flashcards,
        model_used=ai_response.model_used,
        input_tokens=ai_response.input_tokens,
        output_tokens=ai_response.output_tokens,
        estimated_cost_usd=ai_response.estimated_cost_usd,
    )


@router.post("/summarise", response_model=SummariseResponse)
async def summarise_text(
    request: SummariseRequest,
    current_user: AuthenticatedUser,
    claude_service: Annotated[ClaudeService, Depends(get_claude_service)],
) -> SummariseResponse:
    """Summarise provided text.

    Uses Claude to create a concise summary of the input text.
    Requires authentication.

    Args:
        request: SummariseRequest with source text.
        current_user: The authenticated parent.
        claude_service: Claude AI service.

    Returns:
        SummariseResponse with summary.
    """
    try:
        ai_response = await claude_service.summarise(
            text=request.text,
            target_length=request.target_length,
            subject_context=request.subject_code,
        )
    except Exception as e:
        logger.error("Summarisation error", extra={"error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to summarise text. Please try again.",
        )

    return SummariseResponse(
        summary=ai_response.content,
        model_used=ai_response.model_used,
        input_tokens=ai_response.input_tokens,
        output_tokens=ai_response.output_tokens,
        estimated_cost_usd=ai_response.estimated_cost_usd,
    )
