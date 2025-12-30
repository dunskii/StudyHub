"""DeletionRequest model for account deletion flow."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class DeletionStatus(str, Enum):
    """Status of a deletion request."""

    PENDING = "pending"
    CONFIRMED = "confirmed"
    EXECUTED = "executed"
    CANCELLED = "cancelled"


class DeletionRequest(Base):
    """Account deletion request with grace period tracking."""

    __tablename__ = "deletion_requests"

    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Foreign key to user
    # Note: user_id becomes NULL after user deletion (SET NULL) to preserve audit trail
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Request lifecycle timestamps
    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    scheduled_deletion_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    executed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Confirmation token for secure confirmation flow
    confirmation_token: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), unique=True
    )
    token_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )

    # Email reminder tracking
    reminder_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Status tracking
    status: Mapped[str] = mapped_column(
        String(20), default=DeletionStatus.PENDING.value
    )

    # Audit fields
    ip_address: Mapped[str | None] = mapped_column(String(45))  # IPv6 support
    reason: Mapped[str | None] = mapped_column(Text)
    data_export_requested: Mapped[bool] = mapped_column(Boolean, default=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationship to user
    user: Mapped[User] = relationship("User", backref="deletion_requests")

    @property
    def is_pending(self) -> bool:
        """Check if request is still pending confirmation."""
        return self.status == DeletionStatus.PENDING.value

    @property
    def is_confirmed(self) -> bool:
        """Check if request has been confirmed and awaiting execution."""
        return self.status == DeletionStatus.CONFIRMED.value

    @property
    def is_executed(self) -> bool:
        """Check if deletion has been executed."""
        return self.status == DeletionStatus.EXECUTED.value

    @property
    def is_cancelled(self) -> bool:
        """Check if request has been cancelled."""
        return self.status == DeletionStatus.CANCELLED.value

    @property
    def can_be_cancelled(self) -> bool:
        """Check if the request can still be cancelled."""
        return self.status in (
            DeletionStatus.PENDING.value,
            DeletionStatus.CONFIRMED.value,
        )

    @property
    def is_token_expired(self) -> bool:
        """Check if the confirmation token has expired."""
        if self.token_expires_at is None:
            return False  # No expiry set (legacy requests)
        return datetime.now(timezone.utc) > self.token_expires_at

    def __repr__(self) -> str:
        return (
            f"<DeletionRequest(id={self.id}, user_id={self.user_id}, "
            f"status={self.status}, scheduled_at={self.scheduled_deletion_at})>"
        )
