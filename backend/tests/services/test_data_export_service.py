"""Tests for data export service."""
import uuid
from datetime import datetime, timezone
from typing import Any

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.session import Session
from app.models.student import Student
from app.models.student_subject import StudentSubject
from app.models.user import User
from app.services.data_export_service import DataExportService


@pytest.fixture
async def user_with_data(
    db_session: AsyncSession,
    sample_subject: Any,
) -> User:
    """Create a user with students, enrolments, and sessions."""
    user = User(
        id=uuid.uuid4(),
        supabase_auth_id=uuid.uuid4(),
        email="export-test@example.com",
        display_name="Export Test User",
        subscription_tier="free",
        privacy_policy_accepted_at=datetime.now(timezone.utc),
        terms_accepted_at=datetime.now(timezone.utc),
    )
    db_session.add(user)
    await db_session.flush()

    # Create student
    student = Student(
        id=uuid.uuid4(),
        parent_id=user.id,
        display_name="Test Student",
        grade_level=5,
        school_stage="S3",
        onboarding_completed=True,
    )
    db_session.add(student)
    await db_session.flush()

    # Create enrolment
    enrolment = StudentSubject(
        id=uuid.uuid4(),
        student_id=student.id,
        subject_id=sample_subject.id,
        progress={
            "outcomesCompleted": ["MA3-RN-01"],
            "overallPercentage": 25,
            "xpEarned": 100,
        },
    )
    db_session.add(enrolment)

    # Create session
    session = Session(
        id=uuid.uuid4(),
        student_id=student.id,
        subject_id=sample_subject.id,
        session_type="revision",
        duration_minutes=30,
        xp_earned=50,
        data={
            "outcomesWorkedOn": ["MA3-RN-01"],
            "questionsAttempted": 10,
            "questionsCorrect": 8,
        },
    )
    db_session.add(session)

    await db_session.commit()
    await db_session.refresh(user)
    return user


class TestDataExportService:
    """Tests for DataExportService."""

    @pytest.mark.asyncio
    async def test_export_user_data_returns_correct_structure(
        self,
        db_session: AsyncSession,
        user_with_data: User,
    ):
        """Test that export returns the correct data structure."""
        service = DataExportService(db_session)
        result = await service.export_user_data(user_with_data.id)

        assert "export_metadata" in result
        assert "account" in result
        assert "students" in result

    @pytest.mark.asyncio
    async def test_export_metadata_contains_required_fields(
        self,
        db_session: AsyncSession,
        user_with_data: User,
    ):
        """Test that export metadata has required fields."""
        service = DataExportService(db_session)
        result = await service.export_user_data(user_with_data.id)

        metadata = result["export_metadata"]
        assert "export_date" in metadata
        assert "format_version" in metadata
        assert metadata["data_controller"] == "StudyHub"

    @pytest.mark.asyncio
    async def test_export_account_data(
        self,
        db_session: AsyncSession,
        user_with_data: User,
    ):
        """Test that account data is correctly exported."""
        service = DataExportService(db_session)
        result = await service.export_user_data(user_with_data.id)

        account = result["account"]
        assert account["email"] == "export-test@example.com"
        assert account["display_name"] == "Export Test User"
        assert account["subscription_tier"] == "free"
        assert account["consent"]["privacy_policy_accepted_at"] is not None
        assert account["consent"]["terms_accepted_at"] is not None

    @pytest.mark.asyncio
    async def test_export_student_data(
        self,
        db_session: AsyncSession,
        user_with_data: User,
    ):
        """Test that student data is correctly exported."""
        service = DataExportService(db_session)
        result = await service.export_user_data(user_with_data.id)

        assert len(result["students"]) == 1
        student = result["students"][0]

        assert student["display_name"] == "Test Student"
        assert student["grade_level"] == 5
        assert student["school_stage"] == "S3"
        assert student["onboarding_completed"] is True

    @pytest.mark.asyncio
    async def test_export_enrolment_data(
        self,
        db_session: AsyncSession,
        user_with_data: User,
    ):
        """Test that enrolment data is correctly exported."""
        service = DataExportService(db_session)
        result = await service.export_user_data(user_with_data.id)

        student = result["students"][0]
        assert len(student["subjects"]) == 1
        enrolment = student["subjects"][0]

        assert enrolment["subject_code"] == "MATH"
        assert enrolment["subject_name"] == "Mathematics"
        assert enrolment["progress"]["overallPercentage"] == 25
        assert enrolment["progress"]["xpEarned"] == 100

    @pytest.mark.asyncio
    async def test_export_session_data(
        self,
        db_session: AsyncSession,
        user_with_data: User,
    ):
        """Test that session data is correctly exported."""
        service = DataExportService(db_session)
        result = await service.export_user_data(user_with_data.id)

        student = result["students"][0]
        assert len(student["sessions"]) == 1
        session = student["sessions"][0]

        assert session["session_type"] == "revision"
        assert session["duration_minutes"] == 30
        assert session["xp_earned"] == 50
        assert session["data"]["questionsAttempted"] == 10
        assert session["data"]["questionsCorrect"] == 8

    @pytest.mark.asyncio
    async def test_export_nonexistent_user_returns_empty(
        self,
        db_session: AsyncSession,
    ):
        """Test that exporting nonexistent user returns empty dict."""
        service = DataExportService(db_session)
        result = await service.export_user_data(uuid.uuid4())

        assert result == {}

    @pytest.mark.asyncio
    async def test_export_user_without_students(
        self,
        db_session: AsyncSession,
    ):
        """Test exporting user with no students."""
        user = User(
            id=uuid.uuid4(),
            supabase_auth_id=uuid.uuid4(),
            email="no-students@example.com",
            display_name="No Students User",
        )
        db_session.add(user)
        await db_session.commit()

        service = DataExportService(db_session)
        result = await service.export_user_data(user.id)

        assert result["account"]["email"] == "no-students@example.com"
        assert result["students"] == []
