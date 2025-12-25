"""User schemas."""
from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import EmailStr, Field

from app.schemas.base import BaseSchema, IDMixin, TimestampMixin


class UserBase(BaseSchema):
    """Base user schema."""

    email: EmailStr
    display_name: str = Field(..., min_length=1, max_length=255)
    phone_number: str | None = Field(None, max_length=20)


class UserCreate(UserBase):
    """Schema for creating a user."""

    supabase_auth_id: UUID
    subscription_tier: str = "free"
    preferences: dict[str, Any] = Field(default_factory=dict)


class UserUpdate(BaseSchema):
    """Schema for updating a user."""

    display_name: str | None = Field(None, min_length=1, max_length=255)
    phone_number: str | None = Field(None, max_length=20)
    preferences: dict[str, Any] | None = None


class UserResponse(UserBase, IDMixin, TimestampMixin):
    """Schema for user response."""

    supabase_auth_id: UUID
    subscription_tier: str
    subscription_expires_at: datetime | None
    preferences: dict[str, Any]
    last_login_at: datetime | None


class UserSummary(BaseSchema):
    """Minimal user info."""

    id: UUID
    email: EmailStr
    display_name: str
