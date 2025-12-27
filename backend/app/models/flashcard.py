"""Flashcard model for spaced repetition system."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.curriculum_outcome import CurriculumOutcome
    from app.models.note import Note
    from app.models.revision_history import RevisionHistory
    from app.models.student import Student
    from app.models.subject import Subject


class Flashcard(Base):
    """Flashcard for spaced repetition learning."""

    __tablename__ = "flashcards"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE")
    )
    subject_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="SET NULL")
    )
    curriculum_outcome_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("curriculum_outcomes.id", ondelete="SET NULL")
    )
    context_note_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("notes.id", ondelete="SET NULL")
    )

    # Content
    front: Mapped[str] = mapped_column(Text, nullable=False)
    back: Mapped[str] = mapped_column(Text, nullable=False)

    # Generation metadata
    generated_by: Mapped[str | None] = mapped_column(String(20))  # 'user', 'ai', 'system'
    generation_model: Mapped[str | None] = mapped_column(String(50))  # e.g., 'claude-3-5-haiku'

    # Review statistics
    review_count: Mapped[int] = mapped_column(Integer, default=0)
    correct_count: Mapped[int] = mapped_column(Integer, default=0)
    mastery_percent: Mapped[int] = mapped_column(Integer, default=0)

    # Spaced repetition state (SM-2 algorithm)
    sr_interval: Mapped[int] = mapped_column(Integer, default=1)  # Days until next review
    sr_ease_factor: Mapped[float] = mapped_column(Float, default=2.5)  # Ease factor (min 1.3)
    sr_next_review: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    sr_repetition: Mapped[int] = mapped_column(Integer, default=0)  # Successful review count

    # User-defined difficulty
    difficulty_level: Mapped[int | None] = mapped_column(Integer)  # 1-5

    # Tags for organization
    tags: Mapped[list[str] | None] = mapped_column(ARRAY(String))

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    student: Mapped[Student] = relationship("Student", back_populates="flashcards")
    subject: Mapped[Subject | None] = relationship("Subject")
    curriculum_outcome: Mapped[CurriculumOutcome | None] = relationship("CurriculumOutcome")
    context_note: Mapped[Note | None] = relationship("Note")
    revision_history: Mapped[list[RevisionHistory]] = relationship(
        "RevisionHistory", back_populates="flashcard", cascade="all, delete-orphan"
    )

    @property
    def is_due(self) -> bool:
        """Check if this flashcard is due for review."""
        if self.sr_next_review is None:
            return True
        return datetime.now(timezone.utc) >= self.sr_next_review

    @property
    def success_rate(self) -> float:
        """Calculate the success rate as a percentage."""
        if self.review_count == 0:
            return 0.0
        return (self.correct_count / self.review_count) * 100

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "id": str(self.id),
            "student_id": str(self.student_id),
            "subject_id": str(self.subject_id) if self.subject_id else None,
            "curriculum_outcome_id": str(self.curriculum_outcome_id) if self.curriculum_outcome_id else None,
            "context_note_id": str(self.context_note_id) if self.context_note_id else None,
            "front": self.front,
            "back": self.back,
            "generated_by": self.generated_by,
            "generation_model": self.generation_model,
            "review_count": self.review_count,
            "correct_count": self.correct_count,
            "mastery_percent": self.mastery_percent,
            "sr_interval": self.sr_interval,
            "sr_ease_factor": self.sr_ease_factor,
            "sr_next_review": self.sr_next_review.isoformat() if self.sr_next_review else None,
            "sr_repetition": self.sr_repetition,
            "difficulty_level": self.difficulty_level,
            "tags": self.tags,
            "is_due": self.is_due,
            "success_rate": self.success_rate,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
