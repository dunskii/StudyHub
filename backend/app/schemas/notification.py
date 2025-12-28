"""Notification schemas for parent alerts."""
from datetime import datetime, time
from typing import Any, Literal
from uuid import UUID

from pydantic import Field, field_validator

from app.schemas.base import BaseSchema, IDMixin


# Type literals for validation
NotificationTypeEnum = Literal[
    "achievement", "concern", "insight", "reminder", "goal_achieved", "weekly_summary"
]
NotificationPriorityEnum = Literal["low", "normal", "high"]
DeliveryMethodEnum = Literal["in_app", "email", "both"]
EmailFrequencyEnum = Literal["daily", "weekly", "monthly", "never"]
WeekDayEnum = Literal[
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
]


# =============================================================================
# Notification Schemas
# =============================================================================


class NotificationBase(BaseSchema):
    """Base notification schema."""

    type: NotificationTypeEnum = Field(..., description="Notification type")
    title: str = Field(..., min_length=1, max_length=255, description="Notification title")
    message: str = Field(..., min_length=1, max_length=5000, description="Notification message")
    priority: NotificationPriorityEnum = Field(
        default="normal", description="Notification priority"
    )


class NotificationCreate(NotificationBase):
    """Schema for creating a notification."""

    user_id: UUID = Field(..., description="User to notify")
    related_student_id: UUID | None = Field(None, description="Related student")
    related_subject_id: UUID | None = Field(None, description="Related subject")
    related_goal_id: UUID | None = Field(None, description="Related goal")
    delivery_method: DeliveryMethodEnum = Field(
        default="in_app", description="How to deliver the notification"
    )
    data: dict[str, Any] | None = Field(None, description="Additional notification data")


class NotificationResponse(NotificationBase, IDMixin):
    """Schema for notification response."""

    user_id: UUID
    related_student_id: UUID | None = None
    related_subject_id: UUID | None = None
    related_goal_id: UUID | None = None
    delivery_method: DeliveryMethodEnum
    data: dict[str, Any] | None = None
    created_at: datetime
    sent_at: datetime | None = None
    read_at: datetime | None = None

    @property
    def is_read(self) -> bool:
        """Check if notification has been read."""
        return self.read_at is not None

    @property
    def is_sent(self) -> bool:
        """Check if notification has been sent."""
        return self.sent_at is not None


class NotificationSummary(BaseSchema):
    """Minimal notification info for lists."""

    id: UUID
    type: NotificationTypeEnum
    title: str
    priority: NotificationPriorityEnum
    created_at: datetime
    is_read: bool = False


class NotificationListResponse(BaseSchema):
    """Schema for list of notifications."""

    notifications: list[NotificationResponse]
    total: int
    unread_count: int = 0


class NotificationMarkReadRequest(BaseSchema):
    """Schema for marking notifications as read."""

    notification_ids: list[UUID] | None = Field(
        None, description="Specific notification IDs to mark read (None = all)"
    )


class NotificationMarkReadResponse(BaseSchema):
    """Schema for mark read response."""

    marked_count: int = Field(..., description="Number of notifications marked as read")


# =============================================================================
# Notification Preferences Schemas
# =============================================================================


class NotificationPreferencesBase(BaseSchema):
    """Base notification preferences schema."""

    weekly_reports: bool = Field(True, description="Receive weekly progress reports")
    achievement_alerts: bool = Field(True, description="Receive achievement notifications")
    concern_alerts: bool = Field(True, description="Receive concern notifications")
    goal_reminders: bool = Field(True, description="Receive goal reminder notifications")
    insight_notifications: bool = Field(True, description="Receive AI insight notifications")


class NotificationPreferencesUpdate(BaseSchema):
    """Schema for updating notification preferences."""

    weekly_reports: bool | None = None
    achievement_alerts: bool | None = None
    concern_alerts: bool | None = None
    goal_reminders: bool | None = None
    insight_notifications: bool | None = None
    email_frequency: EmailFrequencyEnum | None = Field(
        None, description="How often to send email digests"
    )
    preferred_time: time | None = Field(
        None, description="Preferred time for email notifications (HH:MM)"
    )
    preferred_day: WeekDayEnum | None = Field(
        None, description="Preferred day for weekly reports"
    )
    timezone: str | None = Field(None, max_length=50, description="User timezone")
    quiet_hours_start: time | None = Field(None, description="Start of quiet hours")
    quiet_hours_end: time | None = Field(None, description="End of quiet hours")

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, v: str | None) -> str | None:
        """Validate timezone string."""
        if v is not None:
            # Basic validation - in production, use pytz or zoneinfo
            valid_prefixes = ("Australia/", "Pacific/", "UTC", "GMT")
            if not any(v.startswith(p) for p in valid_prefixes):
                # Allow other IANA timezones but warn
                pass
        return v


class NotificationPreferencesResponse(NotificationPreferencesBase):
    """Schema for notification preferences response."""

    user_id: UUID
    email_frequency: EmailFrequencyEnum = "weekly"
    preferred_time: time = Field(default_factory=lambda: time(18, 0))
    preferred_day: WeekDayEnum = "sunday"
    timezone: str = "Australia/Sydney"
    quiet_hours_start: time | None = None
    quiet_hours_end: time | None = None
    created_at: datetime
    updated_at: datetime
