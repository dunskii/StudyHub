"""Socratic tutor endpoints."""
from typing import Any

from fastapi import APIRouter

router = APIRouter()


@router.post("/chat")
async def chat(
    message: str,
    session_id: str,
    subject_code: str | None = None,
    outcome_code: str | None = None,
) -> dict[str, str]:
    """Send a message to the Socratic tutor."""
    # TODO: Implement with Claude API
    return {"response": "", "model_used": ""}


@router.get("/history/{session_id}")
async def get_chat_history(session_id: str) -> dict[str, Any]:
    """Get chat history for a session."""
    # TODO: Implement
    return {"messages": []}
