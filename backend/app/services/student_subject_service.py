"""Student Subject service for subject enrolment operations."""
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.senior_course import SeniorCourse
from app.models.student import Student
from app.models.student_subject import StudentSubject
from app.models.subject import Subject


class EnrolmentValidationError(Exception):
    """Raised when enrolment validation fails."""

    def __init__(self, message: str, error_code: str = "VALIDATION_ERROR"):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)


# Valid pathways for Stage 5
VALID_STAGE5_PATHWAYS = ["5.1", "5.2", "5.3"]


class StudentSubjectService:
    """Service for student subject enrolment operations."""

    def __init__(self, db: AsyncSession):
        """Initialise with database session."""
        self.db = db

    async def _get_subject(self, subject_id: UUID) -> Subject | None:
        """Get a subject by ID."""
        result = await self.db.execute(
            select(Subject).where(Subject.id == subject_id)
        )
        return result.scalar_one_or_none()

    async def _get_student(self, student_id: UUID) -> Student | None:
        """Get a student by ID."""
        result = await self.db.execute(
            select(Student).where(Student.id == student_id)
        )
        return result.scalar_one_or_none()

    async def _get_senior_course(self, senior_course_id: UUID) -> SeniorCourse | None:
        """Get a senior course by ID."""
        result = await self.db.execute(
            select(SeniorCourse).where(SeniorCourse.id == senior_course_id)
        )
        return result.scalar_one_or_none()

    async def validate_enrolment(
        self,
        student: Student,
        subject: Subject,
        pathway: str | None = None,
        senior_course_id: UUID | None = None,
    ) -> None:
        """Validate an enrolment request.

        CRITICAL: This enforces framework isolation and pathway/course requirements.

        Args:
            student: The student.
            subject: The subject to enrol in.
            pathway: Optional pathway for Stage 5 subjects.
            senior_course_id: Optional senior course for Stage 6 students.

        Raises:
            EnrolmentValidationError: If validation fails.
        """
        # Rule 1: Framework isolation
        if student.framework_id != subject.framework_id:
            raise EnrolmentValidationError(
                "Cannot enrol in a subject from a different curriculum framework.",
                "FRAMEWORK_MISMATCH",
            )

        # Rule 2: Stage availability
        if student.school_stage not in subject.available_stages:
            raise EnrolmentValidationError(
                f"Subject '{subject.name}' is not available for {student.school_stage}.",
                "STAGE_NOT_AVAILABLE",
            )

        # Rule 3: Stage 5 pathway requirement
        subject_config = subject.config or {}
        has_pathways = subject_config.get("hasPathways", False)

        if student.school_stage == "S5" and has_pathways:
            if not pathway:
                raise EnrolmentValidationError(
                    f"Subject '{subject.name}' requires a pathway selection for Stage 5.",
                    "PATHWAY_REQUIRED",
                )
            if pathway not in VALID_STAGE5_PATHWAYS:
                raise EnrolmentValidationError(
                    f"Invalid pathway '{pathway}'. Must be one of: {', '.join(VALID_STAGE5_PATHWAYS)}",
                    "INVALID_PATHWAY",
                )

        # Rule 4: Stage 6 senior course requirement
        if student.school_stage == "S6":
            # Check if subject has senior courses configured
            senior_courses = subject_config.get("seniorCourses", [])
            if senior_courses:
                if not senior_course_id:
                    raise EnrolmentValidationError(
                        f"Subject '{subject.name}' requires a course selection for Stage 6.",
                        "SENIOR_COURSE_REQUIRED",
                    )

                # Verify the senior course exists and belongs to this subject
                senior_course = await self._get_senior_course(senior_course_id)
                if not senior_course:
                    raise EnrolmentValidationError(
                        "Selected senior course does not exist.",
                        "SENIOR_COURSE_NOT_FOUND",
                    )
                if senior_course.subject_id != subject.id:
                    raise EnrolmentValidationError(
                        "Selected senior course does not belong to this subject.",
                        "SENIOR_COURSE_MISMATCH",
                    )

    async def enrol(
        self,
        student_id: UUID,
        subject_id: UUID,
        pathway: str | None = None,
        senior_course_id: UUID | None = None,
    ) -> StudentSubject:
        """Enrol a student in a subject.

        Args:
            student_id: The student UUID.
            subject_id: The subject UUID.
            pathway: Optional pathway for Stage 5 subjects.
            senior_course_id: Optional senior course for Stage 6 students.

        Returns:
            The created student subject enrolment.

        Raises:
            EnrolmentValidationError: If validation fails.
        """
        # Get student and subject
        student = await self._get_student(student_id)
        if not student:
            raise EnrolmentValidationError("Student not found.", "STUDENT_NOT_FOUND")

        subject = await self._get_subject(subject_id)
        if not subject:
            raise EnrolmentValidationError("Subject not found.", "SUBJECT_NOT_FOUND")

        # Check for existing enrolment
        existing = await self.get_enrolment(student_id, subject_id)
        if existing:
            raise EnrolmentValidationError(
                f"Student is already enrolled in '{subject.name}'.",
                "ALREADY_ENROLLED",
            )

        # Validate enrolment
        await self.validate_enrolment(student, subject, pathway, senior_course_id)

        # Create enrolment
        student_subject = StudentSubject(
            student_id=student_id,
            subject_id=subject_id,
            pathway=pathway,
            senior_course_id=senior_course_id,
            enrolled_at=datetime.now(timezone.utc),
            progress={
                "outcomesCompleted": [],
                "outcomesInProgress": [],
                "overallPercentage": 0,
                "lastActivity": None,
                "xpEarned": 0,
            },
        )

        self.db.add(student_subject)
        await self.db.commit()
        await self.db.refresh(student_subject)
        return student_subject

    async def unenrol(self, student_id: UUID, subject_id: UUID) -> bool:
        """Unenrol a student from a subject.

        Args:
            student_id: The student UUID.
            subject_id: The subject UUID.

        Returns:
            True if unenrolled, False if not found.
        """
        enrolment = await self.get_enrolment(student_id, subject_id)
        if not enrolment:
            return False

        await self.db.delete(enrolment)
        await self.db.commit()
        return True

    async def get_by_id(self, student_subject_id: UUID) -> StudentSubject | None:
        """Get a student subject enrolment by ID.

        Args:
            student_subject_id: The student subject UUID.

        Returns:
            The enrolment or None if not found.
        """
        result = await self.db.execute(
            select(StudentSubject).where(StudentSubject.id == student_subject_id)
        )
        return result.scalar_one_or_none()

    async def get_enrolment(
        self,
        student_id: UUID,
        subject_id: UUID,
    ) -> StudentSubject | None:
        """Get a specific enrolment by student and subject.

        Args:
            student_id: The student UUID.
            subject_id: The subject UUID.

        Returns:
            The enrolment or None if not found.
        """
        result = await self.db.execute(
            select(StudentSubject)
            .where(StudentSubject.student_id == student_id)
            .where(StudentSubject.subject_id == subject_id)
        )
        return result.scalar_one_or_none()

    async def get_all_for_student(
        self,
        student_id: UUID,
        include_subject: bool = True,
    ) -> list[StudentSubject]:
        """Get all subject enrolments for a student.

        Args:
            student_id: The student UUID.
            include_subject: Whether to eagerly load subject details.

        Returns:
            List of student subject enrolments.
        """
        query = select(StudentSubject).where(StudentSubject.student_id == student_id)

        if include_subject:
            query = query.options(selectinload(StudentSubject.subject))

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def update_pathway(
        self,
        student_id: UUID,
        subject_id: UUID,
        pathway: str | None = None,
        senior_course_id: UUID | None = None,
    ) -> StudentSubject | None:
        """Update an enrolment's pathway or senior course.

        Args:
            student_id: The student UUID.
            subject_id: The subject UUID.
            pathway: The new pathway (for Stage 5).
            senior_course_id: The new senior course (for Stage 6).

        Returns:
            The updated enrolment or None if not found.

        Raises:
            EnrolmentValidationError: If validation fails.
        """
        enrolment = await self.get_enrolment(student_id, subject_id)
        if not enrolment:
            return None

        student = await self._get_student(student_id)
        subject = await self._get_subject(subject_id)

        if not student or not subject:
            return None

        # Validate the new pathway/course
        await self.validate_enrolment(student, subject, pathway, senior_course_id)

        enrolment.pathway = pathway
        enrolment.senior_course_id = senior_course_id

        await self.db.commit()
        await self.db.refresh(enrolment)
        return enrolment

    async def update_progress(
        self,
        student_subject_id: UUID,
        outcomes_completed: list[str] | None = None,
        outcomes_in_progress: list[str] | None = None,
        overall_percentage: int | None = None,
        xp_earned: int | None = None,
    ) -> StudentSubject | None:
        """Update an enrolment's progress.

        Args:
            student_subject_id: The student subject UUID.
            outcomes_completed: List of completed outcome codes.
            outcomes_in_progress: List of in-progress outcome codes.
            overall_percentage: Overall completion percentage (0-100).
            xp_earned: Total XP earned in this subject.

        Returns:
            The updated enrolment or None if not found.
        """
        enrolment = await self.get_by_id(student_subject_id)
        if not enrolment:
            return None

        progress = dict(enrolment.progress)

        if outcomes_completed is not None:
            progress["outcomesCompleted"] = outcomes_completed

        if outcomes_in_progress is not None:
            progress["outcomesInProgress"] = outcomes_in_progress

        if overall_percentage is not None:
            progress["overallPercentage"] = max(0, min(100, overall_percentage))

        if xp_earned is not None:
            progress["xpEarned"] = max(0, xp_earned)

        progress["lastActivity"] = datetime.now(timezone.utc).isoformat()

        enrolment.progress = progress
        await self.db.commit()
        await self.db.refresh(enrolment)
        return enrolment

    async def add_completed_outcome(
        self,
        student_subject_id: UUID,
        outcome_code: str,
        xp_award: int = 10,
    ) -> StudentSubject | None:
        """Mark an outcome as completed and award XP.

        Args:
            student_subject_id: The student subject UUID.
            outcome_code: The outcome code to mark complete.
            xp_award: XP points to award.

        Returns:
            The updated enrolment or None if not found.
        """
        enrolment = await self.get_by_id(student_subject_id)
        if not enrolment:
            return None

        progress = dict(enrolment.progress)

        # Move from in-progress to completed
        completed = set(progress.get("outcomesCompleted", []))
        in_progress = set(progress.get("outcomesInProgress", []))

        if outcome_code not in completed:
            completed.add(outcome_code)
            in_progress.discard(outcome_code)

            progress["outcomesCompleted"] = list(completed)
            progress["outcomesInProgress"] = list(in_progress)
            progress["xpEarned"] = progress.get("xpEarned", 0) + xp_award
            progress["lastActivity"] = datetime.now(timezone.utc).isoformat()

            enrolment.progress = progress
            await self.db.commit()
            await self.db.refresh(enrolment)

        return enrolment

    async def get_with_subject_details(
        self,
        student_id: UUID,
    ) -> list[StudentSubject]:
        """Get all enrolments with full subject and senior course details.

        Args:
            student_id: The student UUID.

        Returns:
            List of enrolments with subject details loaded.
        """
        result = await self.db.execute(
            select(StudentSubject)
            .options(
                selectinload(StudentSubject.subject),
                selectinload(StudentSubject.senior_course),
            )
            .where(StudentSubject.student_id == student_id)
            .order_by(StudentSubject.enrolled_at)
        )
        return list(result.scalars().all())
