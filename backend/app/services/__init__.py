"""Business logic services."""
from app.services.curriculum_service import CurriculumService
from app.services.framework_service import FrameworkService
from app.services.senior_course_service import SeniorCourseService
from app.services.subject_service import SubjectService

__all__ = [
    "FrameworkService",
    "SubjectService",
    "CurriculumService",
    "SeniorCourseService",
]
