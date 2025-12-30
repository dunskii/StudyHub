"""AI usage tracking model.

Tracks daily AI token usage per student for cost monitoring and limit enforcement.
"""
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AIUsage(Base):
    """Daily AI usage record for a student."""

    __tablename__ = "ai_usage"

    __table_args__ = (
        UniqueConstraint("student_id", "date", name="uq_ai_usage_student_date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)

    # Token counts by model tier
    tokens_haiku: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    tokens_sonnet: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Cost tracking (in USD for consistency with API pricing)
    total_cost_usd: Mapped[Decimal] = mapped_column(
        Numeric(precision=10, scale=6),
        default=Decimal("0"),
        nullable=False,
    )

    # Request count for rate limiting
    request_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    student: Mapped["Student"] = relationship(  # noqa: F821
        "Student",
        back_populates="ai_usage_records",
    )

    @property
    def total_tokens(self) -> int:
        """Get total tokens used across all models."""
        return self.tokens_haiku + self.tokens_sonnet

    def __repr__(self) -> str:
        return (
            f"AIUsage(student_id={self.student_id}, date={self.date}, "
            f"tokens={self.total_tokens}, cost=${self.total_cost_usd})"
        )
