"""Gamification configuration.

Defines XP rules, level thresholds, streak multipliers, and achievement definitions.
All gamification parameters are centralised here for easy tuning.
"""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any


class ActivityType(str, Enum):
    """Types of activities that earn XP."""

    FLASHCARD_REVIEW = "flashcard_review"
    FLASHCARD_CORRECT = "flashcard_correct"
    TUTOR_SESSION = "tutor_session"
    TUTOR_MESSAGE = "tutor_message"
    NOTE_UPLOAD = "note_upload"
    NOTE_OCR_COMPLETE = "note_ocr_complete"
    SESSION_COMPLETE = "session_complete"
    PERFECT_SESSION = "perfect_session"  # 100% correct in a session
    OUTCOME_MASTERED = "outcome_mastered"
    DAILY_LOGIN = "daily_login"


class AchievementCategory(str, Enum):
    """Categories for achievements."""

    ENGAGEMENT = "engagement"  # Streaks, daily activity
    CURRICULUM = "curriculum"  # Mastering outcomes, subjects
    MILESTONE = "milestone"  # Level milestones, XP milestones
    SUBJECT = "subject"  # Subject-specific achievements
    CHALLENGE = "challenge"  # Special challenges (perfect sessions, etc.)


@dataclass
class XPRule:
    """Rule for XP award."""

    base_xp: int
    description: str
    max_per_day: int | None = None  # Optional daily cap


# XP Rules - how much XP each activity earns
XP_RULES: dict[ActivityType, XPRule] = {
    ActivityType.FLASHCARD_REVIEW: XPRule(
        base_xp=5,
        description="XP per flashcard reviewed",
        max_per_day=500,  # Cap at 100 cards/day
    ),
    ActivityType.FLASHCARD_CORRECT: XPRule(
        base_xp=5,
        description="Bonus XP for correct answer",
        max_per_day=500,
    ),
    ActivityType.TUTOR_SESSION: XPRule(
        base_xp=50,
        description="XP for completing a tutor session",
        max_per_day=300,
    ),
    ActivityType.TUTOR_MESSAGE: XPRule(
        base_xp=10,
        description="XP per meaningful tutor exchange",
        max_per_day=200,
    ),
    ActivityType.NOTE_UPLOAD: XPRule(
        base_xp=25,
        description="XP for uploading a study note",
        max_per_day=100,
    ),
    ActivityType.NOTE_OCR_COMPLETE: XPRule(
        base_xp=10,
        description="Bonus XP when OCR completes on note",
        max_per_day=100,
    ),
    ActivityType.SESSION_COMPLETE: XPRule(
        base_xp=25,
        description="XP for completing any study session",
        max_per_day=200,
    ),
    ActivityType.PERFECT_SESSION: XPRule(
        base_xp=50,
        description="Bonus XP for 100% correct session",
        max_per_day=150,
    ),
    ActivityType.OUTCOME_MASTERED: XPRule(
        base_xp=100,
        description="XP for mastering a curriculum outcome",
        max_per_day=None,  # No cap - this is a real achievement
    ),
    ActivityType.DAILY_LOGIN: XPRule(
        base_xp=10,
        description="XP for daily study activity",
        max_per_day=10,  # Once per day
    ),
}


# Level thresholds - XP required to reach each level
# Using a slightly exponential curve for satisfying progression
LEVEL_THRESHOLDS: list[int] = [
    0,       # Level 1
    100,     # Level 2
    250,     # Level 3
    500,     # Level 4
    850,     # Level 5
    1300,    # Level 6
    1900,    # Level 7
    2600,    # Level 8
    3500,    # Level 9
    4600,    # Level 10
    5900,    # Level 11
    7500,    # Level 12
    9400,    # Level 13
    11600,   # Level 14
    14200,   # Level 15
    17200,   # Level 16
    20700,   # Level 17
    24700,   # Level 18
    29300,   # Level 19
    34500,   # Level 20
]

MAX_LEVEL = len(LEVEL_THRESHOLDS)


# Level titles - educational progression themed
LEVEL_TITLES: dict[int, str] = {
    1: "Beginner",
    2: "Learner",
    3: "Student",
    4: "Apprentice",
    5: "Scholar",
    6: "Dedicated Scholar",
    7: "Keen Scholar",
    8: "Junior Researcher",
    9: "Researcher",
    10: "Senior Researcher",
    11: "Junior Expert",
    12: "Expert",
    13: "Senior Expert",
    14: "Master",
    15: "Senior Master",
    16: "Distinguished Scholar",
    17: "Academic",
    18: "Senior Academic",
    19: "Learning Legend",
    20: "Supreme Scholar",
}

# Subject-specific level titles
SUBJECT_LEVEL_TITLES: dict[str, dict[int, str]] = {
    "MATH": {
        1: "Number Novice",
        5: "Problem Solver",
        10: "Mathematics Explorer",
        15: "Mathematics Master",
        20: "Mathematics Virtuoso",
    },
    "ENG": {
        1: "Word Collector",
        5: "Story Weaver",
        10: "Literary Analyst",
        15: "Writing Master",
        20: "Literary Virtuoso",
    },
    "SCI": {
        1: "Curious Explorer",
        5: "Junior Scientist",
        10: "Science Investigator",
        15: "Senior Scientist",
        20: "Science Virtuoso",
    },
    "HSIE": {
        1: "History Seeker",
        5: "Time Traveller",
        10: "History Detective",
        15: "History Master",
        20: "History Virtuoso",
    },
    "PDHPE": {
        1: "Health Beginner",
        5: "Wellness Explorer",
        10: "Health Champion",
        15: "Wellness Master",
        20: "Health Virtuoso",
    },
    "TAS": {
        1: "Tech Tinkerer",
        5: "Problem Designer",
        10: "Technology Builder",
        15: "Tech Master",
        20: "Technology Virtuoso",
    },
    "CA": {
        1: "Creative Spark",
        5: "Artistic Explorer",
        10: "Creative Talent",
        15: "Creative Master",
        20: "Artistic Virtuoso",
    },
    "LANG": {
        1: "Language Beginner",
        5: "Conversation Starter",
        10: "Language Explorer",
        15: "Language Master",
        20: "Polyglot",
    },
}


# Streak multipliers - bonus XP based on consecutive study days
STREAK_MULTIPLIERS: dict[int, float] = {
    0: 1.0,    # No streak
    1: 1.0,    # 1 day (starting)
    3: 1.05,   # 3 days: 5% bonus
    7: 1.10,   # 1 week: 10% bonus
    14: 1.15,  # 2 weeks: 15% bonus
    30: 1.20,  # 1 month: 20% bonus
    60: 1.30,  # 2 months: 30% bonus
    90: 1.40,  # 3 months: 40% bonus
    180: 1.50, # 6 months: 50% bonus (max)
}

# Streak milestones that trigger notifications/achievements
STREAK_MILESTONES: list[int] = [3, 7, 14, 30, 60, 90, 100, 180, 365]


# Achievement definitions - seeded to database
# Format: (code, name, description, category, subject_code, requirements, xp_reward, icon)
ACHIEVEMENT_DEFINITIONS: list[dict[str, Any]] = [
    # Engagement achievements
    {
        "code": "first_session",
        "name": "First Steps",
        "description": "Complete your first study session",
        "category": AchievementCategory.ENGAGEMENT,
        "subject_code": None,
        "requirements": {"sessions_completed": 1},
        "xp_reward": 50,
        "icon": "rocket",
    },
    {
        "code": "streak_3",
        "name": "Getting Started",
        "description": "Study for 3 days in a row",
        "category": AchievementCategory.ENGAGEMENT,
        "subject_code": None,
        "requirements": {"streak_days": 3},
        "xp_reward": 50,
        "icon": "flame",
    },
    {
        "code": "streak_7",
        "name": "Week Warrior",
        "description": "Study for 7 days in a row",
        "category": AchievementCategory.ENGAGEMENT,
        "subject_code": None,
        "requirements": {"streak_days": 7},
        "xp_reward": 100,
        "icon": "flame",
    },
    {
        "code": "streak_30",
        "name": "Monthly Master",
        "description": "Study for 30 days in a row",
        "category": AchievementCategory.ENGAGEMENT,
        "subject_code": None,
        "requirements": {"streak_days": 30},
        "xp_reward": 300,
        "icon": "flame",
    },
    {
        "code": "streak_100",
        "name": "Century Club",
        "description": "Study for 100 days in a row",
        "category": AchievementCategory.ENGAGEMENT,
        "subject_code": None,
        "requirements": {"streak_days": 100},
        "xp_reward": 1000,
        "icon": "trophy",
    },
    # Milestone achievements
    {
        "code": "level_5",
        "name": "Rising Scholar",
        "description": "Reach level 5",
        "category": AchievementCategory.MILESTONE,
        "subject_code": None,
        "requirements": {"level": 5},
        "xp_reward": 100,
        "icon": "star",
    },
    {
        "code": "level_10",
        "name": "Dedicated Learner",
        "description": "Reach level 10",
        "category": AchievementCategory.MILESTONE,
        "subject_code": None,
        "requirements": {"level": 10},
        "xp_reward": 250,
        "icon": "star",
    },
    {
        "code": "level_20",
        "name": "Supreme Scholar",
        "description": "Reach the maximum level",
        "category": AchievementCategory.MILESTONE,
        "subject_code": None,
        "requirements": {"level": 20},
        "xp_reward": 1000,
        "icon": "crown",
    },
    {
        "code": "xp_1000",
        "name": "XP Collector",
        "description": "Earn 1,000 total XP",
        "category": AchievementCategory.MILESTONE,
        "subject_code": None,
        "requirements": {"total_xp": 1000},
        "xp_reward": 50,
        "icon": "zap",
    },
    {
        "code": "xp_10000",
        "name": "XP Champion",
        "description": "Earn 10,000 total XP",
        "category": AchievementCategory.MILESTONE,
        "subject_code": None,
        "requirements": {"total_xp": 10000},
        "xp_reward": 250,
        "icon": "zap",
    },
    # Curriculum achievements
    {
        "code": "first_outcome",
        "name": "First Mastery",
        "description": "Master your first curriculum outcome",
        "category": AchievementCategory.CURRICULUM,
        "subject_code": None,
        "requirements": {"outcomes_mastered": 1},
        "xp_reward": 100,
        "icon": "check-circle",
    },
    {
        "code": "outcomes_10",
        "name": "Outcome Explorer",
        "description": "Master 10 curriculum outcomes",
        "category": AchievementCategory.CURRICULUM,
        "subject_code": None,
        "requirements": {"outcomes_mastered": 10},
        "xp_reward": 250,
        "icon": "check-circle",
    },
    {
        "code": "outcomes_50",
        "name": "Curriculum Champion",
        "description": "Master 50 curriculum outcomes",
        "category": AchievementCategory.CURRICULUM,
        "subject_code": None,
        "requirements": {"outcomes_mastered": 50},
        "xp_reward": 500,
        "icon": "award",
    },
    # Challenge achievements
    {
        "code": "perfect_session",
        "name": "Perfect Session",
        "description": "Get 100% correct in a revision session",
        "category": AchievementCategory.CHALLENGE,
        "subject_code": None,
        "requirements": {"perfect_sessions": 1},
        "xp_reward": 75,
        "icon": "target",
    },
    {
        "code": "perfect_10",
        "name": "Perfectionist",
        "description": "Get 10 perfect revision sessions",
        "category": AchievementCategory.CHALLENGE,
        "subject_code": None,
        "requirements": {"perfect_sessions": 10},
        "xp_reward": 200,
        "icon": "target",
    },
    {
        "code": "flashcards_100",
        "name": "Flashcard Enthusiast",
        "description": "Review 100 flashcards",
        "category": AchievementCategory.CHALLENGE,
        "subject_code": None,
        "requirements": {"flashcards_reviewed": 100},
        "xp_reward": 100,
        "icon": "layers",
    },
    {
        "code": "flashcards_1000",
        "name": "Flashcard Master",
        "description": "Review 1,000 flashcards",
        "category": AchievementCategory.CHALLENGE,
        "subject_code": None,
        "requirements": {"flashcards_reviewed": 1000},
        "xp_reward": 500,
        "icon": "layers",
    },
    # Subject-specific achievements (examples for MATH)
    {
        "code": "math_explorer",
        "name": "Mathematics Explorer",
        "description": "Complete 10 Mathematics study sessions",
        "category": AchievementCategory.SUBJECT,
        "subject_code": "MATH",
        "requirements": {"subject_sessions": 10},
        "xp_reward": 150,
        "icon": "calculator",
    },
    {
        "code": "eng_explorer",
        "name": "Literary Explorer",
        "description": "Complete 10 English study sessions",
        "category": AchievementCategory.SUBJECT,
        "subject_code": "ENG",
        "requirements": {"subject_sessions": 10},
        "xp_reward": 150,
        "icon": "book-open",
    },
    {
        "code": "sci_explorer",
        "name": "Science Explorer",
        "description": "Complete 10 Science study sessions",
        "category": AchievementCategory.SUBJECT,
        "subject_code": "SCI",
        "requirements": {"subject_sessions": 10},
        "xp_reward": 150,
        "icon": "flask-conical",
    },
]


def get_streak_multiplier(streak_days: int) -> float:
    """Get the XP multiplier for a given streak length.

    Args:
        streak_days: Number of consecutive study days.

    Returns:
        The XP multiplier (1.0 to 1.5).
    """
    multiplier = 1.0
    for threshold, mult in sorted(STREAK_MULTIPLIERS.items()):
        if streak_days >= threshold:
            multiplier = mult
        else:
            break
    return multiplier


def get_level_for_xp(total_xp: int) -> int:
    """Calculate level for a given XP amount.

    Args:
        total_xp: Total XP earned.

    Returns:
        The level (1 to MAX_LEVEL).
    """
    level = 1
    for i, threshold in enumerate(LEVEL_THRESHOLDS):
        if total_xp >= threshold:
            level = i + 1
        else:
            break
    return min(level, MAX_LEVEL)


def get_xp_for_next_level(current_level: int) -> int | None:
    """Get XP required for next level.

    Args:
        current_level: Current level.

    Returns:
        XP threshold for next level, or None if at max level.
    """
    if current_level >= MAX_LEVEL:
        return None
    return LEVEL_THRESHOLDS[current_level]


def get_level_title(level: int, subject_code: str | None = None) -> str:
    """Get the title for a level.

    Args:
        level: The level number.
        subject_code: Optional subject code for subject-specific title.

    Returns:
        The level title string.
    """
    # Try subject-specific title first
    if subject_code and subject_code in SUBJECT_LEVEL_TITLES:
        subject_titles = SUBJECT_LEVEL_TITLES[subject_code]
        # Find the highest matching threshold
        title = None
        for threshold, t in sorted(subject_titles.items()):
            if level >= threshold:
                title = t
            else:
                break
        if title:
            return title

    # Fall back to global title
    return LEVEL_TITLES.get(level, LEVEL_TITLES[1])


def get_xp_for_activity(activity_type: ActivityType) -> int:
    """Get base XP for an activity type.

    Args:
        activity_type: The type of activity.

    Returns:
        Base XP amount for the activity.
    """
    rule = XP_RULES.get(activity_type)
    return rule.base_xp if rule else 0
