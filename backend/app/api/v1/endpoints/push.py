"""Push notification API endpoints."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.security import push_rate_limiter, require_push_rate_limit
from app.models import User
from app.schemas.push import (
    PushSubscriptionCreate,
    PushSubscriptionResponse,
    PushSubscriptionList,
    PushTestRequest,
    PushNotificationPayload,
)
from app.services.push_service import PushService

router = APIRouter(prefix="/push", tags=["push"])

# Type aliases
AuthenticatedUser = Annotated[User, Depends(get_current_user)]
Database = Annotated[AsyncSession, Depends(get_db)]
RateLimited = Annotated[None, Depends(require_push_rate_limit)]


@router.post(
    "/subscribe",
    response_model=PushSubscriptionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Subscribe to push notifications",
    description="Register a browser push subscription for the current user.",
)
async def subscribe_push(
    request: Request,
    subscription: PushSubscriptionCreate,
    current_user: AuthenticatedUser,
    db: Database,
    _rate_limit: RateLimited,
    user_agent: str = Header(None),
):
    """Create or update a push subscription for the current user."""
    push_rate_limiter.record_attempt(request)
    service = PushService(db)
    result = await service.create_subscription(
        user_id=current_user.id,
        subscription=subscription,
        user_agent=user_agent,
    )
    return result


@router.delete(
    "/unsubscribe",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Unsubscribe from push notifications",
    description="Remove a push subscription by endpoint.",
)
async def unsubscribe_push(
    request: Request,
    endpoint: str,
    current_user: AuthenticatedUser,
    db: Database,
    _rate_limit: RateLimited,
):
    """Remove a push subscription for the current user."""
    push_rate_limiter.record_attempt(request)
    service = PushService(db)
    deleted = await service.delete_subscription(
        user_id=current_user.id,
        endpoint=endpoint,
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found",
        )


@router.delete(
    "/subscriptions/{subscription_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a push subscription",
    description="Remove a specific push subscription by ID.",
)
async def delete_subscription(
    request: Request,
    subscription_id: UUID,
    current_user: AuthenticatedUser,
    db: Database,
    _rate_limit: RateLimited,
):
    """Delete a specific push subscription."""
    push_rate_limiter.record_attempt(request)
    service = PushService(db)
    deleted = await service.delete_subscription_by_id(
        user_id=current_user.id,
        subscription_id=subscription_id,
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found",
        )


@router.get(
    "/subscriptions",
    response_model=PushSubscriptionList,
    summary="List push subscriptions",
    description="Get all active push subscriptions for the current user.",
)
async def list_subscriptions(
    current_user: AuthenticatedUser,
    db: Database,
):
    """List all active push subscriptions for the current user."""
    service = PushService(db)
    subscriptions = await service.get_user_subscriptions(current_user.id)
    return PushSubscriptionList(
        subscriptions=[
            PushSubscriptionResponse.model_validate(s) for s in subscriptions
        ],
        total=len(subscriptions),
    )


@router.post(
    "/test",
    status_code=status.HTTP_200_OK,
    summary="Send test notification",
    description="Send a test push notification to all of the user's subscriptions.",
)
async def send_test_notification(
    http_request: Request,
    request: PushTestRequest,
    current_user: AuthenticatedUser,
    db: Database,
    _rate_limit: RateLimited,
):
    """Send a test push notification to all user's subscriptions."""
    push_rate_limiter.record_attempt(http_request)
    service = PushService(db)
    subscriptions = await service.get_user_subscriptions(current_user.id)

    if not subscriptions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active push subscriptions found",
        )

    payload = PushNotificationPayload(
        title=request.title,
        body=request.body,
        icon="/pwa-192x192.svg",
        tag="test",
    )

    sent = 0
    failed = 0
    for subscription in subscriptions:
        success = await service.send_notification(subscription, payload)
        if success:
            sent += 1
        else:
            failed += 1

    return {
        "sent": sent,
        "failed": failed,
        "total": len(subscriptions),
    }
