"""Note management endpoints.

Handles note upload, OCR processing, and curriculum alignment.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.schemas import (
    CurriculumAlignmentResponse,
    CurriculumSuggestion,
    NoteCreate,
    NoteListResponse,
    NoteResponse,
    NoteUpdate,
    OCRStatusResponse,
    OutcomeUpdateRequest,
    UploadUrlRequest,
    UploadUrlResponse,
)
from app.services.note_service import (
    NoteAccessDeniedError,
    NoteNotFoundError,
    NoteService,
    NoteServiceError,
)
from app.services.storage_service import get_storage_service
from app.models.student import Student

logger = logging.getLogger(__name__)

router = APIRouter()


async def verify_student_access(
    student_id: UUID,
    db: AsyncSession,
    # TODO: Add current_user dependency when auth is fully integrated
) -> Student:
    """Verify that the current user has access to the student.

    Args:
        student_id: Student UUID.
        db: Database session.

    Returns:
        Student if access granted.

    Raises:
        HTTPException: If student not found or access denied.
    """
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )
    # TODO: Verify that current user owns this student
    return student


def note_to_response(note, download_url: str | None = None, thumbnail_url: str | None = None) -> NoteResponse:
    """Convert Note model to response schema."""
    return NoteResponse(
        id=note.id,
        student_id=note.student_id,
        subject_id=note.subject_id,
        title=note.title,
        content_type=note.content_type,
        storage_url=note.storage_url,
        download_url=download_url,
        thumbnail_url=thumbnail_url,
        ocr_text=note.ocr_text,
        ocr_status=note.ocr_status,
        curriculum_outcomes=note.curriculum_outcomes,
        tags=note.tags,
        note_metadata=note.note_metadata,
        created_at=note.created_at,
        updated_at=note.updated_at,
    )


@router.post("/upload-url", response_model=UploadUrlResponse)
async def get_upload_url(
    request: UploadUrlRequest,
    student_id: UUID = Query(..., description="Student ID for the note"),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> UploadUrlResponse:
    """Get a presigned URL for direct upload to storage.

    The client should use this URL to upload the file directly to DO Spaces,
    then call POST /notes with the storage_key to create the note record.

    Args:
        request: Upload URL request with filename and content type.
        student_id: Student UUID.
        db: Database session.

    Returns:
        UploadUrlResponse with presigned URL and fields.
    """
    settings = get_settings()

    # Validate content type
    if request.content_type not in settings.note_supported_formats_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Allowed: {', '.join(settings.note_supported_formats_list)}",
        )

    # Verify student access
    await verify_student_access(student_id, db)

    # Generate storage key and presigned URL
    storage = get_storage_service()
    storage_key = storage.generate_storage_key(student_id, request.filename)

    try:
        presigned = await storage.generate_presigned_upload_url(
            key=storage_key,
            content_type=request.content_type,
        )

        expires_at = datetime.now(timezone.utc) + timedelta(
            seconds=settings.note_presigned_url_expiry
        )

        return UploadUrlResponse(
            upload_url=presigned["url"],
            fields=presigned["fields"],
            storage_key=storage_key,
            expires_at=expires_at,
        )

    except Exception as e:
        logger.error(f"Failed to generate upload URL: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate upload URL",
        )


@router.post("/", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    request: NoteCreate,
    student_id: UUID = Query(..., description="Student ID for the note"),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
    background_tasks: BackgroundTasks = None,
) -> NoteResponse:
    """Create a note record after successful upload.

    Call this after uploading the file using the presigned URL.

    Args:
        request: Note creation request.
        student_id: Student UUID.
        db: Database session.
        background_tasks: Background task runner.

    Returns:
        Created NoteResponse.
    """
    # Verify student access
    await verify_student_access(student_id, db)

    note_service = NoteService(db)

    try:
        note = await note_service.create_note(
            student_id=student_id,
            title=request.title,
            content_type=request.content_type,
            storage_key=request.storage_key,
            subject_id=request.subject_id,
            tags=request.tags,
            auto_ocr=True,
        )

        # Trigger OCR in background if applicable
        if note.ocr_status == "pending":
            background_tasks.add_task(
                _process_ocr_background,
                note.id,
                student_id,
                db,
            )

        return note_to_response(note)

    except NoteServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


async def _process_ocr_background(note_id: UUID, student_id: UUID, db: AsyncSession) -> None:
    """Background task for OCR processing."""
    try:
        note_service = NoteService(db)
        await note_service.process_ocr(note_id, student_id)
    except Exception as e:
        logger.error(f"Background OCR failed for note {note_id}: {e}")


@router.get("/", response_model=NoteListResponse)
async def list_notes(
    student_id: UUID = Query(..., description="Student ID"),
    subject_id: UUID | None = Query(None, description="Filter by subject"),
    search: str | None = Query(None, description="Search in title and OCR text"),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> NoteListResponse:
    """List notes for a student.

    Args:
        student_id: Student UUID.
        subject_id: Optional filter by subject.
        search: Optional search query.
        offset: Pagination offset.
        limit: Pagination limit.
        db: Database session.

    Returns:
        NoteListResponse with paginated notes.
    """
    # Verify student access
    await verify_student_access(student_id, db)

    note_service = NoteService(db)

    notes, total = await note_service.get_student_notes(
        student_id=student_id,
        subject_id=subject_id,
        search_query=search,
        offset=offset,
        limit=limit,
    )

    return NoteListResponse(
        notes=[note_to_response(note) for note in notes],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: UUID,
    student_id: UUID = Query(..., description="Student ID for verification"),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> NoteResponse:
    """Get a note by ID.

    Args:
        note_id: Note UUID.
        student_id: Student ID for ownership verification.
        db: Database session.

    Returns:
        NoteResponse with note details and signed URLs.
    """
    # Verify student access
    await verify_student_access(student_id, db)

    note_service = NoteService(db)

    try:
        note = await note_service.get_note(note_id, student_id)
        download_url = await note_service.get_download_url(note_id, student_id)
        thumbnail_url = await note_service.get_thumbnail_url(note_id, student_id)

        return note_to_response(note, download_url, thumbnail_url)

    except NoteNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found",
        )
    except NoteAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )


@router.put("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: UUID,
    request: NoteUpdate,
    student_id: UUID = Query(..., description="Student ID for verification"),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> NoteResponse:
    """Update a note's metadata.

    Args:
        note_id: Note UUID.
        request: Update request.
        student_id: Student ID for ownership verification.
        db: Database session.

    Returns:
        Updated NoteResponse.
    """
    # Verify student access
    await verify_student_access(student_id, db)

    note_service = NoteService(db)

    try:
        note = await note_service.update_note(
            note_id=note_id,
            student_id=student_id,
            title=request.title,
            subject_id=request.subject_id,
            tags=request.tags,
        )

        return note_to_response(note)

    except NoteNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found",
        )
    except NoteAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: UUID,
    student_id: UUID = Query(..., description="Student ID for verification"),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> None:
    """Delete a note and its associated files.

    Args:
        note_id: Note UUID.
        student_id: Student ID for ownership verification.
        db: Database session.
    """
    # Verify student access
    await verify_student_access(student_id, db)

    note_service = NoteService(db)

    try:
        await note_service.delete_note(note_id, student_id)

    except NoteNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found",
        )
    except NoteAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )


@router.post("/{note_id}/process-ocr", response_model=OCRStatusResponse)
async def trigger_ocr(
    note_id: UUID,
    student_id: UUID = Query(..., description="Student ID for verification"),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
    background_tasks: BackgroundTasks = None,
) -> OCRStatusResponse:
    """Trigger OCR processing for a note.

    Args:
        note_id: Note UUID.
        student_id: Student ID for ownership verification.
        db: Database session.
        background_tasks: Background task runner.

    Returns:
        OCRStatusResponse with current status.
    """
    # Verify student access
    await verify_student_access(student_id, db)

    note_service = NoteService(db)

    try:
        note = await note_service.get_note(note_id, student_id)

        if note.ocr_status in ("processing", "completed"):
            # Return current status
            metadata = note.note_metadata or {}
            return OCRStatusResponse(
                status=note.ocr_status,
                text=note.ocr_text,
                confidence=metadata.get("ocr_confidence"),
                language=metadata.get("ocr_language"),
            )

        # Trigger OCR in background
        background_tasks.add_task(
            _process_ocr_background,
            note_id,
            student_id,
            db,
        )

        return OCRStatusResponse(
            status="processing",
        )

    except NoteNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found",
        )
    except NoteAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )


@router.get("/{note_id}/ocr-status", response_model=OCRStatusResponse)
async def get_ocr_status(
    note_id: UUID,
    student_id: UUID = Query(..., description="Student ID for verification"),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> OCRStatusResponse:
    """Get OCR processing status for a note.

    Args:
        note_id: Note UUID.
        student_id: Student ID for ownership verification.
        db: Database session.

    Returns:
        OCRStatusResponse with current status.
    """
    # Verify student access
    await verify_student_access(student_id, db)

    note_service = NoteService(db)

    try:
        note = await note_service.get_note(note_id, student_id)
        metadata = note.note_metadata or {}

        return OCRStatusResponse(
            status=note.ocr_status,
            text=note.ocr_text,
            confidence=metadata.get("ocr_confidence"),
            language=metadata.get("ocr_language"),
            error=metadata.get("ocr_error"),
        )

    except NoteNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found",
        )
    except NoteAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )


@router.post("/{note_id}/align-curriculum", response_model=CurriculumAlignmentResponse)
async def align_curriculum(
    note_id: UUID,
    student_id: UUID = Query(..., description="Student ID for verification"),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> CurriculumAlignmentResponse:
    """Get AI-suggested curriculum outcomes for a note.

    Uses Claude AI to analyse the note's OCR text and suggest
    relevant NSW curriculum outcomes.

    Args:
        note_id: Note UUID.
        student_id: Student ID for ownership verification.
        db: Database session.

    Returns:
        CurriculumAlignmentResponse with suggested outcomes.
    """
    # Verify student access
    await verify_student_access(student_id, db)

    note_service = NoteService(db)

    try:
        note = await note_service.get_note(note_id, student_id)

        if not note.ocr_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No OCR text available. Process OCR first.",
            )

        outcomes = await note_service.align_curriculum(note_id, student_id)

        # Get subject name if available
        detected_subject = None
        if note.subject_id:
            from app.models.subject import Subject
            subject = await db.get(Subject, note.subject_id)
            if subject:
                detected_subject = subject.code

        return CurriculumAlignmentResponse(
            suggested_outcomes=[
                CurriculumSuggestion(
                    id=o.id,
                    code=o.code,
                    description=o.description,
                    stage=o.stage,
                    strand=o.strand,
                )
                for o in outcomes
            ],
            detected_subject=detected_subject,
            confidence=0.8 if outcomes else 0.0,
        )

    except NoteNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found",
        )
    except NoteAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    except NoteServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.put("/{note_id}/outcomes", response_model=NoteResponse)
async def update_outcomes(
    note_id: UUID,
    request: OutcomeUpdateRequest,
    student_id: UUID = Query(..., description="Student ID for verification"),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> NoteResponse:
    """Update linked curriculum outcomes for a note.

    Args:
        note_id: Note UUID.
        request: Outcome update request.
        student_id: Student ID for ownership verification.
        db: Database session.

    Returns:
        Updated NoteResponse.
    """
    # Verify student access
    await verify_student_access(student_id, db)

    note_service = NoteService(db)

    try:
        note = await note_service.update_outcomes(
            note_id=note_id,
            student_id=student_id,
            outcome_ids=request.outcome_ids,
        )

        return note_to_response(note)

    except NoteNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found",
        )
    except NoteAccessDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
