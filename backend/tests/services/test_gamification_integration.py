"""
Integration tests for gamification services.

These tests use a real database connection to verify JSONB queries,
aggregation logic, and data persistence work correctly with PostgreSQL.
"""

import pytest
import pytest_asyncio
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.session import Session
from app.models.student import Student
from app.models.student_subject import StudentSubject
from app.services.xp_service import XPService
from app.services.achievement_service import AchievementService
from app.config.gamification import ActivityType


# =============================================================================
# Integration Test Fixtures
# =============================================================================


@pytest_asyncio.fixture
async def integration_student(
    db_session: AsyncSession,
    sample_user,
    sample_framework,
) -> Student:
    """Create a student with gamification data for integration tests."""
    student = Student(
        id=uuid4(),
        parent_id=sample_user.id,
        display_name="Integration Test Student",
        grade_level=5,
        school_stage="S3",
        framework_id=sample_framework.id,
        preferences={},
        gamification={
            "totalXP": 100,
            "level": 2,
            "achievements": [],
            "streaks": {
                "current": 3,
                "longest": 5,
                "lastActiveDate": date.today().isoformat(),
            },
            "dailyXPEarned": {},
        },
    )
    db_session.add(student)
    await db_session.commit()
    await db_session.refresh(student)
    return student


@pytest_asyncio.fixture
async def integration_sessions(
    db_session: AsyncSession,
    integration_student: Student,
    sample_subject,
) -> list[Session]:
    """Create various session types for testing perfect session queries."""
    sessions = []
    now = datetime.now(timezone.utc)
    # ended_at uses DateTime without timezone, so use naive datetime
    now_naive = datetime.now()

    # Perfect revision session (10/10 correct)
    perfect_session = Session(
        id=uuid4(),
        student_id=integration_student.id,
        subject_id=sample_subject.id,
        session_type="revision",
        started_at=now - timedelta(hours=2),
        ended_at=now_naive - timedelta(hours=1, minutes=45),
        duration_minutes=15,
        xp_earned=75,
        data={
            "questionsAttempted": 10,
            "questionsCorrect": 10,
            "flashcardsReviewed": 5,
        },
    )
    sessions.append(perfect_session)

    # Another perfect revision session (5/5 correct)
    perfect_session_2 = Session(
        id=uuid4(),
        student_id=integration_student.id,
        subject_id=sample_subject.id,
        session_type="revision",
        started_at=now - timedelta(hours=1),
        ended_at=now_naive - timedelta(minutes=45),
        duration_minutes=15,
        xp_earned=60,
        data={
            "questionsAttempted": 5,
            "questionsCorrect": 5,
            "flashcardsReviewed": 3,
        },
    )
    sessions.append(perfect_session_2)

    # Imperfect revision session (7/10 correct)
    imperfect_session = Session(
        id=uuid4(),
        student_id=integration_student.id,
        subject_id=sample_subject.id,
        session_type="revision",
        started_at=now - timedelta(minutes=30),
        ended_at=now_naive - timedelta(minutes=10),
        duration_minutes=20,
        xp_earned=50,
        data={
            "questionsAttempted": 10,
            "questionsCorrect": 7,
            "flashcardsReviewed": 8,
        },
    )
    sessions.append(imperfect_session)

    # Tutor session (not counted for perfect sessions)
    tutor_session = Session(
        id=uuid4(),
        student_id=integration_student.id,
        subject_id=sample_subject.id,
        session_type="tutor_chat",
        started_at=now - timedelta(hours=3),
        ended_at=now_naive - timedelta(hours=2, minutes=30),
        duration_minutes=30,
        xp_earned=80,
        data={
            "questionsAttempted": 0,
            "questionsCorrect": 0,
            "messagesExchanged": 15,
        },
    )
    sessions.append(tutor_session)

    # Empty revision session (0 questions - not counted)
    empty_session = Session(
        id=uuid4(),
        student_id=integration_student.id,
        subject_id=sample_subject.id,
        session_type="revision",
        started_at=now - timedelta(hours=4),
        ended_at=now_naive - timedelta(hours=3, minutes=50),
        duration_minutes=10,
        xp_earned=25,
        data={
            "questionsAttempted": 0,
            "questionsCorrect": 0,
            "flashcardsReviewed": 10,
        },
    )
    sessions.append(empty_session)

    for session in sessions:
        db_session.add(session)
    await db_session.commit()

    for session in sessions:
        await db_session.refresh(session)

    return sessions


@pytest_asyncio.fixture
async def integration_student_subjects(
    db_session: AsyncSession,
    integration_student: Student,
    sample_subjects: list,
) -> list[StudentSubject]:
    """Create student subject enrolments with outcomes for testing."""
    student_subjects = []
    now = datetime.now(timezone.utc)

    outcomes_data = [
        # MATH - 3 outcomes
        ["MA3-RN-01", "MA3-RN-02", "MA3-MR-01"],
        # ENG - 2 outcomes
        ["EN3-VOCAB-01", "EN3-SPELL-01"],
        # SCI - 2 outcomes (1 would duplicate if we allowed it)
        ["SC3-WS-01", "SC3-LW-01"],
    ]

    for i, subject in enumerate(sample_subjects):
        student_subject = StudentSubject(
            id=uuid4(),
            student_id=integration_student.id,
            subject_id=subject.id,
            pathway=None,
            progress={
                "outcomesCompleted": outcomes_data[i],
                "outcomesInProgress": [],
                "overallPercentage": (i + 1) * 20,
                "lastActivity": now.isoformat(),
                "xpEarned": (i + 1) * 100,
            },
            last_activity_at=now,
        )
        db_session.add(student_subject)
        student_subjects.append(student_subject)

    await db_session.commit()
    for ss in student_subjects:
        await db_session.refresh(ss)

    return student_subjects


# =============================================================================
# Perfect Sessions JSONB Query Tests
# =============================================================================


class TestPerfectSessionsIntegration:
    """Integration tests for perfect session JSONB queries."""

    @pytest.mark.asyncio
    async def test_perfect_sessions_jsonb_query(
        self,
        db_session: AsyncSession,
        integration_student: Student,
        integration_sessions: list[Session],
    ):
        """Test that JSONB query correctly counts perfect sessions."""
        achievement_service = AchievementService(db=db_session)

        # Get student stats which includes perfect_sessions count
        stats = await achievement_service._get_student_stats(
            student_id=integration_student.id,
            student=integration_student,
        )

        # Should count 2 perfect sessions:
        # - perfect_session (10/10)
        # - perfect_session_2 (5/5)
        # NOT counted:
        # - imperfect_session (7/10)
        # - tutor_session (not revision type)
        # - empty_session (0 questions)
        assert stats["perfect_sessions"] == 2

    @pytest.mark.asyncio
    async def test_perfect_sessions_excludes_tutor(
        self,
        db_session: AsyncSession,
        integration_student: Student,
        sample_subject,
    ):
        """Test that tutor sessions are excluded even with perfect answers."""
        now = datetime.now(timezone.utc)
        now_naive = datetime.now()

        # Create a tutor session with "perfect" answers (shouldn't happen but test anyway)
        tutor_perfect = Session(
            id=uuid4(),
            student_id=integration_student.id,
            subject_id=sample_subject.id,
            session_type="tutor_chat",  # Not "revision"
            started_at=now - timedelta(hours=1),
            ended_at=now_naive,  # Use naive datetime for ended_at
            duration_minutes=60,
            xp_earned=100,
            data={
                "questionsAttempted": 5,
                "questionsCorrect": 5,  # Perfect but wrong session type
            },
        )
        db_session.add(tutor_perfect)
        await db_session.commit()

        achievement_service = AchievementService(db=db_session)
        stats = await achievement_service._get_student_stats(
            student_id=integration_student.id,
            student=integration_student,
        )

        # Should be 0 - tutor sessions don't count
        assert stats["perfect_sessions"] == 0


# =============================================================================
# Outcomes Mastered Aggregation Tests
# =============================================================================


class TestOutcomesMasteredIntegration:
    """Integration tests for outcomes mastered aggregation."""

    @pytest.mark.asyncio
    async def test_outcomes_mastered_aggregation(
        self,
        db_session: AsyncSession,
        integration_student: Student,
        integration_student_subjects: list[StudentSubject],
    ):
        """Test that unique outcomes are correctly aggregated across subjects."""
        achievement_service = AchievementService(db=db_session)

        stats = await achievement_service._get_student_stats(
            student_id=integration_student.id,
            student=integration_student,
        )

        # Should count 7 unique outcomes:
        # MATH: MA3-RN-01, MA3-RN-02, MA3-MR-01 (3)
        # ENG: EN3-VOCAB-01, EN3-SPELL-01 (2)
        # SCI: SC3-WS-01, SC3-LW-01 (2)
        # Total: 7 unique
        assert stats["outcomes_mastered"] == 7

    @pytest.mark.asyncio
    async def test_outcomes_mastered_empty_subjects(
        self,
        db_session: AsyncSession,
        integration_student: Student,
    ):
        """Test outcomes count is 0 when student has no subject enrolments."""
        achievement_service = AchievementService(db=db_session)

        # Student has no subjects enrolled
        stats = await achievement_service._get_student_stats(
            student_id=integration_student.id,
            student=integration_student,
        )

        assert stats["outcomes_mastered"] == 0

    @pytest.mark.asyncio
    async def test_outcomes_mastered_deduplication(
        self,
        db_session: AsyncSession,
        integration_student: Student,
        sample_subjects: list,
    ):
        """Test that duplicate outcome codes across subjects are only counted once."""
        now = datetime.now(timezone.utc)

        # Create two subjects with overlapping outcomes
        for i, subject in enumerate(sample_subjects[:2]):
            student_subject = StudentSubject(
                id=uuid4(),
                student_id=integration_student.id,
                subject_id=subject.id,
                pathway=None,
                progress={
                    # Both have "SHARED-01" outcome
                    "outcomesCompleted": ["SHARED-01", f"UNIQUE-{i}"],
                    "outcomesInProgress": [],
                    "overallPercentage": 50,
                    "lastActivity": now.isoformat(),
                    "xpEarned": 100,
                },
                last_activity_at=now,
            )
            db_session.add(student_subject)

        await db_session.commit()

        achievement_service = AchievementService(db=db_session)
        stats = await achievement_service._get_student_stats(
            student_id=integration_student.id,
            student=integration_student,
        )

        # Should count 3 unique outcomes:
        # SHARED-01 (counted once, not twice)
        # UNIQUE-0
        # UNIQUE-1
        assert stats["outcomes_mastered"] == 3


# =============================================================================
# Daily XP Tracking Persistence Tests
# =============================================================================


class TestDailyXPTrackingIntegration:
    """Integration tests for daily XP tracking persistence."""

    @pytest.mark.asyncio
    async def test_daily_xp_tracking_persistence(
        self,
        db_session: AsyncSession,
        integration_student: Student,
    ):
        """Test that daily XP tracking persists correctly in JSONB."""
        xp_service = XPService(db=db_session)

        # Award XP for flashcard review
        await xp_service.award_xp(
            student_id=integration_student.id,
            amount=50,
            source=ActivityType.FLASHCARD_REVIEW,
        )

        # Refresh student to get updated data
        await db_session.refresh(integration_student)

        # Verify dailyXPEarned was updated
        daily_xp = integration_student.gamification.get("dailyXPEarned", {})
        assert daily_xp.get("date") == date.today().isoformat()
        assert daily_xp.get("flashcard_review", 0) > 0

    @pytest.mark.asyncio
    async def test_daily_xp_cap_enforcement(
        self,
        db_session: AsyncSession,
        integration_student: Student,
    ):
        """Test that daily XP cap is enforced correctly."""
        xp_service = XPService(db=db_session)

        # Set daily XP near the cap (FLASHCARD_REVIEW cap is 500)
        # Student has 3-day streak = 1.05 multiplier
        # Set to 480 remaining, request 50 -> cap at 20, then 20 * 1.05 = 21
        gamification = dict(integration_student.gamification)
        gamification["dailyXPEarned"] = {
            "date": date.today().isoformat(),
            "flashcard_review": 480,  # 20 remaining before cap
        }
        integration_student.gamification = gamification
        db_session.add(integration_student)
        await db_session.commit()
        await db_session.refresh(integration_student)

        # Try to award 50 XP - should only get 20 (remaining cap) * streak multiplier
        result = await xp_service.award_xp(
            student_id=integration_student.id,
            amount=50,
            source=ActivityType.FLASHCARD_REVIEW,
        )

        # XP earned should be capped at 20, then multiplied by streak (1.05)
        # 20 * 1.05 = 21
        assert result["xp_earned"] == 21

        # Refresh and check daily tracking
        await db_session.refresh(integration_student)
        daily_xp = integration_student.gamification.get("dailyXPEarned", {})
        assert daily_xp.get("flashcard_review") == 500  # At cap

    @pytest.mark.asyncio
    async def test_daily_xp_summary_returns_correct_data(
        self,
        db_session: AsyncSession,
        integration_student: Student,
    ):
        """Test that daily XP summary returns correct data."""
        # Set up daily XP data - need to update directly in DB
        gamification = dict(integration_student.gamification)
        gamification["dailyXPEarned"] = {
            "date": date.today().isoformat(),
            "session_complete": 75,
            "flashcard_review": 100,
            "tutor_session": 50,
        }
        integration_student.gamification = gamification
        db_session.add(integration_student)
        await db_session.commit()
        await db_session.refresh(integration_student)

        xp_service = XPService(db=db_session)
        summary = await xp_service.get_daily_xp_summary(integration_student.id)

        assert summary == {
            "session_complete": 75,
            "flashcard_review": 100,
            "tutor_session": 50,
        }
        assert "date" not in summary  # Date key should be excluded

    @pytest.mark.asyncio
    async def test_daily_xp_resets_on_new_day(
        self,
        db_session: AsyncSession,
        integration_student: Student,
    ):
        """Test that daily XP tracking resets when a new day starts."""
        yesterday = (date.today() - timedelta(days=1)).isoformat()

        # Set up yesterday's data (at cap)
        gamification = dict(integration_student.gamification)
        gamification["dailyXPEarned"] = {
            "date": yesterday,
            "flashcard_review": 500,  # At cap yesterday
        }
        integration_student.gamification = gamification
        db_session.add(integration_student)
        await db_session.commit()
        await db_session.refresh(integration_student)

        xp_service = XPService(db=db_session)

        # Should be able to earn full amount today
        # Student has 3-day streak = 1.05 multiplier, so 100 * 1.05 = 105
        result = await xp_service.award_xp(
            student_id=integration_student.id,
            amount=100,
            source=ActivityType.FLASHCARD_REVIEW,
        )

        # Should earn full amount (new day reset) * streak multiplier
        assert result["xp_earned"] == 105  # 100 * 1.05 streak

        # Verify date was updated to today
        await db_session.refresh(integration_student)
        daily_xp = integration_student.gamification.get("dailyXPEarned", {})
        assert daily_xp.get("date") == date.today().isoformat()
