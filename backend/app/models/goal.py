"""Goal model for family goal setting."""
from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.notification import Notification
    from app.models.student import Student
    from app.models.user import User


class Goal(Base):
    """Family goal for student progress tracking."""

    __tablename__ = "goals"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    parent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Goal details
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    target_outcomes: Mapped[list[str] | None] = mapped_column(
        ARRAY(String)
    )  # Curriculum outcome codes
    target_mastery: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2)
    )  # Target percentage (e.g., 80.00)
    target_date: Mapped[date | None] = mapped_column(Date)
    reward: Mapped[str | None] = mapped_column(String(255))  # Family reward

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    achieved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Relationships
    parent: Mapped[User] = relationship("User", back_populates="goals")
    student: Mapped[Student] = relationship("Student", back_populates="goals")
    notifications: Mapped[list[Notification]] = relationship(
        "Notification", back_populates="goal", cascade="all, delete-orphan"
    )

    @property
    def is_achieved(self) -> bool:
        """Check if goal has been achieved."""
        return self.achieved_at is not None

    @property
    def is_overdue(self) -> bool:
        """Check if goal is past its target date."""
        if not self.target_date or self.is_achieved:
            return False
        return date.today() > self.target_date

    @property
    def days_remaining(self) -> int | None:
        """Get days remaining until target date."""
        if not self.target_date:
            return None
        delta = self.target_date - date.today()
        return delta.days
