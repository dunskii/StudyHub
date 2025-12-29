"""Push notification service."""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.push_subscription import PushSubscription
from app.schemas.push import PushSubscriptionCreate, PushNotificationPayload


class PushService:
    """Service for managing push subscriptions and sending notifications."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_subscription(
        self,
        user_id: UUID,
        subscription: PushSubscriptionCreate,
        user_agent: Optional[str] = None,
    ) -> PushSubscription:
        """
        Create or update a push subscription.

        If the endpoint already exists, updates the keys and reactivates it.
        """
        # Check if subscription already exists
        result = await self.db.execute(
            select(PushSubscription).where(
                PushSubscription.endpoint == subscription.endpoint
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            # Update existing subscription
            existing.user_id = user_id
            existing.p256dh_key = subscription.keys.p256dh
            existing.auth_key = subscription.keys.auth
            existing.user_agent = user_agent
            existing.device_name = subscription.device_name
            existing.is_active = True
            existing.failed_attempts = 0
            existing.updated_at = datetime.now(timezone.utc)
            await self.db.commit()
            await self.db.refresh(existing)
            return existing

        # Create new subscription
        new_subscription = PushSubscription(
            user_id=user_id,
            endpoint=subscription.endpoint,
            p256dh_key=subscription.keys.p256dh,
            auth_key=subscription.keys.auth,
            user_agent=user_agent,
            device_name=subscription.device_name,
        )
        self.db.add(new_subscription)
        await self.db.commit()
        await self.db.refresh(new_subscription)
        return new_subscription

    async def get_user_subscriptions(self, user_id: UUID) -> list[PushSubscription]:
        """Get all active subscriptions for a user."""
        result = await self.db.execute(
            select(PushSubscription)
            .where(PushSubscription.user_id == user_id)
            .where(PushSubscription.is_active == True)
            .order_by(PushSubscription.created_at.desc())
        )
        return list(result.scalars().all())

    async def delete_subscription(self, user_id: UUID, endpoint: str) -> bool:
        """Delete a subscription by endpoint."""
        result = await self.db.execute(
            delete(PushSubscription)
            .where(PushSubscription.user_id == user_id)
            .where(PushSubscription.endpoint == endpoint)
        )
        await self.db.commit()
        return result.rowcount > 0

    async def delete_subscription_by_id(
        self, user_id: UUID, subscription_id: UUID
    ) -> bool:
        """Delete a subscription by ID."""
        result = await self.db.execute(
            delete(PushSubscription)
            .where(PushSubscription.user_id == user_id)
            .where(PushSubscription.id == subscription_id)
        )
        await self.db.commit()
        return result.rowcount > 0

    async def mark_subscription_failed(self, subscription_id: UUID) -> None:
        """Mark a subscription as failed (increment failed attempts)."""
        result = await self.db.execute(
            select(PushSubscription).where(PushSubscription.id == subscription_id)
        )
        subscription = result.scalar_one_or_none()

        if subscription:
            subscription.failed_attempts += 1
            if subscription.failed_attempts >= 3:
                subscription.is_active = False
            await self.db.commit()

    async def mark_subscription_used(self, subscription_id: UUID) -> None:
        """Mark a subscription as successfully used."""
        result = await self.db.execute(
            select(PushSubscription).where(PushSubscription.id == subscription_id)
        )
        subscription = result.scalar_one_or_none()

        if subscription:
            subscription.last_used_at = datetime.now(timezone.utc)
            subscription.failed_attempts = 0
            await self.db.commit()

    async def get_all_active_subscriptions(
        self, user_ids: Optional[list[UUID]] = None
    ) -> list[PushSubscription]:
        """Get all active subscriptions, optionally filtered by user IDs."""
        query = select(PushSubscription).where(PushSubscription.is_active == True)

        if user_ids:
            query = query.where(PushSubscription.user_id.in_(user_ids))

        result = await self.db.execute(query)
        return list(result.scalars().all())

    # Note: Actual push sending would require pywebpush library and VAPID keys
    # This is a placeholder for the send functionality
    async def send_notification(
        self,
        subscription: PushSubscription,
        payload: PushNotificationPayload,
    ) -> bool:
        """
        Send a push notification to a subscription.

        Returns True if successful, False otherwise.

        Note: This requires the pywebpush library and VAPID keys to be configured.
        For now, this is a placeholder that logs the notification.
        """
        # TODO: Implement actual push sending with pywebpush
        # from pywebpush import webpush, WebPushException
        #
        # try:
        #     webpush(
        #         subscription_info={
        #             "endpoint": subscription.endpoint,
        #             "keys": {
        #                 "p256dh": subscription.p256dh_key,
        #                 "auth": subscription.auth_key,
        #             },
        #         },
        #         data=payload.model_dump_json(),
        #         vapid_private_key=settings.VAPID_PRIVATE_KEY,
        #         vapid_claims={"sub": f"mailto:{settings.VAPID_EMAIL}"},
        #     )
        #     await self.mark_subscription_used(subscription.id)
        #     return True
        # except WebPushException as e:
        #     if e.response and e.response.status_code in (404, 410):
        #         # Subscription is invalid, deactivate it
        #         subscription.is_active = False
        #         await self.db.commit()
        #     else:
        #         await self.mark_subscription_failed(subscription.id)
        #     return False

        # Placeholder: log the notification
        import logging

        logger = logging.getLogger(__name__)
        logger.info(
            f"Would send push notification to {subscription.endpoint}: "
            f"{payload.title} - {payload.body}"
        )
        await self.mark_subscription_used(subscription.id)
        return True
