"""Curriculum framework endpoints."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import AlreadyExistsError, NotFoundError
from app.core.security import AuthenticatedUser, OptionalUser
from app.schemas.framework import (
    FrameworkCreate,
    FrameworkListResponse,
    FrameworkResponse,
    FrameworkUpdate,
)
from app.services.framework_service import FrameworkService

router = APIRouter(prefix="/frameworks", tags=["frameworks"])


@router.get("", response_model=FrameworkListResponse)
async def get_frameworks(
    active_only: bool = True,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: OptionalUser = None,  # noqa: ARG001
) -> FrameworkListResponse:
    """Get all curriculum frameworks with pagination.

    This endpoint is publicly accessible to allow unauthenticated
    users to browse available frameworks.

    Args:
        active_only: If True, only return active frameworks (default: True).
        page: Page number (1-indexed).
        page_size: Number of items per page (max 100).
        db: Database session.
        current_user: Optional authenticated user.

    Returns:
        Paginated list of curriculum frameworks.
    """
    # Validate pagination params
    page = max(1, page)
    page_size = min(max(1, page_size), 100)
    offset = (page - 1) * page_size

    service = FrameworkService(db)
    frameworks = await service.get_all(
        active_only=active_only,
        offset=offset,
        limit=page_size,
    )
    total = await service.count(active_only=active_only)

    return FrameworkListResponse.create(
        frameworks=[FrameworkResponse.model_validate(f) for f in frameworks],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/default", response_model=FrameworkResponse)
async def get_default_framework(
    db: AsyncSession = Depends(get_db),
) -> FrameworkResponse:
    """Get the default curriculum framework.

    Returns:
        The default curriculum framework (NSW).

    Raises:
        NotFoundError: If no default framework is set.
    """
    service = FrameworkService(db)
    framework = await service.get_default()

    if not framework:
        raise NotFoundError("Default framework")

    return FrameworkResponse.model_validate(framework)


@router.get("/{code}", response_model=FrameworkResponse)
async def get_framework_by_code(
    code: str,
    db: AsyncSession = Depends(get_db),
) -> FrameworkResponse:
    """Get a curriculum framework by its code.

    Args:
        code: The framework code (e.g., 'NSW', 'VIC').
        db: Database session.

    Returns:
        The curriculum framework.

    Raises:
        NotFoundError: If the framework is not found.
    """
    service = FrameworkService(db)
    framework = await service.get_by_code(code)

    if not framework:
        raise NotFoundError("Framework")

    return FrameworkResponse.model_validate(framework)


@router.post("", response_model=FrameworkResponse, status_code=status.HTTP_201_CREATED)
async def create_framework(
    data: FrameworkCreate,
    current_user: AuthenticatedUser,
    db: AsyncSession = Depends(get_db),
) -> FrameworkResponse:
    """Create a new curriculum framework.

    Requires authentication. Only admins should be able to create frameworks
    (authorization check to be added when roles are implemented).

    Args:
        data: The framework creation data.
        db: Database session.
        current_user: The authenticated user.

    Returns:
        The created framework.

    Raises:
        AlreadyExistsError: If a framework with the same code already exists.
    """
    service = FrameworkService(db)

    # Check if code already exists
    existing = await service.get_by_code(data.code)
    if existing:
        raise AlreadyExistsError("Framework")

    framework = await service.create(data)
    return FrameworkResponse.model_validate(framework)


@router.patch("/{code}", response_model=FrameworkResponse)
async def update_framework(
    code: str,
    data: FrameworkUpdate,
    current_user: AuthenticatedUser,
    db: AsyncSession = Depends(get_db),
) -> FrameworkResponse:
    """Update a curriculum framework.

    Requires authentication. Only admins should be able to update frameworks
    (authorization check to be added when roles are implemented).

    Args:
        code: The framework code.
        data: The update data.
        db: Database session.
        current_user: The authenticated user.

    Returns:
        The updated framework.

    Raises:
        NotFoundError: If the framework is not found.
    """
    service = FrameworkService(db)
    framework = await service.get_by_code(code)

    if not framework:
        raise NotFoundError("Framework")

    updated = await service.update(framework.id, data)
    return FrameworkResponse.model_validate(updated)
