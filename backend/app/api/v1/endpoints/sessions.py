"""Session endpoints for managing tutoring sessions.

These endpoints handle:
- Creating new sessions
- Retrieving session details
- Ending sessions
- Listing student sessions

All endpoints require authentication and verify ownership.
"""
from __future__ import annotations

import logging
from typing import Annotated, TYPE_CHECKING
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import AuthenticatedUser
from app.schemas import (
    SessionCreate,
    SessionEndRequest,
    SessionListResponse,
    SessionResponse,
    SessionStatsUpdate,
)
from app.services.session_service import SessionService
from app.models.student import Student
from app.models.subject import Subject

if TYPE_CHECKING:
    from app.models.session import Session

logger = logging.getLogger(__name__)

router = APIRouter()


async def verify_student_ownership(
    student_id: UUID,
    current_user: AuthenticatedUser,
    db: AsyncSession,
) -> Student:
    """Verify the current user is the parent of the student.

    Args:
        student_id: The student ID to verify.
        current_user: The authenticated user.
        db: Database session.

    Returns:
        The verified Student.

    Raises:
        HTTPException: 404 if student not found, 403 if not parent.
    """
    student = await db.get(Student, student_id)
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


def session_to_response(session: "Session", subject: Subject | None = None) -> SessionResponse:
    """Convert a Session model to SessionResponse schema."""
    return SessionResponse(
        id=session.id,
        student_id=session.student_id,
        subject_id=session.subject_id,
        session_type=session.session_type,
        started_at=session.started_at,
        ended_at=session.ended_at,
        duration_minutes=session.duration_minutes,
        xp_earned=session.xp_earned,
        data=session.data or {},
        subject_code=subject.code if subject else None,
        subject_name=subject.name if subject else None,
    )


@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    request: SessionCreate,
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SessionResponse:
    """Create a new tutoring session.

    Requires authentication. The student must belong to the current user.

    Args:
        request: SessionCreate with student_id and session_type.
        current_user: The authenticated parent.
        db: Database session.

    Returns:
        The created SessionResponse.
    """
    # Verify ownership
    await verify_student_ownership(request.student_id, current_user, db)

    session_service = SessionService(db)

    try:
        session = await session_service.create_session(
            student_id=request.student_id,
            session_type=request.session_type,
            subject_id=request.subject_id,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

    # Get subject for response
    subject = None
    if session.subject_id:
        subject = await db.get(Subject, session.subject_id)

    return session_to_response(session, subject)


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: UUID,
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SessionResponse:
    """Get session details by ID.

    Requires authentication. Session must belong to current user's student.

    Args:
        session_id: The session ID.
        current_user: The authenticated parent.
        db: Database session.

    Returns:
        SessionResponse with session details.
    """
    session_service = SessionService(db)
    session = await session_service.get_session(session_id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    # Verify ownership
    await verify_student_ownership(session.student_id, current_user, db)

    # Get subject for response
    subject = None
    if session.subject_id:
        subject = await db.get(Subject, session.subject_id)

    return session_to_response(session, subject)


@router.post("/{session_id}/end", response_model=SessionResponse)
async def end_session(
    session_id: UUID,
    request: SessionEndRequest,
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SessionResponse:
    """End a tutoring session.

    Calculates duration and records XP earned.
    Requires authentication. Session must belong to current user's student.

    Args:
        session_id: The session ID.
        request: SessionEndRequest with xp_earned.
        current_user: The authenticated parent.
        db: Database session.

    Returns:
        Updated SessionResponse.
    """
    # First get the session to verify ownership
    session_service = SessionService(db)
    session = await session_service.get_session(session_id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    # Verify ownership
    await verify_student_ownership(session.student_id, current_user, db)

    # Now end the session
    session = await session_service.end_session(
        session_id=session_id,
        xp_earned=request.xp_earned,
    )

    # Get subject for response
    subject = None
    if session and session.subject_id:
        subject = await db.get(Subject, session.subject_id)

    return session_to_response(session, subject)  # type: ignore[arg-type]


@router.post("/{session_id}/stats", response_model=SessionResponse)
async def update_session_stats(
    session_id: UUID,
    request: SessionStatsUpdate,
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SessionResponse:
    """Update session statistics.

    Increments questions attempted, correct, flashcards reviewed.
    Requires authentication. Session must belong to current user's student.

    Args:
        session_id: The session ID.
        request: SessionStatsUpdate with increments.
        current_user: The authenticated parent.
        db: Database session.

    Returns:
        Updated SessionResponse.
    """
    session_service = SessionService(db)

    # First get session to verify ownership
    session = await session_service.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    # Verify ownership
    await verify_student_ownership(session.student_id, current_user, db)

    # Now increment the stats
    session = await session_service.increment_session_stats(
        session_id=session_id,
        questions_attempted=request.questions_attempted,
        questions_correct=request.questions_correct,
        flashcards_reviewed=request.flashcards_reviewed,
    )

    # Add outcome if provided
    if request.outcome_code:
        session = await session_service.add_outcome_to_session(
            session_id=session_id,
            outcome_code=request.outcome_code,
        )

    # Get subject for response
    subject = None
    if session and session.subject_id:
        subject = await db.get(Subject, session.subject_id)

    return session_to_response(session, subject)  # type: ignore[arg-type]


@router.get("/student/{student_id}", response_model=SessionListResponse)
async def get_student_sessions(
    student_id: UUID,
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    subject_id: UUID | None = None,
    session_type: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> SessionListResponse:
    """Get sessions for a student with optional filters.

    Requires authentication. Student must belong to current user.

    Args:
        student_id: The student ID.
        current_user: The authenticated parent.
        db: Database session.
        subject_id: Optional filter by subject.
        session_type: Optional filter by session type.
        limit: Maximum sessions to return.
        offset: Offset for pagination.

    Returns:
        SessionListResponse with paginated sessions.
    """
    # Verify ownership
    await verify_student_ownership(student_id, current_user, db)

    session_service = SessionService(db)
    sessions, total = await session_service.get_student_sessions(
        student_id=student_id,
        subject_id=subject_id,
        session_type=session_type,
        limit=limit,
        offset=offset,
    )

    # Convert to responses
    session_responses = []
    for session in sessions:
        subject = None
        if session.subject_id:
            subject = await db.get(Subject, session.subject_id)
        session_responses.append(session_to_response(session, subject))

    return SessionListResponse(
        sessions=session_responses,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/student/{student_id}/active", response_model=SessionResponse | None)
async def get_active_session(
    student_id: UUID,
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    subject_id: UUID | None = None,
) -> SessionResponse | None:
    """Get the active (not ended) session for a student.

    Requires authentication. Student must belong to current user.

    Args:
        student_id: The student ID.
        current_user: The authenticated parent.
        db: Database session.
        subject_id: Optional filter by subject.

    Returns:
        Active SessionResponse or None if no active session.
    """
    # Verify ownership
    await verify_student_ownership(student_id, current_user, db)

    session_service = SessionService(db)
    session = await session_service.get_active_session(
        student_id=student_id,
        subject_id=subject_id,
    )

    if not session:
        return None

    # Get subject for response
    subject = None
    if session.subject_id:
        subject = await db.get(Subject, session.subject_id)

    return session_to_response(session, subject)
