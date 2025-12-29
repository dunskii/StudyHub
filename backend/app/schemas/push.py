"""Pydantic schemas for push notifications."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, HttpUrl


class PushSubscriptionKeys(BaseModel):
    """Browser push subscription keys."""

    p256dh: str = Field(..., description="P-256 ECDH public key", min_length=1)
    auth: str = Field(..., description="Authentication secret", min_length=1)


class PushSubscriptionCreate(BaseModel):
    """Request to create a push subscription."""

    endpoint: str = Field(..., description="Push service endpoint URL")
    keys: PushSubscriptionKeys = Field(..., description="Subscription keys")
    device_name: Optional[str] = Field(None, description="Device/browser name", max_length=255)

    @field_validator("endpoint")
    @classmethod
    def validate_endpoint(cls, v: str) -> str:
        """Validate that endpoint is a valid HTTPS URL."""
        if not v:
            raise ValueError("Endpoint cannot be empty")

        # Must be HTTPS for security (except localhost for development)
        if not v.startswith("https://") and not v.startswith("http://localhost"):
            raise ValueError("Push endpoint must use HTTPS")

        # Basic URL structure validation
        if len(v) > 2048:
            raise ValueError("Endpoint URL too long (max 2048 characters)")

        return v


class PushSubscriptionResponse(BaseModel):
    """Response with subscription info."""

    id: UUID
    endpoint: str
    device_name: Optional[str]
    is_active: bool
    created_at: datetime
    last_used_at: Optional[datetime]

    class Config:
        from_attributes = True


class PushSubscriptionList(BaseModel):
    """List of push subscriptions."""

    subscriptions: list[PushSubscriptionResponse]
    total: int


class PushNotificationPayload(BaseModel):
    """Payload for sending a push notification."""

    title: str = Field(..., max_length=100)
    body: str = Field(..., max_length=500)
    icon: Optional[str] = Field(None, description="Icon URL")
    badge: Optional[str] = Field(None, description="Badge URL")
    tag: Optional[str] = Field(None, description="Notification tag for grouping")
    data: Optional[dict] = Field(None, description="Custom data payload")
    actions: Optional[list[dict]] = Field(None, description="Notification actions")


class PushTestRequest(BaseModel):
    """Request to send a test notification."""

    title: str = Field(default="Test Notification", max_length=100)
    body: str = Field(default="This is a test push notification from StudyHub!", max_length=500)
