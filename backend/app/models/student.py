"""Student model."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.ai_usage import AIUsage
    from app.models.curriculum_framework import CurriculumFramework
    from app.models.flashcard import Flashcard
    from app.models.goal import Goal
    from app.models.note import Note
    from app.models.notification import Notification
    from app.models.revision_history import RevisionHistory
    from app.models.session import Session
    from app.models.student_subject import StudentSubject
    from app.models.user import User
    from app.models.weekly_insight import WeeklyInsight


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
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    last_active_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)

    # Curriculum framework
    framework_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("curriculum_frameworks.id")
    )

    # Preferences
    preferences: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        default=lambda: {
            "theme": "auto",
            "studyReminders": True,
            "dailyGoalMinutes": 30,
            "language": "en-AU",
        },
    )

    # Gamification
    gamification: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        default=lambda: {
            "totalXP": 0,
            "level": 1,
            "achievements": [],
            "streaks": {"current": 0, "longest": 0, "lastActiveDate": None},
        },
    )

    # Relationships
    parent: Mapped[User] = relationship("User", back_populates="students")
    framework: Mapped[CurriculumFramework | None] = relationship(
        "CurriculumFramework", back_populates="students"
    )
    subjects: Mapped[list[StudentSubject]] = relationship(
        "StudentSubject", back_populates="student", cascade="all, delete-orphan"
    )
    notes: Mapped[list[Note]] = relationship(
        "Note", back_populates="student", cascade="all, delete-orphan"
    )
    sessions: Mapped[list[Session]] = relationship(
        "Session", back_populates="student", cascade="all, delete-orphan"
    )
    flashcards: Mapped[list[Flashcard]] = relationship(
        "Flashcard", back_populates="student", cascade="all, delete-orphan"
    )
    revision_history: Mapped[list[RevisionHistory]] = relationship(
        "RevisionHistory", back_populates="student", cascade="all, delete-orphan"
    )
    goals: Mapped[list[Goal]] = relationship(
        "Goal", back_populates="student", cascade="all, delete-orphan"
    )
    notifications: Mapped[list[Notification]] = relationship(
        "Notification", back_populates="student", cascade="all, delete-orphan"
    )
    weekly_insights: Mapped[list[WeeklyInsight]] = relationship(
        "WeeklyInsight", back_populates="student", cascade="all, delete-orphan"
    )
    ai_usage_records: Mapped[list[AIUsage]] = relationship(
        "AIUsage", back_populates="student", cascade="all, delete-orphan"
    )
