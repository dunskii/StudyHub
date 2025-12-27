"""Pydantic schemas for revision operations."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class RevisionAnswerRequest(BaseModel):
    """Schema for submitting a flashcard answer."""

    flashcard_id: UUID = Field(..., description="Flashcard UUID")
    was_correct: bool = Field(..., description="Whether the answer was correct")
    difficulty_rating: int = Field(..., ge=1, le=5, description="Difficulty rating 1-5")
    response_time_seconds: int | None = Field(None, ge=0, description="Time to answer")
    session_id: UUID | None = Field(None, description="Session UUID if in a session")


class RevisionAnswerResponse(BaseModel):
    """Schema for answer submission response."""

    flashcard_id: UUID
    was_correct: bool
    quality_rating: int  # SM-2 quality (0-5)
    new_interval: int  # Days until next review
    new_ease_factor: float
    next_review: datetime
    mastery_percent: int


class RevisionSessionStartRequest(BaseModel):
    """Schema for starting a revision session."""

    subject_id: UUID | None = Field(None, description="Filter by subject")
    card_count: int = Field(10, ge=1, le=50, description="Cards to include")
    include_new: bool = Field(True, description="Include unreviewed cards")


class RevisionSessionResponse(BaseModel):
    """Schema for revision session response."""

    session_id: UUID
    flashcard_ids: list[UUID]
    total_cards: int


class RevisionProgressResponse(BaseModel):
    """Schema for overall revision progress."""

    total_flashcards: int
    cards_due: int
    cards_mastered: int
    overall_mastery_percent: float
    review_streak: int
    last_review_date: datetime | None
    total_reviews: int


class SubjectProgressResponse(BaseModel):
    """Schema for per-subject progress."""

    subject_id: UUID
    subject_name: str
    subject_code: str
    total_cards: int
    cards_due: int
    mastery_percent: float


class RevisionHistoryResponse(BaseModel):
    """Schema for revision history record."""

    id: UUID
    flashcard_id: UUID
    session_id: UUID | None
    was_correct: bool
    quality_rating: int
    response_time_seconds: int | None
    sr_interval_before: int
    sr_interval_after: int
    sr_ease_before: float
    sr_ease_after: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RevisionStatsResponse(BaseModel):
    """Schema for detailed revision statistics."""

    # Overall stats
    total_flashcards: int
    total_reviews: int
    cards_mastered: int
    overall_accuracy: float

    # Time-based stats
    reviews_today: int
    reviews_this_week: int
    reviews_this_month: int

    # Streak info
    current_streak: int
    longest_streak: int

    # Distribution
    cards_by_mastery: dict[str, int]  # e.g., {"0-20%": 5, "21-40%": 10, ...}
    cards_by_difficulty: dict[str, int]  # e.g., {"easy": 10, "medium": 15, "hard": 5}
