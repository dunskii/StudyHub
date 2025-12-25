"""Subject endpoints."""
from typing import Any

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def get_subjects(framework_code: str = "NSW") -> dict[str, Any]:
    """Get all subjects for a framework."""
    # TODO: Implement
    return {"subjects": []}


@router.get("/{subject_code}")
async def get_subject(subject_code: str, framework_code: str = "NSW") -> dict[str, Any]:
    """Get a specific subject."""
    # TODO: Implement
    return {"subject": None}
