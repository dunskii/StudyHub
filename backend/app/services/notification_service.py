"""Notification service for parent alerts and updates.

Handles:
- Creating notifications
- Managing notification preferences
- Marking notifications as read
- Preference-aware notification delivery
"""
from __future__ import annotations

import logging
from datetime import datetime, time, timedelta, timezone
from typing import Any, cast
from uuid import UUID

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import (
    Notification,
    NotificationType,
    NotificationPriority,
    DeliveryMethod,
)
from app.models.notification_preference import NotificationPreference
from app.models.student import Student
from app.models.user import User
from app.schemas.notification import (
    NotificationCreate,
    NotificationPreferencesUpdate,
    NotificationTypeEnum,
    NotificationPriorityEnum,
    DeliveryMethodEnum,
)

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for managing notifications and preferences."""

    def __init__(self, db: AsyncSession) -> None:
        """Initialise with database session.

        Args:
            db: Async database session.
        """
        self.db = db

    # =========================================================================
    # Notification CRUD
    # =========================================================================

    async def create(self, data: NotificationCreate) -> Notification:
        """Create a new notification.

        Args:
            data: Notification creation data.

        Returns:
            The created notification.
        """
        notification = Notification(
            user_id=data.user_id,
            type=data.type,
            title=data.title,
            message=data.message,
            priority=data.priority,
            related_student_id=data.related_student_id,
            related_subject_id=data.related_subject_id,
            related_goal_id=data.related_goal_id,
            delivery_method=data.delivery_method,
            data=data.data,
        )

        self.db.add(notification)
        await self.db.commit()
        await self.db.refresh(notification)

        logger.info(
            f"Created notification {notification.id} of type {data.type} "
            f"for user {data.user_id}"
        )
        return notification

    async def create_if_enabled(
        self,
        user_id: UUID,
        notification_type: str,
        title: str,
        message: str,
        priority: str = NotificationPriority.NORMAL,
        related_student_id: UUID | None = None,
        related_subject_id: UUID | None = None,
        related_goal_id: UUID | None = None,
        data: dict[str, Any] | None = None,
    ) -> Notification | None:
        """Create a notification only if the user has it enabled.

        Args:
            user_id: The user to notify.
            notification_type: Type of notification.
            title: Notification title.
            message: Notification message.
            priority: Notification priority.
            related_student_id: Related student if applicable.
            related_subject_id: Related subject if applicable.
            related_goal_id: Related goal if applicable.
            data: Additional data.

        Returns:
            The notification if created, None if disabled by preferences.
        """
        # Check preferences
        prefs = await self.get_preferences(user_id)
        if prefs and not prefs.should_send_notification(notification_type):
            logger.debug(
                f"Notification type {notification_type} disabled for user {user_id}"
            )
            return None

        # Determine delivery method based on preferences
        delivery_method = DeliveryMethod.IN_APP
        if prefs and prefs.should_send_email():
            delivery_method = DeliveryMethod.BOTH

        return await self.create(
            NotificationCreate(
                user_id=user_id,
                type=cast(NotificationTypeEnum, notification_type),
                title=title,
                message=message,
                priority=cast(NotificationPriorityEnum, priority),
                related_student_id=related_student_id,
                related_subject_id=related_subject_id,
                related_goal_id=related_goal_id,
                delivery_method=cast(DeliveryMethodEnum, delivery_method),
                data=data,
            )
        )

    async def get_by_id(self, notification_id: UUID, user_id: UUID) -> Notification | None:
        """Get a notification by ID with ownership verification.

        Args:
            notification_id: The notification UUID.
            user_id: The user's UUID.

        Returns:
            The notification if found and owned, None otherwise.
        """
        result = await self.db.execute(
            select(Notification)
            .where(Notification.id == notification_id)
            .where(Notification.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_for_user(
        self,
        user_id: UUID,
        unread_only: bool = False,
        notification_type: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Notification], int, int]:
        """Get notifications for a user.

        Args:
            user_id: The user's UUID.
            unread_only: If True, only return unread notifications.
            notification_type: Optional filter by type.
            limit: Maximum number to return.
            offset: Number to skip.

        Returns:
            Tuple of (notifications, total count, unread count).
        """
        # Build query
        query = select(Notification).where(Notification.user_id == user_id)

        if unread_only:
            query = query.where(Notification.read_at.is_(None))

        if notification_type:
            query = query.where(Notification.type == notification_type)

        # Get total count
        count_query = (
            select(func.count(Notification.id))
            .where(Notification.user_id == user_id)
        )
        if unread_only:
            count_query = count_query.where(Notification.read_at.is_(None))
        if notification_type:
            count_query = count_query.where(Notification.type == notification_type)

        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        # Get unread count
        unread_result = await self.db.execute(
            select(func.count(Notification.id))
            .where(Notification.user_id == user_id)
            .where(Notification.read_at.is_(None))
        )
        unread_count = unread_result.scalar() or 0

        # Get notifications
        query = query.order_by(Notification.created_at.desc()).offset(offset).limit(limit)
        result = await self.db.execute(query)
        notifications = list(result.scalars().all())

        return notifications, total, unread_count

    async def mark_read(self, notification_id: UUID, user_id: UUID) -> bool:
        """Mark a notification as read.

        Args:
            notification_id: The notification UUID.
            user_id: The user's UUID.

        Returns:
            True if marked, False if not found.
        """
        notification = await self.get_by_id(notification_id, user_id)
        if not notification:
            return False

        if not notification.read_at:
            notification.read_at = datetime.now(timezone.utc)
            await self.db.commit()

        return True

    async def mark_all_read(self, user_id: UUID) -> int:
        """Mark all notifications as read for a user.

        Args:
            user_id: The user's UUID.

        Returns:
            Number of notifications marked as read.
        """
        # First count unread
        count_result = await self.db.execute(
            select(func.count(Notification.id))
            .where(Notification.user_id == user_id)
            .where(Notification.read_at.is_(None))
        )
        count = count_result.scalar() or 0

        # Then update
        await self.db.execute(
            update(Notification)
            .where(Notification.user_id == user_id)
            .where(Notification.read_at.is_(None))
            .values(read_at=datetime.now(timezone.utc))
        )
        await self.db.commit()
        return count

    async def delete_old_notifications(
        self, user_id: UUID, days_old: int = 90
    ) -> int:
        """Delete old read notifications using batch delete.

        Args:
            user_id: The user's UUID.
            days_old: Delete notifications older than this many days.

        Returns:
            Number of notifications deleted.
        """
        cutoff = datetime.now(timezone.utc) - timedelta(days=days_old)

        # Count first (for return value and logging)
        count_result = await self.db.execute(
            select(func.count(Notification.id))
            .where(Notification.user_id == user_id)
            .where(Notification.read_at.isnot(None))
            .where(Notification.created_at < cutoff)
        )
        count = count_result.scalar() or 0

        if count > 0:
            # Batch delete using single DELETE statement
            await self.db.execute(
                delete(Notification)
                .where(Notification.user_id == user_id)
                .where(Notification.read_at.isnot(None))
                .where(Notification.created_at < cutoff)
            )
            await self.db.commit()
            logger.info(f"Deleted {count} old notifications for user {user_id}")

        return count

    async def get_unread_count(self, user_id: UUID) -> int:
        """Get count of unread notifications.

        Args:
            user_id: The user's UUID.

        Returns:
            Number of unread notifications.
        """
        result = await self.db.execute(
            select(func.count(Notification.id))
            .where(Notification.user_id == user_id)
            .where(Notification.read_at.is_(None))
        )
        return result.scalar() or 0

    # =========================================================================
    # Notification Preferences
    # =========================================================================

    async def get_preferences(self, user_id: UUID) -> NotificationPreference | None:
        """Get notification preferences for a user.

        Args:
            user_id: The user's UUID.

        Returns:
            Preferences or None if not set.
        """
        result = await self.db.execute(
            select(NotificationPreference)
            .where(NotificationPreference.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_or_create_preferences(self, user_id: UUID) -> NotificationPreference:
        """Get or create notification preferences for a user.

        Args:
            user_id: The user's UUID.

        Returns:
            The preferences (existing or newly created with defaults).
        """
        prefs = await self.get_preferences(user_id)
        if prefs:
            return prefs

        # Verify user exists
        user = await self.db.get(User, user_id)
        if not user:
            raise ValueError(f"User {user_id} not found")

        # Create with defaults
        prefs = NotificationPreference(user_id=user_id)
        self.db.add(prefs)
        await self.db.commit()
        await self.db.refresh(prefs)

        logger.info(f"Created default notification preferences for user {user_id}")
        return prefs

    async def update_preferences(
        self, user_id: UUID, data: NotificationPreferencesUpdate
    ) -> NotificationPreference:
        """Update notification preferences.

        Args:
            user_id: The user's UUID.
            data: Update data.

        Returns:
            The updated preferences.
        """
        prefs = await self.get_or_create_preferences(user_id)

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(prefs, field, value)

        await self.db.commit()
        await self.db.refresh(prefs)

        logger.info(f"Updated notification preferences for user {user_id}")
        return prefs

    # =========================================================================
    # Convenience Methods for Common Notifications
    # =========================================================================

    async def notify_achievement(
        self,
        parent_id: UUID,
        student_id: UUID,
        achievement_name: str,
        achievement_description: str,
    ) -> Notification | None:
        """Create an achievement notification.

        Args:
            parent_id: The parent's user UUID.
            student_id: The student UUID.
            achievement_name: Name of the achievement.
            achievement_description: Description of what was achieved.

        Returns:
            The notification if created.
        """
        # Get student name
        student = await self.db.get(Student, student_id)
        student_name = student.display_name if student else "Your child"

        return await self.create_if_enabled(
            user_id=parent_id,
            notification_type=NotificationType.ACHIEVEMENT,
            title=f"{student_name} earned: {achievement_name}",
            message=achievement_description,
            priority=NotificationPriority.NORMAL,
            related_student_id=student_id,
            data={"achievement_name": achievement_name},
        )

    async def notify_concern(
        self,
        parent_id: UUID,
        student_id: UUID,
        concern_title: str,
        concern_message: str,
        subject_id: UUID | None = None,
    ) -> Notification | None:
        """Create a concern notification.

        Args:
            parent_id: The parent's user UUID.
            student_id: The student UUID.
            concern_title: Title of the concern.
            concern_message: Details of the concern.
            subject_id: Related subject if applicable.

        Returns:
            The notification if created.
        """
        return await self.create_if_enabled(
            user_id=parent_id,
            notification_type=NotificationType.CONCERN,
            title=concern_title,
            message=concern_message,
            priority=NotificationPriority.HIGH,
            related_student_id=student_id,
            related_subject_id=subject_id,
        )

    async def notify_goal_achieved(
        self,
        parent_id: UUID,
        student_id: UUID,
        goal_id: UUID,
        goal_title: str,
        reward: str | None = None,
    ) -> Notification | None:
        """Create a goal achieved notification.

        Args:
            parent_id: The parent's user UUID.
            student_id: The student UUID.
            goal_id: The achieved goal UUID.
            goal_title: Title of the goal.
            reward: Optional reward associated with the goal.

        Returns:
            The notification if created.
        """
        student = await self.db.get(Student, student_id)
        student_name = student.display_name if student else "Your child"

        message = f"{student_name} has achieved the goal: {goal_title}"
        if reward:
            message += f"\n\nReward: {reward}"

        return await self.create_if_enabled(
            user_id=parent_id,
            notification_type=NotificationType.GOAL_ACHIEVED,
            title=f"Goal Achieved: {goal_title}",
            message=message,
            priority=NotificationPriority.NORMAL,
            related_student_id=student_id,
            related_goal_id=goal_id,
            data={"goal_title": goal_title, "reward": reward},
        )

    async def notify_weekly_insights(
        self,
        parent_id: UUID,
        student_id: UUID,
        summary: str,
    ) -> Notification | None:
        """Create a weekly insights notification.

        Args:
            parent_id: The parent's user UUID.
            student_id: The student UUID.
            summary: Brief summary of the insights.

        Returns:
            The notification if created.
        """
        student = await self.db.get(Student, student_id)
        student_name = student.display_name if student else "Your child"

        return await self.create_if_enabled(
            user_id=parent_id,
            notification_type=NotificationType.INSIGHT,
            title=f"Weekly Insights for {student_name}",
            message=summary,
            priority=NotificationPriority.NORMAL,
            related_student_id=student_id,
        )

    # =========================================================================
    # Email Delivery Helpers
    # =========================================================================

    async def get_pending_email_notifications(
        self, user_id: UUID
    ) -> list[Notification]:
        """Get notifications that need to be sent via email.

        Args:
            user_id: The user's UUID.

        Returns:
            List of notifications pending email delivery.
        """
        result = await self.db.execute(
            select(Notification)
            .where(Notification.user_id == user_id)
            .where(
                Notification.delivery_method.in_(
                    [DeliveryMethod.EMAIL, DeliveryMethod.BOTH]
                )
            )
            .where(Notification.sent_at.is_(None))
            .order_by(Notification.created_at)
        )
        return list(result.scalars().all())

    async def mark_sent(self, notification_id: UUID) -> bool:
        """Mark a notification as sent (for email delivery).

        Args:
            notification_id: The notification UUID.

        Returns:
            True if marked, False if not found.
        """
        notification = await self.db.get(Notification, notification_id)
        if not notification:
            return False

        notification.sent_at = datetime.now(timezone.utc)
        await self.db.commit()
        return True
