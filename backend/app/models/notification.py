"""Notification model for parent alerts."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.goal import Goal
    from app.models.student import Student
    from app.models.subject import Subject
    from app.models.user import User


class NotificationType:
    """Notification type constants."""

    ACHIEVEMENT = "achievement"
    CONCERN = "concern"
    INSIGHT = "insight"
    REMINDER = "reminder"
    GOAL_ACHIEVED = "goal_achieved"
    WEEKLY_SUMMARY = "weekly_summary"


class NotificationPriority:
    """Notification priority constants."""

    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"


class DeliveryMethod:
    """Delivery method constants."""

    IN_APP = "in_app"
    EMAIL = "email"
    BOTH = "both"


class Notification(Base):
    """Parent notification for alerts and updates."""

    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    # Notification content
    type: Mapped[str] = mapped_column(String(30), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[str] = mapped_column(String(20), default="normal", nullable=False)

    # Related entities (optional)
    related_student_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE")
    )
    related_subject_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="SET NULL")
    )
    related_goal_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("goals.id", ondelete="CASCADE")
    )

    # Delivery tracking
    delivery_method: Mapped[str] = mapped_column(
        String(20), default="in_app", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Extra data for rich notifications
    data: Mapped[dict[str, Any] | None] = mapped_column(JSONB)

    # Relationships
    user: Mapped[User] = relationship("User", back_populates="notifications")
    student: Mapped[Student | None] = relationship(
        "Student", back_populates="notifications"
    )
    subject: Mapped[Subject | None] = relationship("Subject")
    goal: Mapped[Goal | None] = relationship("Goal", back_populates="notifications")

    @property
    def is_read(self) -> bool:
        """Check if notification has been read."""
        return self.read_at is not None

    @property
    def is_sent(self) -> bool:
        """Check if notification has been sent (for email delivery)."""
        return self.sent_at is not None

    def mark_read(self) -> None:
        """Mark notification as read."""
        if not self.read_at:
            self.read_at = datetime.now(timezone.utc)

    def mark_sent(self) -> None:
        """Mark notification as sent."""
        if not self.sent_at:
            self.sent_at = datetime.now(timezone.utc)
