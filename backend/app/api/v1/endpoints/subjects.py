"""Subject endpoints."""
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.exceptions import NotFoundError, ValidationError
from app.schemas.curriculum import OutcomeListResponse, OutcomeResponse
from app.schemas.subject import SubjectListResponse, SubjectResponse
from app.services.curriculum_service import CurriculumService
from app.services.subject_service import SubjectService

settings = get_settings()

router = APIRouter()


@router.get("", response_model=SubjectListResponse)
async def get_subjects(
    framework_code: str = Query("NSW", description="Framework code (e.g., NSW, VIC)"),
    active_only: bool = Query(True, description="Only return active subjects"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
) -> SubjectListResponse:
    """Get all subjects for a framework.

    Returns a paginated list of subjects filtered by framework.
    Framework isolation ensures only subjects for the specified
    framework are returned.

    Args:
        framework_code: The framework code (default: NSW).
        active_only: If True, only return active subjects.
        page: Page number (1-indexed).
        page_size: Number of items per page.
        db: Database session.

    Returns:
        Paginated list of subjects.
    """
    # Validate page limit to prevent expensive offset queries
    if page > settings.max_page_number:
        raise ValidationError(
            message=f"Page number exceeds maximum allowed ({settings.max_page_number})",
            details={"max_page": settings.max_page_number, "requested_page": page},
        )

    service = SubjectService(db)

    # Get framework ID from code
    framework_id = await service.get_framework_id_by_code(framework_code)
    if not framework_id:
        raise NotFoundError("Framework")

    offset = (page - 1) * page_size
    subjects = await service.get_all(
        framework_id=framework_id,
        active_only=active_only,
        offset=offset,
        limit=page_size,
    )
    total = await service.count(
        framework_id=framework_id,
        active_only=active_only,
    )

    return SubjectListResponse.create(
        subjects=[SubjectResponse.model_validate(s) for s in subjects],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{subject_id}", response_model=SubjectResponse)
async def get_subject(
    subject_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> SubjectResponse:
    """Get a subject by ID.

    Args:
        subject_id: The subject UUID.
        db: Database session.

    Returns:
        The subject.

    Raises:
        NotFoundError: If the subject is not found.
    """
    service = SubjectService(db)
    subject = await service.get_by_id(subject_id)

    if not subject:
        raise NotFoundError("Subject")

    return SubjectResponse.model_validate(subject)


@router.get("/code/{code}", response_model=SubjectResponse)
async def get_subject_by_code(
    code: str,
    framework_code: str = Query("NSW", description="Framework code"),
    db: AsyncSession = Depends(get_db),
) -> SubjectResponse:
    """Get a subject by its code.

    CRITICAL: Framework isolation - subjects are scoped by framework.

    Args:
        code: The subject code (e.g., MATH, ENG).
        framework_code: The framework code (default: NSW).
        db: Database session.

    Returns:
        The subject.

    Raises:
        NotFoundError: If the subject is not found.
    """
    service = SubjectService(db)
    subject = await service.get_by_code(
        code=code,
        framework_code=framework_code,
    )

    if not subject:
        raise NotFoundError("Subject")

    return SubjectResponse.model_validate(subject)


@router.get("/{subject_id}/outcomes", response_model=OutcomeListResponse)
async def get_subject_outcomes(
    subject_id: UUID,
    stage: str | None = Query(None, description="Filter by stage (e.g., S3, S4)"),
    strand: str | None = Query(None, description="Filter by strand"),
    pathway: str | None = Query(None, description="Filter by pathway (e.g., 5.1)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
) -> OutcomeListResponse:
    """Get curriculum outcomes for a subject.

    Returns a paginated list of curriculum outcomes for the specified
    subject, optionally filtered by stage, strand, or pathway.

    Args:
        subject_id: The subject UUID.
        stage: Optional filter by stage.
        strand: Optional filter by strand.
        pathway: Optional filter by pathway.
        page: Page number.
        page_size: Items per page.
        db: Database session.

    Returns:
        Paginated list of outcomes.

    Raises:
        NotFoundError: If the subject is not found.
    """
    # Validate page limit to prevent expensive offset queries
    if page > settings.max_page_number:
        raise ValidationError(
            message=f"Page number exceeds maximum allowed ({settings.max_page_number})",
            details={"max_page": settings.max_page_number, "requested_page": page},
        )

    subject_service = SubjectService(db)
    curriculum_service = CurriculumService(db)

    # Verify subject exists
    subject = await subject_service.get_by_id(subject_id)
    if not subject:
        raise NotFoundError("Subject")

    # Get outcomes for the subject
    offset = (page - 1) * page_size
    outcomes = await curriculum_service.query_outcomes(
        framework_id=subject.framework_id,
        subject_id=subject_id,
        stage=stage,
        strand=strand,
        pathway=pathway,
        offset=offset,
        limit=page_size,
    )
    total = await curriculum_service.count_outcomes(
        framework_id=subject.framework_id,
        subject_id=subject_id,
        stage=stage,
        strand=strand,
        pathway=pathway,
    )

    return OutcomeListResponse.create(
        outcomes=[OutcomeResponse.model_validate(o) for o in outcomes],
        total=total,
        page=page,
        page_size=page_size,
    )
