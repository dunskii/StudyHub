"""Pydantic schemas for note operations."""
from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


# =============================================================================
# Request Schemas
# =============================================================================


class UploadUrlRequest(BaseModel):
    """Request for a presigned upload URL."""

    filename: str = Field(..., min_length=1, max_length=255)
    content_type: str = Field(
        ...,
        pattern=r"^(image/(jpeg|png|heic|webp)|application/pdf)$",
    )


class NoteCreate(BaseModel):
    """Request to create a note after upload."""

    title: str = Field(..., min_length=1, max_length=255)
    storage_key: str = Field(..., min_length=1)
    content_type: str = Field(..., min_length=1)
    subject_id: UUID | None = None
    tags: list[str] | None = None


class NoteUpdate(BaseModel):
    """Request to update note metadata."""

    title: str | None = Field(None, min_length=1, max_length=255)
    subject_id: UUID | None = None
    tags: list[str] | None = None


class OutcomeUpdateRequest(BaseModel):
    """Request to update linked curriculum outcomes."""

    outcome_ids: list[UUID]


# =============================================================================
# Response Schemas
# =============================================================================


class UploadUrlResponse(BaseModel):
    """Response with presigned upload URL."""

    upload_url: str
    fields: dict[str, str]
    storage_key: str
    expires_at: datetime

    model_config = {"from_attributes": True}


class NoteResponse(BaseModel):
    """Response with note details."""

    id: UUID
    student_id: UUID
    subject_id: UUID | None
    title: str
    content_type: str
    storage_url: str | None
    download_url: str | None = None  # Signed URL for display
    thumbnail_url: str | None = None  # Signed thumbnail URL
    ocr_text: str | None
    ocr_status: str
    curriculum_outcomes: list[UUID] | None
    tags: list[str] | None
    note_metadata: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NoteListResponse(BaseModel):
    """Response with paginated note list."""

    notes: list[NoteResponse]
    total: int
    limit: int
    offset: int

    model_config = {"from_attributes": True}


class OCRStatusResponse(BaseModel):
    """Response with OCR processing status."""

    status: str  # pending, processing, completed, failed, not_applicable
    text: str | None = None
    confidence: float | None = None
    language: str | None = None
    error: str | None = None

    model_config = {"from_attributes": True}


class CurriculumSuggestion(BaseModel):
    """A suggested curriculum outcome."""

    id: UUID
    code: str
    description: str
    stage: str | None
    strand: str | None

    model_config = {"from_attributes": True}


class CurriculumAlignmentResponse(BaseModel):
    """Response with AI-suggested curriculum outcomes."""

    suggested_outcomes: list[CurriculumSuggestion]
    detected_subject: str | None = None
    confidence: float

    model_config = {"from_attributes": True}


class NoteSearchResult(BaseModel):
    """Search result for a note."""

    id: UUID
    title: str
    content_type: str
    thumbnail_url: str | None = None
    ocr_text_snippet: str | None = None  # First ~200 chars of OCR text
    subject_id: UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


class NoteSearchResponse(BaseModel):
    """Response with note search results."""

    results: list[NoteSearchResult]
    total: int
    query: str

    model_config = {"from_attributes": True}
