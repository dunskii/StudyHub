"""Revision and flashcard management endpoints.

Handles flashcard CRUD, revision sessions, and progress tracking.
"""
from __future__ import annotations

import logging
import time
from collections import defaultdict
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import AuthenticatedUser
from app.models.flashcard import Flashcard
from app.models.student import Student
from app.schemas.flashcard import (
    FlashcardBulkCreate,
    FlashcardCreate,
    FlashcardDraftResponse,
    FlashcardGenerateRequest,
    FlashcardGenerateResponse,
    FlashcardListResponse,
    FlashcardResponse,
    FlashcardUpdate,
)
from app.schemas.revision import (
    RevisionAnswerRequest,
    RevisionAnswerResponse,
    RevisionHistoryResponse,
    RevisionProgressResponse,
    RevisionSessionStartRequest,
    RevisionSessionResponse,
    SubjectProgressResponse,
)
from app.services.flashcard_generation import (
    FlashcardGenerationError,
    FlashcardGenerationService,
)
from app.services.revision_service import (
    FlashcardAccessDeniedError,
    FlashcardNotFoundError,
    RevisionService,
    RevisionServiceError,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# =============================================================================
# Rate Limiting for AI Generation
# =============================================================================


class GenerationRateLimiter:
    """Rate limiter for AI flashcard generation to prevent cost abuse.

    Limits generation requests per student to prevent:
    - Excessive Claude API costs
    - Token quota exhaustion
    - Student spamming
    """

    def __init__(
        self,
        max_per_hour: int = 5,
        max_per_day: int = 20,
    ):
        """Initialize rate limiter.

        Args:
            max_per_hour: Maximum requests per student per hour.
            max_per_day: Maximum requests per student per day.
        """
        self.max_per_hour = max_per_hour
        self.max_per_day = max_per_day
        self._hourly: dict[str, list[float]] = defaultdict(list)
        self._daily: dict[str, list[float]] = defaultdict(list)

    def _cleanup_old(
        self, key: str, requests: dict[str, list[float]], window_seconds: int
    ) -> None:
        """Remove requests outside the time window."""
        cutoff = time.time() - window_seconds
        requests[key] = [t for t in requests[key] if t > cutoff]

    def check_limit(self, student_id: UUID) -> None:
        """Check if a student can make a generation request.

        Args:
            student_id: Student UUID.

        Raises:
            HTTPException: If rate limit exceeded.
        """
        key = str(student_id)
        now = time.time()

        # Check hourly limit
        self._cleanup_old(key, self._hourly, 3600)
        if len(self._hourly[key]) >= self.max_per_hour:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many generation requests. Maximum {self.max_per_hour} per hour.",
                headers={"Retry-After": "3600"},
            )

        # Check daily limit
        self._cleanup_old(key, self._daily, 86400)
        if len(self._daily[key]) >= self.max_per_day:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Daily generation limit reached. Maximum {self.max_per_day} per day.",
                headers={"Retry-After": "86400"},
            )

    def record_request(self, student_id: UUID) -> None:
        """Record a successful generation request.

        Args:
            student_id: Student UUID.
        """
        key = str(student_id)
        now = time.time()
        self._hourly[key].append(now)
        self._daily[key].append(now)


# Global rate limiter instance
generation_rate_limiter = GenerationRateLimiter(
    max_per_hour=5,
    max_per_day=20,
)


# =============================================================================
# Authentication Helpers
# =============================================================================


async def verify_student_access(
    student_id: UUID,
    current_user: AuthenticatedUser,
    db: AsyncSession,
) -> Student:
    """Verify that the current user has access to the student.

    Args:
        student_id: Student UUID.
        current_user: Authenticated user from JWT.
        db: Database session.

    Returns:
        Student if access granted.

    Raises:
        HTTPException: If student not found or access denied.
    """
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    # Verify that current user owns this student
    if student.parent_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own students",
        )

    return student


def flashcard_to_response(flashcard: Flashcard) -> FlashcardResponse:
    """Convert Flashcard model to response schema."""
    return FlashcardResponse(
        id=flashcard.id,
        student_id=flashcard.student_id,
        subject_id=flashcard.subject_id,
        curriculum_outcome_id=flashcard.curriculum_outcome_id,
        context_note_id=flashcard.context_note_id,
        front=flashcard.front,
        back=flashcard.back,
        generated_by=flashcard.generated_by,
        generation_model=flashcard.generation_model,
        review_count=flashcard.review_count,
        correct_count=flashcard.correct_count,
        mastery_percent=flashcard.mastery_percent,
        sr_interval=flashcard.sr_interval,
        sr_ease_factor=flashcard.sr_ease_factor,
        sr_next_review=flashcard.sr_next_review,
        sr_repetition=flashcard.sr_repetition,
        difficulty_level=flashcard.difficulty_level,
        tags=flashcard.tags,
        is_due=flashcard.is_due,
        success_rate=flashcard.success_rate,
        created_at=flashcard.created_at,
        updated_at=flashcard.updated_at,
    )


# =============================================================================
# Flashcard CRUD Endpoints
# =============================================================================


@router.post("/flashcards", response_model=FlashcardResponse, status_code=status.HTTP_201_CREATED)
async def create_flashcard(
    request: FlashcardCreate,
    current_user: AuthenticatedUser,
    student_id: UUID = Query(..., description="Student ID"),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> FlashcardResponse:
    """Create a new flashcard.

    Args:
        request: Flashcard creation data.
        current_user: Authenticated user.
        student_id: Student UUID.
        db: Database session.

    Returns:
        Created flashcard.
    """
    await verify_student_access(student_id, current_user, db)

    service = RevisionService(db)

    try:
        flashcard = await service.create_flashcard(
            student_id=student_id,
            front=request.front,
            back=request.back,
            subject_id=request.subject_id,
            curriculum_outcome_id=request.curriculum_outcome_id,
            context_note_id=request.context_note_id,
            generated_by="user",
            difficulty_level=request.difficulty_level,
            tags=request.tags,
        )
        return flashcard_to_response(flashcard)

    except RevisionServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/flashcards/bulk", response_model=list[FlashcardResponse], status_code=status.HTTP_201_CREATED)
async def create_flashcards_bulk(
    request: FlashcardBulkCreate,
    current_user: AuthenticatedUser,
    student_id: UUID = Query(..., description="Student ID"),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> list[FlashcardResponse]:
    """Create multiple flashcards at once.

    Args:
        request: List of flashcard data.
        current_user: Authenticated user.
        student_id: Student UUID.
        db: Database session.

    Returns:
        List of created flashcards.
    """
    await verify_student_access(student_id, current_user, db)

    service = RevisionService(db)

    try:
        flashcards_data = [
            {
                "front": fc.front,
                "back": fc.back,
                "subject_id": fc.subject_id,
                "curriculum_outcome_id": fc.curriculum_outcome_id,
                "context_note_id": fc.context_note_id,
                "generated_by": "user",
                "difficulty_level": fc.difficulty_level,
                "tags": fc.tags,
            }
            for fc in request.flashcards
        ]

        flashcards = await service.create_flashcards_bulk(student_id, flashcards_data)
        return [flashcard_to_response(fc) for fc in flashcards]

    except RevisionServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/flashcards", response_model=FlashcardListResponse)
async def get_flashcards(
    current_user: AuthenticatedUser,
    student_id: UUID = Query(..., description="Student ID"),
    subject_id: UUID | None = Query(None, description="Filter by subject"),
    outcome_id: UUID | None = Query(None, description="Filter by curriculum outcome"),
    due_only: bool = Query(False, description="Only return due cards"),
    search: str | None = Query(None, description="Search in front/back text"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(50, ge=1, le=100, description="Pagination limit"),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> FlashcardListResponse:
    """Get flashcards for a student with optional filters.

    Args:
        current_user: Authenticated user.
        student_id: Student UUID.
        subject_id: Optional subject filter.
        outcome_id: Optional outcome filter.
        due_only: If True, only return due cards.
        search: Optional search query.
        offset: Pagination offset.
        limit: Pagination limit.
        db: Database session.

    Returns:
        Paginated list of flashcards.
    """
    await verify_student_access(student_id, current_user, db)

    service = RevisionService(db)

    flashcards, total = await service.get_student_flashcards(
        student_id=student_id,
        subject_id=subject_id,
        outcome_id=outcome_id,
        due_only=due_only,
        search_query=search,
        offset=offset,
        limit=limit,
    )

    return FlashcardListResponse(
        flashcards=[flashcard_to_response(fc) for fc in flashcards],
        total=total,
        offset=offset,
        limit=limit,
    )


@router.get("/flashcards/{flashcard_id}", response_model=FlashcardResponse)
async def get_flashcard(
    flashcard_id: UUID,
    current_user: AuthenticatedUser,
    student_id: UUID = Query(..., description="Student ID"),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> FlashcardResponse:
    """Get a single flashcard by ID.

    Args:
        flashcard_id: Flashcard UUID.
        current_user: Authenticated user.
        student_id: Student UUID for ownership verification.
        db: Database session.

    Returns:
        Flashcard details.
    """
    await verify_student_access(student_id, current_user, db)

    service = RevisionService(db)

    try:
        flashcard = await service.get_flashcard(flashcard_id, student_id)
        return flashcard_to_response(flashcard)

    except FlashcardNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flashcard not found",
        )
    except FlashcardAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this flashcard",
        )


@router.put("/flashcards/{flashcard_id}", response_model=FlashcardResponse)
async def update_flashcard(
    flashcard_id: UUID,
    request: FlashcardUpdate,
    current_user: AuthenticatedUser,
    student_id: UUID = Query(..., description="Student ID"),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> FlashcardResponse:
    """Update a flashcard.

    Args:
        flashcard_id: Flashcard UUID.
        request: Update data.
        current_user: Authenticated user.
        student_id: Student UUID for ownership verification.
        db: Database session.

    Returns:
        Updated flashcard.
    """
    await verify_student_access(student_id, current_user, db)

    service = RevisionService(db)

    try:
        flashcard = await service.update_flashcard(
            flashcard_id=flashcard_id,
            student_id=student_id,
            front=request.front,
            back=request.back,
            difficulty_level=request.difficulty_level,
            tags=request.tags,
        )
        return flashcard_to_response(flashcard)

    except FlashcardNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flashcard not found",
        )
    except FlashcardAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this flashcard",
        )


@router.delete("/flashcards/{flashcard_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_flashcard(
    flashcard_id: UUID,
    current_user: AuthenticatedUser,
    student_id: UUID = Query(..., description="Student ID"),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> None:
    """Delete a flashcard.

    Args:
        flashcard_id: Flashcard UUID.
        current_user: Authenticated user.
        student_id: Student UUID for ownership verification.
        db: Database session.
    """
    await verify_student_access(student_id, current_user, db)

    service = RevisionService(db)

    try:
        await service.delete_flashcard(flashcard_id, student_id)

    except FlashcardNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flashcard not found",
        )
    except FlashcardAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this flashcard",
        )


# =============================================================================
# AI Generation Endpoints
# =============================================================================


@router.post("/flashcards/generate", response_model=FlashcardGenerateResponse)
async def generate_flashcards(
    request: FlashcardGenerateRequest,
    current_user: AuthenticatedUser,
    student_id: UUID = Query(..., description="Student ID"),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> FlashcardGenerateResponse:
    """Generate flashcards using AI from a note or curriculum outcome.

    Rate limited to prevent excessive API costs (5/hour, 20/day per student).

    Args:
        request: Generation request with source and count.
        current_user: Authenticated user.
        student_id: Student UUID.
        db: Database session.

    Returns:
        Generated flashcard drafts for approval.
    """
    await verify_student_access(student_id, current_user, db)

    # Check rate limit before making AI call
    generation_rate_limiter.check_limit(student_id)

    if not request.note_id and not request.outcome_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must provide either note_id or outcome_id",
        )

    service = FlashcardGenerationService(db)

    try:
        if request.note_id:
            drafts = await service.generate_from_note(
                note_id=request.note_id,
                student_id=student_id,
                count=request.count,
            )
            source_type = "note"
            source_id = request.note_id
        else:
            drafts = await service.generate_from_outcome(
                outcome_id=request.outcome_id,
                student_id=student_id,
                count=request.count,
            )
            source_type = "outcome"
            source_id = request.outcome_id

        # Record successful request for rate limiting
        generation_rate_limiter.record_request(student_id)

        return FlashcardGenerateResponse(
            drafts=[
                FlashcardDraftResponse(
                    front=d.front,
                    back=d.back,
                    difficulty_level=d.difficulty_level,
                    tags=d.tags,
                )
                for d in drafts
            ],
            source_type=source_type,
            source_id=source_id,
        )

    except FlashcardGenerationError as e:
        # Don't record failed requests against rate limit quota
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


# =============================================================================
# Review Endpoints
# =============================================================================


@router.get("/due", response_model=list[FlashcardResponse])
async def get_due_flashcards(
    current_user: AuthenticatedUser,
    student_id: UUID = Query(..., description="Student ID"),
    subject_id: UUID | None = Query(None, description="Filter by subject"),
    limit: int = Query(50, ge=1, le=100, description="Max cards to return"),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> list[FlashcardResponse]:
    """Get flashcards that are due for review.

    Args:
        current_user: Authenticated user.
        student_id: Student UUID.
        subject_id: Optional subject filter.
        limit: Maximum cards to return.
        db: Database session.

    Returns:
        List of due flashcards.
    """
    await verify_student_access(student_id, current_user, db)

    service = RevisionService(db)

    flashcards = await service.get_due_flashcards(
        student_id=student_id,
        subject_id=subject_id,
        limit=limit,
    )

    return [flashcard_to_response(fc) for fc in flashcards]


@router.post("/answer", response_model=RevisionAnswerResponse)
async def submit_answer(
    request: RevisionAnswerRequest,
    current_user: AuthenticatedUser,
    student_id: UUID = Query(..., description="Student ID"),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> RevisionAnswerResponse:
    """Submit an answer for a flashcard review.

    Args:
        request: Answer submission data.
        current_user: Authenticated user.
        student_id: Student UUID.
        db: Database session.

    Returns:
        Updated flashcard state and next review date.
    """
    await verify_student_access(student_id, current_user, db)

    service = RevisionService(db)

    try:
        flashcard, history = await service.record_review(
            flashcard_id=request.flashcard_id,
            student_id=student_id,
            was_correct=request.was_correct,
            difficulty_rating=request.difficulty_rating,
            response_time_seconds=request.response_time_seconds,
            session_id=request.session_id,
        )

        return RevisionAnswerResponse(
            flashcard_id=flashcard.id,
            was_correct=request.was_correct,
            quality_rating=history.quality_rating,
            new_interval=flashcard.sr_interval,
            new_ease_factor=flashcard.sr_ease_factor,
            next_review=flashcard.sr_next_review,
            mastery_percent=flashcard.mastery_percent,
        )

    except FlashcardNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flashcard not found",
        )
    except FlashcardAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this flashcard",
        )


# =============================================================================
# Progress Endpoints
# =============================================================================


@router.get("/progress", response_model=RevisionProgressResponse)
async def get_revision_progress(
    current_user: AuthenticatedUser,
    student_id: UUID = Query(..., description="Student ID"),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> RevisionProgressResponse:
    """Get overall revision progress for a student.

    Args:
        current_user: Authenticated user.
        student_id: Student UUID.
        db: Database session.

    Returns:
        Progress statistics.
    """
    await verify_student_access(student_id, current_user, db)

    service = RevisionService(db)

    progress = await service.get_revision_progress(student_id)

    return RevisionProgressResponse(**progress)


@router.get("/progress/by-subject", response_model=list[SubjectProgressResponse])
async def get_progress_by_subject(
    current_user: AuthenticatedUser,
    student_id: UUID = Query(..., description="Student ID"),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> list[SubjectProgressResponse]:
    """Get revision progress grouped by subject.

    Args:
        current_user: Authenticated user.
        student_id: Student UUID.
        db: Database session.

    Returns:
        List of per-subject progress.
    """
    await verify_student_access(student_id, current_user, db)

    service = RevisionService(db)

    progress = await service.get_progress_by_subject(student_id)

    return [
        SubjectProgressResponse(
            subject_id=UUID(p["subject_id"]),
            subject_name=p["subject_name"],
            subject_code=p["subject_code"],
            total_cards=p["total_cards"],
            cards_due=p["cards_due"],
            mastery_percent=p["mastery_percent"],
        )
        for p in progress
    ]


@router.get("/history", response_model=list[RevisionHistoryResponse])
async def get_revision_history(
    current_user: AuthenticatedUser,
    student_id: UUID = Query(..., description="Student ID"),
    flashcard_id: UUID | None = Query(None, description="Filter by flashcard"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> list[RevisionHistoryResponse]:
    """Get revision history for a student.

    Args:
        current_user: Authenticated user.
        student_id: Student UUID.
        flashcard_id: Optional flashcard filter.
        limit: Maximum records to return.
        db: Database session.

    Returns:
        List of revision history records.
    """
    await verify_student_access(student_id, current_user, db)

    service = RevisionService(db)

    history = await service.get_revision_history(
        student_id=student_id,
        flashcard_id=flashcard_id,
        limit=limit,
    )

    return [
        RevisionHistoryResponse(
            id=h.id,
            flashcard_id=h.flashcard_id,
            session_id=h.session_id,
            was_correct=h.was_correct,
            quality_rating=h.quality_rating,
            response_time_seconds=h.response_time_seconds,
            sr_interval_before=h.sr_interval_before,
            sr_interval_after=h.sr_interval_after,
            sr_ease_before=h.sr_ease_before,
            sr_ease_after=h.sr_ease_after,
            created_at=h.created_at,
        )
        for h in history
    ]
