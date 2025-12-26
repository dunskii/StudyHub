"""Senior course endpoints."""
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import NotFoundError
from app.schemas.senior_course import SeniorCourseListResponse, SeniorCourseResponse
from app.services.senior_course_service import SeniorCourseService

router = APIRouter()


@router.get("", response_model=SeniorCourseListResponse)
async def get_senior_courses(
    framework_code: str = Query("NSW", description="Framework code (e.g., NSW for HSC)"),
    subject_id: UUID | None = Query(None, description="Filter by subject ID"),
    active_only: bool = Query(True, description="Only return active courses"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
) -> SeniorCourseListResponse:
    """Get all senior courses for a framework.

    Returns a paginated list of senior courses (e.g., HSC courses for NSW).
    Framework isolation ensures only courses for the specified framework
    are returned.

    Args:
        framework_code: The framework code (default: NSW for HSC).
        subject_id: Optional filter by subject.
        active_only: If True, only return active courses.
        page: Page number (1-indexed).
        page_size: Number of items per page.
        db: Database session.

    Returns:
        Paginated list of senior courses.

    Raises:
        NotFoundError: If the framework is not found.
    """
    service = SeniorCourseService(db)

    # Get framework ID from code
    framework_id = await service.get_framework_id_by_code(framework_code)
    if not framework_id:
        raise NotFoundError("Framework")

    offset = (page - 1) * page_size
    courses = await service.get_all(
        framework_id=framework_id,
        subject_id=subject_id,
        active_only=active_only,
        offset=offset,
        limit=page_size,
    )
    total = await service.count(
        framework_id=framework_id,
        subject_id=subject_id,
        active_only=active_only,
    )

    return SeniorCourseListResponse.create(
        courses=[SeniorCourseResponse.model_validate(c) for c in courses],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/atar", response_model=SeniorCourseListResponse)
async def get_atar_courses(
    framework_code: str = Query("NSW", description="Framework code"),
    subject_id: UUID | None = Query(None, description="Filter by subject ID"),
    db: AsyncSession = Depends(get_db),
) -> SeniorCourseListResponse:
    """Get all ATAR-eligible senior courses.

    Returns courses that contribute to the ATAR (Australian Tertiary
    Admission Rank) for university admission.

    Args:
        framework_code: The framework code (default: NSW).
        subject_id: Optional filter by subject.
        db: Database session.

    Returns:
        List of ATAR-eligible courses.

    Raises:
        NotFoundError: If the framework is not found.
    """
    service = SeniorCourseService(db)

    # Get framework ID from code
    framework_id = await service.get_framework_id_by_code(framework_code)
    if not framework_id:
        raise NotFoundError("Framework")

    courses = await service.get_atar_courses(
        framework_id=framework_id,
        subject_id=subject_id,
    )

    return SeniorCourseListResponse.create(
        courses=[SeniorCourseResponse.model_validate(c) for c in courses],
        total=len(courses),
        page=1,
        page_size=len(courses) or 1,
    )


@router.get("/{course_id}", response_model=SeniorCourseResponse)
async def get_senior_course(
    course_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> SeniorCourseResponse:
    """Get a senior course by ID.

    Args:
        course_id: The course UUID.
        db: Database session.

    Returns:
        The senior course.

    Raises:
        NotFoundError: If the course is not found.
    """
    service = SeniorCourseService(db)
    course = await service.get_by_id(course_id)

    if not course:
        raise NotFoundError("Senior Course")

    return SeniorCourseResponse.model_validate(course)


@router.get("/code/{code}", response_model=SeniorCourseResponse)
async def get_senior_course_by_code(
    code: str,
    framework_code: str = Query("NSW", description="Framework code"),
    db: AsyncSession = Depends(get_db),
) -> SeniorCourseResponse:
    """Get a senior course by its code.

    CRITICAL: Framework isolation - courses are scoped by framework.

    Args:
        code: The course code.
        framework_code: The framework code (default: NSW).
        db: Database session.

    Returns:
        The senior course.

    Raises:
        NotFoundError: If the course is not found.
    """
    service = SeniorCourseService(db)
    course = await service.get_by_code(
        code=code,
        framework_code=framework_code,
    )

    if not course:
        raise NotFoundError("Senior Course")

    return SeniorCourseResponse.model_validate(course)


@router.get("/subject/{subject_id}", response_model=list[SeniorCourseResponse])
async def get_courses_by_subject(
    subject_id: UUID,
    framework_code: str = Query("NSW", description="Framework code for isolation (e.g., NSW)"),
    active_only: bool = Query(True, description="Only return active courses"),
    db: AsyncSession = Depends(get_db),
) -> list[SeniorCourseResponse]:
    """Get all senior courses for a subject.

    Framework isolation is enforced to ensure only courses from the
    specified framework are returned.

    Args:
        subject_id: The subject UUID.
        framework_code: The framework code (default: NSW).
        active_only: If True, only return active courses.
        db: Database session.

    Returns:
        List of senior courses for the subject.

    Raises:
        NotFoundError: If the framework is not found.
    """
    service = SeniorCourseService(db)

    # Verify framework exists
    framework_id = await service.get_framework_id_by_code(framework_code)
    if not framework_id:
        raise NotFoundError("Framework")

    courses = await service.get_by_subject(
        subject_id=subject_id,
        framework_id=framework_id,
        active_only=active_only,
    )

    return [SeniorCourseResponse.model_validate(c) for c in courses]
