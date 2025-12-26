"""Student endpoints for student profile management."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import ForbiddenError, NotFoundError
from app.core.security import AuthenticatedUser
from app.schemas.student import (
    StudentCreate,
    StudentListResponse,
    StudentResponse,
    StudentUpdate,
)
from app.services.student_service import StudentService
from app.services.user_service import UserService

router = APIRouter()


@router.get("", response_model=StudentListResponse)
async def list_students(
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
) -> StudentListResponse:
    """List all students for the current user.

    CRITICAL: Only returns students belonging to the authenticated user.

    Args:
        current_user: The authenticated user.
        db: Database session.
        page: Page number (1-indexed).
        page_size: Items per page.

    Returns:
        Paginated list of the user's students.
    """
    service = StudentService(db)

    offset = (page - 1) * page_size
    students = await service.get_all_for_parent(
        parent_id=current_user.id,
        offset=offset,
        limit=page_size,
    )
    total = await service.count_for_parent(current_user.id)

    return StudentListResponse(
        students=[StudentResponse.model_validate(s) for s in students],
        total=total,
    )


@router.post("", response_model=StudentResponse, status_code=201)
async def create_student(
    data: StudentCreate,
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StudentResponse:
    """Create a new student profile.

    The student is automatically linked to the authenticated user as parent.

    Args:
        data: Student creation data.
        current_user: The authenticated user (becomes parent).
        db: Database session.

    Returns:
        The created student.

    Raises:
        ForbiddenError: If trying to create student for different parent.
    """
    # Ensure the student is being created for the current user
    if data.parent_id != current_user.id:
        raise ForbiddenError("Cannot create students for other users")

    service = StudentService(db)
    student = await service.create(data)

    return StudentResponse.model_validate(student)


@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(
    student_id: UUID,
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StudentResponse:
    """Get a student by ID.

    CRITICAL: Ownership verification - only the parent can access.

    Args:
        student_id: The student UUID.
        current_user: The authenticated user.
        db: Database session.

    Returns:
        The student profile.

    Raises:
        NotFoundError: If student not found.
        ForbiddenError: If user is not the parent.
    """
    service = StudentService(db)

    # This method includes ownership verification
    student = await service.get_by_id_for_user(student_id, current_user.id)

    if not student:
        # Check if student exists to differentiate 404 vs 403
        exists = await service.get_by_id(student_id)
        if exists:
            raise ForbiddenError("You do not have access to this student")
        raise NotFoundError("Student")

    return StudentResponse.model_validate(student)


@router.put("/{student_id}", response_model=StudentResponse)
async def update_student(
    student_id: UUID,
    data: StudentUpdate,
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StudentResponse:
    """Update a student profile.

    CRITICAL: Ownership verification - only the parent can update.

    Args:
        student_id: The student UUID.
        data: Update data.
        current_user: The authenticated user.
        db: Database session.

    Returns:
        The updated student profile.

    Raises:
        NotFoundError: If student not found.
        ForbiddenError: If user is not the parent.
    """
    service = StudentService(db)

    # This method includes ownership verification
    student = await service.update(student_id, data, current_user.id)

    if not student:
        # Check if student exists to differentiate 404 vs 403
        exists = await service.get_by_id(student_id)
        if exists:
            raise ForbiddenError("You do not have access to this student")
        raise NotFoundError("Student")

    return StudentResponse.model_validate(student)


@router.delete("/{student_id}", status_code=204)
async def delete_student(
    student_id: UUID,
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """Delete a student profile.

    CRITICAL: Ownership verification - only the parent can delete.
    WARNING: This cascades to delete all student data.

    Args:
        student_id: The student UUID.
        current_user: The authenticated user.
        db: Database session.

    Raises:
        NotFoundError: If student not found.
        ForbiddenError: If user is not the parent.
    """
    service = StudentService(db)

    # Check ownership first
    student = await service.get_by_id_for_user(student_id, current_user.id)

    if not student:
        exists = await service.get_by_id(student_id)
        if exists:
            raise ForbiddenError("You do not have access to this student")
        raise NotFoundError("Student")

    await service.delete(student_id, current_user.id)


@router.post("/{student_id}/onboarding/complete", response_model=StudentResponse)
async def complete_onboarding(
    student_id: UUID,
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StudentResponse:
    """Mark a student's onboarding as complete.

    Args:
        student_id: The student UUID.
        current_user: The authenticated user.
        db: Database session.

    Returns:
        The updated student profile.

    Raises:
        NotFoundError: If student not found.
        ForbiddenError: If user is not the parent.
    """
    service = StudentService(db)

    student = await service.mark_onboarding_complete(student_id, current_user.id)

    if not student:
        exists = await service.get_by_id(student_id)
        if exists:
            raise ForbiddenError("You do not have access to this student")
        raise NotFoundError("Student")

    return StudentResponse.model_validate(student)


@router.post("/{student_id}/activity", response_model=StudentResponse)
async def record_activity(
    student_id: UUID,
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StudentResponse:
    """Record student activity (updates last_active and streak).

    This should be called when a student starts a study session.

    Args:
        student_id: The student UUID.
        current_user: The authenticated user.
        db: Database session.

    Returns:
        The updated student profile.

    Raises:
        NotFoundError: If student not found.
        ForbiddenError: If user is not the parent.
    """
    user_service = UserService(db)
    student_service = StudentService(db)

    # Verify ownership
    if not await user_service.verify_owns_student(current_user.id, student_id):
        exists = await student_service.get_by_id(student_id)
        if exists:
            raise ForbiddenError("You do not have access to this student")
        raise NotFoundError("Student")

    # Update last active
    await student_service.update_last_active(student_id)

    # Update streak
    student = await student_service.update_streak(student_id, is_active_today=True)

    if not student:
        raise NotFoundError("Student")

    return StudentResponse.model_validate(student)
