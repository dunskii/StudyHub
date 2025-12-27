"""Note service for managing student notes.

Handles note CRUD operations, OCR processing, and curriculum alignment.
"""
from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.note import Note
from app.models.student import Student
from app.models.subject import Subject
from app.models.curriculum_outcome import CurriculumOutcome
from app.services.storage_service import StorageService, get_storage_service
from app.services.ocr_service import OCRService, get_ocr_service
from app.services.image_processor import ImageProcessor, get_image_processor
from app.services.claude_service import ClaudeService, get_claude_service, TaskType

logger = logging.getLogger(__name__)


class NoteServiceError(Exception):
    """Base exception for note service errors."""

    pass


class NoteNotFoundError(NoteServiceError):
    """Note not found."""

    pass


class NoteAccessDeniedError(NoteServiceError):
    """Access to note denied."""

    pass


class NoteService:
    """Service for managing student notes."""

    def __init__(
        self,
        db: AsyncSession,
        storage: StorageService | None = None,
        ocr: OCRService | None = None,
        image_processor: ImageProcessor | None = None,
        claude: ClaudeService | None = None,
    ) -> None:
        """Initialize the note service.

        Args:
            db: Database session.
            storage: Storage service (default: singleton).
            ocr: OCR service (default: singleton).
            image_processor: Image processor (default: singleton).
            claude: Claude service (default: singleton).
        """
        self._db = db
        self._storage = storage or get_storage_service()
        self._ocr = ocr or get_ocr_service()
        self._image_processor = image_processor or get_image_processor()
        self._claude = claude

    async def _get_claude(self) -> ClaudeService:
        """Get Claude service lazily."""
        if self._claude is None:
            self._claude = get_claude_service()
        return self._claude

    async def create_note(
        self,
        student_id: UUID,
        title: str,
        content_type: str,
        storage_key: str,
        subject_id: UUID | None = None,
        tags: list[str] | None = None,
        auto_ocr: bool = True,
    ) -> Note:
        """Create a new note.

        Args:
            student_id: The student's UUID.
            title: Note title.
            content_type: MIME type of the file.
            storage_key: Storage key for the uploaded file.
            subject_id: Optional subject UUID.
            tags: Optional list of tags.
            auto_ocr: Whether to trigger OCR automatically.

        Returns:
            Created Note.
        """
        settings = get_settings()

        # Check note limit
        count = await self._db.scalar(
            select(func.count()).select_from(Note).where(Note.student_id == student_id)
        )
        if count and count >= settings.note_max_per_student:
            raise NoteServiceError(
                f"Note limit reached ({settings.note_max_per_student} notes max)"
            )

        # Generate storage URL
        storage_url = f"{settings.do_spaces_url}/{settings.do_spaces_bucket}/{storage_key}"

        # Create note record
        note = Note(
            student_id=student_id,
            subject_id=subject_id,
            title=title,
            content_type=content_type,
            storage_url=storage_url,
            ocr_status="pending" if auto_ocr and content_type.startswith("image/") else "not_applicable",
            tags=tags,
            note_metadata={"storage_key": storage_key},
        )

        self._db.add(note)
        await self._db.commit()
        await self._db.refresh(note)

        logger.info(f"Created note {note.id} for student {student_id}")

        return note

    async def get_note(
        self,
        note_id: UUID,
        student_id: UUID | None = None,
    ) -> Note:
        """Get a note by ID.

        Args:
            note_id: Note UUID.
            student_id: Optional student ID for ownership verification.

        Returns:
            Note if found.

        Raises:
            NoteNotFoundError: If note not found.
            NoteAccessDeniedError: If student_id provided and doesn't match.
        """
        note = await self._db.get(Note, note_id)

        if not note:
            raise NoteNotFoundError(f"Note {note_id} not found")

        if student_id and note.student_id != student_id:
            raise NoteAccessDeniedError("Access denied to this note")

        return note

    async def get_student_notes(
        self,
        student_id: UUID,
        subject_id: UUID | None = None,
        search_query: str | None = None,
        offset: int = 0,
        limit: int = 50,
    ) -> tuple[list[Note], int]:
        """Get notes for a student with optional filters.

        Args:
            student_id: The student's UUID.
            subject_id: Optional filter by subject.
            search_query: Optional search in title and OCR text.
            offset: Pagination offset.
            limit: Pagination limit.

        Returns:
            Tuple of (notes list, total count).
        """
        query = select(Note).where(Note.student_id == student_id)

        if subject_id:
            query = query.where(Note.subject_id == subject_id)

        if search_query:
            search_pattern = f"%{search_query}%"
            query = query.where(
                or_(
                    Note.title.ilike(search_pattern),
                    Note.ocr_text.ilike(search_pattern),
                )
            )

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total = await self._db.scalar(count_query) or 0

        # Get paginated results
        query = query.order_by(Note.created_at.desc()).offset(offset).limit(limit)
        result = await self._db.execute(query)
        notes = list(result.scalars().all())

        return notes, total

    async def update_note(
        self,
        note_id: UUID,
        student_id: UUID,
        title: str | None = None,
        subject_id: UUID | None = None,
        tags: list[str] | None = None,
    ) -> Note:
        """Update a note's metadata.

        Args:
            note_id: Note UUID.
            student_id: Student ID for ownership verification.
            title: New title (optional).
            subject_id: New subject (optional).
            tags: New tags (optional).

        Returns:
            Updated Note.
        """
        note = await self.get_note(note_id, student_id)

        if title is not None:
            note.title = title
        if subject_id is not None:
            note.subject_id = subject_id
        if tags is not None:
            note.tags = tags

        await self._db.commit()
        await self._db.refresh(note)

        logger.info(f"Updated note {note_id}")

        return note

    async def delete_note(
        self,
        note_id: UUID,
        student_id: UUID,
    ) -> bool:
        """Delete a note and its associated files.

        Args:
            note_id: Note UUID.
            student_id: Student ID for ownership verification.

        Returns:
            True if deleted.
        """
        note = await self.get_note(note_id, student_id)

        # Delete files from storage
        metadata = note.note_metadata or {}
        storage_key = metadata.get("storage_key")
        if storage_key:
            try:
                await self._storage.delete_file(storage_key)
                # Try to delete thumbnail too
                thumb_key = self._storage.generate_thumbnail_key(storage_key)
                await self._storage.delete_file(thumb_key)
            except Exception as e:
                logger.warning(f"Failed to delete files for note {note_id}: {e}")

        # Delete note record
        await self._db.delete(note)
        await self._db.commit()

        logger.info(f"Deleted note {note_id}")

        return True

    async def process_ocr(self, note_id: UUID, student_id: UUID) -> Note:
        """Process OCR for a note.

        Args:
            note_id: Note UUID.
            student_id: Student ID for ownership verification.

        Returns:
            Updated Note with OCR results.
        """
        note = await self.get_note(note_id, student_id)

        if not note.content_type.startswith("image/"):
            raise NoteServiceError("OCR only supported for images")

        # Update status to processing
        note.ocr_status = "processing"
        await self._db.commit()

        try:
            # Download image from storage
            metadata = note.note_metadata or {}
            storage_key = metadata.get("storage_key")
            if not storage_key:
                raise NoteServiceError("Storage key not found")

            image_data = await self._storage.download_file(storage_key)

            # Resize for OCR if needed
            processed_image = self._image_processor.resize_for_ocr(image_data)

            # Run OCR
            ocr_result = await self._ocr.extract_text(processed_image)

            if ocr_result.success:
                note.ocr_text = ocr_result.text
                note.ocr_status = "completed"
                note.note_metadata = {
                    **metadata,
                    "ocr_confidence": ocr_result.confidence,
                    "ocr_language": ocr_result.language,
                    "ocr_block_count": len(ocr_result.blocks),
                }
            else:
                note.ocr_status = "failed"
                note.note_metadata = {
                    **metadata,
                    "ocr_error": ocr_result.error,
                }

            await self._db.commit()
            await self._db.refresh(note)

            logger.info(f"OCR processed for note {note_id}: {note.ocr_status}")

            return note

        except Exception as e:
            note.ocr_status = "failed"
            metadata = note.note_metadata or {}
            note.note_metadata = {**metadata, "ocr_error": str(e)}
            await self._db.commit()
            logger.error(f"OCR failed for note {note_id}: {e}")
            raise

    async def align_curriculum(
        self,
        note_id: UUID,
        student_id: UUID,
    ) -> list[CurriculumOutcome]:
        """Use AI to suggest curriculum outcomes for a note.

        Args:
            note_id: Note UUID.
            student_id: Student ID for ownership verification.

        Returns:
            List of suggested CurriculumOutcome objects.
        """
        note = await self.get_note(note_id, student_id)

        if not note.ocr_text:
            raise NoteServiceError("No OCR text available for alignment")

        # Get student's framework for context
        student = await self._db.get(Student, student_id)
        if not student:
            raise NoteServiceError("Student not found")

        # Get subject context if available
        subject_name = None
        if note.subject_id:
            subject = await self._db.get(Subject, note.subject_id)
            if subject:
                subject_name = subject.name

        # Build prompt for Claude
        prompt = f"""Analyse the following student note and identify which NSW curriculum outcomes it relates to.

Note Title: {note.title}
Subject: {subject_name or 'Unknown'}
Student Year Level: {student.year_level}

Note Content (from OCR):
{note.ocr_text[:2000]}  # Limit to first 2000 chars

Based on this content, identify up to 5 relevant NSW curriculum outcome codes.
Return ONLY a JSON array of outcome codes, like: ["MA3-RN-01", "MA3-RN-02"]
If you cannot identify specific outcomes, return an empty array: []"""

        try:
            claude = await self._get_claude()
            response = await claude.chat(
                system_prompt="You are a curriculum alignment expert for the NSW curriculum.",
                messages=[{"role": "user", "content": prompt}],
                task_type=TaskType.SIMPLE,
            )

            # Parse outcome codes from response
            import json
            import re

            # Try to extract JSON array from response
            json_match = re.search(r'\[.*?\]', response.content, re.DOTALL)
            if json_match:
                outcome_codes = json.loads(json_match.group())
            else:
                outcome_codes = []

            # Fetch matching outcomes from database
            if outcome_codes:
                result = await self._db.execute(
                    select(CurriculumOutcome).where(
                        CurriculumOutcome.code.in_(outcome_codes)
                    )
                )
                outcomes = list(result.scalars().all())
            else:
                outcomes = []

            logger.info(
                f"Curriculum alignment for note {note_id}: "
                f"suggested {len(outcome_codes)} codes, found {len(outcomes)} outcomes"
            )

            return outcomes

        except Exception as e:
            logger.error(f"Curriculum alignment failed for note {note_id}: {e}")
            return []

    async def update_outcomes(
        self,
        note_id: UUID,
        student_id: UUID,
        outcome_ids: list[UUID],
    ) -> Note:
        """Update the curriculum outcomes linked to a note.

        Args:
            note_id: Note UUID.
            student_id: Student ID for ownership verification.
            outcome_ids: List of outcome UUIDs to link.

        Returns:
            Updated Note.
        """
        note = await self.get_note(note_id, student_id)

        note.curriculum_outcomes = outcome_ids

        await self._db.commit()
        await self._db.refresh(note)

        logger.info(f"Updated outcomes for note {note_id}: {len(outcome_ids)} outcomes")

        return note

    async def get_notes_by_outcome(
        self,
        student_id: UUID,
        outcome_id: UUID,
    ) -> list[Note]:
        """Get all notes linked to a specific outcome.

        Args:
            student_id: The student's UUID.
            outcome_id: The outcome UUID.

        Returns:
            List of notes linked to the outcome.
        """
        result = await self._db.execute(
            select(Note)
            .where(Note.student_id == student_id)
            .where(Note.curriculum_outcomes.contains([outcome_id]))
            .order_by(Note.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_download_url(self, note_id: UUID, student_id: UUID) -> str:
        """Get a presigned download URL for a note's file.

        Args:
            note_id: Note UUID.
            student_id: Student ID for ownership verification.

        Returns:
            Presigned download URL.
        """
        note = await self.get_note(note_id, student_id)

        metadata = note.note_metadata or {}
        storage_key = metadata.get("storage_key")

        if not storage_key:
            raise NoteServiceError("Storage key not found")

        return await self._storage.generate_presigned_download_url(storage_key)

    async def get_thumbnail_url(self, note_id: UUID, student_id: UUID) -> str | None:
        """Get a presigned URL for a note's thumbnail.

        Args:
            note_id: Note UUID.
            student_id: Student ID for ownership verification.

        Returns:
            Presigned thumbnail URL, or None if no thumbnail.
        """
        note = await self.get_note(note_id, student_id)

        metadata = note.note_metadata or {}
        storage_key = metadata.get("storage_key")

        if not storage_key:
            return None

        thumb_key = self._storage.generate_thumbnail_key(storage_key)

        if await self._storage.file_exists(thumb_key):
            return await self._storage.generate_presigned_download_url(thumb_key)

        return None
