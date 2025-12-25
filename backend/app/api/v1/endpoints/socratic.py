"""Socratic tutor endpoints."""
from fastapi import APIRouter

router = APIRouter()


@router.post("/chat")
async def chat(
    message: str,
    session_id: str,
    subject_code: str | None = None,
    outcome_code: str | None = None,
):
    """Send a message to the Socratic tutor."""
    # TODO: Implement with Claude API
    return {"response": "", "model_used": ""}


@router.get("/history/{session_id}")
async def get_chat_history(session_id: str):
    """Get chat history for a session."""
    # TODO: Implement
    return {"messages": []}
