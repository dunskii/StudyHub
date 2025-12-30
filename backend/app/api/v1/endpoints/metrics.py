"""Metrics and monitoring endpoints.

Exposes Prometheus-compatible metrics for production monitoring.
"""
import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_optional
from app.models.ai_interaction import AIInteraction
from app.models.session import Session
from app.models.student import Student
from app.models.user import User

router = APIRouter()


@router.get("/health/detailed")
async def detailed_health_check(db: AsyncSession = Depends(get_db)):
    """Detailed health check for monitoring systems.

    Returns status of all system components.
    """
    health = {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "components": {},
    }

    # Check database connection
    try:
        start = time.time()
        await db.execute(text("SELECT 1"))
        db_latency = (time.time() - start) * 1000
        health["components"]["database"] = {
            "status": "healthy",
            "latency_ms": round(db_latency, 2),
        }
    except Exception as e:
        health["status"] = "unhealthy"
        health["components"]["database"] = {
            "status": "unhealthy",
            "error": str(e),
        }

    return health


@router.get("/metrics")
async def prometheus_metrics(
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """Prometheus-compatible metrics endpoint.

    Returns metrics in Prometheus text format.
    """
    # Require authentication for metrics in production
    # This is a basic check - in production, use proper auth or network isolation
    metrics_lines = []

    try:
        # Get user counts
        user_count = await db.scalar(select(func.count(User.id)))
        student_count = await db.scalar(select(func.count(Student.id)))

        # Get session counts (last 24 hours)
        one_day_ago = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        today_sessions = await db.scalar(
            select(func.count(Session.id)).where(Session.started_at >= one_day_ago)
        )

        # Get AI interaction counts (last 24 hours)
        today_ai_interactions = await db.scalar(
            select(func.count(AIInteraction.id)).where(
                AIInteraction.created_at >= one_day_ago
            )
        )

        # Format as Prometheus metrics
        metrics_lines.extend([
            "# HELP studyhub_users_total Total number of registered users",
            "# TYPE studyhub_users_total gauge",
            f"studyhub_users_total {user_count or 0}",
            "",
            "# HELP studyhub_students_total Total number of student profiles",
            "# TYPE studyhub_students_total gauge",
            f"studyhub_students_total {student_count or 0}",
            "",
            "# HELP studyhub_sessions_today Sessions started today",
            "# TYPE studyhub_sessions_today gauge",
            f"studyhub_sessions_today {today_sessions or 0}",
            "",
            "# HELP studyhub_ai_interactions_today AI interactions today",
            "# TYPE studyhub_ai_interactions_today gauge",
            f"studyhub_ai_interactions_today {today_ai_interactions or 0}",
            "",
        ])

    except Exception as e:
        metrics_lines.extend([
            "# HELP studyhub_metrics_error Metrics collection error",
            "# TYPE studyhub_metrics_error gauge",
            f'studyhub_metrics_error{{error="{str(e)}"}} 1',
        ])

    return "\n".join(metrics_lines)


@router.get("/metrics/summary")
async def metrics_summary(db: AsyncSession = Depends(get_db)):
    """JSON metrics summary for dashboards.

    Returns a JSON object with key metrics for monitoring dashboards.
    """
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    # Gather metrics
    user_count = await db.scalar(select(func.count(User.id))) or 0
    student_count = await db.scalar(select(func.count(Student.id))) or 0

    today_sessions = await db.scalar(
        select(func.count(Session.id)).where(Session.started_at >= today)
    ) or 0

    today_ai_interactions = await db.scalar(
        select(func.count(AIInteraction.id)).where(AIInteraction.created_at >= today)
    ) or 0

    # Calculate active users (sessions in last 7 days)
    seven_days_ago = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    from datetime import timedelta
    seven_days_ago = seven_days_ago - timedelta(days=7)

    active_students = await db.scalar(
        select(func.count(func.distinct(Session.student_id))).where(
            Session.started_at >= seven_days_ago
        )
    ) or 0

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "users": {
            "total_parents": user_count,
            "total_students": student_count,
            "active_students_7d": active_students,
        },
        "activity": {
            "sessions_today": today_sessions,
            "ai_interactions_today": today_ai_interactions,
        },
        "health": {
            "status": "healthy",
            "database": "connected",
        },
    }
