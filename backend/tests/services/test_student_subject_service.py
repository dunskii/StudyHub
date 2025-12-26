"""Tests for StudentSubjectService."""
import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.student_subject_service import (
    EnrolmentValidationError,
    StudentSubjectService,
)


@pytest.mark.asyncio
async def test_enrol_success(
    db_session: AsyncSession,
    sample_student,
    sample_subject,
):
    """Test successfully enrolling a student in a subject."""
    service = StudentSubjectService(db_session)

    enrolment = await service.enrol(sample_student.id, sample_subject.id)

    assert enrolment is not None
    assert enrolment.student_id == sample_student.id
    assert enrolment.subject_id == sample_subject.id
    assert enrolment.progress["overallPercentage"] == 0
    assert enrolment.progress["xpEarned"] == 0


@pytest.mark.asyncio
async def test_enrol_duplicate_fails(
    db_session: AsyncSession,
    sample_student,
    sample_subject,
):
    """Test that enrolling twice in the same subject fails."""
    service = StudentSubjectService(db_session)

    # First enrolment succeeds
    await service.enrol(sample_student.id, sample_subject.id)

    # Second enrolment should fail
    with pytest.raises(EnrolmentValidationError) as exc_info:
        await service.enrol(sample_student.id, sample_subject.id)

    assert exc_info.value.error_code == "ALREADY_ENROLLED"


@pytest.mark.asyncio
async def test_enrol_wrong_framework_fails(
    db_session: AsyncSession,
    sample_student,
    sample_subject,
):
    """Test that enrolling in subject from wrong framework fails."""
    # Create a subject in a different framework
    from app.models.curriculum_framework import CurriculumFramework
    from app.models.subject import Subject

    other_framework = CurriculumFramework(
        id=uuid.uuid4(),
        code="VIC",
        name="Victorian Curriculum",
        country="Australia",
        region_type="state",
        syllabus_authority="VCAA",
        syllabus_url="https://vic.edu.au",
        structure={"stages": {}},
        is_active=True,
    )
    db_session.add(other_framework)

    other_subject = Subject(
        id=uuid.uuid4(),
        framework_id=other_framework.id,
        code="MATH",
        name="Mathematics",
        kla="Mathematics",
        available_stages=["S3"],
        is_active=True,
    )
    db_session.add(other_subject)
    await db_session.commit()

    service = StudentSubjectService(db_session)

    # Trying to enrol NSW student in VIC subject should fail
    with pytest.raises(EnrolmentValidationError) as exc_info:
        await service.enrol(sample_student.id, other_subject.id)

    assert exc_info.value.error_code == "FRAMEWORK_MISMATCH"


@pytest.mark.asyncio
async def test_enrol_stage5_requires_pathway(
    db_session: AsyncSession,
    sample_stage5_student,
    sample_subject,
):
    """Test that Stage 5 students must provide pathway for subjects with pathways."""
    service = StudentSubjectService(db_session)

    # sample_subject has hasPathways=True
    with pytest.raises(EnrolmentValidationError) as exc_info:
        await service.enrol(sample_stage5_student.id, sample_subject.id)

    assert exc_info.value.error_code == "PATHWAY_REQUIRED"


@pytest.mark.asyncio
async def test_enrol_stage5_with_valid_pathway(
    db_session: AsyncSession,
    sample_stage5_student,
    sample_subject,
):
    """Test Stage 5 enrolment with valid pathway succeeds."""
    service = StudentSubjectService(db_session)

    enrolment = await service.enrol(
        sample_stage5_student.id,
        sample_subject.id,
        pathway="5.2",
    )

    assert enrolment is not None
    assert enrolment.pathway == "5.2"


@pytest.mark.asyncio
async def test_enrol_stage5_with_invalid_pathway(
    db_session: AsyncSession,
    sample_stage5_student,
    sample_subject,
):
    """Test Stage 5 enrolment with invalid pathway fails."""
    service = StudentSubjectService(db_session)

    with pytest.raises(EnrolmentValidationError) as exc_info:
        await service.enrol(
            sample_stage5_student.id,
            sample_subject.id,
            pathway="5.4",  # Invalid
        )

    assert exc_info.value.error_code == "INVALID_PATHWAY"


@pytest.mark.asyncio
async def test_enrol_student_not_found(db_session: AsyncSession, sample_subject):
    """Test enrolling non-existent student fails."""
    service = StudentSubjectService(db_session)

    with pytest.raises(EnrolmentValidationError) as exc_info:
        await service.enrol(uuid.uuid4(), sample_subject.id)

    assert exc_info.value.error_code == "STUDENT_NOT_FOUND"


@pytest.mark.asyncio
async def test_enrol_subject_not_found(db_session: AsyncSession, sample_student):
    """Test enrolling in non-existent subject fails."""
    service = StudentSubjectService(db_session)

    with pytest.raises(EnrolmentValidationError) as exc_info:
        await service.enrol(sample_student.id, uuid.uuid4())

    assert exc_info.value.error_code == "SUBJECT_NOT_FOUND"


@pytest.mark.asyncio
async def test_unenrol_success(
    db_session: AsyncSession,
    sample_student,
    sample_subject,
):
    """Test successfully unenrolling from a subject."""
    service = StudentSubjectService(db_session)

    # First enrol
    await service.enrol(sample_student.id, sample_subject.id)

    # Then unenrol
    result = await service.unenrol(sample_student.id, sample_subject.id)

    assert result is True

    # Verify unenrolled
    enrolment = await service.get_enrolment(sample_student.id, sample_subject.id)
    assert enrolment is None


@pytest.mark.asyncio
async def test_unenrol_not_enrolled(
    db_session: AsyncSession,
    sample_student,
    sample_subject,
):
    """Test unenrolling when not enrolled returns False."""
    service = StudentSubjectService(db_session)

    result = await service.unenrol(sample_student.id, sample_subject.id)

    assert result is False


@pytest.mark.asyncio
async def test_get_all_for_student(
    db_session: AsyncSession,
    sample_student,
    sample_subjects,
):
    """Test getting all enrolments for a student."""
    service = StudentSubjectService(db_session)

    # Enrol in multiple subjects
    for subject in sample_subjects[:2]:
        await service.enrol(sample_student.id, subject.id)

    enrolments = await service.get_all_for_student(sample_student.id)

    assert len(enrolments) == 2


@pytest.mark.asyncio
async def test_update_pathway(
    db_session: AsyncSession,
    sample_stage5_student,
    sample_subject,
):
    """Test updating an enrolment's pathway."""
    service = StudentSubjectService(db_session)

    # Enrol with 5.1 pathway
    await service.enrol(
        sample_stage5_student.id,
        sample_subject.id,
        pathway="5.1",
    )

    # Update to 5.3
    enrolment = await service.update_pathway(
        sample_stage5_student.id,
        sample_subject.id,
        pathway="5.3",
    )

    assert enrolment is not None
    assert enrolment.pathway == "5.3"


@pytest.mark.asyncio
async def test_update_progress(
    db_session: AsyncSession,
    sample_student,
    sample_subject,
):
    """Test updating progress for an enrolment."""
    service = StudentSubjectService(db_session)

    enrolment = await service.enrol(sample_student.id, sample_subject.id)

    updated = await service.update_progress(
        student_subject_id=enrolment.id,
        outcomes_completed=["MA3-RN-01", "MA3-MR-01"],
        overall_percentage=50,
        xp_earned=100,
    )

    assert updated is not None
    assert len(updated.progress["outcomesCompleted"]) == 2
    assert updated.progress["overallPercentage"] == 50
    assert updated.progress["xpEarned"] == 100
    assert updated.progress["lastActivity"] is not None


@pytest.mark.asyncio
async def test_add_completed_outcome(
    db_session: AsyncSession,
    sample_student,
    sample_subject,
):
    """Test marking an outcome as completed."""
    service = StudentSubjectService(db_session)

    enrolment = await service.enrol(sample_student.id, sample_subject.id)

    updated = await service.add_completed_outcome(
        student_subject_id=enrolment.id,
        outcome_code="MA3-RN-01",
        xp_award=15,
    )

    assert updated is not None
    assert "MA3-RN-01" in updated.progress["outcomesCompleted"]
    assert updated.progress["xpEarned"] == 15


@pytest.mark.asyncio
async def test_add_completed_outcome_idempotent(
    db_session: AsyncSession,
    sample_student,
    sample_subject,
):
    """Test that completing same outcome twice doesn't double XP."""
    service = StudentSubjectService(db_session)

    enrolment = await service.enrol(sample_student.id, sample_subject.id)

    await service.add_completed_outcome(
        student_subject_id=enrolment.id,
        outcome_code="MA3-RN-01",
        xp_award=15,
    )

    # Complete same outcome again
    updated = await service.add_completed_outcome(
        student_subject_id=enrolment.id,
        outcome_code="MA3-RN-01",
        xp_award=15,
    )

    # XP should still be 15, not 30
    assert updated.progress["xpEarned"] == 15


@pytest.mark.asyncio
async def test_get_with_subject_details(
    db_session: AsyncSession,
    sample_student,
    sample_subject,
):
    """Test getting enrolments with full subject details."""
    service = StudentSubjectService(db_session)

    await service.enrol(sample_student.id, sample_subject.id)

    enrolments = await service.get_with_subject_details(sample_student.id)

    assert len(enrolments) == 1
    assert enrolments[0].subject is not None
    assert enrolments[0].subject.code == "MATH"
