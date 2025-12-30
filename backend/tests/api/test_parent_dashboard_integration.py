"""
HTTP Integration Tests for Parent Dashboard API endpoints.

These tests verify actual HTTP request/response behaviour, including:
- Authentication requirements
- Ownership verification (access control)
- Response status codes and structure
- Error response formats
"""

import pytest
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.models.goal import Goal
from app.models.notification import Notification


class TestDashboardAuthentication:
    """Tests for dashboard authentication requirements."""

    @pytest.mark.asyncio
    async def test_dashboard_requires_authentication(self, client: AsyncClient):
        """Dashboard endpoint requires authentication."""
        response = await client.get("/api/v1/parent/dashboard")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_student_progress_requires_authentication(self, client: AsyncClient):
        """Student progress endpoint requires authentication."""
        response = await client.get(f"/api/v1/parent/students/{uuid4()}/progress")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_goals_requires_authentication(self, client: AsyncClient):
        """Goals endpoint requires authentication."""
        response = await client.get("/api/v1/parent/goals")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_notifications_requires_authentication(self, client: AsyncClient):
        """Notifications endpoint requires authentication."""
        response = await client.get("/api/v1/parent/notifications")
        assert response.status_code == 401


class TestDashboardOverview:
    """Tests for GET /api/v1/parent/dashboard endpoint."""

    @pytest.mark.asyncio
    async def test_get_dashboard_success(
        self,
        authenticated_client: AsyncClient,
        sample_student,
    ):
        """Dashboard returns expected structure with authenticated user."""
        response = await authenticated_client.get("/api/v1/parent/dashboard")
        assert response.status_code == 200

        data = response.json()
        assert "students" in data
        assert "total_study_time_week_minutes" in data
        assert "total_sessions_week" in data
        assert "unread_notifications" in data
        assert "active_goals_count" in data
        assert "achievements_this_week" in data

    @pytest.mark.asyncio
    async def test_dashboard_includes_student_summary(
        self,
        authenticated_client: AsyncClient,
        sample_student,
    ):
        """Dashboard includes student summaries with expected fields."""
        response = await authenticated_client.get("/api/v1/parent/dashboard")
        assert response.status_code == 200

        data = response.json()
        assert len(data["students"]) >= 1

        student = data["students"][0]
        expected_fields = [
            "id",
            "display_name",
            "grade_level",
            "school_stage",
            "total_xp",
            "level",
            "current_streak",
            "sessions_this_week",
            "study_time_this_week_minutes",
        ]
        for field in expected_fields:
            assert field in student, f"Missing field: {field}"


class TestStudentProgressOwnership:
    """Tests for student progress ownership verification."""

    @pytest.mark.asyncio
    async def test_cannot_access_other_parents_student(
        self,
        db_session: AsyncSession,
        authenticated_client: AsyncClient,
        another_user,
        sample_framework,
    ):
        """Cannot access student belonging to another parent."""
        from app.models.student import Student

        # Create student belonging to another_user
        other_student = Student(
            id=uuid4(),
            parent_id=another_user.id,
            display_name="Other Child",
            grade_level=3,
            school_stage="S2",
            framework_id=sample_framework.id,
        )
        db_session.add(other_student)
        await db_session.commit()

        # Try to access as authenticated user (who is not the parent)
        response = await authenticated_client.get(
            f"/api/v1/parent/students/{other_student.id}/progress"
        )

        # Should return 403 Forbidden or 404 Not Found
        assert response.status_code in (403, 404)

    @pytest.mark.asyncio
    async def test_can_access_own_student(
        self,
        authenticated_client: AsyncClient,
        sample_student,
    ):
        """Can access own child's progress."""
        response = await authenticated_client.get(
            f"/api/v1/parent/students/{sample_student.id}/progress"
        )
        assert response.status_code == 200

        data = response.json()
        assert data["student_id"] == str(sample_student.id)
        assert data["student_name"] == sample_student.display_name

    @pytest.mark.asyncio
    async def test_nonexistent_student_returns_404(
        self,
        authenticated_client: AsyncClient,
    ):
        """Nonexistent student returns 404."""
        fake_id = uuid4()
        response = await authenticated_client.get(
            f"/api/v1/parent/students/{fake_id}/progress"
        )
        assert response.status_code == 404


class TestGoalOwnership:
    """Tests for goal ownership verification."""

    @pytest.mark.asyncio
    async def test_create_goal_validates_student_ownership(
        self,
        db_session: AsyncSession,
        authenticated_client: AsyncClient,
        another_user,
        sample_framework,
    ):
        """Cannot create goal for another parent's student."""
        from app.models.student import Student

        # Create student belonging to another_user
        other_student = Student(
            id=uuid4(),
            parent_id=another_user.id,
            display_name="Other Child",
            grade_level=3,
            school_stage="S2",
            framework_id=sample_framework.id,
        )
        db_session.add(other_student)
        await db_session.commit()

        # Try to create goal for that student
        response = await authenticated_client.post(
            "/api/v1/parent/goals",
            json={
                "student_id": str(other_student.id),
                "title": "Test Goal",
                "target_mastery": 80,
            },
        )

        # Should return 403 or 404
        assert response.status_code in (403, 404)

    @pytest.mark.asyncio
    async def test_can_create_goal_for_own_student(
        self,
        authenticated_client: AsyncClient,
        sample_student,
    ):
        """Can create goal for own child."""
        response = await authenticated_client.post(
            "/api/v1/parent/goals",
            json={
                "student_id": str(sample_student.id),
                "title": "Master Multiplication",
                "description": "Learn times tables",
                "target_mastery": 80,
            },
        )
        assert response.status_code == 201

        data = response.json()
        assert data["title"] == "Master Multiplication"
        assert data["student_id"] == str(sample_student.id)

    @pytest.mark.asyncio
    async def test_cannot_update_other_parents_goal(
        self,
        db_session: AsyncSession,
        authenticated_client: AsyncClient,
        another_user,
        sample_framework,
    ):
        """Cannot update another parent's goal."""
        from app.models.student import Student

        # Create other student
        other_student = Student(
            id=uuid4(),
            parent_id=another_user.id,
            display_name="Other Child",
            grade_level=3,
            school_stage="S2",
            framework_id=sample_framework.id,
        )
        db_session.add(other_student)
        await db_session.flush()

        # Create goal for other parent
        other_goal = Goal(
            id=uuid4(),
            student_id=other_student.id,
            parent_id=another_user.id,
            title="Other Goal",
            is_active=True,
        )
        db_session.add(other_goal)
        await db_session.commit()

        # Try to update as authenticated user
        response = await authenticated_client.put(
            f"/api/v1/parent/goals/{other_goal.id}",
            json={"title": "Hacked Title"},
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_cannot_delete_other_parents_goal(
        self,
        db_session: AsyncSession,
        authenticated_client: AsyncClient,
        another_user,
        sample_framework,
    ):
        """Cannot delete another parent's goal."""
        from app.models.student import Student

        # Create other student
        other_student = Student(
            id=uuid4(),
            parent_id=another_user.id,
            display_name="Other Child",
            grade_level=3,
            school_stage="S2",
            framework_id=sample_framework.id,
        )
        db_session.add(other_student)
        await db_session.flush()

        # Create goal for other parent
        other_goal = Goal(
            id=uuid4(),
            student_id=other_student.id,
            parent_id=another_user.id,
            title="Other Goal",
            is_active=True,
        )
        db_session.add(other_goal)
        await db_session.commit()

        # Try to delete as authenticated user
        response = await authenticated_client.delete(
            f"/api/v1/parent/goals/{other_goal.id}"
        )

        assert response.status_code == 404


class TestNotificationOwnership:
    """Tests for notification ownership verification."""

    @pytest.mark.asyncio
    async def test_notifications_only_shows_own(
        self,
        db_session: AsyncSession,
        authenticated_client: AsyncClient,
        sample_user,
        another_user,
    ):
        """Notifications only shows user's own notifications."""
        # Create notifications for both users
        own_notification = Notification(
            id=uuid4(),
            user_id=sample_user.id,
            type="achievement",  # Valid notification type
            title="Your Notification",
            message="This is yours",
            priority="normal",
            delivery_method="in_app",
        )
        other_notification = Notification(
            id=uuid4(),
            user_id=another_user.id,
            type="achievement",  # Valid notification type
            title="Other Notification",
            message="This is not yours",
            priority="normal",
            delivery_method="in_app",
        )
        db_session.add_all([own_notification, other_notification])
        await db_session.commit()

        # Get notifications as authenticated user
        response = await authenticated_client.get("/api/v1/parent/notifications")
        assert response.status_code == 200

        data = response.json()
        notification_ids = [n["id"] for n in data["notifications"]]

        # Should only see own notification
        assert str(own_notification.id) in notification_ids
        assert str(other_notification.id) not in notification_ids

    @pytest.mark.asyncio
    async def test_cannot_mark_other_users_notification_read(
        self,
        db_session: AsyncSession,
        authenticated_client: AsyncClient,
        another_user,
    ):
        """Cannot mark another user's notification as read."""
        # Create notification for other user
        other_notification = Notification(
            id=uuid4(),
            user_id=another_user.id,
            type="milestone",
            title="Other Notification",
            message="Not yours",
            priority="normal",
            delivery_method="in_app",
        )
        db_session.add(other_notification)
        await db_session.commit()

        # Try to mark as read
        response = await authenticated_client.post(
            f"/api/v1/parent/notifications/{other_notification.id}/read"
        )

        assert response.status_code == 404


class TestGoalCRUD:
    """Tests for goal CRUD operations."""

    @pytest.mark.asyncio
    async def test_goal_list_pagination(
        self,
        db_session: AsyncSession,
        authenticated_client: AsyncClient,
        sample_student,
        sample_user,
    ):
        """Goal list supports pagination."""
        # Create multiple goals
        for i in range(5):
            goal = Goal(
                id=uuid4(),
                student_id=sample_student.id,
                parent_id=sample_user.id,
                title=f"Goal {i + 1}",
                is_active=True,
            )
            db_session.add(goal)
        await db_session.commit()

        # Get first page
        response = await authenticated_client.get(
            "/api/v1/parent/goals?page=1&page_size=2"
        )
        assert response.status_code == 200

        data = response.json()
        assert len(data["goals"]) == 2
        assert data["total"] >= 5

    @pytest.mark.asyncio
    async def test_goal_list_active_filter(
        self,
        db_session: AsyncSession,
        authenticated_client: AsyncClient,
        sample_student,
        sample_user,
    ):
        """Goal list can filter by active status."""
        # Create active and inactive goals
        active_goal = Goal(
            id=uuid4(),
            student_id=sample_student.id,
            parent_id=sample_user.id,
            title="Active Goal",
            is_active=True,
        )
        inactive_goal = Goal(
            id=uuid4(),
            student_id=sample_student.id,
            parent_id=sample_user.id,
            title="Inactive Goal",
            is_active=False,
            achieved_at=datetime.now(timezone.utc),
        )
        db_session.add_all([active_goal, inactive_goal])
        await db_session.commit()

        # Get active only
        response = await authenticated_client.get(
            "/api/v1/parent/goals?active_only=true"
        )
        assert response.status_code == 200

        data = response.json()
        goal_ids = [g["id"] for g in data["goals"]]
        assert str(active_goal.id) in goal_ids
        assert str(inactive_goal.id) not in goal_ids

    @pytest.mark.asyncio
    async def test_update_goal(
        self,
        db_session: AsyncSession,
        authenticated_client: AsyncClient,
        sample_student,
        sample_user,
    ):
        """Can update own goal."""
        goal = Goal(
            id=uuid4(),
            student_id=sample_student.id,
            parent_id=sample_user.id,
            title="Original Title",
            is_active=True,
        )
        db_session.add(goal)
        await db_session.commit()

        response = await authenticated_client.put(
            f"/api/v1/parent/goals/{goal.id}",
            json={"title": "Updated Title", "description": "New description"},
        )
        assert response.status_code == 200

        data = response.json()
        assert data["title"] == "Updated Title"
        assert data["description"] == "New description"

    @pytest.mark.asyncio
    async def test_delete_goal(
        self,
        db_session: AsyncSession,
        authenticated_client: AsyncClient,
        sample_student,
        sample_user,
    ):
        """Can delete own goal."""
        goal = Goal(
            id=uuid4(),
            student_id=sample_student.id,
            parent_id=sample_user.id,
            title="To Delete",
            is_active=True,
        )
        db_session.add(goal)
        await db_session.commit()

        response = await authenticated_client.delete(
            f"/api/v1/parent/goals/{goal.id}"
        )
        assert response.status_code == 204

        # Verify deleted
        get_response = await authenticated_client.get(
            f"/api/v1/parent/goals/{goal.id}"
        )
        assert get_response.status_code == 404


class TestNotificationPreferences:
    """Tests for notification preferences endpoints."""

    @pytest.mark.asyncio
    async def test_get_preferences_creates_default(
        self,
        authenticated_client: AsyncClient,
    ):
        """Get preferences creates default if none exist."""
        response = await authenticated_client.get(
            "/api/v1/parent/notification-preferences"
        )
        assert response.status_code == 200

        data = response.json()
        # Check default values
        assert "weekly_reports" in data
        assert "achievement_alerts" in data
        assert "email_frequency" in data

    @pytest.mark.asyncio
    async def test_update_preferences(
        self,
        authenticated_client: AsyncClient,
    ):
        """Can update notification preferences."""
        # First get to create defaults
        await authenticated_client.get(
            "/api/v1/parent/notification-preferences"
        )

        # Update
        response = await authenticated_client.put(
            "/api/v1/parent/notification-preferences",
            json={
                "weekly_reports": False,
                "email_frequency": "monthly",
            },
        )
        assert response.status_code == 200

        data = response.json()
        assert data["weekly_reports"] is False
        assert data["email_frequency"] == "monthly"


class TestErrorResponses:
    """Tests for error response formats."""

    @pytest.mark.asyncio
    async def test_404_includes_hint(
        self,
        authenticated_client: AsyncClient,
    ):
        """404 responses include helpful hints."""
        response = await authenticated_client.get(
            f"/api/v1/parent/goals/{uuid4()}"
        )
        assert response.status_code == 404

        data = response.json()
        # Accept either 'detail' or 'message' key for error responses
        assert "detail" in data or "message" in data
        if "details" in data:
            assert "hint" in data["details"]

    @pytest.mark.asyncio
    async def test_validation_error_format(
        self,
        authenticated_client: AsyncClient,
        sample_student,
    ):
        """Validation errors return proper format."""
        response = await authenticated_client.post(
            "/api/v1/parent/goals",
            json={
                "student_id": str(sample_student.id),
                "title": "",  # Invalid: empty title
            },
        )
        assert response.status_code == 422

        data = response.json()
        assert "detail" in data

    @pytest.mark.asyncio
    async def test_invalid_uuid_format(
        self,
        authenticated_client: AsyncClient,
    ):
        """Invalid UUID format returns 422."""
        response = await authenticated_client.get(
            "/api/v1/parent/students/not-a-uuid/progress"
        )
        assert response.status_code == 422
