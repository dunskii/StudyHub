"""User model (parent accounts)."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.student import Student


class User(Base):
    """User/parent account."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    supabase_auth_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), unique=True, nullable=False
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone_number: Mapped[str | None] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Privacy & Consent
    privacy_policy_accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    terms_accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    marketing_consent: Mapped[bool] = mapped_column(Boolean, default=False)
    data_processing_consent: Mapped[bool] = mapped_column(Boolean, default=True)

    # Subscription
    subscription_tier: Mapped[str] = mapped_column(String(20), default="free")
    subscription_started_at: Mapped[datetime | None] = mapped_column(DateTime)
    subscription_expires_at: Mapped[datetime | None] = mapped_column(DateTime)
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255))

    # Preferences
    preferences: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        default=lambda: {
            "emailNotifications": True,
            "weeklyReports": True,
            "language": "en-AU",
            "timezone": "Australia/Sydney",
        },
    )
    user_metadata: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)

    # Relationships
    students: Mapped[list[Student]] = relationship(
        "Student", back_populates="parent", cascade="all, delete-orphan"
    )
