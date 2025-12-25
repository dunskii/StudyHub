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
]
