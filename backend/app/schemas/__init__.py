"""Pydantic schemas."""
from app.schemas.base import BaseSchema, IDMixin, TimestampMixin
from app.schemas.framework import (
    FrameworkCreate,
    FrameworkListResponse,
    FrameworkResponse,
    FrameworkSummary,
    FrameworkUpdate,
)
from app.schemas.health import HealthResponse
from app.schemas.student import (
    GamificationData,
    StudentCreate,
    StudentListResponse,
    StudentResponse,
    StudentSummary,
    StudentUpdate,
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
]
