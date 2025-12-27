"""User endpoints for parent account management."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import AlreadyExistsError, NotFoundError
from app.core.security import (
    AuthenticatedUser,
    auth_rate_limiter,
    require_auth_rate_limit,
)
from app.schemas.student import StudentListResponse, StudentResponse
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.schemas.ai_interaction import (
    AIInteractionListResponse,
    AIInteractionResponse,
    TokenUsageResponse,
)
from app.services.data_export_service import DataExportService
from app.services.student_service import StudentService
from app.services.user_service import UserService
from app.services.ai_interaction_service import AIInteractionService
from app.models.student import Student

router = APIRouter()


@router.post("", response_model=UserResponse, status_code=201)
async def create_user(
    request: Request,
    data: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _rate_limit: None = Depends(require_auth_rate_limit),
) -> UserResponse:
    """Create a new user account after Supabase signup.

    This endpoint is called after a successful Supabase authentication
    to sync the user data to our database.

    Rate limited to prevent abuse (5 attempts per minute, 5 min lockout).

    Args:
        request: The FastAPI request object.
        data: User creation data including Supabase auth ID.
        db: Database session.
        _rate_limit: Rate limiting dependency (not used directly).

    Returns:
        The created user.

    Raises:
        AlreadyExistsError: If user with this email or Supabase ID already exists.
        HTTPException: 429 if rate limited.
    """
    # Record this attempt
    auth_rate_limiter.record_attempt(request)

    service = UserService(db)

    # Check for existing user by email
    existing = await service.get_by_email(data.email)
    if existing:
        raise AlreadyExistsError("User", "email")

    # Check for existing user by Supabase ID
    existing = await service.get_by_supabase_id(data.supabase_auth_id)
    if existing:
        raise AlreadyExistsError("User", "supabase_auth_id")

    user = await service.create(data)

    # Clear rate limit attempts on successful creation
    auth_rate_limiter.clear_attempts(request)

    return UserResponse.model_validate(user)


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserResponse:
    """Get the current authenticated user's profile.

    Args:
        current_user: The authenticated user from the token.
        db: Database session.

    Returns:
        The user's profile.
    """
    service = UserService(db)
    user = await service.get_by_id(current_user.id)

    if not user:
        raise NotFoundError("User")

    # Update last login
    await service.update_last_login(current_user.id)

    return UserResponse.model_validate(user)


@router.put("/me", response_model=UserResponse)
async def update_current_user_profile(
    data: UserUpdate,
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserResponse:
    """Update the current authenticated user's profile.

    Args:
        data: Update data.
        current_user: The authenticated user from the token.
        db: Database session.

    Returns:
        The updated user profile.

    Raises:
        NotFoundError: If the user is not found.
    """
    service = UserService(db)
    user = await service.update(current_user.id, data)

    if not user:
        raise NotFoundError("User")

    return UserResponse.model_validate(user)


@router.get("/me/students", response_model=StudentListResponse)
async def get_current_user_students(
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
) -> StudentListResponse:
    """Get all students belonging to the current user.

    Args:
        current_user: The authenticated user from the token.
        db: Database session.
        page: Page number (1-indexed).
        page_size: Items per page.

    Returns:
        List of the user's students.
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


@router.post("/me/accept-privacy-policy", response_model=UserResponse)
async def accept_privacy_policy(
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserResponse:
    """Record that the user has accepted the privacy policy.

    Args:
        current_user: The authenticated user from the token.
        db: Database session.

    Returns:
        The updated user profile.
    """
    service = UserService(db)
    user = await service.accept_privacy_policy(current_user.id)

    if not user:
        raise NotFoundError("User")

    return UserResponse.model_validate(user)


@router.post("/me/accept-terms", response_model=UserResponse)
async def accept_terms(
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserResponse:
    """Record that the user has accepted the terms of service.

    Args:
        current_user: The authenticated user from the token.
        db: Database session.

    Returns:
        The updated user profile.
    """
    service = UserService(db)
    user = await service.accept_terms(current_user.id)

    if not user:
        raise NotFoundError("User")

    return UserResponse.model_validate(user)


@router.get("/me/export")
async def export_user_data(
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Export all user data for privacy compliance.

    This endpoint implements data portability requirements for:
    - Australian Privacy Act
    - GDPR Article 20 (Right to data portability)

    Returns all data associated with the user's account and their
    students in a portable JSON format.

    Args:
        current_user: The authenticated user from the token.
        db: Database session.

    Returns:
        JSON export of all user data including:
        - Account information
        - Student profiles
        - Subject enrolments
        - Study session history
    """
    service = DataExportService(db)
    return await service.export_user_data(current_user.id)


# =============================================================================
# Parent AI Visibility Endpoints
# =============================================================================


@router.get("/me/students/{student_id}/ai-interactions", response_model=AIInteractionListResponse)
async def get_child_ai_interactions(
    student_id: UUID,
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    flagged_only: bool = Query(default=False, description="Only return flagged interactions"),
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
) -> AIInteractionListResponse:
    """Get AI interactions for a child (parent oversight).

    Parents can view their children's AI conversations for oversight,
    not surveillance. This helps parents:
    - Monitor learning progress
    - Review flagged conversations
    - Ensure appropriate AI interactions

    Args:
        student_id: The student (child) ID.
        current_user: The authenticated parent.
        db: Database session.
        flagged_only: Whether to only return flagged interactions.
        page: Page number (1-indexed).
        page_size: Items per page.

    Returns:
        Paginated list of AI interactions.

    Raises:
        HTTPException: 403 if not the parent, 404 if student not found.
    """
    # Verify parent-child relationship
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    if student.parent_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own children's AI interactions",
        )

    # Get interactions
    ai_service = AIInteractionService(db)
    offset = (page - 1) * page_size

    interactions, total = await ai_service.get_student_interactions(
        student_id=student_id,
        flagged_only=flagged_only,
        limit=page_size,
        offset=offset,
    )

    # Get flagged count
    flagged_count = await ai_service.get_flagged_count(student_id)

    return AIInteractionListResponse(
        interactions=[
            AIInteractionResponse.model_validate(i) for i in interactions
        ],
        total=total,
        flagged_count=flagged_count,
        limit=page_size,
        offset=offset,
    )


@router.get("/me/students/{student_id}/ai-interactions/flagged", response_model=AIInteractionListResponse)
async def get_child_flagged_interactions(
    student_id: UUID,
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
) -> AIInteractionListResponse:
    """Get flagged AI interactions for a child.

    Convenience endpoint for quickly reviewing interactions that were
    flagged for parent attention.

    Args:
        student_id: The student (child) ID.
        current_user: The authenticated parent.
        db: Database session.
        page: Page number (1-indexed).
        page_size: Items per page.

    Returns:
        Paginated list of flagged AI interactions.
    """
    # Verify parent-child relationship
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    if student.parent_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own children's AI interactions",
        )

    # Get flagged interactions
    ai_service = AIInteractionService(db)
    offset = (page - 1) * page_size

    interactions, total = await ai_service.get_student_interactions(
        student_id=student_id,
        flagged_only=True,
        limit=page_size,
        offset=offset,
    )

    return AIInteractionListResponse(
        interactions=[
            AIInteractionResponse.model_validate(i) for i in interactions
        ],
        total=total,
        flagged_count=total,  # All results are flagged
        limit=page_size,
        offset=offset,
    )


@router.get("/me/students/{student_id}/ai-usage", response_model=TokenUsageResponse)
async def get_child_ai_usage(
    student_id: UUID,
    current_user: AuthenticatedUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    period: str = Query(default="today", description="Period: today, week, month, all_time"),
) -> TokenUsageResponse:
    """Get AI token usage statistics for a child.

    Returns token usage and estimated cost for the specified period.

    Args:
        student_id: The student (child) ID.
        current_user: The authenticated parent.
        db: Database session.
        period: Time period for statistics.

    Returns:
        Token usage statistics.
    """
    from datetime import datetime, timedelta, timezone

    # Verify parent-child relationship
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    if student.parent_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own children's AI usage",
        )

    # Calculate since date based on period
    now = datetime.now(timezone.utc)
    since = None

    if period == "today":
        since = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        since = now - timedelta(days=7)
    elif period == "month":
        since = now - timedelta(days=30)
    # else: all_time - since remains None

    # Get usage
    ai_service = AIInteractionService(db)
    token_usage = await ai_service.get_student_token_usage(student_id, since)
    cost = await ai_service.get_student_cost(student_id, since)

    return TokenUsageResponse(
        student_id=student_id,
        input_tokens=token_usage["input_tokens"],
        output_tokens=token_usage["output_tokens"],
        total_tokens=token_usage["total_tokens"],
        estimated_cost_usd=cost,
        period=period,
    )
