"""Pydantic schemas for gamification.

Defines request/response schemas for XP, levels, achievements, and streaks.
"""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.config.gamification import AchievementCategory


# =============================================================================
# Streak Schemas
# =============================================================================


class StreakInfo(BaseModel):
    """Information about a student's study streak."""

    current: int = Field(..., ge=0, description="Current streak in days")
    longest: int = Field(..., ge=0, description="Longest streak ever achieved")
    last_active_date: str | None = Field(
        None, description="Date of last activity (YYYY-MM-DD)"
    )
    multiplier: float = Field(
        1.0, ge=1.0, le=2.0, description="Current XP multiplier from streak"
    )
    next_milestone: int | None = Field(
        None, description="Next streak milestone to achieve"
    )
    days_to_milestone: int | None = Field(
        None, description="Days until next milestone"
    )


# =============================================================================
# Level Schemas
# =============================================================================


class LevelInfo(BaseModel):
    """Information about a student's level."""

    level: int = Field(..., ge=1, le=20, description="Current level")
    title: str = Field(..., description="Title for current level")
    current_xp: int = Field(..., ge=0, description="Current total XP")
    level_start_xp: int = Field(..., ge=0, description="XP at start of current level")
    next_level_xp: int | None = Field(
        None, description="XP required for next level (None if max level)"
    )
    progress_percent: Decimal = Field(
        ..., ge=0, le=100, description="Progress to next level as percentage"
    )
    is_max_level: bool = Field(False, description="Whether at maximum level")


class SubjectLevelInfo(BaseModel):
    """Level information for a specific subject."""

    subject_id: UUID
    subject_code: str
    subject_name: str
    xp_earned: int = Field(..., ge=0, description="XP earned in this subject")
    level: int = Field(..., ge=1, description="Level in this subject")
    title: str = Field(..., description="Subject-specific level title")
    progress_percent: Decimal = Field(
        ..., ge=0, le=100, description="Progress to next level"
    )


# =============================================================================
# Achievement Schemas
# =============================================================================


class AchievementDefinitionResponse(BaseModel):
    """Achievement definition (what can be earned)."""

    code: str = Field(..., description="Unique achievement code")
    name: str = Field(..., max_length=100, description="Achievement name")
    description: str = Field(..., max_length=500, description="Achievement description")
    category: AchievementCategory = Field(..., description="Achievement category")
    subject_code: str | None = Field(None, description="Subject code if subject-specific")
    xp_reward: int = Field(..., ge=0, description="XP awarded when unlocked")
    icon: str = Field(..., description="Icon name (Lucide icon)")


class Achievement(BaseModel):
    """An unlocked achievement."""

    code: str = Field(..., description="Unique achievement code")
    name: str = Field(..., description="Achievement name")
    description: str = Field(..., description="Achievement description")
    category: AchievementCategory = Field(..., description="Achievement category")
    subject_code: str | None = Field(None, description="Subject code if subject-specific")
    icon: str = Field(..., description="Icon name")
    xp_reward: int = Field(..., ge=0, description="XP awarded")
    unlocked_at: datetime = Field(..., description="When the achievement was unlocked")


class AchievementWithProgress(BaseModel):
    """Achievement with progress information (locked or unlocked)."""

    code: str
    name: str
    description: str
    category: AchievementCategory
    subject_code: str | None = None
    icon: str
    xp_reward: int
    is_unlocked: bool = False
    unlocked_at: datetime | None = None
    progress_percent: Decimal = Field(
        Decimal("0"), ge=0, le=100, description="Progress towards unlocking"
    )
    progress_text: str | None = Field(
        None, description="Human-readable progress (e.g., '7/10 sessions')"
    )


# =============================================================================
# XP Event Schemas
# =============================================================================


class XPEvent(BaseModel):
    """Record of XP earned."""

    amount: int = Field(..., description="Base XP amount")
    final_amount: int = Field(..., description="XP after multipliers")
    source: str = Field(..., description="Activity that earned XP")
    multiplier: float = Field(1.0, description="Streak multiplier applied")
    timestamp: datetime = Field(..., description="When XP was earned")
    subject_id: UUID | None = Field(None, description="Subject if applicable")
    session_id: UUID | None = Field(None, description="Session if applicable")


class XPAwardResponse(BaseModel):
    """Response when XP is awarded."""

    xp_earned: int = Field(..., description="XP earned (after multipliers)")
    new_total_xp: int = Field(..., description="New total XP")
    streak_multiplier: float = Field(..., description="Multiplier applied")
    level_up: bool = Field(False, description="Whether student levelled up")
    new_level: int | None = Field(None, description="New level if levelled up")
    achievements_unlocked: list[str] = Field(
        default_factory=list, description="Achievement codes unlocked"
    )


# =============================================================================
# Gamification Stats Schemas
# =============================================================================


class GamificationStats(BaseModel):
    """Complete gamification stats for a student."""

    # Core stats
    total_xp: int = Field(..., ge=0, description="Total XP earned")
    level: int = Field(..., ge=1, le=20, description="Current level")
    level_title: str = Field(..., description="Title for current level")
    level_progress_percent: Decimal = Field(
        ..., ge=0, le=100, description="Progress to next level"
    )
    next_level_xp: int | None = Field(None, description="XP for next level")

    # Streak info
    streak: StreakInfo

    # Achievement summary
    achievements_unlocked: int = Field(..., ge=0, description="Number of achievements")
    achievements_total: int = Field(..., ge=0, description="Total achievements available")
    recent_achievements: list[Achievement] = Field(
        default_factory=list, description="Recently unlocked achievements"
    )

    # Subject stats (summary)
    subjects_with_progress: int = Field(
        ..., ge=0, description="Number of subjects with XP"
    )


class GamificationStatsDetailed(GamificationStats):
    """Extended gamification stats with full details."""

    # Full achievement list
    achievements: list[AchievementWithProgress] = Field(
        default_factory=list, description="All achievements with progress"
    )

    # Subject breakdown
    subject_stats: list[SubjectLevelInfo] = Field(
        default_factory=list, description="XP and level per subject"
    )

    # Recent activity
    recent_xp_events: list[XPEvent] = Field(
        default_factory=list, description="Recent XP events"
    )


# =============================================================================
# Parent Dashboard Schemas
# =============================================================================


class ParentGamificationSummary(BaseModel):
    """Gamification summary for parent dashboard."""

    student_id: UUID
    student_name: str
    total_xp: int
    level: int
    level_title: str
    streak_current: int
    streak_longest: int
    achievements_unlocked: int
    achievements_total: int
    recent_achievements: list[Achievement] = Field(default_factory=list)
    level_progress_percent: Decimal


# =============================================================================
# Update Schemas (for internal use)
# =============================================================================


class GamificationUpdate(BaseModel):
    """Internal schema for updating gamification data."""

    xp_delta: int = 0
    new_streak: int | None = None
    new_achievements: list[str] = Field(default_factory=list)
    level_up: bool = False
    new_level: int | None = None


class SessionGamificationResult(BaseModel):
    """Result of processing gamification for a completed session."""

    xp_earned: int
    streak_updated: bool
    new_streak: int
    achievements_unlocked: list[Achievement]
    level_up: bool
    new_level: int | None = None
    new_level_title: str | None = None
