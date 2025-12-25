"""Curriculum endpoints."""
from fastapi import APIRouter

router = APIRouter()


@router.get("/frameworks")
async def get_frameworks():
    """Get all active curriculum frameworks."""
    # TODO: Implement
    return {"frameworks": []}


@router.get("/frameworks/{framework_code}/outcomes")
async def get_outcomes(framework_code: str, subject_code: str | None = None):
    """Get curriculum outcomes for a framework."""
    # TODO: Implement
    return {"outcomes": []}
