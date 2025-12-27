"""Pydantic schemas for flashcard operations."""
from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class FlashcardCreate(BaseModel):
    """Schema for creating a new flashcard."""

    front: str = Field(..., min_length=1, max_length=2000, description="Question/prompt text")
    back: str = Field(..., min_length=1, max_length=2000, description="Answer text")
    subject_id: UUID | None = Field(None, description="Subject UUID")
    curriculum_outcome_id: UUID | None = Field(None, description="Curriculum outcome UUID")
    context_note_id: UUID | None = Field(None, description="Source note UUID")
    difficulty_level: int | None = Field(None, ge=1, le=5, description="Difficulty 1-5")
    tags: list[str] | None = Field(None, max_length=10, description="Tags for organization")

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return None
        # Clean and validate tags
        cleaned = [tag.strip()[:50] for tag in v if tag.strip()]
        return cleaned[:10]  # Max 10 tags


class FlashcardUpdate(BaseModel):
    """Schema for updating a flashcard."""

    front: str | None = Field(None, min_length=1, max_length=2000)
    back: str | None = Field(None, min_length=1, max_length=2000)
    difficulty_level: int | None = Field(None, ge=1, le=5)
    tags: list[str] | None = Field(None, max_length=10)

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return None
        cleaned = [tag.strip()[:50] for tag in v if tag.strip()]
        return cleaned[:10]


class FlashcardResponse(BaseModel):
    """Schema for flashcard response."""

    id: UUID
    student_id: UUID
    subject_id: UUID | None
    curriculum_outcome_id: UUID | None
    context_note_id: UUID | None
    front: str
    back: str
    generated_by: str | None
    generation_model: str | None
    review_count: int
    correct_count: int
    mastery_percent: int
    sr_interval: int
    sr_ease_factor: float
    sr_next_review: datetime | None
    sr_repetition: int
    difficulty_level: int | None
    tags: list[str] | None
    is_due: bool
    success_rate: float
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FlashcardListResponse(BaseModel):
    """Schema for paginated flashcard list."""

    flashcards: list[FlashcardResponse]
    total: int
    offset: int
    limit: int


class FlashcardBulkCreate(BaseModel):
    """Schema for creating multiple flashcards."""

    flashcards: list[FlashcardCreate] = Field(..., min_length=1, max_length=20)


class FlashcardGenerateRequest(BaseModel):
    """Schema for AI flashcard generation request."""

    note_id: UUID | None = Field(None, description="Source note UUID")
    outcome_id: UUID | None = Field(None, description="Curriculum outcome UUID")
    count: int = Field(5, ge=1, le=20, description="Number of cards to generate")

    @field_validator("count")
    @classmethod
    def validate_count(cls, v: int) -> int:
        return min(max(1, v), 20)


class FlashcardDraftResponse(BaseModel):
    """Schema for a generated flashcard draft."""

    front: str
    back: str
    difficulty_level: int
    tags: list[str]


class FlashcardGenerateResponse(BaseModel):
    """Schema for AI flashcard generation response."""

    drafts: list[FlashcardDraftResponse]
    source_type: Literal["note", "outcome"]
    source_id: UUID
