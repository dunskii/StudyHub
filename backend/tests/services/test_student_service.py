"""Tests for StudentService."""
import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.student import StudentCreate, StudentUpdate
from app.services.student_service import StudentService, get_stage_for_grade


class TestGetStageForGrade:
    """Tests for the grade to stage mapping function."""

    @pytest.mark.parametrize(
        "grade,expected_stage",
        [
            (0, "ES1"),   # Kindergarten
            (1, "S1"),
            (2, "S1"),
            (3, "S2"),
            (4, "S2"),
            (5, "S3"),
            (6, "S3"),
            (7, "S4"),
            (8, "S4"),
            (9, "S5"),
            (10, "S5"),
            (11, "S6"),
            (12, "S6"),
        ],
    )
    def test_grade_to_stage_mapping(self, grade: int, expected_stage: str):
        """Test that each grade maps to correct stage."""
        assert get_stage_for_grade(grade) == expected_stage

    def test_invalid_grade_raises_error(self):
        """Test that invalid grade raises ValueError."""
        with pytest.raises(ValueError, match="Invalid grade level"):
            get_stage_for_grade(13)

        with pytest.raises(ValueError, match="Invalid grade level"):
            get_stage_for_grade(-1)


@pytest.mark.asyncio
async def test_create_student(
    db_session: AsyncSession,
    sample_user,
    sample_framework,
):
    """Test creating a new student."""
    service = StudentService(db_session)

    data = StudentCreate(
        parent_id=sample_user.id,
        display_name="New Student",
        grade_level=7,
        school_stage="S4",
        framework_id=sample_framework.id,
    )

    student = await service.create(data)

    assert student is not None
    assert student.id is not None
    assert student.display_name == "New Student"
    assert student.grade_level == 7
    assert student.school_stage == "S4"
    assert student.parent_id == sample_user.id
    assert student.framework_id == sample_framework.id
    assert student.onboarding_completed is False


@pytest.mark.asyncio
async def test_create_student_auto_calculates_stage(
    db_session: AsyncSession,
    sample_user,
    sample_framework,
):
    """Test that stage is auto-calculated from grade if not provided."""
    service = StudentService(db_session)

    data = StudentCreate(
        parent_id=sample_user.id,
        display_name="Auto Stage Student",
        grade_level=5,
        school_stage="",  # Will be auto-calculated
        framework_id=sample_framework.id,
    )

    student = await service.create(data)

    assert student.school_stage == "S3"  # Grade 5 = Stage 3


@pytest.mark.asyncio
async def test_get_by_id(db_session: AsyncSession, sample_student):
    """Test getting a student by ID."""
    service = StudentService(db_session)

    student = await service.get_by_id(sample_student.id)

    assert student is not None
    assert student.id == sample_student.id


@pytest.mark.asyncio
async def test_get_by_id_not_found(db_session: AsyncSession):
    """Test getting a non-existent student."""
    service = StudentService(db_session)

    student = await service.get_by_id(uuid.uuid4())

    assert student is None


@pytest.mark.asyncio
async def test_get_by_id_for_user_success(
    db_session: AsyncSession,
    sample_user,
    sample_student,
):
    """Test getting a student with ownership verification - success case."""
    service = StudentService(db_session)

    student = await service.get_by_id_for_user(sample_student.id, sample_user.id)

    assert student is not None
    assert student.id == sample_student.id


@pytest.mark.asyncio
async def test_get_by_id_for_user_wrong_parent(
    db_session: AsyncSession,
    sample_student,
    another_user,
):
    """Test getting a student with wrong parent - should return None."""
    service = StudentService(db_session)

    student = await service.get_by_id_for_user(sample_student.id, another_user.id)

    assert student is None


@pytest.mark.asyncio
async def test_get_all_for_parent(
    db_session: AsyncSession,
    sample_user,
    sample_student,
    sample_framework,
):
    """Test getting all students for a parent."""
    service = StudentService(db_session)

    # Create another student for the same parent
    from app.models.student import Student

    student2 = Student(
        id=uuid.uuid4(),
        parent_id=sample_user.id,
        display_name="Second Student",
        grade_level=3,
        school_stage="S2",
        framework_id=sample_framework.id,
    )
    db_session.add(student2)
    await db_session.commit()

    students = await service.get_all_for_parent(sample_user.id)

    assert len(students) == 2


@pytest.mark.asyncio
async def test_get_all_for_parent_empty(db_session: AsyncSession, another_user):
    """Test getting students for a parent with no students."""
    service = StudentService(db_session)

    students = await service.get_all_for_parent(another_user.id)

    assert len(students) == 0


@pytest.mark.asyncio
async def test_count_for_parent(
    db_session: AsyncSession,
    sample_user,
    sample_student,
):
    """Test counting students for a parent."""
    service = StudentService(db_session)

    count = await service.count_for_parent(sample_user.id)

    assert count == 1


@pytest.mark.asyncio
async def test_update_student(
    db_session: AsyncSession,
    sample_user,
    sample_student,
):
    """Test updating a student."""
    service = StudentService(db_session)

    data = StudentUpdate(
        display_name="Updated Student Name",
    )

    student = await service.update(sample_student.id, data, sample_user.id)

    assert student is not None
    assert student.display_name == "Updated Student Name"


@pytest.mark.asyncio
async def test_update_student_wrong_parent(
    db_session: AsyncSession,
    sample_student,
    another_user,
):
    """Test updating a student with wrong parent - should fail."""
    service = StudentService(db_session)

    data = StudentUpdate(display_name="Should Fail")

    student = await service.update(sample_student.id, data, another_user.id)

    assert student is None


@pytest.mark.asyncio
async def test_update_student_auto_calculates_stage(
    db_session: AsyncSession,
    sample_user,
    sample_student,
):
    """Test that updating grade auto-calculates stage."""
    service = StudentService(db_session)

    data = StudentUpdate(grade_level=10)  # Should auto-set stage to S5

    student = await service.update(sample_student.id, data, sample_user.id)

    assert student is not None
    assert student.grade_level == 10
    assert student.school_stage == "S5"


@pytest.mark.asyncio
async def test_delete_student(
    db_session: AsyncSession,
    sample_user,
    sample_student,
):
    """Test deleting a student."""
    service = StudentService(db_session)

    result = await service.delete(sample_student.id, sample_user.id)

    assert result is True

    # Verify student is deleted
    student = await service.get_by_id(sample_student.id)
    assert student is None


@pytest.mark.asyncio
async def test_delete_student_wrong_parent(
    db_session: AsyncSession,
    sample_student,
    another_user,
):
    """Test deleting a student with wrong parent - should fail."""
    service = StudentService(db_session)

    result = await service.delete(sample_student.id, another_user.id)

    assert result is False


@pytest.mark.asyncio
async def test_mark_onboarding_complete(
    db_session: AsyncSession,
    sample_user,
    sample_student,
):
    """Test marking onboarding as complete."""
    service = StudentService(db_session)

    assert sample_student.onboarding_completed is False

    student = await service.mark_onboarding_complete(sample_student.id, sample_user.id)

    assert student is not None
    assert student.onboarding_completed is True


@pytest.mark.asyncio
async def test_mark_onboarding_complete_wrong_parent(
    db_session: AsyncSession,
    sample_student,
    another_user,
):
    """Test marking onboarding complete with wrong parent - should fail."""
    service = StudentService(db_session)

    student = await service.mark_onboarding_complete(sample_student.id, another_user.id)

    assert student is None


@pytest.mark.asyncio
async def test_update_last_active(db_session: AsyncSession, sample_student):
    """Test updating last active timestamp."""
    service = StudentService(db_session)

    assert sample_student.last_active_at is None

    await service.update_last_active(sample_student.id)

    student = await service.get_by_id(sample_student.id)
    assert student is not None
    assert student.last_active_at is not None


@pytest.mark.asyncio
async def test_update_gamification(db_session: AsyncSession, sample_student):
    """Test updating gamification data."""
    service = StudentService(db_session)

    student = await service.update_gamification(
        sample_student.id,
        xp_delta=100,
        new_achievements=["first_login", "first_subject"],
    )

    assert student is not None
    assert student.gamification["totalXP"] == 100
    assert student.gamification["level"] == 2  # sqrt(100/100) + 1 = 2
    assert "first_login" in student.gamification["achievements"]
    assert "first_subject" in student.gamification["achievements"]


@pytest.mark.asyncio
async def test_update_gamification_accumulates(db_session: AsyncSession, sample_student):
    """Test that gamification XP accumulates."""
    service = StudentService(db_session)

    await service.update_gamification(sample_student.id, xp_delta=50)
    student = await service.update_gamification(sample_student.id, xp_delta=50)

    assert student is not None
    assert student.gamification["totalXP"] == 100


@pytest.mark.asyncio
async def test_get_with_subjects(
    db_session: AsyncSession,
    sample_user,
    sample_student,
    sample_subject,
):
    """Test getting a student with enrolled subjects."""
    # First enrol the student in a subject
    from app.services.student_subject_service import StudentSubjectService

    subject_service = StudentSubjectService(db_session)
    await subject_service.enrol(sample_student.id, sample_subject.id)

    service = StudentService(db_session)
    student = await service.get_with_subjects(sample_student.id, sample_user.id)

    assert student is not None
    assert len(student.subjects) == 1
    assert student.subjects[0].subject_id == sample_subject.id
