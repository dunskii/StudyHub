"""API v1 router."""
from fastapi import APIRouter

from app.api.v1.endpoints import (
    curriculum,
    frameworks,
    notes,
    sessions,
    socratic,
    students,
    subjects,
)

api_router = APIRouter()

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
