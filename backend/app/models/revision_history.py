"""Revision history model for tracking flashcard reviews."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.flashcard import Flashcard
    from app.models.session import Session
    from app.models.student import Student


class RevisionHistory(Base):
    """Record of a single flashcard review."""

    __tablename__ = "revision_history"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE")
    )
    flashcard_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("flashcards.id", ondelete="CASCADE")
    )
    session_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="SET NULL")
    )

    # Review result
    was_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    quality_rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 0-5 for SM-2
    response_time_seconds: Mapped[int | None] = mapped_column(Integer)

    # SM-2 state before this review
    sr_interval_before: Mapped[int] = mapped_column(Integer, nullable=False)
    sr_ease_before: Mapped[float] = mapped_column(Float, nullable=False)
    sr_repetition_before: Mapped[int] = mapped_column(Integer, nullable=False)

    # SM-2 state after this review
    sr_interval_after: Mapped[int] = mapped_column(Integer, nullable=False)
    sr_ease_after: Mapped[float] = mapped_column(Float, nullable=False)
    sr_repetition_after: Mapped[int] = mapped_column(Integer, nullable=False)

    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    student: Mapped[Student] = relationship("Student", back_populates="revision_history")
    flashcard: Mapped[Flashcard] = relationship("Flashcard", back_populates="revision_history")
    session: Mapped[Session | None] = relationship("Session")

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "id": str(self.id),
            "student_id": str(self.student_id),
            "flashcard_id": str(self.flashcard_id),
            "session_id": str(self.session_id) if self.session_id else None,
            "was_correct": self.was_correct,
            "quality_rating": self.quality_rating,
            "response_time_seconds": self.response_time_seconds,
            "sr_interval_before": self.sr_interval_before,
            "sr_interval_after": self.sr_interval_after,
            "sr_ease_before": self.sr_ease_before,
            "sr_ease_after": self.sr_ease_after,
            "sr_repetition_before": self.sr_repetition_before,
            "sr_repetition_after": self.sr_repetition_after,
            "created_at": self.created_at.isoformat(),
        }
