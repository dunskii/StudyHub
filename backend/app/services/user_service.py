"""User service for user/parent account operations."""
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.student import Student
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate


class UserService:
    """Service for user/parent account operations."""

    def __init__(self, db: AsyncSession):
        """Initialise with database session."""
        self.db = db

    async def create(self, data: UserCreate) -> User:
        """Create a new user account.

        Args:
            data: User creation data including Supabase auth ID.

        Returns:
            The created user.
        """
        user = User(
            supabase_auth_id=data.supabase_auth_id,
            email=data.email,
            display_name=data.display_name,
            phone_number=data.phone_number,
            subscription_tier=data.subscription_tier,
            preferences=data.preferences or {
                "emailNotifications": True,
                "weeklyReports": True,
                "language": "en-AU",
                "timezone": "Australia/Sydney",
            },
        )

        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def get_by_id(self, user_id: UUID) -> User | None:
        """Get a user by ID.

        Args:
            user_id: The user UUID.

        Returns:
            The user or None if not found.
        """
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_by_supabase_id(self, supabase_auth_id: UUID) -> User | None:
        """Get a user by Supabase auth ID.

        Args:
            supabase_auth_id: The Supabase auth UUID.

        Returns:
            The user or None if not found.
        """
        result = await self.db.execute(
            select(User).where(User.supabase_auth_id == supabase_auth_id)
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        """Get a user by email address.

        Args:
            email: The email address.

        Returns:
            The user or None if not found.
        """
        result = await self.db.execute(
            select(User).where(User.email == email.lower())
        )
        return result.scalar_one_or_none()

    async def update(self, user_id: UUID, data: UserUpdate) -> User | None:
        """Update a user's profile.

        Args:
            user_id: The user UUID.
            data: The update data.

        Returns:
            The updated user or None if not found.
        """
        user = await self.get_by_id(user_id)
        if not user:
            return None

        update_data = data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(user, field, value)

        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def update_last_login(self, user_id: UUID) -> None:
        """Update the user's last login timestamp.

        Args:
            user_id: The user UUID.
        """
        user = await self.get_by_id(user_id)
        if user:
            user.last_login_at = datetime.now(timezone.utc)
            await self.db.commit()

    async def verify_owns_student(self, user_id: UUID, student_id: UUID) -> bool:
        """Verify that a user owns (is parent of) a student.

        CRITICAL: This is the primary access control check for student data.

        Args:
            user_id: The user UUID.
            student_id: The student UUID.

        Returns:
            True if the user is the parent of the student, False otherwise.
        """
        result = await self.db.execute(
            select(Student.id)
            .where(Student.id == student_id)
            .where(Student.parent_id == user_id)
        )
        return result.scalar_one_or_none() is not None

    async def get_with_students(self, user_id: UUID) -> User | None:
        """Get a user with their students loaded.

        Args:
            user_id: The user UUID.

        Returns:
            The user with students or None if not found.
        """
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.students))
            .where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def delete(self, user_id: UUID) -> bool:
        """Delete a user account.

        WARNING: This cascades to delete all students and their data.

        Args:
            user_id: The user UUID.

        Returns:
            True if deleted, False if not found.
        """
        user = await self.get_by_id(user_id)
        if not user:
            return False

        await self.db.delete(user)
        await self.db.commit()
        return True

    async def accept_privacy_policy(self, user_id: UUID) -> User | None:
        """Record that user accepted the privacy policy.

        Args:
            user_id: The user UUID.

        Returns:
            The updated user or None if not found.
        """
        user = await self.get_by_id(user_id)
        if not user:
            return None

        user.privacy_policy_accepted_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def accept_terms(self, user_id: UUID) -> User | None:
        """Record that user accepted the terms of service.

        Args:
            user_id: The user UUID.

        Returns:
            The updated user or None if not found.
        """
        user = await self.get_by_id(user_id)
        if not user:
            return None

        user.terms_accepted_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(user)
        return user
