"""Pydantic schemas for AI interactions (tutor chat)."""
from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class CurriculumContext(BaseModel):
    """Curriculum context for an AI interaction."""

    outcome_code: str | None = None
    outcome_description: str | None = None
    stage: str | None = None
    strand: str | None = None
    pathway: str | None = None


class ChatRequest(BaseModel):
    """Request schema for sending a chat message to the tutor."""

    session_id: UUID
    message: str = Field(
        ...,
        min_length=1,
        max_length=4000,
        description="The student's message to the tutor",
    )
    subject_code: str | None = Field(
        None,
        min_length=1,
        max_length=10,
        description="Subject code (MATH, ENG, SCI, etc.)",
    )
    outcome_code: str | None = Field(
        None,
        description="Curriculum outcome code for context",
    )

    model_config = {"json_schema_extra": {"example": {
        "session_id": "123e4567-e89b-12d3-a456-426614174000",
        "message": "I don't understand how to solve quadratic equations",
        "subject_code": "MATH",
        "outcome_code": "MA5.2-NA-01",
    }}}


class ChatResponse(BaseModel):
    """Response schema for a tutor chat message."""

    response: str
    model_used: str
    input_tokens: int
    output_tokens: int
    estimated_cost_usd: float
    interaction_id: UUID
    flagged: bool = False

    model_config = {"json_schema_extra": {"example": {
        "response": "Let's think about this step by step. What do you already know about quadratic equations?",
        "model_used": "claude-sonnet-4-20250514",
        "input_tokens": 450,
        "output_tokens": 120,
        "estimated_cost_usd": 0.00315,
        "interaction_id": "123e4567-e89b-12d3-a456-426614174002",
        "flagged": False,
    }}}


class FlashcardItem(BaseModel):
    """A single flashcard."""

    front: str = Field(..., description="Question or prompt on the front")
    back: str = Field(..., description="Answer or explanation on the back")


class FlashcardRequest(BaseModel):
    """Request schema for generating flashcards."""

    text: str = Field(
        ...,
        min_length=10,
        max_length=10000,
        description="Source text to generate flashcards from",
    )
    subject_code: str | None = Field(
        None,
        description="Subject for context",
    )
    num_cards: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Number of flashcards to generate",
    )

    model_config = {"json_schema_extra": {"example": {
        "text": "Photosynthesis is the process by which plants convert light energy into chemical energy...",
        "subject_code": "SCI",
        "num_cards": 5,
    }}}


class FlashcardResponse(BaseModel):
    """Response schema for flashcard generation."""

    flashcards: list[FlashcardItem]
    model_used: str
    input_tokens: int
    output_tokens: int
    estimated_cost_usd: float


class SummariseRequest(BaseModel):
    """Request schema for summarising text."""

    text: str = Field(
        ...,
        min_length=10,
        max_length=20000,
        description="Text to summarise",
    )
    subject_code: str | None = Field(
        None,
        description="Subject for context",
    )
    target_length: str = Field(
        default="medium",
        description="Target length: short, medium, or long",
    )

    model_config = {"json_schema_extra": {"example": {
        "text": "The French Revolution was a period of radical political and societal change...",
        "subject_code": "HSIE",
        "target_length": "medium",
    }}}


class SummariseResponse(BaseModel):
    """Response schema for text summarisation."""

    summary: str
    model_used: str
    input_tokens: int
    output_tokens: int
    estimated_cost_usd: float


class AIInteractionResponse(BaseModel):
    """Response schema for a single AI interaction."""

    id: UUID
    session_id: UUID
    student_id: UUID
    subject_id: UUID | None = None
    user_message: str
    ai_response: str
    model_used: str
    task_type: str
    input_tokens: int
    output_tokens: int
    estimated_cost_usd: float
    curriculum_context: dict[str, Any] | None = None
    created_at: datetime
    flagged: bool
    flag_reason: str | None = None

    model_config = {"from_attributes": True}


class AIInteractionListResponse(BaseModel):
    """Response schema for paginated AI interaction list."""

    interactions: list[AIInteractionResponse]
    total: int
    flagged_count: int
    limit: int
    offset: int


class ChatHistoryMessage(BaseModel):
    """A message in chat history."""

    role: str = Field(..., description="'user' or 'assistant'")
    content: str
    timestamp: datetime
    flagged: bool = False


class ChatHistoryResponse(BaseModel):
    """Response schema for chat history."""

    session_id: UUID
    messages: list[ChatHistoryMessage]
    total_messages: int


class TokenUsageResponse(BaseModel):
    """Response schema for token usage statistics."""

    student_id: UUID
    input_tokens: int
    output_tokens: int
    total_tokens: int
    estimated_cost_usd: float
    period: str  # "today", "week", "month", "all_time"


class InteractionFlagRequest(BaseModel):
    """Request to flag an interaction."""

    reason: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Reason for flagging",
    )
