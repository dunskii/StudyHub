"""AI usage tracking schemas."""
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


# =============================================================================
# Response Schemas
# =============================================================================


class AIUsageResponse(BaseModel):
    """Daily AI usage record."""

    id: UUID
    student_id: UUID
    date: date
    tokens_haiku: int
    tokens_sonnet: int
    total_tokens: int
    total_cost_usd: Decimal
    request_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AIUsageSummary(BaseModel):
    """Summary of AI usage for a period."""

    student_id: UUID
    period_start: date
    period_end: date
    total_tokens_haiku: int = 0
    total_tokens_sonnet: int = 0
    total_tokens: int = 0
    total_cost_usd: Decimal = Decimal("0")
    total_requests: int = 0
    daily_average_tokens: int = 0


class AIUsageLimits(BaseModel):
    """Current usage limits and status."""

    # Current usage (today)
    today_tokens: int = 0
    today_cost_usd: Decimal = Decimal("0")
    today_requests: int = 0

    # Monthly usage
    month_tokens: int = 0
    month_cost_usd: Decimal = Decimal("0")

    # Limits
    daily_token_limit: int = Field(default=150_000)
    monthly_soft_limit: int = Field(default=2_000_000)
    monthly_hard_limit: int = Field(default=3_000_000)

    # Status
    daily_limit_reached: bool = False
    monthly_soft_limit_reached: bool = False
    monthly_hard_limit_reached: bool = False

    # Percentage used
    daily_usage_percent: float = 0.0
    monthly_usage_percent: float = 0.0


class AIUsageHistoryResponse(BaseModel):
    """Paginated AI usage history."""

    usage: list[AIUsageResponse]
    total: int
    page: int
    page_size: int


# =============================================================================
# Internal Schemas
# =============================================================================


class AIUsageUpdate(BaseModel):
    """Internal schema for updating AI usage."""

    tokens_haiku: int = 0
    tokens_sonnet: int = 0
    cost_usd: Decimal = Decimal("0")
    requests: int = 1
