"""Note endpoints."""
from typing import Any

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def get_notes(subject_id: str | None = None) -> dict[str, Any]:
    """Get student's notes."""
    # TODO: Implement
    return {"notes": []}


@router.post("/")
async def create_note() -> dict[str, Any]:
    """Create a new note."""
    # TODO: Implement
    return {"note": None}


@router.post("/{note_id}/ocr")
async def process_ocr(note_id: str) -> dict[str, str]:
    """Process OCR for a note."""
    # TODO: Implement
    return {"status": "processing"}
