"""Data export service for privacy compliance (GDPR, Privacy Act)."""
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.session import Session
from app.models.student import Student
from app.models.student_subject import StudentSubject
from app.models.user import User


class DataExportService:
    """Service for exporting user data for privacy compliance.

    Implements data portability requirements for:
    - Australian Privacy Act
    - GDPR Article 20 (Right to data portability)
    - COPPA best practices
    """

    def __init__(self, db: AsyncSession):
        """Initialise with database session."""
        self.db = db

    async def export_user_data(self, user_id: UUID) -> dict[str, Any]:
        """Export all data for a user and their students.

        This provides a complete data export in a portable format
        for privacy compliance.

        Args:
            user_id: The user's UUID.

        Returns:
            Dictionary containing all user data in portable format.
        """
        # Get user with all related data
        result = await self.db.execute(
            select(User)
            .options(
                selectinload(User.students)
                .selectinload(Student.subjects)
                .selectinload(StudentSubject.subject),
                selectinload(User.students)
                .selectinload(Student.sessions),
            )
            .where(User.id == user_id)
        )
        user = result.scalar_one_or_none()

        if not user:
            return {}

        return {
            "export_metadata": {
                "export_date": datetime.now(timezone.utc).isoformat(),
                "format_version": "1.0",
                "data_controller": "StudyHub",
            },
            "account": self._export_account(user),
            "students": [
                await self._export_student(student)
                for student in user.students
            ],
        }

    def _export_account(self, user: User) -> dict[str, Any]:
        """Export user account data.

        Args:
            user: The user model.

        Returns:
            Dictionary of user account data.
        """
        return {
            "id": str(user.id),
            "email": user.email,
            "display_name": user.display_name,
            "phone_number": user.phone_number,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
            "subscription_tier": user.subscription_tier,
            "preferences": user.preferences,
            "consent": {
                "privacy_policy_accepted_at": (
                    user.privacy_policy_accepted_at.isoformat()
                    if user.privacy_policy_accepted_at else None
                ),
                "terms_accepted_at": (
                    user.terms_accepted_at.isoformat()
                    if user.terms_accepted_at else None
                ),
                "marketing_consent": user.marketing_consent,
                "data_processing_consent": user.data_processing_consent,
            },
        }

    async def _export_student(self, student: Student) -> dict[str, Any]:
        """Export student data.

        Args:
            student: The student model.

        Returns:
            Dictionary of student data.
        """
        return {
            "id": str(student.id),
            "display_name": student.display_name,
            "email": student.email,
            "grade_level": student.grade_level,
            "school_stage": student.school_stage,
            "school": student.school,
            "created_at": student.created_at.isoformat() if student.created_at else None,
            "last_active_at": (
                student.last_active_at.isoformat()
                if student.last_active_at else None
            ),
            "onboarding_completed": student.onboarding_completed,
            "preferences": student.preferences,
            "gamification": student.gamification,
            "subjects": [
                self._export_enrolment(enrolment)
                for enrolment in student.subjects
            ],
            "sessions": [
                self._export_session(session)
                for session in student.sessions
            ],
        }

    def _export_enrolment(self, enrolment: StudentSubject) -> dict[str, Any]:
        """Export subject enrolment data.

        Args:
            enrolment: The student subject model.

        Returns:
            Dictionary of enrolment data.
        """
        return {
            "id": str(enrolment.id),
            "subject_name": enrolment.subject.name if enrolment.subject else None,
            "subject_code": enrolment.subject.code if enrolment.subject else None,
            "pathway": enrolment.pathway,
            "enrolled_at": enrolment.enrolled_at.isoformat() if enrolment.enrolled_at else None,
            "progress": enrolment.progress,
        }

    def _export_session(self, session: Session) -> dict[str, Any]:
        """Export session data.

        Args:
            session: The session model.

        Returns:
            Dictionary of session data.
        """
        return {
            "id": str(session.id),
            "session_type": session.session_type,
            "started_at": session.started_at.isoformat() if session.started_at else None,
            "ended_at": session.ended_at.isoformat() if session.ended_at else None,
            "duration_minutes": session.duration_minutes,
            "xp_earned": session.xp_earned,
            "data": session.data,
        }
