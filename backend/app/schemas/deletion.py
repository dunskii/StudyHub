"""Pydantic schemas for account deletion flow."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class DeletionRequestCreate(BaseModel):
    """Request to initiate account deletion."""

    reason: str | None = Field(
        default=None,
        max_length=1000,
        description="Optional reason for deletion",
    )
    export_data: bool = Field(
        default=False,
        description="Request data export before deletion",
    )


class DeletionConfirmRequest(BaseModel):
    """Request to confirm account deletion with password."""

    password: str = Field(
        ...,
        min_length=1,
        description="Current password for verification",
    )
    confirmation_token: UUID = Field(
        ...,
        description="Token received in confirmation email",
    )


class DeletionCancelRequest(BaseModel):
    """Request to cancel a pending deletion."""

    pass  # No fields needed, authenticated user is implicit


class DeletionRequestResponse(BaseModel):
    """Response containing deletion request details."""

    id: UUID
    user_id: UUID | None  # NULL after user deletion (audit records)
    status: str
    requested_at: datetime
    scheduled_deletion_at: datetime
    confirmed_at: datetime | None = None
    cancelled_at: datetime | None = None
    data_export_requested: bool
    days_remaining: int = Field(
        ...,
        description="Days until permanent deletion (0 if already executed)",
    )
    can_cancel: bool = Field(
        ...,
        description="Whether the request can still be cancelled",
    )

    model_config = {"from_attributes": True}


class DeletionInitiatedResponse(BaseModel):
    """Response when deletion request is initiated."""

    message: str
    deletion_request_id: UUID
    scheduled_deletion_at: datetime
    confirmation_email_sent: bool
    grace_period_days: int


class DeletionConfirmedResponse(BaseModel):
    """Response when deletion is confirmed."""

    message: str
    deletion_request_id: UUID
    scheduled_deletion_at: datetime
    status: str


class DeletionCancelledResponse(BaseModel):
    """Response when deletion is cancelled."""

    message: str
    deletion_request_id: UUID
    cancelled_at: datetime


class DeletionStatusResponse(BaseModel):
    """Response containing current deletion status."""

    has_pending_deletion: bool
    deletion_request: DeletionRequestResponse | None = None


class DeletionSummary(BaseModel):
    """Summary of what was deleted."""

    user_deleted: bool
    students_deleted: int
    notes_deleted: int
    flashcards_deleted: int
    sessions_deleted: int
    ai_interactions_deleted: int
    files_deleted: int
    total_records_deleted: int
