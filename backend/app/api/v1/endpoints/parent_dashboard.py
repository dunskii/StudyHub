"""Parent dashboard API endpoints.

Provides parents with:
- Dashboard overview with all children's summaries
- Detailed student progress views
- AI-generated weekly insights
- Goal management (CRUD)
- Notification management and preferences
"""
from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import ForbiddenError, NotFoundError
from app.core.security import AuthenticatedUser
from app.schemas.goal import (
    GoalCreate,
    GoalListResponse,
    GoalResponse,
    GoalUpdate,
    GoalWithProgress,
)
from app.schemas.notification import (
    NotificationListResponse,
    NotificationPreferencesResponse,
    NotificationPreferencesUpdate,
    NotificationResponse,
)
from app.schemas.parent_dashboard import (
    DashboardOverviewResponse,
    DashboardStudentSummary,
    StudentProgressResponse,
)
from app.schemas.weekly_insight import WeeklyInsightsData, WeeklyInsightsResponse
from app.services.goal_service import GoalService
from app.services.insight_generation_service import InsightGenerationService
from app.services.notification_service import NotificationService
from app.services.parent_analytics_service import ParentAnalyticsService
from app.services.student_service import StudentService

router = APIRouter()


# =============================================================================
# Dashboard Overview
# =============================================================================


@router.get("/dashboard", response_model=DashboardOverviewResponse)
async def get_dashboard_overview(
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DashboardOverviewResponse:
    """Get parent dashboard overview with all children's summaries.

    Returns high-level stats for each child including:
    - Current mastery levels
    - This week's activity stats
    - Active goals and recent achievements
    - Streak information

    Args:
        current_user: The authenticated parent user.
        db: Database session.

    Returns:
        Dashboard overview with student summaries.
    """
    analytics_service = ParentAnalyticsService(db)
    notification_service = NotificationService(db)
    goal_service = GoalService(db)

    # Get summaries for all students (batch query - avoids N+1)
    summaries = await analytics_service.get_students_summary(current_user.id)

    # Get unread notification count
    unread_count = await notification_service.get_unread_count(current_user.id)

    # Get active goals count
    active_goals_count = await goal_service.count_active_goals(current_user.id)

    # Get aggregate weekly stats
    total_time, total_sessions = await analytics_service.get_aggregate_stats(
        current_user.id
    )

    return DashboardOverviewResponse(
        students=summaries,
        total_study_time_week_minutes=total_time,
        total_sessions_week=total_sessions,
        unread_notifications=unread_count,
        active_goals_count=active_goals_count,
        achievements_this_week=0,  # Placeholder: Achievement tracking not yet implemented
    )


# =============================================================================
# Student Progress
# =============================================================================


@router.get("/students/{student_id}/progress", response_model=StudentProgressResponse)
async def get_student_progress(
    student_id: UUID,
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StudentProgressResponse:
    """Get detailed progress view for a specific student.

    Includes:
    - Subject-by-subject mastery breakdown
    - Weekly activity statistics
    - Foundation strength analysis
    - Mastery trends over time

    CRITICAL: Ownership verification - only the parent can access.

    Args:
        student_id: The student UUID.
        current_user: The authenticated parent user.
        db: Database session.

    Returns:
        Detailed student progress data.

    Raises:
        NotFoundError: If student not found.
        ForbiddenError: If user is not the parent.
    """
    analytics_service = ParentAnalyticsService(db)
    student_service = StudentService(db)

    # This method includes ownership verification
    progress = await analytics_service.get_student_progress(
        student_id, current_user.id
    )

    if not progress:
        # Check if student exists to differentiate 404 vs 403
        exists = await student_service.get_by_id(student_id)
        if exists:
            raise ForbiddenError("You do not have access to this student's progress data")
        raise NotFoundError(
            "Student",
            hint="Verify the student ID is correct and belongs to your account",
        )

    return progress


# =============================================================================
# Weekly Insights
# =============================================================================


@router.get("/students/{student_id}/insights", response_model=WeeklyInsightsResponse)
async def get_weekly_insights(
    student_id: UUID,
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    week_start: date | None = Query(
        None,
        description="Start of the week (Monday). Defaults to current week.",
    ),
    force_regenerate: bool = Query(
        False,
        description="Force regeneration of insights (ignores cache).",
    ),
) -> WeeklyInsightsResponse:
    """Get AI-generated weekly insights for a student.

    Provides Claude AI analysis including:
    - This week's wins and achievements
    - Personalised recommendations
    - Areas of concern (if any)
    - Pathway readiness (Stage 5) or HSC projections (Stage 6)

    CRITICAL: Ownership verification - only the parent can access.

    Args:
        student_id: The student UUID.
        current_user: The authenticated parent user.
        db: Database session.
        week_start: Start of the week to get insights for.
        force_regenerate: Whether to force regeneration.

    Returns:
        Weekly insights data.

    Raises:
        NotFoundError: If student not found.
        ForbiddenError: If user is not the parent.
    """
    student_service = StudentService(db)
    insight_service = InsightGenerationService(db)

    # Verify ownership
    student = await student_service.get_by_id_for_user(student_id, current_user.id)
    if not student:
        exists = await student_service.get_by_id(student_id)
        if exists:
            raise ForbiddenError("You do not have access to this student's insights")
        raise NotFoundError(
            "Student",
            hint="Verify the student ID is correct and belongs to your account",
        )

    # Generate or retrieve insights
    insight = await insight_service.generate_weekly_insights(
        student_id=student_id,
        week_start=week_start,
        force_regenerate=force_regenerate,
    )

    # Convert raw insights dict to structured schema
    insights_data = WeeklyInsightsData.model_validate(insight.insights)

    return WeeklyInsightsResponse(
        student_id=insight.student_id,
        week_start=insight.week_start,
        insights=insights_data,
        generated_at=insight.generated_at,
    )


# =============================================================================
# Goal Management
# =============================================================================


@router.get("/goals", response_model=GoalListResponse)
async def list_goals(
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    student_id: UUID | None = Query(
        None,
        description="Filter goals by student ID.",
    ),
    active_only: bool = Query(
        False,
        description="Only return active (non-achieved) goals.",
    ),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
) -> GoalListResponse:
    """List goals for the parent's children.

    Args:
        current_user: The authenticated parent user.
        db: Database session.
        student_id: Optional filter by student.
        active_only: Whether to filter to active goals only.
        page: Page number (1-indexed).
        page_size: Items per page.

    Returns:
        Paginated list of goals.
    """
    goal_service = GoalService(db)
    student_service = StudentService(db)

    offset = (page - 1) * page_size

    if student_id:
        # Verify ownership
        student = await student_service.get_by_id_for_user(student_id, current_user.id)
        if not student:
            exists = await student_service.get_by_id(student_id)
            if exists:
                raise ForbiddenError("You do not have access to this student's goals")
            raise NotFoundError(
                "Student",
                hint="Verify the student ID is correct and belongs to your account",
            )

        goals, total = await goal_service.get_for_student(
            student_id=student_id,
            parent_id=current_user.id,
            active_only=active_only,
            limit=page_size,
            offset=offset,
        )
    else:
        # Get all goals for all children
        all_goals = await goal_service.get_all_for_parent(
            parent_id=current_user.id,
            active_only=active_only,
        )
        total = len(all_goals)
        goals = all_goals[offset : offset + page_size]

    # Calculate progress for all goals in batch (avoids N+1)
    progress_map = await goal_service.calculate_progress_batch(goals)

    goals_with_progress: list[GoalWithProgress] = []
    for goal in goals:
        progress = progress_map.get(goal.id)
        if progress:
            goals_with_progress.append(
                GoalWithProgress(
                    **GoalResponse.model_validate(goal).model_dump(),
                    progress=progress,
                )
            )

    return GoalListResponse(
        goals=goals_with_progress,
        total=total,
    )


@router.post("/goals", response_model=GoalWithProgress, status_code=201)
async def create_goal(
    data: GoalCreate,
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> GoalWithProgress:
    """Create a new goal for a student.

    CRITICAL: Ownership verification - can only create goals for own children.

    Args:
        data: Goal creation data.
        current_user: The authenticated parent user.
        db: Database session.

    Returns:
        The created goal with initial progress.

    Raises:
        NotFoundError: If student not found.
        ForbiddenError: If user is not the parent.
    """
    goal_service = GoalService(db)
    student_service = StudentService(db)

    # Verify ownership
    student = await student_service.get_by_id_for_user(data.student_id, current_user.id)
    if not student:
        exists = await student_service.get_by_id(data.student_id)
        if exists:
            raise ForbiddenError("You cannot create goals for this student")
        raise NotFoundError(
            "Student",
            hint="Verify the student ID is correct and belongs to your account",
        )

    goal = await goal_service.create(current_user.id, data)
    progress = await goal_service.calculate_progress(goal)

    return GoalWithProgress(
        **GoalResponse.model_validate(goal).model_dump(),
        progress=progress,
    )


@router.get("/goals/{goal_id}", response_model=GoalWithProgress)
async def get_goal(
    goal_id: UUID,
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> GoalWithProgress:
    """Get a specific goal by ID.

    CRITICAL: Ownership verification - only the parent can access.

    Args:
        goal_id: The goal UUID.
        current_user: The authenticated parent user.
        db: Database session.

    Returns:
        The goal with current progress.

    Raises:
        NotFoundError: If goal not found.
    """
    goal_service = GoalService(db)

    result = await goal_service.get_with_progress(goal_id, current_user.id)
    if not result:
        raise NotFoundError(
            "Goal",
            hint="Verify the goal ID is correct and you have access to it",
        )

    goal, progress = result
    return GoalWithProgress(
        **GoalResponse.model_validate(goal).model_dump(),
        progress=progress,
    )


@router.put("/goals/{goal_id}", response_model=GoalWithProgress)
async def update_goal(
    goal_id: UUID,
    data: GoalUpdate,
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> GoalWithProgress:
    """Update a goal.

    CRITICAL: Ownership verification - only the parent can update.

    Args:
        goal_id: The goal UUID.
        data: Update data.
        current_user: The authenticated parent user.
        db: Database session.

    Returns:
        The updated goal with progress.

    Raises:
        NotFoundError: If goal not found.
    """
    goal_service = GoalService(db)

    goal = await goal_service.update(goal_id, current_user.id, data)
    if not goal:
        raise NotFoundError(
            "Goal",
            hint="Verify the goal ID is correct and you have access to it",
        )

    progress = await goal_service.calculate_progress(goal)

    return GoalWithProgress(
        **GoalResponse.model_validate(goal).model_dump(),
        progress=progress,
    )


@router.delete("/goals/{goal_id}", status_code=204)
async def delete_goal(
    goal_id: UUID,
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """Delete a goal.

    CRITICAL: Ownership verification - only the parent can delete.

    Args:
        goal_id: The goal UUID.
        current_user: The authenticated parent user.
        db: Database session.

    Raises:
        NotFoundError: If goal not found.
    """
    goal_service = GoalService(db)

    deleted = await goal_service.delete(goal_id, current_user.id)
    if not deleted:
        raise NotFoundError(
            "Goal",
            hint="Verify the goal ID is correct and you have access to it",
        )


@router.post("/goals/{goal_id}/check-achievement", response_model=GoalWithProgress)
async def check_goal_achievement(
    goal_id: UUID,
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> GoalWithProgress:
    """Check if a goal has been achieved and update status.

    This endpoint can be called to check if current progress
    meets or exceeds the goal target.

    Args:
        goal_id: The goal UUID.
        current_user: The authenticated parent user.
        db: Database session.

    Returns:
        The goal with updated achievement status.

    Raises:
        NotFoundError: If goal not found.
    """
    goal_service = GoalService(db)
    notification_service = NotificationService(db)

    result = await goal_service.get_with_progress(goal_id, current_user.id)
    if not result:
        raise NotFoundError(
            "Goal",
            hint="Verify the goal ID is correct and you have access to it",
        )

    goal, _ = result

    # Check and mark if achieved
    newly_achieved = await goal_service.check_and_mark_achieved(
        goal_id, current_user.id
    )

    if newly_achieved:
        # Create achievement notification
        await notification_service.notify_goal_achieved(
            parent_id=current_user.id,
            student_id=goal.student_id,
            goal_id=goal.id,
            goal_title=goal.title,
            reward=goal.reward,
        )

    # Get updated progress
    progress = await goal_service.calculate_progress(goal)

    return GoalWithProgress(
        **GoalResponse.model_validate(goal).model_dump(),
        progress=progress,
    )


# =============================================================================
# Notifications
# =============================================================================


@router.get("/notifications", response_model=NotificationListResponse)
async def list_notifications(
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    unread_only: bool = Query(False, description="Only return unread notifications."),
    notification_type: str | None = Query(None, description="Filter by type."),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
) -> NotificationListResponse:
    """List notifications for the current user.

    Args:
        current_user: The authenticated parent user.
        db: Database session.
        unread_only: Whether to filter to unread only.
        notification_type: Optional filter by notification type.
        page: Page number (1-indexed).
        page_size: Items per page.

    Returns:
        Paginated list of notifications with counts.
    """
    notification_service = NotificationService(db)

    offset = (page - 1) * page_size

    notifications, total, unread_count = await notification_service.get_for_user(
        user_id=current_user.id,
        unread_only=unread_only,
        notification_type=notification_type,
        limit=page_size,
        offset=offset,
    )

    return NotificationListResponse(
        notifications=[
            NotificationResponse.model_validate(n) for n in notifications
        ],
        total=total,
        unread_count=unread_count,
    )


@router.post("/notifications/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: UUID,
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> NotificationResponse:
    """Mark a notification as read.

    Args:
        notification_id: The notification UUID.
        current_user: The authenticated parent user.
        db: Database session.

    Returns:
        The updated notification.

    Raises:
        NotFoundError: If notification not found.
    """
    notification_service = NotificationService(db)

    success = await notification_service.mark_read(notification_id, current_user.id)
    if not success:
        raise NotFoundError(
            "Notification",
            hint="Verify the notification ID is correct and belongs to your account",
        )

    notification = await notification_service.get_by_id(
        notification_id, current_user.id
    )
    return NotificationResponse.model_validate(notification)


@router.post("/notifications/read-all", status_code=200)
async def mark_all_notifications_read(
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, int]:
    """Mark all notifications as read.

    Args:
        current_user: The authenticated parent user.
        db: Database session.

    Returns:
        Number of notifications marked as read.
    """
    notification_service = NotificationService(db)

    count = await notification_service.mark_all_read(current_user.id)

    return {"marked_read": count}


# =============================================================================
# Notification Preferences
# =============================================================================


@router.get("/notification-preferences", response_model=NotificationPreferencesResponse)
async def get_notification_preferences(
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> NotificationPreferencesResponse:
    """Get notification preferences for the current user.

    Returns default preferences if none have been set.

    Args:
        current_user: The authenticated parent user.
        db: Database session.

    Returns:
        Current notification preferences.
    """
    notification_service = NotificationService(db)

    prefs = await notification_service.get_or_create_preferences(current_user.id)

    return NotificationPreferencesResponse.model_validate(prefs)


@router.put("/notification-preferences", response_model=NotificationPreferencesResponse)
async def update_notification_preferences(
    data: NotificationPreferencesUpdate,
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> NotificationPreferencesResponse:
    """Update notification preferences.

    Args:
        data: Preference updates.
        current_user: The authenticated parent user.
        db: Database session.

    Returns:
        Updated notification preferences.
    """
    notification_service = NotificationService(db)

    prefs = await notification_service.update_preferences(current_user.id, data)

    return NotificationPreferencesResponse.model_validate(prefs)
