"""SQLAlchemy models."""
from app.models.curriculum_framework import CurriculumFramework
from app.models.subject import Subject
from app.models.curriculum_outcome import CurriculumOutcome
from app.models.senior_course import SeniorCourse
from app.models.user import User
from app.models.student import Student
from app.models.student_subject import StudentSubject
from app.models.note import Note
from app.models.session import Session
from app.models.ai_interaction import AIInteraction
from app.models.flashcard import Flashcard
from app.models.revision_history import RevisionHistory
from app.models.goal import Goal
from app.models.notification import Notification, NotificationType, NotificationPriority, DeliveryMethod
from app.models.notification_preference import NotificationPreference, EmailFrequency, WeekDay
from app.models.weekly_insight import WeeklyInsight
from app.models.achievement_definition import AchievementDefinition

__all__ = [
    "CurriculumFramework",
    "Subject",
    "CurriculumOutcome",
    "SeniorCourse",
    "User",
    "Student",
    "StudentSubject",
    "Note",
    "Session",
    "AIInteraction",
    "Flashcard",
    "RevisionHistory",
    # Phase 7: Parent Dashboard
    "Goal",
    "Notification",
    "NotificationType",
    "NotificationPriority",
    "DeliveryMethod",
    "NotificationPreference",
    "EmailFrequency",
    "WeekDay",
    "WeeklyInsight",
    # Phase 8: Gamification
    "AchievementDefinition",
]
