"""Curriculum endpoints."""
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.exceptions import NotFoundError, ValidationError
from app.schemas.curriculum import (
    OutcomeListResponse,
    OutcomeResponse,
    StrandListResponse,
)
from app.services.curriculum_service import CurriculumService

settings = get_settings()

router = APIRouter()


@router.get("/outcomes", response_model=OutcomeListResponse)
async def get_outcomes(
    framework_code: str = Query("NSW", description="Framework code (REQUIRED for isolation)"),
    subject_id: UUID | None = Query(None, description="Filter by subject ID"),
    stage: str | None = Query(None, description="Filter by stage (e.g., S3, S4, S5)"),
    strand: str | None = Query(None, description="Filter by strand"),
    pathway: str | None = Query(None, description="Filter by pathway (e.g., 5.1, 5.2)"),
    search: str | None = Query(None, max_length=100, description="Search in code/description"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
) -> OutcomeListResponse:
    """Query curriculum outcomes with filtering.

    CRITICAL: Framework isolation - outcomes are always filtered by framework.
    The framework_code parameter is required to ensure proper data isolation.

    Args:
        framework_code: The framework code (default: NSW).
        subject_id: Optional filter by subject.
        stage: Optional filter by stage.
        strand: Optional filter by strand.
        pathway: Optional filter by pathway.
        search: Optional search term.
        page: Page number.
        page_size: Items per page.
        db: Database session.

    Returns:
        Paginated list of outcomes.

    Raises:
        NotFoundError: If the framework is not found.
    """
    # Validate page limit to prevent expensive offset queries
    if page > settings.max_page_number:
        raise ValidationError(
            message=f"Page number exceeds maximum allowed ({settings.max_page_number})",
            details={"max_page": settings.max_page_number, "requested_page": page},
        )

    service = CurriculumService(db)

    # Get framework ID from code - CRITICAL for isolation
    framework_id = await service.get_framework_id_by_code(framework_code)
    if not framework_id:
        raise NotFoundError("Framework")

    offset = (page - 1) * page_size
    outcomes = await service.query_outcomes(
        framework_id=framework_id,
        subject_id=subject_id,
        stage=stage,
        strand=strand,
        pathway=pathway,
        search=search,
        offset=offset,
        limit=page_size,
    )
    total = await service.count_outcomes(
        framework_id=framework_id,
        subject_id=subject_id,
        stage=stage,
        strand=strand,
        pathway=pathway,
        search=search,
    )

    return OutcomeListResponse.create(
        outcomes=[OutcomeResponse.model_validate(o) for o in outcomes],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/outcomes/{outcome_code}", response_model=OutcomeResponse)
async def get_outcome_by_code(
    outcome_code: str,
    framework_code: str = Query("NSW", description="Framework code"),
    db: AsyncSession = Depends(get_db),
) -> OutcomeResponse:
    """Get a curriculum outcome by its code.

    CRITICAL: Framework isolation - must specify framework.

    Args:
        outcome_code: The outcome code (e.g., MA3-RN-01).
        framework_code: The framework code (default: NSW).
        db: Database session.

    Returns:
        The curriculum outcome.

    Raises:
        NotFoundError: If the outcome is not found.
    """
    service = CurriculumService(db)
    outcome = await service.get_by_code(
        outcome_code=outcome_code,
        framework_code=framework_code,
    )

    if not outcome:
        raise NotFoundError("Outcome")

    return OutcomeResponse.model_validate(outcome)


@router.get("/outcomes/id/{outcome_id}", response_model=OutcomeResponse)
async def get_outcome_by_id(
    outcome_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> OutcomeResponse:
    """Get a curriculum outcome by its ID.

    Args:
        outcome_id: The outcome UUID.
        db: Database session.

    Returns:
        The curriculum outcome.

    Raises:
        NotFoundError: If the outcome is not found.
    """
    service = CurriculumService(db)
    outcome = await service.get_by_id(outcome_id)

    if not outcome:
        raise NotFoundError("Outcome")

    return OutcomeResponse.model_validate(outcome)


@router.get("/strands", response_model=StrandListResponse)
async def get_strands(
    framework_code: str = Query("NSW", description="Framework code (REQUIRED)"),
    subject_id: UUID | None = Query(None, description="Filter by subject ID"),
    db: AsyncSession = Depends(get_db),
) -> StrandListResponse:
    """Get distinct strands for a framework/subject.

    CRITICAL: Framework isolation - strands are filtered by framework.

    Args:
        framework_code: The framework code.
        subject_id: Optional filter by subject.
        db: Database session.

    Returns:
        List of distinct strand names.

    Raises:
        NotFoundError: If the framework is not found.
    """
    service = CurriculumService(db)

    # Get framework ID from code
    framework_id = await service.get_framework_id_by_code(framework_code)
    if not framework_id:
        raise NotFoundError("Framework")

    strands = await service.get_strands(
        framework_id=framework_id,
        subject_id=subject_id,
    )

    return StrandListResponse(
        strands=strands,
        framework_id=framework_id,
        subject_id=subject_id,
    )


@router.get("/stages", response_model=list[str])
async def get_stages(
    framework_code: str = Query("NSW", description="Framework code (REQUIRED)"),
    subject_id: UUID | None = Query(None, description="Filter by subject ID"),
    db: AsyncSession = Depends(get_db),
) -> list[str]:
    """Get distinct stages for a framework/subject.

    CRITICAL: Framework isolation - stages are filtered by framework.

    Args:
        framework_code: The framework code.
        subject_id: Optional filter by subject.
        db: Database session.

    Returns:
        List of distinct stage names.

    Raises:
        NotFoundError: If the framework is not found.
    """
    service = CurriculumService(db)

    # Get framework ID from code
    framework_id = await service.get_framework_id_by_code(framework_code)
    if not framework_id:
        raise NotFoundError("Framework")

    return await service.get_stages(
        framework_id=framework_id,
        subject_id=subject_id,
    )
