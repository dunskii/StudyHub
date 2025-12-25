"""Student endpoints."""
from fastapi import APIRouter

router = APIRouter()


@router.get("/me")
async def get_current_student():
    """Get current student profile."""
    # TODO: Implement with auth
    return {"student": None}


@router.get("/me/subjects")
async def get_student_subjects():
    """Get current student's enrolled subjects."""
    # TODO: Implement
    return {"subjects": []}


@router.post("/me/subjects/{subject_id}")
async def enroll_in_subject(subject_id: str):
    """Enroll in a subject."""
    # TODO: Implement
    return {"enrolled": True}
