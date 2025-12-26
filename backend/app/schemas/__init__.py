"""Pydantic schemas."""
from app.schemas.base import BaseSchema, IDMixin, TimestampMixin
from app.schemas.curriculum import (
    OutcomeCreate,
    OutcomeListResponse,
    OutcomeQueryParams,
    OutcomeResponse,
    OutcomeSummary,
    OutcomeUpdate,
    StrandInfo,
    StrandListResponse,
)
from app.schemas.framework import (
    FrameworkCreate,
    FrameworkListResponse,
    FrameworkResponse,
    FrameworkSummary,
    FrameworkUpdate,
)
from app.schemas.health import HealthResponse
from app.schemas.senior_course import (
    SeniorCourseCreate,
    SeniorCourseListResponse,
    SeniorCourseResponse,
    SeniorCourseSummary,
    SeniorCourseUpdate,
)
from app.schemas.student import (
    GamificationData,
    StudentCreate,
    StudentListResponse,
    StudentResponse,
    StudentSummary,
    StudentUpdate,
)
from app.schemas.subject import (
    SubjectConfig,
    SubjectCreate,
    SubjectListResponse,
    SubjectResponse,
    SubjectSummary,
    SubjectUpdate,
)
from app.schemas.student_subject import (
    BulkEnrolmentRequest,
    BulkEnrolmentResponse,
    EnrolmentRequest,
    StudentSubjectCreate,
    StudentSubjectListResponse,
    StudentSubjectProgress,
    StudentSubjectProgressUpdate,
    StudentSubjectResponse,
    StudentSubjectUpdate,
    StudentSubjectWithDetails,
)
from app.schemas.user import UserCreate, UserResponse, UserSummary, UserUpdate

__all__ = [
    # Base
    "BaseSchema",
    "IDMixin",
    "TimestampMixin",
    # Health
    "HealthResponse",
    # Framework
    "FrameworkCreate",
    "FrameworkUpdate",
    "FrameworkResponse",
    "FrameworkListResponse",
    "FrameworkSummary",
    # Subject
    "SubjectConfig",
    "SubjectCreate",
    "SubjectUpdate",
    "SubjectResponse",
    "SubjectSummary",
    "SubjectListResponse",
    # Curriculum Outcome
    "OutcomeCreate",
    "OutcomeUpdate",
    "OutcomeResponse",
    "OutcomeSummary",
    "OutcomeListResponse",
    "OutcomeQueryParams",
    "StrandInfo",
    "StrandListResponse",
    # Senior Course
    "SeniorCourseCreate",
    "SeniorCourseUpdate",
    "SeniorCourseResponse",
    "SeniorCourseSummary",
    "SeniorCourseListResponse",
    # User
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserSummary",
    # Student
    "StudentCreate",
    "StudentUpdate",
    "StudentResponse",
    "StudentSummary",
    "StudentListResponse",
    "GamificationData",
    # Student Subject / Enrolment
    "StudentSubjectCreate",
    "StudentSubjectUpdate",
    "StudentSubjectResponse",
    "StudentSubjectProgress",
    "StudentSubjectProgressUpdate",
    "StudentSubjectWithDetails",
    "StudentSubjectListResponse",
    "EnrolmentRequest",
    "BulkEnrolmentRequest",
    "BulkEnrolmentResponse",
]
