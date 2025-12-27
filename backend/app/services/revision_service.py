"""Revision service for managing flashcards and revision sessions.

Handles flashcard CRUD operations, revision sessions, and progress tracking.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.flashcard import Flashcard
from app.models.revision_history import RevisionHistory
from app.models.session import Session
from app.models.student import Student
from app.models.subject import Subject
from app.services.spaced_repetition import (
    SpacedRepetitionService,
    SpacedRepetitionState,
    get_spaced_repetition_service,
)

logger = logging.getLogger(__name__)


class RevisionServiceError(Exception):
    """Base exception for revision service errors."""

    pass


class FlashcardNotFoundError(RevisionServiceError):
    """Flashcard not found."""

    pass


class FlashcardAccessDeniedError(RevisionServiceError):
    """Access to flashcard denied."""

    pass


class RevisionService:
    """Service for managing flashcards and revision sessions."""

    MAX_FLASHCARDS_PER_STUDENT = 1000
    MAX_SESSION_CARDS = 50
    DEFAULT_SESSION_CARDS = 10

    def __init__(
        self,
        db: AsyncSession,
        sr_service: SpacedRepetitionService | None = None,
    ) -> None:
        """Initialize the revision service.

        Args:
            db: Database session.
            sr_service: Spaced repetition service (default: singleton).
        """
        self._db = db
        self._sr = sr_service or get_spaced_repetition_service()

    # =========================================================================
    # Flashcard CRUD Operations
    # =========================================================================

    async def create_flashcard(
        self,
        student_id: UUID,
        front: str,
        back: str,
        subject_id: UUID | None = None,
        curriculum_outcome_id: UUID | None = None,
        context_note_id: UUID | None = None,
        generated_by: str = "user",
        generation_model: str | None = None,
        difficulty_level: int | None = None,
        tags: list[str] | None = None,
    ) -> Flashcard:
        """Create a new flashcard.

        Args:
            student_id: The student's UUID.
            front: Question/prompt text.
            back: Answer text.
            subject_id: Optional subject UUID.
            curriculum_outcome_id: Optional curriculum outcome UUID.
            context_note_id: Optional source note UUID.
            generated_by: How the card was created ('user', 'ai', 'system').
            generation_model: AI model used (if generated_by='ai').
            difficulty_level: Initial difficulty (1-5).
            tags: Optional list of tags.

        Returns:
            Created Flashcard.

        Raises:
            RevisionServiceError: If flashcard limit is reached.
        """
        # Check flashcard limit
        count = await self._db.scalar(
            select(func.count())
            .select_from(Flashcard)
            .where(Flashcard.student_id == student_id)
        )
        if count and count >= self.MAX_FLASHCARDS_PER_STUDENT:
            raise RevisionServiceError(
                f"Flashcard limit reached ({self.MAX_FLASHCARDS_PER_STUDENT} cards max)"
            )

        # Create flashcard with initial SR state
        flashcard = Flashcard(
            student_id=student_id,
            subject_id=subject_id,
            curriculum_outcome_id=curriculum_outcome_id,
            context_note_id=context_note_id,
            front=front,
            back=back,
            generated_by=generated_by,
            generation_model=generation_model,
            difficulty_level=difficulty_level,
            tags=tags,
            # Initial SR state
            sr_interval=self._sr.INITIAL_INTERVAL,
            sr_ease_factor=self._sr.DEFAULT_EASE_FACTOR,
            sr_repetition=0,
            sr_next_review=None,  # Due immediately
        )

        self._db.add(flashcard)
        await self._db.commit()
        await self._db.refresh(flashcard)

        logger.info(f"Created flashcard {flashcard.id} for student {student_id}")

        return flashcard

    async def create_flashcards_bulk(
        self,
        student_id: UUID,
        flashcards_data: list[dict[str, Any]],
    ) -> list[Flashcard]:
        """Create multiple flashcards at once.

        Args:
            student_id: The student's UUID.
            flashcards_data: List of flashcard data dicts.

        Returns:
            List of created Flashcards.
        """
        # Check total count
        current_count = await self._db.scalar(
            select(func.count())
            .select_from(Flashcard)
            .where(Flashcard.student_id == student_id)
        )
        current_count = current_count or 0

        if current_count + len(flashcards_data) > self.MAX_FLASHCARDS_PER_STUDENT:
            raise RevisionServiceError(
                f"Would exceed flashcard limit ({self.MAX_FLASHCARDS_PER_STUDENT} cards max)"
            )

        flashcards = []
        for data in flashcards_data:
            flashcard = Flashcard(
                student_id=student_id,
                subject_id=data.get("subject_id"),
                curriculum_outcome_id=data.get("curriculum_outcome_id"),
                context_note_id=data.get("context_note_id"),
                front=data["front"],
                back=data["back"],
                generated_by=data.get("generated_by", "user"),
                generation_model=data.get("generation_model"),
                difficulty_level=data.get("difficulty_level"),
                tags=data.get("tags"),
                sr_interval=self._sr.INITIAL_INTERVAL,
                sr_ease_factor=self._sr.DEFAULT_EASE_FACTOR,
                sr_repetition=0,
                sr_next_review=None,
            )
            self._db.add(flashcard)
            flashcards.append(flashcard)

        await self._db.commit()

        for flashcard in flashcards:
            await self._db.refresh(flashcard)

        logger.info(f"Created {len(flashcards)} flashcards for student {student_id}")

        return flashcards

    async def get_flashcard(
        self,
        flashcard_id: UUID,
        student_id: UUID | None = None,
    ) -> Flashcard:
        """Get a flashcard by ID.

        Args:
            flashcard_id: Flashcard UUID.
            student_id: Optional student ID for ownership verification.

        Returns:
            Flashcard if found.

        Raises:
            FlashcardNotFoundError: If flashcard not found.
            FlashcardAccessDeniedError: If student_id doesn't match.
        """
        flashcard = await self._db.get(Flashcard, flashcard_id)

        if not flashcard:
            raise FlashcardNotFoundError(f"Flashcard {flashcard_id} not found")

        if student_id and flashcard.student_id != student_id:
            raise FlashcardAccessDeniedError("Access denied to this flashcard")

        return flashcard

    async def get_student_flashcards(
        self,
        student_id: UUID,
        subject_id: UUID | None = None,
        outcome_id: UUID | None = None,
        due_only: bool = False,
        search_query: str | None = None,
        offset: int = 0,
        limit: int = 50,
    ) -> tuple[list[Flashcard], int]:
        """Get flashcards for a student with optional filters.

        Args:
            student_id: The student's UUID.
            subject_id: Optional filter by subject.
            outcome_id: Optional filter by curriculum outcome.
            due_only: If True, only return cards due for review.
            search_query: Optional search in front/back text.
            offset: Pagination offset.
            limit: Pagination limit.

        Returns:
            Tuple of (flashcards list, total count).
        """
        query = select(Flashcard).where(Flashcard.student_id == student_id)

        if subject_id:
            query = query.where(Flashcard.subject_id == subject_id)

        if outcome_id:
            query = query.where(Flashcard.curriculum_outcome_id == outcome_id)

        if due_only:
            now = datetime.now(timezone.utc)
            query = query.where(
                or_(
                    Flashcard.sr_next_review.is_(None),
                    Flashcard.sr_next_review <= now,
                )
            )

        if search_query:
            search_pattern = f"%{search_query}%"
            query = query.where(
                or_(
                    Flashcard.front.ilike(search_pattern),
                    Flashcard.back.ilike(search_pattern),
                )
            )

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total = await self._db.scalar(count_query) or 0

        # Get paginated results
        query = query.order_by(Flashcard.created_at.desc()).offset(offset).limit(limit)
        result = await self._db.execute(query)
        flashcards = list(result.scalars().all())

        return flashcards, total

    async def get_due_flashcards(
        self,
        student_id: UUID,
        subject_id: UUID | None = None,
        limit: int = 50,
    ) -> list[Flashcard]:
        """Get flashcards that are due for review.

        Args:
            student_id: The student's UUID.
            subject_id: Optional filter by subject.
            limit: Maximum number of cards to return.

        Returns:
            List of due flashcards, ordered by priority.
        """
        now = datetime.now(timezone.utc)

        query = (
            select(Flashcard)
            .where(Flashcard.student_id == student_id)
            .where(
                or_(
                    Flashcard.sr_next_review.is_(None),
                    Flashcard.sr_next_review <= now,
                )
            )
        )

        if subject_id:
            query = query.where(Flashcard.subject_id == subject_id)

        # Order by: new cards first (null next_review), then most overdue
        query = query.order_by(
            Flashcard.sr_next_review.asc().nullsfirst()
        ).limit(limit)

        result = await self._db.execute(query)
        return list(result.scalars().all())

    async def update_flashcard(
        self,
        flashcard_id: UUID,
        student_id: UUID,
        front: str | None = None,
        back: str | None = None,
        difficulty_level: int | None = None,
        tags: list[str] | None = None,
    ) -> Flashcard:
        """Update a flashcard's content.

        Args:
            flashcard_id: Flashcard UUID.
            student_id: Student ID for ownership verification.
            front: New question text (optional).
            back: New answer text (optional).
            difficulty_level: New difficulty (optional).
            tags: New tags (optional).

        Returns:
            Updated Flashcard.
        """
        flashcard = await self.get_flashcard(flashcard_id, student_id)

        if front is not None:
            flashcard.front = front
        if back is not None:
            flashcard.back = back
        if difficulty_level is not None:
            flashcard.difficulty_level = difficulty_level
        if tags is not None:
            flashcard.tags = tags

        await self._db.commit()
        await self._db.refresh(flashcard)

        logger.info(f"Updated flashcard {flashcard_id}")

        return flashcard

    async def delete_flashcard(
        self,
        flashcard_id: UUID,
        student_id: UUID,
    ) -> bool:
        """Delete a flashcard.

        Args:
            flashcard_id: Flashcard UUID.
            student_id: Student ID for ownership verification.

        Returns:
            True if deleted.
        """
        flashcard = await self.get_flashcard(flashcard_id, student_id)

        await self._db.delete(flashcard)
        await self._db.commit()

        logger.info(f"Deleted flashcard {flashcard_id}")

        return True

    # =========================================================================
    # Review Operations
    # =========================================================================

    async def record_review(
        self,
        flashcard_id: UUID,
        student_id: UUID,
        was_correct: bool,
        difficulty_rating: int,
        response_time_seconds: int | None = None,
        session_id: UUID | None = None,
    ) -> tuple[Flashcard, RevisionHistory]:
        """Record a flashcard review and update spaced repetition state.

        Args:
            flashcard_id: Flashcard UUID.
            student_id: Student ID for ownership verification.
            was_correct: Whether the answer was correct.
            difficulty_rating: User's difficulty rating (1-5).
            response_time_seconds: Time taken to answer.
            session_id: Optional session UUID.

        Returns:
            Tuple of (updated Flashcard, RevisionHistory record).
        """
        flashcard = await self.get_flashcard(flashcard_id, student_id)

        # Save current state for history
        old_interval = flashcard.sr_interval
        old_ease = flashcard.sr_ease_factor
        old_repetition = flashcard.sr_repetition

        # Convert difficulty rating to SM-2 quality
        quality = self._sr.quality_from_difficulty(difficulty_rating, was_correct)

        # Calculate new SR state
        current_state = SpacedRepetitionState(
            interval=flashcard.sr_interval,
            ease_factor=flashcard.sr_ease_factor,
            repetition=flashcard.sr_repetition,
        )
        result = self._sr.calculate_next_review(quality, current_state)

        # Update flashcard
        flashcard.sr_interval = result.interval
        flashcard.sr_ease_factor = result.ease_factor
        flashcard.sr_repetition = result.repetition
        flashcard.sr_next_review = result.next_review
        flashcard.review_count += 1
        if was_correct:
            flashcard.correct_count += 1
        flashcard.mastery_percent = self._sr.calculate_mastery_percent(
            flashcard.review_count, flashcard.correct_count
        )

        # Create history record
        history = RevisionHistory(
            student_id=student_id,
            flashcard_id=flashcard_id,
            session_id=session_id,
            was_correct=was_correct,
            quality_rating=quality,
            response_time_seconds=response_time_seconds,
            sr_interval_before=old_interval,
            sr_interval_after=result.interval,
            sr_ease_before=old_ease,
            sr_ease_after=result.ease_factor,
            sr_repetition_before=old_repetition,
            sr_repetition_after=result.repetition,
        )
        self._db.add(history)

        await self._db.commit()
        await self._db.refresh(flashcard)
        await self._db.refresh(history)

        logger.info(
            f"Recorded review for flashcard {flashcard_id}: "
            f"correct={was_correct}, quality={quality}, "
            f"next_review={result.next_review.date()}"
        )

        return flashcard, history

    # =========================================================================
    # Progress & Statistics
    # =========================================================================

    async def get_revision_progress(
        self,
        student_id: UUID,
    ) -> dict[str, Any]:
        """Get overall revision progress for a student.

        Args:
            student_id: The student's UUID.

        Returns:
            Dictionary with progress statistics.
        """
        now = datetime.now(timezone.utc)

        # Total flashcards
        total_cards = await self._db.scalar(
            select(func.count())
            .select_from(Flashcard)
            .where(Flashcard.student_id == student_id)
        ) or 0

        # Cards due for review
        cards_due = await self._db.scalar(
            select(func.count())
            .select_from(Flashcard)
            .where(Flashcard.student_id == student_id)
            .where(
                or_(
                    Flashcard.sr_next_review.is_(None),
                    Flashcard.sr_next_review <= now,
                )
            )
        ) or 0

        # Cards with high mastery (>= 80%)
        cards_mastered = await self._db.scalar(
            select(func.count())
            .select_from(Flashcard)
            .where(Flashcard.student_id == student_id)
            .where(Flashcard.mastery_percent >= 80)
        ) or 0

        # Average mastery
        avg_mastery = await self._db.scalar(
            select(func.avg(Flashcard.mastery_percent))
            .where(Flashcard.student_id == student_id)
        ) or 0.0

        # Last review date
        last_review = await self._db.scalar(
            select(func.max(RevisionHistory.created_at))
            .where(RevisionHistory.student_id == student_id)
        )

        # Review streak (simplified - days in a row with reviews)
        review_streak = await self._calculate_review_streak(student_id)

        # Total reviews
        total_reviews = await self._db.scalar(
            select(func.count())
            .select_from(RevisionHistory)
            .where(RevisionHistory.student_id == student_id)
        ) or 0

        return {
            "total_flashcards": total_cards,
            "cards_due": cards_due,
            "cards_mastered": cards_mastered,
            "overall_mastery_percent": round(avg_mastery, 1),
            "review_streak": review_streak,
            "last_review_date": last_review.isoformat() if last_review else None,
            "total_reviews": total_reviews,
        }

    async def get_progress_by_subject(
        self,
        student_id: UUID,
    ) -> list[dict[str, Any]]:
        """Get revision progress grouped by subject.

        Args:
            student_id: The student's UUID.

        Returns:
            List of subject progress dictionaries.
        """
        now = datetime.now(timezone.utc)

        # Query flashcards grouped by subject
        result = await self._db.execute(
            select(
                Flashcard.subject_id,
                func.count(Flashcard.id).label("total_cards"),
                func.avg(Flashcard.mastery_percent).label("avg_mastery"),
                func.count(
                    Flashcard.id
                ).filter(
                    or_(
                        Flashcard.sr_next_review.is_(None),
                        Flashcard.sr_next_review <= now,
                    )
                ).label("cards_due"),
            )
            .where(Flashcard.student_id == student_id)
            .where(Flashcard.subject_id.isnot(None))
            .group_by(Flashcard.subject_id)
        )

        subject_stats = result.all()

        # Fetch subject details
        progress = []
        for stat in subject_stats:
            if stat.subject_id:
                subject = await self._db.get(Subject, stat.subject_id)
                if subject:
                    progress.append({
                        "subject_id": str(stat.subject_id),
                        "subject_name": subject.name,
                        "subject_code": subject.code,
                        "total_cards": stat.total_cards,
                        "cards_due": stat.cards_due,
                        "mastery_percent": round(stat.avg_mastery or 0, 1),
                    })

        return progress

    async def get_revision_history(
        self,
        student_id: UUID,
        flashcard_id: UUID | None = None,
        limit: int = 50,
    ) -> list[RevisionHistory]:
        """Get revision history for a student or specific flashcard.

        Args:
            student_id: The student's UUID.
            flashcard_id: Optional filter by flashcard.
            limit: Maximum records to return.

        Returns:
            List of RevisionHistory records.
        """
        query = (
            select(RevisionHistory)
            .where(RevisionHistory.student_id == student_id)
        )

        if flashcard_id:
            query = query.where(RevisionHistory.flashcard_id == flashcard_id)

        query = query.order_by(RevisionHistory.created_at.desc()).limit(limit)

        result = await self._db.execute(query)
        return list(result.scalars().all())

    async def _calculate_review_streak(self, student_id: UUID) -> int:
        """Calculate the current review streak (consecutive days with reviews)."""
        # Get distinct review dates
        result = await self._db.execute(
            select(func.date(RevisionHistory.created_at).label("review_date"))
            .where(RevisionHistory.student_id == student_id)
            .group_by(func.date(RevisionHistory.created_at))
            .order_by(func.date(RevisionHistory.created_at).desc())
            .limit(365)  # Check up to a year
        )

        dates = [row.review_date for row in result.all()]

        if not dates:
            return 0

        # Check if reviewed today or yesterday
        today = datetime.now(timezone.utc).date()
        yesterday = today - timedelta(days=1)
        if dates[0] != today and dates[0] != yesterday:
            return 0

        # Count consecutive days
        streak = 1
        for i in range(1, len(dates)):
            expected_date = dates[i - 1] - timedelta(days=1)
            if dates[i] == expected_date:
                streak += 1
            else:
                break

        return streak
