"""Student model."""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Student(Base):
    """Student profile."""

    __tablename__ = "students"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    parent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    supabase_auth_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), unique=True)
    email: Mapped[str | None] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    grade_level: Mapped[int] = mapped_column(Integer, nullable=False)
    school_stage: Mapped[str] = mapped_column(String(20), nullable=False)
    school: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_active_at: Mapped[datetime | None] = mapped_column(DateTime)
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)

    # Curriculum framework
    framework_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("curriculum_frameworks.id")
    )

    # Preferences
    preferences: Mapped[dict] = mapped_column(
        JSONB,
        default=lambda: {
            "theme": "auto",
            "studyReminders": True,
            "dailyGoalMinutes": 30,
            "language": "en-AU",
        },
    )

    # Gamification
    gamification: Mapped[dict] = mapped_column(
        JSONB,
        default=lambda: {
            "totalXP": 0,
            "level": 1,
            "achievements": [],
            "streaks": {"current": 0, "longest": 0, "lastActiveDate": None},
        },
    )

    # Relationships
    parent: Mapped["User"] = relationship("User", back_populates="students")  # noqa: F821
    framework: Mapped["CurriculumFramework"] = relationship(  # noqa: F821
        "CurriculumFramework", back_populates="students"
    )
    subjects: Mapped[list["StudentSubject"]] = relationship(  # noqa: F821
        "StudentSubject", back_populates="student", cascade="all, delete-orphan"
    )
    notes: Mapped[list["Note"]] = relationship(  # noqa: F821
        "Note", back_populates="student", cascade="all, delete-orphan"
    )
    sessions: Mapped[list["Session"]] = relationship(  # noqa: F821
        "Session", back_populates="student", cascade="all, delete-orphan"
    )
