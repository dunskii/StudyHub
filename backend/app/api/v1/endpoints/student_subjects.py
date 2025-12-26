"""Student Subject endpoints for subject enrolment management."""
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import ForbiddenError, NotFoundError
from app.core.security import AuthenticatedUser
from app.schemas.student_subject import (
    BulkEnrolmentRequest,
    BulkEnrolmentResponse,
    EnrolmentRequest,
    SeniorCourseSummary,
    StudentSubjectListResponse,
    StudentSubjectProgressUpdate,
    StudentSubjectResponse,
    StudentSubjectUpdate,
    StudentSubjectWithDetails,
    SubjectSummary,
)
from app.services.student_service import StudentService
from app.services.student_subject_service import (
    EnrolmentValidationError,
    StudentSubjectService,
)
from app.services.user_service import UserService

router = APIRouter()


async def verify_student_ownership(
    student_id: UUID,
    current_user: AuthenticatedUser,
    db: AsyncSession,
) -> None:
    """Verify the current user owns the student.

    Raises:
        ForbiddenError: If user does not own the student.
        NotFoundError: If student does not exist.
    """
    user_service = UserService(db)
    student_service = StudentService(db)

    if not await user_service.verify_owns_student(current_user.id, student_id):
        exists = await student_service.get_by_id(student_id)
        if exists:
            raise ForbiddenError("You do not have access to this student")
        raise NotFoundError("Student")


@router.get("/{student_id}/subjects", response_model=StudentSubjectListResponse)
async def get_student_subjects(
    student_id: UUID,
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StudentSubjectListResponse:
    """Get all enrolled subjects for a student.

    CRITICAL: Ownership verification - only the parent can access.

    Args:
        student_id: The student UUID.
        current_user: The authenticated user.
        db: Database session.

    Returns:
        List of enrolled subjects with details.

    Raises:
        NotFoundError: If student not found.
        ForbiddenError: If user is not the parent.
    """
    await verify_student_ownership(student_id, current_user, db)

    service = StudentSubjectService(db)
    enrolments = await service.get_with_subject_details(student_id)

    # Transform to response format
    result = []
    for enrolment in enrolments:
        subject = enrolment.subject
        senior_course = enrolment.senior_course

        progress_data = enrolment.progress or {}

        result.append(
            StudentSubjectWithDetails(
                id=enrolment.id,
                student_id=enrolment.student_id,
                subject_id=enrolment.subject_id,
                pathway=enrolment.pathway,
                senior_course_id=enrolment.senior_course_id,
                enrolled_at=enrolment.enrolled_at,
                progress={
                    "outcomesCompleted": progress_data.get("outcomesCompleted", []),
                    "outcomesInProgress": progress_data.get("outcomesInProgress", []),
                    "overallPercentage": progress_data.get("overallPercentage", 0),
                    "lastActivity": progress_data.get("lastActivity"),
                    "xpEarned": progress_data.get("xpEarned", 0),
                },
                subject=SubjectSummary(
                    id=subject.id,
                    code=subject.code,
                    name=subject.name,
                    icon=subject.icon,
                    color=subject.color,
                ),
                senior_course=SeniorCourseSummary(
                    id=senior_course.id,
                    code=senior_course.code,
                    name=senior_course.name,
                    units=senior_course.units,
                ) if senior_course else None,
            )
        )

    return StudentSubjectListResponse(
        enrolments=result,
        total=len(result),
    )


@router.post(
    "/{student_id}/subjects",
    response_model=StudentSubjectResponse,
    status_code=201,
)
async def enrol_in_subject(
    student_id: UUID,
    data: EnrolmentRequest,
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StudentSubjectResponse:
    """Enrol a student in a subject.

    CRITICAL: Ownership verification and framework isolation enforced.

    Args:
        student_id: The student UUID.
        data: Enrolment request with subject and optional pathway/course.
        current_user: The authenticated user.
        db: Database session.

    Returns:
        The created enrolment.

    Raises:
        NotFoundError: If student not found.
        ForbiddenError: If user is not the parent.
        HTTPException 422: If validation fails (framework mismatch, etc).
    """
    await verify_student_ownership(student_id, current_user, db)

    service = StudentSubjectService(db)

    try:
        enrolment = await service.enrol(
            student_id=student_id,
            subject_id=data.subject_id,
            pathway=data.pathway,
            senior_course_id=data.senior_course_id,
        )
    except EnrolmentValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error_code": e.error_code,
                "message": e.message,
            },
        ) from e

    return StudentSubjectResponse.from_orm_with_progress(enrolment)


@router.post(
    "/{student_id}/subjects/bulk",
    response_model=BulkEnrolmentResponse,
    status_code=201,
)
async def bulk_enrol_in_subjects(
    student_id: UUID,
    data: BulkEnrolmentRequest,
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> BulkEnrolmentResponse:
    """Enrol a student in multiple subjects at once.

    Useful during onboarding when selecting initial subjects.

    Args:
        student_id: The student UUID.
        data: List of enrolment requests.
        current_user: The authenticated user.
        db: Database session.

    Returns:
        Summary of successful and failed enrolments.

    Raises:
        NotFoundError: If student not found.
        ForbiddenError: If user is not the parent.
    """
    await verify_student_ownership(student_id, current_user, db)

    service = StudentSubjectService(db)

    successful: list[StudentSubjectResponse] = []
    failed: list[dict[str, Any]] = []

    for enrolment_request in data.enrolments:
        try:
            enrolment = await service.enrol(
                student_id=student_id,
                subject_id=enrolment_request.subject_id,
                pathway=enrolment_request.pathway,
                senior_course_id=enrolment_request.senior_course_id,
            )
            successful.append(StudentSubjectResponse.from_orm_with_progress(enrolment))
        except EnrolmentValidationError as e:
            failed.append({
                "subject_id": str(enrolment_request.subject_id),
                "error_code": e.error_code,
                "message": e.message,
            })

    return BulkEnrolmentResponse(
        successful=successful,
        failed=failed,
    )


@router.delete("/{student_id}/subjects/{subject_id}", status_code=204)
async def unenrol_from_subject(
    student_id: UUID,
    subject_id: UUID,
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """Unenrol a student from a subject.

    CRITICAL: Ownership verification.

    Args:
        student_id: The student UUID.
        subject_id: The subject UUID.
        current_user: The authenticated user.
        db: Database session.

    Raises:
        NotFoundError: If student or enrolment not found.
        ForbiddenError: If user is not the parent.
    """
    await verify_student_ownership(student_id, current_user, db)

    service = StudentSubjectService(db)
    success = await service.unenrol(student_id, subject_id)

    if not success:
        raise NotFoundError("Enrolment")


@router.put(
    "/{student_id}/subjects/{subject_id}",
    response_model=StudentSubjectResponse,
)
async def update_enrolment(
    student_id: UUID,
    subject_id: UUID,
    data: StudentSubjectUpdate,
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StudentSubjectResponse:
    """Update a student's subject enrolment (pathway or senior course).

    CRITICAL: Ownership verification and validation enforced.

    Args:
        student_id: The student UUID.
        subject_id: The subject UUID.
        data: Update data (pathway, senior_course_id).
        current_user: The authenticated user.
        db: Database session.

    Returns:
        The updated enrolment.

    Raises:
        NotFoundError: If student or enrolment not found.
        ForbiddenError: If user is not the parent.
        HTTPException 422: If validation fails.
    """
    await verify_student_ownership(student_id, current_user, db)

    service = StudentSubjectService(db)

    try:
        enrolment = await service.update_pathway(
            student_id=student_id,
            subject_id=subject_id,
            pathway=data.pathway,
            senior_course_id=data.senior_course_id,
        )
    except EnrolmentValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error_code": e.error_code,
                "message": e.message,
            },
        ) from e

    if not enrolment:
        raise NotFoundError("Enrolment")

    return StudentSubjectResponse.from_orm_with_progress(enrolment)


@router.put(
    "/{student_id}/subjects/{subject_id}/progress",
    response_model=StudentSubjectResponse,
)
async def update_enrolment_progress(
    student_id: UUID,
    subject_id: UUID,
    data: StudentSubjectProgressUpdate,
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StudentSubjectResponse:
    """Update a student's progress in a subject.

    Args:
        student_id: The student UUID.
        subject_id: The subject UUID.
        data: Progress update data.
        current_user: The authenticated user.
        db: Database session.

    Returns:
        The updated enrolment.

    Raises:
        NotFoundError: If student or enrolment not found.
        ForbiddenError: If user is not the parent.
    """
    await verify_student_ownership(student_id, current_user, db)

    service = StudentSubjectService(db)

    # Get the enrolment first
    enrolment = await service.get_enrolment(student_id, subject_id)
    if not enrolment:
        raise NotFoundError("Enrolment")

    # Update progress
    updated = await service.update_progress(
        student_subject_id=enrolment.id,
        outcomes_completed=data.outcomes_completed,
        outcomes_in_progress=data.outcomes_in_progress,
        overall_percentage=data.overall_percentage,
        xp_earned=data.xp_earned,
    )

    if not updated:
        raise NotFoundError("Enrolment")

    return StudentSubjectResponse.from_orm_with_progress(updated)


@router.post(
    "/{student_id}/subjects/{subject_id}/outcomes/{outcome_code}/complete",
    response_model=StudentSubjectResponse,
)
async def complete_outcome(
    student_id: UUID,
    subject_id: UUID,
    outcome_code: str,
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    xp_award: int = 10,
) -> StudentSubjectResponse:
    """Mark an outcome as completed for a student.

    Awards XP and updates the student's progress.

    Args:
        student_id: The student UUID.
        subject_id: The subject UUID.
        outcome_code: The curriculum outcome code to mark complete.
        current_user: The authenticated user.
        db: Database session.
        xp_award: XP points to award (default: 10).

    Returns:
        The updated enrolment.

    Raises:
        NotFoundError: If student or enrolment not found.
        ForbiddenError: If user is not the parent.
    """
    await verify_student_ownership(student_id, current_user, db)

    service = StudentSubjectService(db)

    # Get the enrolment first
    enrolment = await service.get_enrolment(student_id, subject_id)
    if not enrolment:
        raise NotFoundError("Enrolment")

    # Mark outcome complete
    updated = await service.add_completed_outcome(
        student_subject_id=enrolment.id,
        outcome_code=outcome_code,
        xp_award=xp_award,
    )

    if not updated:
        raise NotFoundError("Enrolment")

    return StudentSubjectResponse.from_orm_with_progress(updated)
