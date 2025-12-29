"""API v1 router."""
from fastapi import APIRouter

from app.api.v1.endpoints import (
    curriculum,
    frameworks,
    gamification,
    notes,
    parent_dashboard,
    push,
    revision,
    senior_courses,
    sessions,
    socratic,
    student_subjects,
    students,
    subjects,
    users,
)

api_router = APIRouter()

# User endpoints (parent accounts)
api_router.include_router(
    users.router,
    prefix="/users",
    tags=["users"],
)

api_router.include_router(
    frameworks.router,
    tags=["frameworks"],
)
api_router.include_router(
    curriculum.router,
    prefix="/curriculum",
    tags=["curriculum"],
)
api_router.include_router(
    subjects.router,
    prefix="/subjects",
    tags=["subjects"],
)
api_router.include_router(
    senior_courses.router,
    prefix="/senior-courses",
    tags=["senior-courses"],
)
api_router.include_router(
    students.router,
    prefix="/students",
    tags=["students"],
)
api_router.include_router(
    notes.router,
    prefix="/notes",
    tags=["notes"],
)
api_router.include_router(
    sessions.router,
    prefix="/sessions",
    tags=["sessions"],
)
api_router.include_router(
    socratic.router,
    prefix="/socratic",
    tags=["ai-tutor"],
)

# Student subject enrolment endpoints (nested under students)
api_router.include_router(
    student_subjects.router,
    prefix="/students",
    tags=["enrolments"],
)
api_router.include_router(
    revision.router,
    prefix="/revision",
    tags=["revision"],
)

# Parent dashboard endpoints
api_router.include_router(
    parent_dashboard.router,
    prefix="/parent",
    tags=["parent-dashboard"],
)

# Gamification endpoints
api_router.include_router(
    gamification.router,
    tags=["gamification"],
)

# Push notification endpoints (Phase 9: PWA)
api_router.include_router(
    push.router,
    tags=["push-notifications"],
)
