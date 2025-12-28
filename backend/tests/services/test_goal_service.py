"""
Tests for GoalService.
"""

import pytest
from datetime import date, datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4, UUID

from app.services.goal_service import GoalService
from app.schemas.goal import GoalCreate, GoalUpdate, GoalProgress


@pytest.fixture
def mock_db():
    """Create a mock database session."""
    db = AsyncMock()
    return db


@pytest.fixture
def goal_service(mock_db):
    """Create a GoalService instance with mocked db."""
    return GoalService(db=mock_db)


@pytest.fixture
def sample_goal_data():
    """Sample goal creation data."""
    return GoalCreate(
        student_id=str(uuid4()),
        title="Master Multiplication Tables",
        description="Learn all multiplication tables from 1 to 12",
        target_outcomes=["MA3-RN-01", "MA3-RN-02"],
        target_mastery=80,
        target_date=date.today() + timedelta(days=30),
        reward="Pizza night!",
    )


@pytest.fixture
def sample_goal_model():
    """Create a sample goal model object."""
    goal = MagicMock()
    goal.id = uuid4()
    goal.student_id = uuid4()
    goal.parent_id = uuid4()
    goal.title = "Master Multiplication Tables"
    goal.description = "Learn all multiplication tables"
    goal.target_outcomes = ["MA3-RN-01", "MA3-RN-02"]
    goal.target_mastery = Decimal("80")
    goal.target_date = date.today() + timedelta(days=30)
    goal.reward = "Pizza night!"
    goal.is_active = True
    goal.achieved_at = None
    goal.created_at = datetime.now() - timedelta(days=15)
    goal.updated_at = datetime.now()
    return goal


@pytest.fixture
def mock_student_subject():
    """Create a mock student subject with mastery data."""
    subject = MagicMock()
    subject.student_id = uuid4()
    subject.mastery_level = Decimal("60")
    return subject


class TestGoalServiceCreate:
    """Tests for goal creation."""

    @pytest.mark.asyncio
    async def test_create_goal_validates_input(self, sample_goal_data):
        """Test that goal creation validates input data."""
        assert sample_goal_data.title == "Master Multiplication Tables"
        assert sample_goal_data.target_mastery == 80
        assert sample_goal_data.reward == "Pizza night!"

    @pytest.mark.asyncio
    async def test_goal_create_schema_validates_title(self):
        """Test that GoalCreate requires a title."""
        with pytest.raises(Exception):
            GoalCreate(
                student_id=str(uuid4()),
                title="",  # Empty title should fail
            )


class TestGoalServiceProgress:
    """Tests for goal progress calculation."""

    @pytest.mark.asyncio
    async def test_calculate_progress_with_zero_target_mastery(
        self, goal_service, mock_db, sample_goal_model
    ):
        """Test that zero target_mastery doesn't cause division by zero."""
        sample_goal_model.target_mastery = Decimal("0")
        sample_goal_model.target_outcomes = None

        # Mock empty subjects result
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_db.execute.return_value = mock_result

        # This should NOT raise ZeroDivisionError
        progress = await goal_service.calculate_progress(sample_goal_model)

        # Should return 0% progress, not crash
        assert progress.progress_percentage == Decimal("0")

    @pytest.mark.asyncio
    async def test_calculate_progress_with_target_mastery(
        self, goal_service, mock_db, sample_goal_model, mock_student_subject
    ):
        """Test progress calculation with target mastery."""
        sample_goal_model.target_mastery = Decimal("80")
        sample_goal_model.target_outcomes = None
        mock_student_subject.student_id = sample_goal_model.student_id
        mock_student_subject.mastery_level = Decimal("40")

        # Mock subjects result with 40% mastery
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [mock_student_subject]
        mock_db.execute.return_value = mock_result

        progress = await goal_service.calculate_progress(sample_goal_model)

        # 40% current / 80% target = 50% progress
        assert progress.progress_percentage == Decimal("50.0")

    @pytest.mark.asyncio
    async def test_calculate_progress_with_outcomes(
        self, goal_service, mock_db, sample_goal_model, mock_student_subject
    ):
        """Test progress calculation with target outcomes."""
        sample_goal_model.target_mastery = Decimal("80")
        sample_goal_model.target_outcomes = ["MA3-RN-01", "MA3-RN-02"]
        mock_student_subject.student_id = sample_goal_model.student_id
        mock_student_subject.mastery_level = Decimal("60")

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [mock_student_subject]
        mock_db.execute.return_value = mock_result

        progress = await goal_service.calculate_progress(sample_goal_model)

        assert progress.outcomes_total == 2
        assert progress.current_mastery == Decimal("60")

    @pytest.mark.asyncio
    async def test_calculate_days_remaining(
        self, goal_service, mock_db, sample_goal_model
    ):
        """Test days remaining calculation."""
        sample_goal_model.target_date = date.today() + timedelta(days=30)
        sample_goal_model.target_outcomes = None
        sample_goal_model.target_mastery = None

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_db.execute.return_value = mock_result

        progress = await goal_service.calculate_progress(sample_goal_model)

        assert progress.days_remaining == 30

    @pytest.mark.asyncio
    async def test_calculate_days_remaining_overdue(
        self, goal_service, mock_db, sample_goal_model
    ):
        """Test days remaining for overdue goal."""
        sample_goal_model.target_date = date.today() - timedelta(days=5)
        sample_goal_model.target_outcomes = None
        sample_goal_model.target_mastery = None

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_db.execute.return_value = mock_result

        progress = await goal_service.calculate_progress(sample_goal_model)

        assert progress.days_remaining == -5

    @pytest.mark.asyncio
    async def test_is_on_track_when_ahead(
        self, goal_service, mock_db, sample_goal_model, mock_student_subject
    ):
        """Test on-track status when ahead of schedule."""
        # 30 day goal, 15 days elapsed, 15 days remaining
        sample_goal_model.target_date = date.today() + timedelta(days=15)
        sample_goal_model.created_at = datetime.now() - timedelta(days=15)
        sample_goal_model.target_mastery = Decimal("80")
        sample_goal_model.target_outcomes = None

        # 60% progress at 50% time elapsed = ahead
        mock_student_subject.mastery_level = Decimal("60")
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [mock_student_subject]
        mock_db.execute.return_value = mock_result

        progress = await goal_service.calculate_progress(sample_goal_model)

        assert progress.is_on_track is True

    @pytest.mark.asyncio
    async def test_is_on_track_when_behind(
        self, goal_service, mock_db, sample_goal_model, mock_student_subject
    ):
        """Test on-track status when behind schedule."""
        # 30 day goal, 25 days elapsed, 5 days remaining
        sample_goal_model.target_date = date.today() + timedelta(days=5)
        sample_goal_model.created_at = datetime.now() - timedelta(days=25)
        sample_goal_model.target_mastery = Decimal("80")
        sample_goal_model.target_outcomes = None

        # Only 20% progress at 83% time elapsed = behind
        mock_student_subject.mastery_level = Decimal("16")  # 16/80 = 20%
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [mock_student_subject]
        mock_db.execute.return_value = mock_result

        progress = await goal_service.calculate_progress(sample_goal_model)

        assert progress.is_on_track is False


class TestGoalServiceProgressBatch:
    """Tests for batch progress calculation."""

    @pytest.mark.asyncio
    async def test_calculate_progress_batch_empty(self, goal_service, mock_db):
        """Test batch progress with empty list."""
        result = await goal_service.calculate_progress_batch([])
        assert result == {}

    @pytest.mark.asyncio
    async def test_calculate_progress_batch_single(
        self, goal_service, mock_db, sample_goal_model, mock_student_subject
    ):
        """Test batch progress with single goal."""
        sample_goal_model.target_mastery = Decimal("80")
        sample_goal_model.target_outcomes = None
        mock_student_subject.student_id = sample_goal_model.student_id
        mock_student_subject.mastery_level = Decimal("40")

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [mock_student_subject]
        mock_db.execute.return_value = mock_result

        result = await goal_service.calculate_progress_batch([sample_goal_model])

        assert sample_goal_model.id in result
        assert result[sample_goal_model.id].progress_percentage == Decimal("50.0")

    @pytest.mark.asyncio
    async def test_calculate_progress_batch_multiple(
        self, goal_service, mock_db
    ):
        """Test batch progress with multiple goals."""
        student_id = uuid4()

        goal1 = MagicMock()
        goal1.id = uuid4()
        goal1.student_id = student_id
        goal1.target_mastery = Decimal("80")
        goal1.target_outcomes = None
        goal1.target_date = None
        goal1.created_at = datetime.now()

        goal2 = MagicMock()
        goal2.id = uuid4()
        goal2.student_id = student_id
        goal2.target_mastery = Decimal("100")
        goal2.target_outcomes = None
        goal2.target_date = None
        goal2.created_at = datetime.now()

        subject = MagicMock()
        subject.student_id = student_id
        subject.mastery_level = Decimal("50")

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [subject]
        mock_db.execute.return_value = mock_result

        result = await goal_service.calculate_progress_batch([goal1, goal2])

        assert len(result) == 2
        # Goal 1: 50/80 = 62.5%
        assert result[goal1.id].progress_percentage == Decimal("62.5")
        # Goal 2: 50/100 = 50%
        assert result[goal2.id].progress_percentage == Decimal("50.0")


class TestGoalServiceAchievement:
    """Tests for goal achievement checking."""

    @pytest.mark.asyncio
    async def test_check_achievement_already_achieved(
        self, goal_service, mock_db, sample_goal_model
    ):
        """Test achievement check on already achieved goal."""
        sample_goal_model.achieved_at = datetime.now()

        # Mock get_by_id to return the achieved goal
        with patch.object(
            goal_service, 'get_by_id', new_callable=AsyncMock
        ) as mock_get:
            mock_get.return_value = sample_goal_model

            result = await goal_service.check_and_mark_achieved(
                sample_goal_model.id, sample_goal_model.parent_id
            )

            # Should return False - not newly achieved
            assert result is False


class TestGoalServiceList:
    """Tests for listing goals."""

    @pytest.mark.asyncio
    async def test_count_active_goals(self, goal_service, mock_db):
        """Test counting active goals for a parent."""
        parent_id = uuid4()

        mock_result = MagicMock()
        mock_result.scalar.return_value = 5
        mock_db.execute.return_value = mock_result

        count = await goal_service.count_active_goals(parent_id)

        assert count == 5
        mock_db.execute.assert_called_once()


class TestGoalServiceDelete:
    """Tests for goal deletion."""

    @pytest.mark.asyncio
    async def test_delete_goal_not_found(self, goal_service, mock_db):
        """Test deleting a non-existent goal."""
        with patch.object(
            goal_service, 'get_by_id', new_callable=AsyncMock
        ) as mock_get:
            mock_get.return_value = None

            result = await goal_service.delete(uuid4(), uuid4())

            assert result is False

    @pytest.mark.asyncio
    async def test_delete_goal_success(
        self, goal_service, mock_db, sample_goal_model
    ):
        """Test successful goal deletion."""
        with patch.object(
            goal_service, 'get_by_id', new_callable=AsyncMock
        ) as mock_get:
            mock_get.return_value = sample_goal_model
            mock_db.delete = AsyncMock()
            mock_db.commit = AsyncMock()

            result = await goal_service.delete(
                sample_goal_model.id, sample_goal_model.parent_id
            )

            assert result is True
            mock_db.delete.assert_called_once_with(sample_goal_model)
            mock_db.commit.assert_called_once()
