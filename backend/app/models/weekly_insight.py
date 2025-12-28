"""WeeklyInsight model for caching AI-generated insights."""
from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.student import Student


class WeeklyInsight(Base):
    """Cached AI-generated weekly insights for a student."""

    __tablename__ = "weekly_insights"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
    )
    week_start: Mapped[date] = mapped_column(Date, nullable=False)  # Monday of the week

    # AI-generated insights (cached)
    insights: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    # Structure: {
    #   "wins": [{"title": str, "description": str, "subject_id": str|None, "priority": str}],
    #   "areas_to_watch": [...],
    #   "recommendations": [...],
    #   "teacher_talking_points": [str],
    #   "pathway_readiness": {...} | None,  # Stage 5 only
    #   "hsc_projection": {...} | None,  # Stage 6 only
    # }

    # Generation metadata
    model_used: Mapped[str] = mapped_column(
        String(50), default="claude-3-5-haiku", nullable=False
    )
    tokens_used: Mapped[int | None] = mapped_column(Integer)
    cost_estimate: Mapped[Decimal | None] = mapped_column(Numeric(10, 6))  # USD cost

    # Timestamps
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    sent_to_parent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Relationships
    student: Mapped[Student] = relationship("Student", back_populates="weekly_insights")

    @property
    def is_sent(self) -> bool:
        """Check if insight has been sent to parent."""
        return self.sent_to_parent_at is not None

    @property
    def wins(self) -> list[dict[str, Any]]:
        """Get wins from insights."""
        result: list[dict[str, Any]] = self.insights.get("wins", [])
        return result

    @property
    def areas_to_watch(self) -> list[dict[str, Any]]:
        """Get areas to watch from insights."""
        result: list[dict[str, Any]] = self.insights.get("areas_to_watch", [])
        return result

    @property
    def recommendations(self) -> list[dict[str, Any]]:
        """Get recommendations from insights."""
        result: list[dict[str, Any]] = self.insights.get("recommendations", [])
        return result

    @property
    def teacher_talking_points(self) -> list[str]:
        """Get teacher talking points from insights."""
        result: list[str] = self.insights.get("teacher_talking_points", [])
        return result

    @property
    def pathway_readiness(self) -> dict[str, Any] | None:
        """Get pathway readiness (Stage 5 only)."""
        return self.insights.get("pathway_readiness")

    @property
    def hsc_projection(self) -> dict[str, Any] | None:
        """Get HSC projection (Stage 6 only)."""
        return self.insights.get("hsc_projection")

    def mark_sent(self) -> None:
        """Mark insight as sent to parent."""
        if not self.sent_to_parent_at:
            self.sent_to_parent_at = datetime.now(timezone.utc)

    @classmethod
    def get_week_start(cls, for_date: date | None = None) -> date:
        """Get the Monday of the week for a given date."""
        from datetime import timedelta

        if for_date is None:
            for_date = date.today()
        # Monday is weekday 0
        days_since_monday = for_date.weekday()
        return for_date - timedelta(days=days_since_monday)
