"""Student service for student profile operations."""
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.student import Student
from app.schemas.student import StudentCreate, StudentUpdate


# Stage mapping from grade level
GRADE_TO_STAGE = {
    0: "ES1",   # Kindergarten
    1: "S1",    # Year 1
    2: "S1",    # Year 2
    3: "S2",    # Year 3
    4: "S2",    # Year 4
    5: "S3",    # Year 5
    6: "S3",    # Year 6
    7: "S4",    # Year 7
    8: "S4",    # Year 8
    9: "S5",    # Year 9
    10: "S5",   # Year 10
    11: "S6",   # Year 11
    12: "S6",   # Year 12
}


def get_stage_for_grade(grade_level: int) -> str:
    """Get the school stage for a grade level.

    Args:
        grade_level: The grade level (0=Kindergarten, 1-12=Years 1-12).

    Returns:
        The school stage code (ES1, S1, S2, S3, S4, S5, S6).

    Raises:
        ValueError: If grade_level is out of range.
    """
    if grade_level not in GRADE_TO_STAGE:
        raise ValueError(f"Invalid grade level: {grade_level}. Must be 0-12.")
    return GRADE_TO_STAGE[grade_level]


class StudentService:
    """Service for student profile operations."""

    def __init__(self, db: AsyncSession):
        """Initialise with database session."""
        self.db = db

    async def create(self, data: StudentCreate) -> Student:
        """Create a new student profile.

        Args:
            data: Student creation data.

        Returns:
            The created student.
        """
        # Auto-calculate school_stage if not provided
        school_stage = data.school_stage
        if not school_stage:
            school_stage = get_stage_for_grade(data.grade_level)

        student = Student(
            parent_id=data.parent_id,
            supabase_auth_id=data.supabase_auth_id,
            display_name=data.display_name,
            grade_level=data.grade_level,
            school_stage=school_stage,
            framework_id=data.framework_id,
            preferences=data.preferences or {
                "theme": "auto",
                "studyReminders": True,
                "dailyGoalMinutes": 30,
                "language": "en-AU",
            },
        )

        self.db.add(student)
        await self.db.commit()
        await self.db.refresh(student)
        return student

    async def get_by_id(self, student_id: UUID) -> Student | None:
        """Get a student by ID.

        Note: This does NOT check ownership. Use get_by_id_for_user for access control.

        Args:
            student_id: The student UUID.

        Returns:
            The student or None if not found.
        """
        result = await self.db.execute(
            select(Student).where(Student.id == student_id)
        )
        return result.scalar_one_or_none()

    async def get_by_id_for_user(
        self,
        student_id: UUID,
        user_id: UUID,
    ) -> Student | None:
        """Get a student by ID with ownership verification.

        CRITICAL: This is the primary access-controlled method for getting students.

        Args:
            student_id: The student UUID.
            user_id: The requesting user's UUID (must be parent).

        Returns:
            The student if found AND owned by user, None otherwise.
        """
        result = await self.db.execute(
            select(Student)
            .where(Student.id == student_id)
            .where(Student.parent_id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_all_for_parent(
        self,
        parent_id: UUID,
        offset: int = 0,
        limit: int | None = None,
    ) -> list[Student]:
        """Get all students for a parent.

        Args:
            parent_id: The parent's user UUID.
            offset: Number of records to skip.
            limit: Maximum number of records to return.

        Returns:
            List of students belonging to the parent.
        """
        query = (
            select(Student)
            .where(Student.parent_id == parent_id)
            .order_by(Student.display_name)
        )

        if offset > 0:
            query = query.offset(offset)

        if limit is not None:
            query = query.limit(limit)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count_for_parent(self, parent_id: UUID) -> int:
        """Count students for a parent.

        Args:
            parent_id: The parent's user UUID.

        Returns:
            Number of students.
        """
        result = await self.db.execute(
            select(func.count())
            .select_from(Student)
            .where(Student.parent_id == parent_id)
        )
        return result.scalar() or 0

    async def update(
        self,
        student_id: UUID,
        data: StudentUpdate,
        requesting_user_id: UUID,
    ) -> Student | None:
        """Update a student profile with ownership verification.

        Args:
            student_id: The student UUID.
            data: The update data.
            requesting_user_id: The requesting user's UUID (must be parent).

        Returns:
            The updated student or None if not found/not owned.
        """
        student = await self.get_by_id_for_user(student_id, requesting_user_id)
        if not student:
            return None

        update_data = data.model_dump(exclude_unset=True)

        # Auto-calculate school_stage if grade_level is being updated
        if "grade_level" in update_data and "school_stage" not in update_data:
            update_data["school_stage"] = get_stage_for_grade(update_data["grade_level"])

        for field, value in update_data.items():
            setattr(student, field, value)

        await self.db.commit()
        await self.db.refresh(student)
        return student

    async def delete(
        self,
        student_id: UUID,
        requesting_user_id: UUID,
    ) -> bool:
        """Delete a student with ownership verification.

        WARNING: This cascades to delete all student data (subjects, notes, sessions).

        Args:
            student_id: The student UUID.
            requesting_user_id: The requesting user's UUID (must be parent).

        Returns:
            True if deleted, False if not found/not owned.
        """
        student = await self.get_by_id_for_user(student_id, requesting_user_id)
        if not student:
            return False

        await self.db.delete(student)
        await self.db.commit()
        return True

    async def mark_onboarding_complete(
        self,
        student_id: UUID,
        requesting_user_id: UUID,
    ) -> Student | None:
        """Mark a student's onboarding as complete.

        Args:
            student_id: The student UUID.
            requesting_user_id: The requesting user's UUID (must be parent).

        Returns:
            The updated student or None if not found/not owned.
        """
        student = await self.get_by_id_for_user(student_id, requesting_user_id)
        if not student:
            return None

        student.onboarding_completed = True
        await self.db.commit()
        await self.db.refresh(student)
        return student

    async def update_last_active(self, student_id: UUID) -> None:
        """Update the student's last active timestamp.

        Args:
            student_id: The student UUID.
        """
        student = await self.get_by_id(student_id)
        if student:
            student.last_active_at = datetime.now(timezone.utc)
            await self.db.commit()

    async def update_gamification(
        self,
        student_id: UUID,
        xp_delta: int = 0,
        new_achievements: list[str] | None = None,
    ) -> Student | None:
        """Update a student's gamification data.

        Args:
            student_id: The student UUID.
            xp_delta: XP points to add (can be negative).
            new_achievements: List of new achievement IDs to add.

        Returns:
            The updated student or None if not found.
        """
        student = await self.get_by_id(student_id)
        if not student:
            return None

        gamification = dict(student.gamification)

        # Update XP
        gamification["totalXP"] = gamification.get("totalXP", 0) + xp_delta

        # Calculate level (simple formula: level = floor(sqrt(totalXP / 100)) + 1)
        total_xp = gamification["totalXP"]
        gamification["level"] = int((total_xp / 100) ** 0.5) + 1

        # Add new achievements
        if new_achievements:
            existing = set(gamification.get("achievements", []))
            existing.update(new_achievements)
            gamification["achievements"] = list(existing)

        student.gamification = gamification
        await self.db.commit()
        await self.db.refresh(student)
        return student

    async def update_streak(
        self,
        student_id: UUID,
        is_active_today: bool = True,
    ) -> Student | None:
        """Update a student's study streak.

        Args:
            student_id: The student UUID.
            is_active_today: Whether the student was active today.

        Returns:
            The updated student or None if not found.
        """
        student = await self.get_by_id(student_id)
        if not student:
            return None

        gamification = dict(student.gamification)
        streaks = gamification.get("streaks", {"current": 0, "longest": 0, "lastActiveDate": None})

        today = datetime.now(timezone.utc).date()
        yesterday = (today - timedelta(days=1)).isoformat()
        today_str = today.isoformat()
        last_active = streaks.get("lastActiveDate")

        if is_active_today:
            if last_active == today_str:
                # Already counted today
                pass
            elif last_active == yesterday:
                # Yesterday - continue streak
                streaks["current"] = streaks.get("current", 0) + 1
            else:
                # Streak broken or first day
                streaks["current"] = 1

            streaks["lastActiveDate"] = today_str

            # Update longest streak
            if streaks["current"] > streaks.get("longest", 0):
                streaks["longest"] = streaks["current"]

        gamification["streaks"] = streaks
        student.gamification = gamification
        await self.db.commit()
        await self.db.refresh(student)
        return student

    async def get_with_subjects(
        self,
        student_id: UUID,
        requesting_user_id: UUID,
    ) -> Student | None:
        """Get a student with their enrolled subjects loaded.

        Args:
            student_id: The student UUID.
            requesting_user_id: The requesting user's UUID (must be parent).

        Returns:
            The student with subjects or None if not found/not owned.
        """
        result = await self.db.execute(
            select(Student)
            .options(selectinload(Student.subjects))
            .where(Student.id == student_id)
            .where(Student.parent_id == requesting_user_id)
        )
        return result.scalar_one_or_none()
