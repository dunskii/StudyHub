"""NotificationPreference model for user notification settings."""
from __future__ import annotations

import uuid
from datetime import datetime, time, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class EmailFrequency:
    """Email frequency constants."""

    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    NEVER = "never"


class WeekDay:
    """Week day constants."""

    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"


class NotificationPreference(Base):
    """User notification preferences."""

    __tablename__ = "notification_preferences"

    # Primary key is user_id (one-to-one with users)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )

    # Notification toggles
    weekly_reports: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    achievement_alerts: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    concern_alerts: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    goal_reminders: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    insight_notifications: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )

    # Email settings
    email_frequency: Mapped[str] = mapped_column(
        String(20), default="weekly", nullable=False
    )
    preferred_time: Mapped[time] = mapped_column(
        Time, default=time(18, 0), nullable=False
    )  # 6 PM
    preferred_day: Mapped[str] = mapped_column(
        String(20), default="sunday", nullable=False
    )
    timezone: Mapped[str] = mapped_column(
        String(50), default="Australia/Sydney", nullable=False
    )

    # Quiet hours (optional)
    quiet_hours_start: Mapped[time | None] = mapped_column(Time)
    quiet_hours_end: Mapped[time | None] = mapped_column(Time)

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
    user: Mapped[User] = relationship(
        "User", back_populates="notification_preferences"
    )

    def should_send_notification(self, notification_type: str) -> bool:
        """Check if a notification type should be sent based on preferences."""
        type_map = {
            "achievement": self.achievement_alerts,
            "concern": self.concern_alerts,
            "insight": self.insight_notifications,
            "reminder": self.goal_reminders,
            "goal_achieved": self.goal_reminders,
            "weekly_summary": self.weekly_reports,
        }
        return type_map.get(notification_type, True)

    def should_send_email(self) -> bool:
        """Check if emails should be sent based on frequency setting."""
        return self.email_frequency != EmailFrequency.NEVER

    def is_in_quiet_hours(self, current_time: time) -> bool:
        """Check if current time is within quiet hours."""
        if not self.quiet_hours_start or not self.quiet_hours_end:
            return False

        # Handle overnight quiet hours (e.g., 22:00 to 07:00)
        if self.quiet_hours_start > self.quiet_hours_end:
            return (
                current_time >= self.quiet_hours_start
                or current_time <= self.quiet_hours_end
            )
        else:
            return self.quiet_hours_start <= current_time <= self.quiet_hours_end
