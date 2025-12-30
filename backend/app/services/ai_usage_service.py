"""AI usage tracking service.

Tracks and enforces daily/monthly AI token limits per student.
"""
import logging
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import and_, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_usage import AIUsage
from app.schemas.ai_usage import (
    AIUsageLimits,
    AIUsageResponse,
    AIUsageSummary,
    AIUsageUpdate,
)

logger = logging.getLogger(__name__)

# =============================================================================
# Usage Limits Configuration
# =============================================================================

# Daily limit per student (tokens)
DAILY_TOKEN_LIMIT = 150_000  # ~$0.45/day with mixed model usage

# Monthly limits (tokens)
MONTHLY_SOFT_LIMIT = 2_000_000  # Warning threshold (~$6/month)
MONTHLY_HARD_LIMIT = 3_000_000  # Hard cap, requires parent override (~$9/month)

# Cost calculation (per 1M tokens, USD)
COST_PER_MILLION_HAIKU_INPUT = 0.80
COST_PER_MILLION_HAIKU_OUTPUT = 4.00
COST_PER_MILLION_SONNET_INPUT = 3.00
COST_PER_MILLION_SONNET_OUTPUT = 15.00

# Simplified cost (average of input/output)
COST_PER_TOKEN_HAIKU = Decimal("0.0000024")  # ~$2.40/M average
COST_PER_TOKEN_SONNET = Decimal("0.000009")  # ~$9.00/M average


class AIUsageService:
    """Service for tracking and enforcing AI usage limits."""

    def __init__(self, db: AsyncSession):
        """Initialise with database session."""
        self.db = db

    async def record_usage(
        self,
        student_id: uuid.UUID,
        model: str,
        input_tokens: int,
        output_tokens: int,
    ) -> AIUsage:
        """Record AI token usage for a student.

        Uses upsert to handle concurrent updates efficiently.

        Args:
            student_id: The student's UUID.
            model: Model identifier (haiku, sonnet).
            input_tokens: Number of input tokens.
            output_tokens: Number of output tokens.

        Returns:
            Updated AI usage record for today.
        """
        today = date.today()
        total_tokens = input_tokens + output_tokens

        # Determine model tier and calculate cost
        is_haiku = "haiku" in model.lower()
        cost = self._calculate_cost(model, input_tokens, output_tokens)

        # Prepare update values
        tokens_haiku = total_tokens if is_haiku else 0
        tokens_sonnet = total_tokens if not is_haiku else 0

        # Upsert: insert or update on conflict
        stmt = insert(AIUsage).values(
            id=uuid.uuid4(),
            student_id=student_id,
            date=today,
            tokens_haiku=tokens_haiku,
            tokens_sonnet=tokens_sonnet,
            total_cost_usd=cost,
            request_count=1,
        ).on_conflict_do_update(
            constraint="uq_ai_usage_student_date",
            set_={
                "tokens_haiku": AIUsage.tokens_haiku + tokens_haiku,
                "tokens_sonnet": AIUsage.tokens_sonnet + tokens_sonnet,
                "total_cost_usd": AIUsage.total_cost_usd + cost,
                "request_count": AIUsage.request_count + 1,
                "updated_at": datetime.now(timezone.utc),
            },
        ).returning(AIUsage)

        result = await self.db.execute(stmt)
        await self.db.commit()

        usage = result.scalar_one()

        logger.debug(
            "Recorded AI usage",
            extra={
                "student_id": str(student_id),
                "model": model,
                "tokens": total_tokens,
                "cost_usd": str(cost),
            },
        )

        return usage

    async def check_limits(self, student_id: uuid.UUID) -> AIUsageLimits:
        """Check current usage against limits.

        Args:
            student_id: The student's UUID.

        Returns:
            Current usage and limit status.
        """
        today = date.today()
        month_start = today.replace(day=1)

        # Get today's usage
        today_usage = await self._get_daily_usage(student_id, today)

        # Get monthly total
        month_total = await self._get_period_total(student_id, month_start, today)

        # Calculate limit status
        today_tokens = today_usage.total_tokens if today_usage else 0
        month_tokens = month_total

        return AIUsageLimits(
            today_tokens=today_tokens,
            today_cost_usd=today_usage.total_cost_usd if today_usage else Decimal("0"),
            today_requests=today_usage.request_count if today_usage else 0,
            month_tokens=month_tokens,
            month_cost_usd=await self._get_period_cost(student_id, month_start, today),
            daily_token_limit=DAILY_TOKEN_LIMIT,
            monthly_soft_limit=MONTHLY_SOFT_LIMIT,
            monthly_hard_limit=MONTHLY_HARD_LIMIT,
            daily_limit_reached=today_tokens >= DAILY_TOKEN_LIMIT,
            monthly_soft_limit_reached=month_tokens >= MONTHLY_SOFT_LIMIT,
            monthly_hard_limit_reached=month_tokens >= MONTHLY_HARD_LIMIT,
            daily_usage_percent=min(100.0, (today_tokens / DAILY_TOKEN_LIMIT) * 100),
            monthly_usage_percent=min(100.0, (month_tokens / MONTHLY_HARD_LIMIT) * 100),
        )

    async def can_make_request(
        self,
        student_id: uuid.UUID,
        estimated_tokens: int = 0,
    ) -> tuple[bool, str | None]:
        """Check if a student can make an AI request.

        Args:
            student_id: The student's UUID.
            estimated_tokens: Estimated tokens for the request.

        Returns:
            Tuple of (allowed, reason if not allowed).
        """
        limits = await self.check_limits(student_id)

        # Check hard monthly limit
        if limits.monthly_hard_limit_reached:
            return False, "Monthly AI usage limit reached. Please ask a parent to review usage."

        # Check daily limit
        if limits.daily_limit_reached:
            return False, "Daily AI usage limit reached. Come back tomorrow!"

        # Check if adding estimated tokens would exceed limits
        if estimated_tokens > 0:
            if limits.today_tokens + estimated_tokens > DAILY_TOKEN_LIMIT:
                return False, "This request would exceed the daily limit."
            if limits.month_tokens + estimated_tokens > MONTHLY_HARD_LIMIT:
                return False, "This request would exceed the monthly limit."

        return True, None

    async def get_daily_usage(
        self,
        student_id: uuid.UUID,
        target_date: date | None = None,
    ) -> AIUsageResponse | None:
        """Get usage for a specific day.

        Args:
            student_id: The student's UUID.
            target_date: Date to get usage for (defaults to today).

        Returns:
            Usage record or None.
        """
        usage = await self._get_daily_usage(student_id, target_date or date.today())
        if usage:
            return AIUsageResponse(
                id=usage.id,
                student_id=usage.student_id,
                date=usage.date,
                tokens_haiku=usage.tokens_haiku,
                tokens_sonnet=usage.tokens_sonnet,
                total_tokens=usage.total_tokens,
                total_cost_usd=usage.total_cost_usd,
                request_count=usage.request_count,
                created_at=usage.created_at,
                updated_at=usage.updated_at,
            )
        return None

    async def get_usage_history(
        self,
        student_id: uuid.UUID,
        days: int = 30,
    ) -> list[AIUsageResponse]:
        """Get usage history for a student.

        Args:
            student_id: The student's UUID.
            days: Number of days to retrieve.

        Returns:
            List of daily usage records.
        """
        start_date = date.today() - timedelta(days=days)

        result = await self.db.execute(
            select(AIUsage)
            .where(
                and_(
                    AIUsage.student_id == student_id,
                    AIUsage.date >= start_date,
                )
            )
            .order_by(AIUsage.date.desc())
        )
        records = result.scalars().all()

        return [
            AIUsageResponse(
                id=r.id,
                student_id=r.student_id,
                date=r.date,
                tokens_haiku=r.tokens_haiku,
                tokens_sonnet=r.tokens_sonnet,
                total_tokens=r.total_tokens,
                total_cost_usd=r.total_cost_usd,
                request_count=r.request_count,
                created_at=r.created_at,
                updated_at=r.updated_at,
            )
            for r in records
        ]

    async def get_usage_summary(
        self,
        student_id: uuid.UUID,
        start_date: date,
        end_date: date,
    ) -> AIUsageSummary:
        """Get aggregated usage summary for a period.

        Args:
            student_id: The student's UUID.
            start_date: Period start.
            end_date: Period end.

        Returns:
            Aggregated usage summary.
        """
        result = await self.db.execute(
            select(
                func.sum(AIUsage.tokens_haiku).label("haiku"),
                func.sum(AIUsage.tokens_sonnet).label("sonnet"),
                func.sum(AIUsage.total_cost_usd).label("cost"),
                func.sum(AIUsage.request_count).label("requests"),
                func.count(AIUsage.id).label("days"),
            )
            .where(
                and_(
                    AIUsage.student_id == student_id,
                    AIUsage.date >= start_date,
                    AIUsage.date <= end_date,
                )
            )
        )
        row = result.first()

        haiku = row.haiku or 0
        sonnet = row.sonnet or 0
        total = haiku + sonnet
        days = row.days or 1

        return AIUsageSummary(
            student_id=student_id,
            period_start=start_date,
            period_end=end_date,
            total_tokens_haiku=haiku,
            total_tokens_sonnet=sonnet,
            total_tokens=total,
            total_cost_usd=row.cost or Decimal("0"),
            total_requests=row.requests or 0,
            daily_average_tokens=total // days if days > 0 else 0,
        )

    # =========================================================================
    # Private Methods
    # =========================================================================

    async def _get_daily_usage(
        self,
        student_id: uuid.UUID,
        target_date: date,
    ) -> AIUsage | None:
        """Get usage record for a specific day."""
        result = await self.db.execute(
            select(AIUsage).where(
                and_(
                    AIUsage.student_id == student_id,
                    AIUsage.date == target_date,
                )
            )
        )
        return result.scalar_one_or_none()

    async def _get_period_total(
        self,
        student_id: uuid.UUID,
        start_date: date,
        end_date: date,
    ) -> int:
        """Get total tokens for a period."""
        result = await self.db.execute(
            select(
                func.sum(AIUsage.tokens_haiku + AIUsage.tokens_sonnet)
            ).where(
                and_(
                    AIUsage.student_id == student_id,
                    AIUsage.date >= start_date,
                    AIUsage.date <= end_date,
                )
            )
        )
        return result.scalar() or 0

    async def _get_period_cost(
        self,
        student_id: uuid.UUID,
        start_date: date,
        end_date: date,
    ) -> Decimal:
        """Get total cost for a period."""
        result = await self.db.execute(
            select(func.sum(AIUsage.total_cost_usd)).where(
                and_(
                    AIUsage.student_id == student_id,
                    AIUsage.date >= start_date,
                    AIUsage.date <= end_date,
                )
            )
        )
        return result.scalar() or Decimal("0")

    def _calculate_cost(
        self,
        model: str,
        input_tokens: int,
        output_tokens: int,
    ) -> Decimal:
        """Calculate cost for tokens based on model.

        Uses simplified average pricing for input/output.
        """
        total = input_tokens + output_tokens

        if "haiku" in model.lower():
            return Decimal(str(total)) * COST_PER_TOKEN_HAIKU
        else:
            return Decimal(str(total)) * COST_PER_TOKEN_SONNET
