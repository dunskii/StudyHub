"""Pydantic schemas for tutoring sessions."""
from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class SessionData(BaseModel):
    """Session data tracking learning progress."""

    outcomesWorkedOn: list[str] = Field(default_factory=list)
    questionsAttempted: int = 0
    questionsCorrect: int = 0
    flashcardsReviewed: int = 0


class SessionCreate(BaseModel):
    """Request schema for creating a new session."""

    student_id: UUID
    subject_id: UUID | None = None
    session_type: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Type of session: tutor_chat, revision, homework_help",
    )

    model_config = {"json_schema_extra": {"example": {
        "student_id": "123e4567-e89b-12d3-a456-426614174000",
        "subject_id": "123e4567-e89b-12d3-a456-426614174001",
        "session_type": "tutor_chat",
    }}}


class SessionUpdate(BaseModel):
    """Request schema for updating a session."""

    ended_at: datetime | None = None
    xp_earned: int | None = None
    data: SessionData | None = None

    model_config = {"json_schema_extra": {"example": {
        "xp_earned": 50,
        "data": {
            "outcomesWorkedOn": ["MA4-NA-01"],
            "questionsAttempted": 5,
            "questionsCorrect": 4,
            "flashcardsReviewed": 0,
        },
    }}}


class SessionResponse(BaseModel):
    """Response schema for a session."""

    id: UUID
    student_id: UUID
    subject_id: UUID | None = None
    session_type: str
    started_at: datetime
    ended_at: datetime | None = None
    duration_minutes: int | None = None
    xp_earned: int
    data: dict[str, Any]

    # Optional expanded fields
    subject_code: str | None = None
    subject_name: str | None = None

    model_config = {"from_attributes": True}


class SessionListResponse(BaseModel):
    """Response schema for paginated session list."""

    sessions: list[SessionResponse]
    total: int
    limit: int
    offset: int


class SessionEndRequest(BaseModel):
    """Request to end a session."""

    xp_earned: int = Field(default=0, ge=0)


class SessionStatsUpdate(BaseModel):
    """Request to update session statistics."""

    questions_attempted: int = Field(default=0, ge=0)
    questions_correct: int = Field(default=0, ge=0)
    flashcards_reviewed: int = Field(default=0, ge=0)
    outcome_code: str | None = None
