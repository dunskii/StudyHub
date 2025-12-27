"""Session service for managing tutoring sessions.

Handles session lifecycle: creation, updates, and retrieval.
Enforces ownership verification for all operations.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.models.session import Session
from app.models.student import Student
from app.models.subject import Subject


class SessionService:
    """Service for managing tutoring sessions."""

    def __init__(self, db: AsyncSession) -> None:
        """Initialise with database session.

        Args:
            db: Async database session.
        """
        self.db = db
        self.settings = get_settings()

    async def create_session(
        self,
        student_id: uuid.UUID,
        session_type: str,
        subject_id: uuid.UUID | None = None,
    ) -> Session:
        """Create a new tutoring session.

        Args:
            student_id: ID of the student.
            session_type: Type of session (tutor_chat, revision, homework_help).
            subject_id: Optional subject ID for subject-specific sessions.

        Returns:
            The created Session.

        Raises:
            ValueError: If student not found.
        """
        # Verify student exists
        student = await self.db.get(Student, student_id)
        if not student:
            raise ValueError(f"Student {student_id} not found")

        # Verify subject if provided
        if subject_id:
            subject = await self.db.get(Subject, subject_id)
            if not subject:
                raise ValueError(f"Subject {subject_id} not found")

        session = Session(
            student_id=student_id,
            subject_id=subject_id,
            session_type=session_type,
            started_at=datetime.now(timezone.utc),
            data={
                "outcomesWorkedOn": [],
                "questionsAttempted": 0,
                "questionsCorrect": 0,
                "flashcardsReviewed": 0,
            },
        )

        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)

        return session

    async def get_session(
        self,
        session_id: uuid.UUID,
        include_interactions: bool = False,
    ) -> Session | None:
        """Get a session by ID.

        Args:
            session_id: The session ID.
            include_interactions: Whether to eager-load AI interactions.

        Returns:
            The Session if found, None otherwise.
        """
        query = select(Session).where(Session.id == session_id)

        if include_interactions:
            query = query.options(selectinload(Session.ai_interactions))

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_session_with_ownership(
        self,
        session_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Session | None:
        """Get a session with ownership verification.

        Args:
            session_id: The session ID.
            user_id: The user ID (parent) to verify ownership.

        Returns:
            The Session if found and owned by user, None otherwise.
        """
        query = (
            select(Session)
            .join(Student)
            .where(Session.id == session_id)
            .where(Student.parent_id == user_id)
        )

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_student_sessions(
        self,
        student_id: uuid.UUID,
        subject_id: uuid.UUID | None = None,
        session_type: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[Session], int]:
        """Get sessions for a student with optional filters.

        Args:
            student_id: The student ID.
            subject_id: Optional filter by subject.
            session_type: Optional filter by session type.
            limit: Maximum number of sessions to return.
            offset: Number of sessions to skip.

        Returns:
            Tuple of (sessions list, total count).
        """
        # Build base query
        query = select(Session).where(Session.student_id == student_id)
        count_query = select(func.count()).select_from(Session).where(
            Session.student_id == student_id
        )

        # Apply filters
        if subject_id:
            query = query.where(Session.subject_id == subject_id)
            count_query = count_query.where(Session.subject_id == subject_id)

        if session_type:
            query = query.where(Session.session_type == session_type)
            count_query = count_query.where(Session.session_type == session_type)

        # Order by most recent first
        query = query.order_by(Session.started_at.desc())

        # Apply pagination
        query = query.limit(limit).offset(offset)

        # Execute queries
        result = await self.db.execute(query)
        sessions = list(result.scalars().all())

        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        return sessions, total

    async def end_session(
        self,
        session_id: uuid.UUID,
        xp_earned: int = 0,
    ) -> Session | None:
        """End a session and calculate duration.

        Args:
            session_id: The session ID.
            xp_earned: XP earned during the session.

        Returns:
            The updated Session if found, None otherwise.
        """
        session = await self.get_session(session_id)
        if not session:
            return None

        now = datetime.now(timezone.utc)
        session.ended_at = now

        # Calculate duration in minutes
        if session.started_at:
            duration = (now - session.started_at).total_seconds() / 60
            session.duration_minutes = int(duration)

        session.xp_earned = xp_earned

        await self.db.commit()
        await self.db.refresh(session)

        return session

    async def update_session_data(
        self,
        session_id: uuid.UUID,
        data_updates: dict[str, Any],
    ) -> Session | None:
        """Update session data (outcomes, questions, etc.).

        Args:
            session_id: The session ID.
            data_updates: Dictionary of data fields to update.

        Returns:
            The updated Session if found, None otherwise.
        """
        session = await self.get_session(session_id)
        if not session:
            return None

        # Merge updates into existing data
        current_data = session.data or {}
        current_data.update(data_updates)
        session.data = current_data

        await self.db.commit()
        await self.db.refresh(session)

        return session

    async def add_outcome_to_session(
        self,
        session_id: uuid.UUID,
        outcome_code: str,
    ) -> Session | None:
        """Add a curriculum outcome to the session's worked-on list.

        Args:
            session_id: The session ID.
            outcome_code: The outcome code to add.

        Returns:
            The updated Session if found, None otherwise.
        """
        session = await self.get_session(session_id)
        if not session:
            return None

        current_data = session.data or {}
        outcomes = current_data.get("outcomesWorkedOn", [])

        if outcome_code not in outcomes:
            outcomes.append(outcome_code)
            current_data["outcomesWorkedOn"] = outcomes
            session.data = current_data

            await self.db.commit()
            await self.db.refresh(session)

        return session

    async def increment_session_stats(
        self,
        session_id: uuid.UUID,
        questions_attempted: int = 0,
        questions_correct: int = 0,
        flashcards_reviewed: int = 0,
    ) -> Session | None:
        """Increment session statistics.

        Args:
            session_id: The session ID.
            questions_attempted: Number of questions attempted to add.
            questions_correct: Number of correct answers to add.
            flashcards_reviewed: Number of flashcards reviewed to add.

        Returns:
            The updated Session if found, None otherwise.
        """
        session = await self.get_session(session_id)
        if not session:
            return None

        current_data = session.data or {}

        if questions_attempted:
            current_data["questionsAttempted"] = (
                current_data.get("questionsAttempted", 0) + questions_attempted
            )

        if questions_correct:
            current_data["questionsCorrect"] = (
                current_data.get("questionsCorrect", 0) + questions_correct
            )

        if flashcards_reviewed:
            current_data["flashcardsReviewed"] = (
                current_data.get("flashcardsReviewed", 0) + flashcards_reviewed
            )

        session.data = current_data

        await self.db.commit()
        await self.db.refresh(session)

        return session

    async def get_active_session(
        self,
        student_id: uuid.UUID,
        subject_id: uuid.UUID | None = None,
    ) -> Session | None:
        """Get an active (not ended) session for a student.

        Args:
            student_id: The student ID.
            subject_id: Optional subject filter.

        Returns:
            The active Session if found, None otherwise.
        """
        query = (
            select(Session)
            .where(Session.student_id == student_id)
            .where(Session.ended_at.is_(None))
        )

        if subject_id:
            query = query.where(Session.subject_id == subject_id)

        # Get most recent active session
        query = query.order_by(Session.started_at.desc()).limit(1)

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def cleanup_stale_sessions(
        self,
        student_id: uuid.UUID,
    ) -> int:
        """End sessions that have been inactive beyond the timeout.

        Args:
            student_id: The student ID.

        Returns:
            Number of sessions ended.
        """
        timeout_minutes = self.settings.ai_session_timeout_minutes
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=timeout_minutes)

        # Find stale sessions
        query = (
            select(Session)
            .where(Session.student_id == student_id)
            .where(Session.ended_at.is_(None))
            .where(Session.started_at < cutoff)
        )

        result = await self.db.execute(query)
        stale_sessions = result.scalars().all()

        count = 0
        for session in stale_sessions:
            await self.end_session(session.id)
            count += 1

        return count
