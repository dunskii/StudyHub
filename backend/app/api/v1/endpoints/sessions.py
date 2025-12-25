"""Session endpoints."""
from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def get_sessions():
    """Get student's study sessions."""
    # TODO: Implement
    return {"sessions": []}


@router.post("/")
async def start_session(session_type: str, subject_id: str | None = None):
    """Start a new study session."""
    # TODO: Implement
    return {"session": None}


@router.post("/{session_id}/end")
async def end_session(session_id: str):
    """End a study session."""
    # TODO: Implement
    return {"session": None}
