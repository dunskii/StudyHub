"""
Tests for ParentAnalyticsService.
"""

import pytest
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from app.services.parent_analytics_service import ParentAnalyticsService


@pytest.fixture
def mock_db():
    """Create a mock database session."""
    db = AsyncMock()
    return db


@pytest.fixture
def analytics_service(mock_db):
    """Create a ParentAnalyticsService instance with mocked db."""
    return ParentAnalyticsService(db=mock_db)


@pytest.fixture
def sample_student():
    """Create a sample student model."""
    student = MagicMock()
    student.id = uuid4()
    student.parent_id = uuid4()
    student.display_name = "Test Student"
    student.grade_level = 5
    student.school_stage = "Stage 3"
    student.framework_id = uuid4()
    student.last_active_at = datetime.now(timezone.utc)
    student.gamification = {
        "totalXP": 1500,
        "level": 5,
        "streaks": {"current": 7, "longest": 14}
    }
    student.preferences = {"dailyGoalMinutes": 30}
    return student


@pytest.fixture
def sample_student_subject():
    """Create a sample student subject model."""
    ss = MagicMock()
    ss.student_id = uuid4()
    ss.subject_id = uuid4()
    ss.mastery_level = Decimal("65.5")
    ss.last_activity_at = datetime.now(timezone.utc)
    ss.current_focus_outcomes = ["MA3-RN-01"]
    return ss


@pytest.fixture
def sample_subject():
    """Create a sample subject model."""
    subject = MagicMock()
    subject.id = uuid4()
    subject.code = "MATH"
    subject.name = "Mathematics"
    subject.config = {"color": "#3B82F6"}
    subject.display_order = 1
    return subject


class TestGetStudentSummary:
    """Tests for get_student_summary method."""

    @pytest.mark.asyncio
    async def test_get_student_summary_success(
        self, analytics_service, mock_db, sample_student
    ):
        """Test getting a student summary."""
        # Mock db.get to return student
        mock_db.get.return_value = sample_student

        # Mock session counting methods
        with patch.object(
            analytics_service, '_count_sessions_since', new_callable=AsyncMock
        ) as mock_count, patch.object(
            analytics_service, '_sum_session_time_since', new_callable=AsyncMock
        ) as mock_time:
            mock_count.return_value = 5
            mock_time.return_value = 120

            result = await analytics_service.get_student_summary(sample_student.id)

            assert result is not None
            assert result.id == sample_student.id
            assert result.display_name == "Test Student"
            assert result.grade_level == 5
            assert result.total_xp == 1500
            assert result.level == 5
            assert result.current_streak == 7
            assert result.sessions_this_week == 5
            assert result.study_time_this_week_minutes == 120

    @pytest.mark.asyncio
    async def test_get_student_summary_not_found(self, analytics_service, mock_db):
        """Test getting summary for non-existent student."""
        mock_db.get.return_value = None

        result = await analytics_service.get_student_summary(uuid4())

        assert result is None

    @pytest.mark.asyncio
    async def test_get_student_summary_no_gamification(
        self, analytics_service, mock_db, sample_student
    ):
        """Test summary when student has no gamification data."""
        sample_student.gamification = None
        mock_db.get.return_value = sample_student

        with patch.object(
            analytics_service, '_count_sessions_since', new_callable=AsyncMock
        ) as mock_count, patch.object(
            analytics_service, '_sum_session_time_since', new_callable=AsyncMock
        ) as mock_time:
            mock_count.return_value = 0
            mock_time.return_value = 0

            result = await analytics_service.get_student_summary(sample_student.id)

            assert result is not None
            assert result.total_xp == 0
            assert result.level == 1
            assert result.current_streak == 0


class TestGetStudentsSummary:
    """Tests for get_students_summary method."""

    @pytest.mark.asyncio
    async def test_get_students_summary_multiple(
        self, analytics_service, mock_db, sample_student
    ):
        """Test getting summaries for multiple students."""
        parent_id = uuid4()
        student2 = MagicMock()
        student2.id = uuid4()
        student2.display_name = "Second Student"

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [sample_student, student2]
        mock_db.execute.return_value = mock_result

        with patch.object(
            analytics_service, 'get_student_summary', new_callable=AsyncMock
        ) as mock_get:
            summary1 = MagicMock()
            summary1.id = sample_student.id
            summary2 = MagicMock()
            summary2.id = student2.id
            mock_get.side_effect = [summary1, summary2]

            result = await analytics_service.get_students_summary(parent_id)

            assert len(result) == 2
            mock_get.assert_any_call(sample_student.id)
            mock_get.assert_any_call(student2.id)

    @pytest.mark.asyncio
    async def test_get_students_summary_empty(self, analytics_service, mock_db):
        """Test getting summaries when parent has no students."""
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_db.execute.return_value = mock_result

        result = await analytics_service.get_students_summary(uuid4())

        assert result == []


class TestGetOverallMastery:
    """Tests for get_overall_mastery method."""

    @pytest.mark.asyncio
    async def test_get_overall_mastery_with_subjects(
        self, analytics_service, mock_db
    ):
        """Test overall mastery calculation with enrolled subjects."""
        student_id = uuid4()

        subject1 = MagicMock()
        subject1.mastery_level = Decimal("60")
        subject2 = MagicMock()
        subject2.mastery_level = Decimal("80")

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [subject1, subject2]
        mock_db.execute.return_value = mock_result

        result = await analytics_service.get_overall_mastery(student_id)

        # Average of 60 and 80 = 70
        assert result == Decimal("70.0")

    @pytest.mark.asyncio
    async def test_get_overall_mastery_no_subjects(
        self, analytics_service, mock_db
    ):
        """Test overall mastery when no subjects enrolled."""
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_db.execute.return_value = mock_result

        result = await analytics_service.get_overall_mastery(uuid4())

        assert result == Decimal("0")


class TestGetWeeklyStats:
    """Tests for get_weekly_stats method."""

    @pytest.mark.asyncio
    async def test_get_weekly_stats_with_sessions(
        self, analytics_service, mock_db, sample_student
    ):
        """Test weekly stats calculation."""
        student_id = uuid4()

        # Mock session query result
        session_row = MagicMock()
        session_row.session_count = 5
        session_row.total_minutes = 150
        session_result = MagicMock()
        session_result.one.return_value = session_row

        # Mock topics query result (session data)
        topics_result = MagicMock()
        session_data = {"outcomesWorkedOn": ["MA3-01", "MA3-02"], "questionsAttempted": 20, "questionsCorrect": 15}
        topics_result.scalars.return_value = [session_data]

        # Mock flashcard count
        flashcard_result = MagicMock()
        flashcard_result.scalar.return_value = 30

        # Set up execute side effects
        mock_db.execute.side_effect = [
            session_result,
            topics_result,
            flashcard_result,
        ]

        mock_db.get.return_value = sample_student

        with patch.object(
            analytics_service, 'get_overall_mastery', new_callable=AsyncMock
        ) as mock_mastery:
            mock_mastery.return_value = Decimal("70")

            result = await analytics_service.get_weekly_stats(student_id)

            assert result.study_time_minutes == 150
            assert result.sessions_count == 5
            assert result.topics_covered == 2
            assert result.flashcards_reviewed == 30
            assert result.questions_answered == 20
            assert result.accuracy_percentage == Decimal("75.0")

    @pytest.mark.asyncio
    async def test_get_weekly_stats_no_activity(
        self, analytics_service, mock_db, sample_student
    ):
        """Test weekly stats with no activity."""
        student_id = uuid4()

        session_row = MagicMock()
        session_row.session_count = 0
        session_row.total_minutes = 0
        session_result = MagicMock()
        session_result.one.return_value = session_row

        topics_result = MagicMock()
        topics_result.scalars.return_value = []

        flashcard_result = MagicMock()
        flashcard_result.scalar.return_value = 0

        mock_db.execute.side_effect = [
            session_result,
            topics_result,
            flashcard_result,
        ]
        mock_db.get.return_value = sample_student

        with patch.object(
            analytics_service, 'get_overall_mastery', new_callable=AsyncMock
        ) as mock_mastery:
            mock_mastery.return_value = Decimal("0")

            result = await analytics_service.get_weekly_stats(student_id)

            assert result.study_time_minutes == 0
            assert result.sessions_count == 0
            assert result.topics_covered == 0
            assert result.accuracy_percentage is None


class TestGetSubjectProgress:
    """Tests for get_subject_progress method."""

    @pytest.mark.asyncio
    async def test_get_subject_progress(
        self, analytics_service, mock_db, sample_student_subject, sample_subject
    ):
        """Test getting progress for enrolled subjects."""
        student_id = uuid4()

        # Mock subject query result
        mock_result = MagicMock()
        mock_result.all.return_value = [(sample_student_subject, sample_subject)]
        mock_db.execute.return_value = mock_result

        with patch.object(
            analytics_service, '_get_strand_progress', new_callable=AsyncMock
        ) as mock_strands, patch.object(
            analytics_service, '_count_sessions_since', new_callable=AsyncMock
        ) as mock_count, patch.object(
            analytics_service, '_sum_session_time_since', new_callable=AsyncMock
        ) as mock_time, patch.object(
            analytics_service, '_sum_xp_since', new_callable=AsyncMock
        ) as mock_xp:
            mock_strands.return_value = []
            mock_count.return_value = 3
            mock_time.return_value = 90
            mock_xp.return_value = 250

            result = await analytics_service.get_subject_progress(student_id)

            assert len(result) == 1
            assert result[0].subject_code == "MATH"
            assert result[0].subject_name == "Mathematics"
            assert result[0].mastery_level == Decimal("65.5")
            assert result[0].sessions_this_week == 3
            assert result[0].time_spent_this_week_minutes == 90
            assert result[0].xp_earned_this_week == 250


class TestGetFoundationStrength:
    """Tests for get_foundation_strength method."""

    @pytest.mark.asyncio
    async def test_foundation_strength_high_mastery(
        self, analytics_service, mock_db, sample_student
    ):
        """Test foundation strength for student with high mastery."""
        mock_db.get.return_value = sample_student

        with patch.object(
            analytics_service, 'get_overall_mastery', new_callable=AsyncMock
        ) as mock_mastery:
            mock_mastery.return_value = Decimal("80")

            result = await analytics_service.get_foundation_strength(sample_student.id)

            assert result.gaps_identified == 0
            assert len(result.strengths) > 0
            assert len(result.critical_gaps) == 0

    @pytest.mark.asyncio
    async def test_foundation_strength_low_mastery(
        self, analytics_service, mock_db, sample_student
    ):
        """Test foundation strength for student with low mastery."""
        mock_db.get.return_value = sample_student

        with patch.object(
            analytics_service, 'get_overall_mastery', new_callable=AsyncMock
        ) as mock_mastery:
            mock_mastery.return_value = Decimal("40")

            result = await analytics_service.get_foundation_strength(sample_student.id)

            assert result.gaps_identified == 3
            assert len(result.critical_gaps) > 0

    @pytest.mark.asyncio
    async def test_foundation_strength_student_not_found(
        self, analytics_service, mock_db
    ):
        """Test foundation strength for non-existent student."""
        mock_db.get.return_value = None

        result = await analytics_service.get_foundation_strength(uuid4())

        assert result.overall_strength == Decimal("0")
        assert result.prior_year_mastery == Decimal("0")


class TestGetStudentProgress:
    """Tests for get_student_progress method."""

    @pytest.mark.asyncio
    async def test_get_student_progress_success(
        self, analytics_service, mock_db, sample_student
    ):
        """Test getting full progress report."""
        student_id = sample_student.id
        parent_id = sample_student.parent_id

        # Mock ownership verification
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_student
        mock_db.execute.return_value = mock_result

        with patch.object(
            analytics_service, 'get_overall_mastery', new_callable=AsyncMock
        ) as mock_mastery, patch.object(
            analytics_service, 'get_foundation_strength', new_callable=AsyncMock
        ) as mock_foundation, patch.object(
            analytics_service, 'get_weekly_stats', new_callable=AsyncMock
        ) as mock_weekly, patch.object(
            analytics_service, 'get_subject_progress', new_callable=AsyncMock
        ) as mock_subjects:
            mock_mastery.return_value = Decimal("75")

            # Create proper FoundationStrength mock with Decimal values
            from app.schemas.parent_dashboard import FoundationStrength
            mock_foundation.return_value = FoundationStrength(
                overall_strength=Decimal("80.0"),
                prior_year_mastery=Decimal("72.0"),
                gaps_identified=0,
                critical_gaps=[],
                strengths=["Strong foundation"],
            )

            # Create proper WeeklyStats mock with proper values
            from app.schemas.parent_dashboard import WeeklyStats
            mock_weekly.return_value = WeeklyStats(
                study_time_minutes=120,
                study_goal_minutes=150,
                sessions_count=5,
                topics_covered=3,
                mastery_improvement=Decimal("2.5"),
                flashcards_reviewed=20,
                questions_answered=50,
                accuracy_percentage=Decimal("85.0"),
            )

            mock_subjects.return_value = []

            mock_db.get.return_value = None  # No framework lookup

            result = await analytics_service.get_student_progress(student_id, parent_id)

            assert result is not None
            assert result.student_id == student_id
            assert result.student_name == sample_student.display_name
            assert result.overall_mastery == Decimal("75")

    @pytest.mark.asyncio
    async def test_get_student_progress_not_owned(
        self, analytics_service, mock_db
    ):
        """Test getting progress for student not owned by parent."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        result = await analytics_service.get_student_progress(uuid4(), uuid4())

        assert result is None


class TestGetAggregateStats:
    """Tests for get_aggregate_stats method."""

    @pytest.mark.asyncio
    async def test_get_aggregate_stats(self, analytics_service, mock_db):
        """Test getting aggregate stats for parent."""
        parent_id = uuid4()

        mock_row = MagicMock()
        mock_row.total_time = 300
        mock_row.total_sessions = 10
        mock_result = MagicMock()
        mock_result.one.return_value = mock_row
        mock_db.execute.return_value = mock_result

        total_time, total_sessions = await analytics_service.get_aggregate_stats(parent_id)

        assert total_time == 300
        assert total_sessions == 10

    @pytest.mark.asyncio
    async def test_get_aggregate_stats_no_activity(
        self, analytics_service, mock_db
    ):
        """Test aggregate stats with no activity."""
        mock_row = MagicMock()
        mock_row.total_time = None
        mock_row.total_sessions = 0
        mock_result = MagicMock()
        mock_result.one.return_value = mock_row
        mock_db.execute.return_value = mock_result

        total_time, total_sessions = await analytics_service.get_aggregate_stats(uuid4())

        assert total_time == 0
        assert total_sessions == 0


class TestHelperMethods:
    """Tests for helper methods."""

    def test_get_week_start_monday(self, analytics_service):
        """Test that week start is correctly calculated as Monday."""
        # Test with a Wednesday
        wednesday = date(2024, 3, 13)  # March 13, 2024 is a Wednesday
        result = analytics_service._get_week_start(wednesday)

        assert result == date(2024, 3, 11)  # March 11, 2024 is Monday

    def test_get_week_start_already_monday(self, analytics_service):
        """Test week start when date is already Monday."""
        monday = date(2024, 3, 11)
        result = analytics_service._get_week_start(monday)

        assert result == monday

    def test_get_week_start_sunday(self, analytics_service):
        """Test week start for a Sunday."""
        sunday = date(2024, 3, 17)  # March 17, 2024 is a Sunday
        result = analytics_service._get_week_start(sunday)

        assert result == date(2024, 3, 11)  # Previous Monday

    @pytest.mark.asyncio
    async def test_count_sessions_since(self, analytics_service, mock_db):
        """Test counting sessions since a date."""
        mock_result = MagicMock()
        mock_result.scalar.return_value = 5
        mock_db.execute.return_value = mock_result

        result = await analytics_service._count_sessions_since(
            uuid4(), date.today() - timedelta(days=7)
        )

        assert result == 5

    @pytest.mark.asyncio
    async def test_sum_session_time_since(self, analytics_service, mock_db):
        """Test summing session time since a date."""
        mock_result = MagicMock()
        mock_result.scalar.return_value = 180
        mock_db.execute.return_value = mock_result

        result = await analytics_service._sum_session_time_since(
            uuid4(), date.today() - timedelta(days=7)
        )

        assert result == 180

    @pytest.mark.asyncio
    async def test_sum_xp_since(self, analytics_service, mock_db):
        """Test summing XP since a date."""
        mock_result = MagicMock()
        mock_result.scalar.return_value = 500
        mock_db.execute.return_value = mock_result

        result = await analytics_service._sum_xp_since(
            uuid4(), date.today() - timedelta(days=7)
        )

        assert result == 500

    @pytest.mark.asyncio
    async def test_sum_xp_since_with_subject_filter(
        self, analytics_service, mock_db
    ):
        """Test summing XP with subject filter."""
        mock_result = MagicMock()
        mock_result.scalar.return_value = 200
        mock_db.execute.return_value = mock_result

        result = await analytics_service._sum_xp_since(
            uuid4(), date.today() - timedelta(days=7), subject_id=uuid4()
        )

        assert result == 200
        # Verify execute was called (with subject filter in query)
        mock_db.execute.assert_called_once()
