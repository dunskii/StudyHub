"""Gamification API endpoints.

Provides endpoints for XP, levels, achievements, streaks, and subject progress.
"""
from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.gamification import AchievementCategory
from app.core.database import get_db
from app.core.security import AuthenticatedUser
from app.models.student import Student
from app.models.user import User
from app.schemas.gamification import (
    Achievement,
    AchievementDefinitionResponse,
    AchievementWithProgress,
    GamificationStats,
    GamificationStatsDetailed,
    LevelInfo,
    ParentGamificationSummary,
    StreakInfo,
    SubjectLevelInfo,
)
from app.services.gamification_service import GamificationService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/gamification", tags=["gamification"])


# =============================================================================
# Authentication Helpers
# =============================================================================


async def verify_student_access(
    student_id: UUID,
    current_user: AuthenticatedUser,
    db: AsyncSession,
) -> Student:
    """Verify that the current user has access to the student.

    Args:
        student_id: Student UUID.
        current_user: Authenticated user from JWT.
        db: Database session.

    Returns:
        Student if access granted.

    Raises:
        HTTPException: If student not found or access denied.
    """
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    # Verify that current user owns this student
    if student.parent_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own students",
        )

    return student


# =============================================================================
# Student Endpoints
# =============================================================================


@router.get("/students/{student_id}/stats", response_model=GamificationStats)
async def get_gamification_stats(
    student_id: UUID,
    current_user: AuthenticatedUser,
    db: AsyncSession = Depends(get_db),
) -> GamificationStats:
    """Get gamification stats for a student.

    Returns XP, level, streak, and achievement summary.
    """
    student = await verify_student_access(student_id, current_user, db)
    service = GamificationService(db)
    try:
        return await service.get_stats(student.id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/students/{student_id}/stats/detailed", response_model=GamificationStatsDetailed)
async def get_detailed_gamification_stats(
    student_id: UUID,
    current_user: AuthenticatedUser,
    db: AsyncSession = Depends(get_db),
) -> GamificationStatsDetailed:
    """Get detailed gamification stats including all achievements and subjects."""
    student = await verify_student_access(student_id, current_user, db)
    service = GamificationService(db)
    try:
        return await service.get_detailed_stats(student.id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/students/{student_id}/level", response_model=LevelInfo)
async def get_level_info(
    student_id: UUID,
    current_user: AuthenticatedUser,
    db: AsyncSession = Depends(get_db),
) -> LevelInfo:
    """Get current level information."""
    student = await verify_student_access(student_id, current_user, db)
    service = GamificationService(db)
    try:
        return await service.get_level_info(student.id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/students/{student_id}/streak", response_model=StreakInfo)
async def get_streak_info(
    student_id: UUID,
    current_user: AuthenticatedUser,
    db: AsyncSession = Depends(get_db),
) -> StreakInfo:
    """Get current streak information."""
    student = await verify_student_access(student_id, current_user, db)
    service = GamificationService(db)
    try:
        return await service.get_streak_info(student.id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/students/{student_id}/achievements", response_model=list[AchievementWithProgress])
async def get_achievements(
    student_id: UUID,
    current_user: AuthenticatedUser,
    db: AsyncSession = Depends(get_db),
    category: AchievementCategory | None = Query(None, description="Filter by category"),
) -> list[AchievementWithProgress]:
    """Get all achievements with progress for a student.

    Returns both locked and unlocked achievements.
    """
    student = await verify_student_access(student_id, current_user, db)
    service = GamificationService(db)
    achievements = await service.get_achievements(student.id, include_locked=True)

    # Filter by category if specified
    if category:
        achievements = [a for a in achievements if a.category == category]

    return achievements


@router.get("/students/{student_id}/achievements/unlocked", response_model=list[Achievement])
async def get_unlocked_achievements(
    student_id: UUID,
    current_user: AuthenticatedUser,
    db: AsyncSession = Depends(get_db),
) -> list[Achievement]:
    """Get only unlocked achievements for a student."""
    student = await verify_student_access(student_id, current_user, db)
    service = GamificationService(db)
    return await service.achievement_service.get_unlocked_achievements(student.id)


@router.get("/achievements/definitions", response_model=list[AchievementDefinitionResponse])
async def get_achievement_definitions(
    current_user: AuthenticatedUser,
    db: AsyncSession = Depends(get_db),
    category: AchievementCategory | None = Query(None, description="Filter by category"),
    subject_code: str | None = Query(None, description="Filter by subject code"),
) -> list[AchievementDefinitionResponse]:
    """Get all available achievement definitions.

    Requires authentication. Returns definitions without exposing internal requirements
    for unlocked achievements to prevent gaming the system.
    """
    from app.services.achievement_service import AchievementService
    service = AchievementService(db)
    return await service.get_all_definitions(
        category=category,
        subject_code=subject_code,
    )


@router.get("/students/{student_id}/subjects", response_model=list[SubjectLevelInfo])
async def get_subject_progress(
    student_id: UUID,
    current_user: AuthenticatedUser,
    db: AsyncSession = Depends(get_db),
) -> list[SubjectLevelInfo]:
    """Get XP and level for all enrolled subjects."""
    student = await verify_student_access(student_id, current_user, db)
    service = GamificationService(db)
    return await service.get_subject_stats(student.id)


@router.get("/students/{student_id}/subjects/{subject_id}", response_model=SubjectLevelInfo)
async def get_subject_progress_by_id(
    student_id: UUID,
    subject_id: UUID,
    current_user: AuthenticatedUser,
    db: AsyncSession = Depends(get_db),
) -> SubjectLevelInfo:
    """Get XP and level for a specific subject."""
    student = await verify_student_access(student_id, current_user, db)
    from app.services.level_service import LevelService
    service = LevelService(db)
    result = await service.get_subject_level_info(student.id, subject_id)
    if not result:
        raise HTTPException(
            status_code=404,
            detail="Subject not found or student not enrolled",
        )
    return result


# =============================================================================
# Parent Endpoints
# =============================================================================


@router.get(
    "/parent/students/{student_id}",
    response_model=ParentGamificationSummary,
)
async def get_child_gamification_summary(
    student_id: UUID,
    current_user: AuthenticatedUser,
    db: AsyncSession = Depends(get_db),
) -> ParentGamificationSummary:
    """Get gamification summary for a child (parent view).

    Parents can only view their own children's data.
    """
    student = await verify_student_access(student_id, current_user, db)
    service = GamificationService(db)
    return await service.get_parent_summary(student.id, student.display_name)


@router.get(
    "/parent/students/{student_id}/achievements",
    response_model=list[Achievement],
)
async def get_child_achievements(
    student_id: UUID,
    current_user: AuthenticatedUser,
    db: AsyncSession = Depends(get_db),
) -> list[Achievement]:
    """Get all unlocked achievements for a child (parent view)."""
    student = await verify_student_access(student_id, current_user, db)
    from app.services.achievement_service import AchievementService
    service = AchievementService(db)
    return await service.get_unlocked_achievements(student.id)


@router.get(
    "/parent/students/{student_id}/subjects",
    response_model=list[SubjectLevelInfo],
)
async def get_child_subject_progress(
    student_id: UUID,
    current_user: AuthenticatedUser,
    db: AsyncSession = Depends(get_db),
) -> list[SubjectLevelInfo]:
    """Get subject progress for a child (parent view)."""
    student = await verify_student_access(student_id, current_user, db)
    from app.services.level_service import LevelService
    service = LevelService(db)
    return await service.get_all_subject_levels(student.id)
