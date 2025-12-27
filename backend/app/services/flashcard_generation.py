"""Flashcard Generation Service for AI-powered flashcard creation.

Uses Claude Haiku to generate high-quality flashcards from:
- Note content (OCR text)
- Curriculum outcomes
- Subject context
"""
from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.curriculum_outcome import CurriculumOutcome
from app.models.note import Note
from app.models.student import Student
from app.models.subject import Subject
from app.services.claude_service import ClaudeService, TaskType, get_claude_service

logger = logging.getLogger(__name__)


@dataclass
class FlashcardDraft:
    """A generated flashcard pending approval."""

    front: str
    back: str
    difficulty_level: int
    tags: list[str]


class FlashcardGenerationError(Exception):
    """Error during flashcard generation."""

    pass


class FlashcardGenerationService:
    """Service for generating flashcards using AI."""

    MAX_CARDS_PER_REQUEST = 20
    DEFAULT_CARDS = 5
    MAX_CONTENT_LENGTH = 4000  # Limit content sent to AI

    # Subject-specific question styles
    SUBJECT_STYLES = {
        "MATH": "mathematical problem-solving with clear steps",
        "ENG": "text analysis, vocabulary, and comprehension",
        "SCI": "scientific concepts, hypotheses, and observations",
        "HSIE": "historical events, cause-effect, and source analysis",
        "PDHPE": "health concepts and personal development",
        "TAS": "technology processes and design thinking",
        "CA": "artistic techniques and creative concepts",
        "LANG": "vocabulary, grammar, and language patterns",
    }

    # Stage-appropriate language guidelines
    STAGE_GUIDELINES = {
        "ES1": "Use very simple words, short sentences. Year K.",
        "Stage 1": "Simple language, concrete examples. Years 1-2.",
        "Stage 2": "Clear explanations, real-world examples. Years 3-4.",
        "Stage 3": "More detailed explanations. Years 5-6.",
        "Stage 4": "Academic vocabulary, abstract concepts. Years 7-8.",
        "Stage 5": "Complex ideas, critical thinking. Years 9-10.",
        "Stage 6": "HSC-level rigour, exam-style questions. Years 11-12.",
    }

    def __init__(
        self,
        db: AsyncSession,
        claude: ClaudeService | None = None,
    ) -> None:
        """Initialize the flashcard generation service.

        Args:
            db: Database session.
            claude: Claude service (default: singleton).
        """
        self._db = db
        self._claude = claude

    async def _get_claude(self) -> ClaudeService:
        """Get Claude service lazily."""
        if self._claude is None:
            self._claude = get_claude_service()
        return self._claude

    async def generate_from_note(
        self,
        note_id: UUID,
        student_id: UUID,
        count: int = DEFAULT_CARDS,
    ) -> list[FlashcardDraft]:
        """Generate flashcards from a note's content.

        Args:
            note_id: The note UUID.
            student_id: The student UUID for context.
            count: Number of flashcards to generate.

        Returns:
            List of FlashcardDraft objects.

        Raises:
            FlashcardGenerationError: If generation fails.
        """
        count = min(count, self.MAX_CARDS_PER_REQUEST)

        # Fetch note
        note = await self._db.get(Note, note_id)
        if not note:
            raise FlashcardGenerationError(f"Note {note_id} not found")

        if note.student_id != student_id:
            raise FlashcardGenerationError("Access denied to this note")

        if not note.ocr_text:
            raise FlashcardGenerationError("Note has no OCR text to generate from")

        # Get student context
        student = await self._db.get(Student, student_id)
        if not student:
            raise FlashcardGenerationError("Student not found")

        # Get subject context
        subject_name = "General"
        subject_code = None
        question_style = "clear questions with concise answers"

        if note.subject_id:
            subject = await self._db.get(Subject, note.subject_id)
            if subject:
                subject_name = subject.name
                subject_code = subject.code
                question_style = self.SUBJECT_STYLES.get(
                    subject_code, question_style
                )

        # Build prompt
        stage_guide = self.STAGE_GUIDELINES.get(
            student.school_stage, "Age-appropriate language."
        )

        content = note.ocr_text[:self.MAX_CONTENT_LENGTH]

        prompt = f"""Generate {count} high-quality flashcards from this student note content.

CONTEXT:
- Subject: {subject_name}
- Student Stage: {student.school_stage} (Year {student.grade_level})
- Note Title: {note.title}

LANGUAGE GUIDELINES:
{stage_guide}

QUESTION STYLE:
Focus on {question_style}.

NOTE CONTENT:
{content}

REQUIREMENTS:
1. Create exactly {count} flashcards
2. Each flashcard should test understanding of key concepts
3. Questions (front) should be clear and specific
4. Answers (back) should be concise but complete
5. Vary difficulty levels (1=easy, 3=medium, 5=hard)
6. Include relevant topic tags

Return a JSON array with this exact format:
[
  {{
    "front": "What is...?",
    "back": "The answer is...",
    "difficulty": 3,
    "tags": ["topic1", "topic2"]
  }}
]

Return ONLY the JSON array, no other text."""

        try:
            claude = await self._get_claude()
            response = await claude.chat(
                system_prompt=(
                    "You are an expert educational content creator specialising in "
                    "the NSW curriculum. Create high-quality flashcards that help "
                    "students learn and retain information effectively."
                ),
                messages=[{"role": "user", "content": prompt}],
                task_type=TaskType.SIMPLE,  # Use Haiku for cost efficiency
            )

            # Parse response
            drafts = self._parse_flashcard_response(response.content)

            logger.info(
                f"Generated {len(drafts)} flashcards from note {note_id}"
            )

            return drafts

        except Exception as e:
            logger.error(f"Flashcard generation failed for note {note_id}: {e}")
            raise FlashcardGenerationError(f"Generation failed: {str(e)}")

    async def generate_from_outcome(
        self,
        outcome_id: UUID,
        student_id: UUID,
        count: int = DEFAULT_CARDS,
    ) -> list[FlashcardDraft]:
        """Generate flashcards for a curriculum outcome.

        Args:
            outcome_id: The curriculum outcome UUID.
            student_id: The student UUID for context.
            count: Number of flashcards to generate.

        Returns:
            List of FlashcardDraft objects.
        """
        count = min(count, self.MAX_CARDS_PER_REQUEST)

        # Fetch outcome
        outcome = await self._db.get(CurriculumOutcome, outcome_id)
        if not outcome:
            raise FlashcardGenerationError(f"Outcome {outcome_id} not found")

        # Get student context
        student = await self._db.get(Student, student_id)
        if not student:
            raise FlashcardGenerationError("Student not found")

        # Get subject context
        subject = await self._db.get(Subject, outcome.subject_id)
        subject_name = subject.name if subject else "Unknown"
        subject_code = subject.code if subject else None
        question_style = self.SUBJECT_STYLES.get(
            subject_code, "clear questions with concise answers"
        ) if subject_code else "clear questions with concise answers"

        # Build prompt
        stage_guide = self.STAGE_GUIDELINES.get(
            student.school_stage, "Age-appropriate language."
        )

        prompt = f"""Generate {count} high-quality flashcards for this NSW curriculum outcome.

CURRICULUM OUTCOME:
- Code: {outcome.code}
- Description: {outcome.description}
- Subject: {subject_name}
- Stage: {outcome.stage}

STUDENT CONTEXT:
- Current Stage: {student.school_stage} (Year {student.grade_level})

LANGUAGE GUIDELINES:
{stage_guide}

QUESTION STYLE:
Focus on {question_style}.

REQUIREMENTS:
1. Create exactly {count} flashcards that help students achieve this outcome
2. Questions should directly test the skills/knowledge in the outcome
3. Include a mix of recall, understanding, and application questions
4. Vary difficulty levels (1=easy, 3=medium, 5=hard)
5. Use age-appropriate language and examples

Return a JSON array with this exact format:
[
  {{
    "front": "What is...?",
    "back": "The answer is...",
    "difficulty": 3,
    "tags": ["{outcome.code}", "topic"]
  }}
]

Return ONLY the JSON array, no other text."""

        try:
            claude = await self._get_claude()
            response = await claude.chat(
                system_prompt=(
                    "You are an expert educational content creator specialising in "
                    "the NSW curriculum. Create flashcards that directly align with "
                    "curriculum outcomes and help students master the required skills."
                ),
                messages=[{"role": "user", "content": prompt}],
                task_type=TaskType.SIMPLE,
            )

            drafts = self._parse_flashcard_response(response.content)

            # Ensure outcome code is in tags
            for draft in drafts:
                if outcome.code not in draft.tags:
                    draft.tags.insert(0, outcome.code)

            logger.info(
                f"Generated {len(drafts)} flashcards for outcome {outcome.code}"
            )

            return drafts

        except Exception as e:
            logger.error(f"Flashcard generation failed for outcome {outcome_id}: {e}")
            raise FlashcardGenerationError(f"Generation failed: {str(e)}")

    def _parse_flashcard_response(self, response: str) -> list[FlashcardDraft]:
        """Parse the AI response into FlashcardDraft objects.

        Args:
            response: The raw AI response text.

        Returns:
            List of FlashcardDraft objects.

        Raises:
            FlashcardGenerationError: If parsing fails.
        """
        try:
            # Try to extract JSON array from response
            json_match = re.search(r'\[[\s\S]*\]', response)
            if not json_match:
                raise FlashcardGenerationError("No JSON array found in response")

            cards_data = json.loads(json_match.group())

            if not isinstance(cards_data, list):
                raise FlashcardGenerationError("Response is not a list")

            drafts = []
            for card in cards_data:
                if not isinstance(card, dict):
                    continue

                front = card.get("front", "").strip()
                back = card.get("back", "").strip()

                if not front or not back:
                    continue

                difficulty = card.get("difficulty", 3)
                if not isinstance(difficulty, int) or not 1 <= difficulty <= 5:
                    difficulty = 3

                tags = card.get("tags", [])
                if not isinstance(tags, list):
                    tags = []
                tags = [str(t).strip() for t in tags if t]

                drafts.append(FlashcardDraft(
                    front=front,
                    back=back,
                    difficulty_level=difficulty,
                    tags=tags,
                ))

            if not drafts:
                raise FlashcardGenerationError("No valid flashcards in response")

            return drafts

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse flashcard JSON: {e}")
            raise FlashcardGenerationError(f"Invalid JSON response: {str(e)}")

    async def estimate_generation_cost(self, content_length: int, count: int) -> float:
        """Estimate the cost of generating flashcards.

        Args:
            content_length: Length of source content.
            count: Number of cards to generate.

        Returns:
            Estimated cost in USD.
        """
        # Rough token estimates
        # Input: ~1 token per 4 characters + prompt overhead
        input_tokens = (content_length / 4) + 500
        # Output: ~50 tokens per card
        output_tokens = count * 50

        # Claude Haiku pricing (as of 2024)
        # Input: $0.25 per 1M tokens
        # Output: $1.25 per 1M tokens
        input_cost = (input_tokens / 1_000_000) * 0.25
        output_cost = (output_tokens / 1_000_000) * 1.25

        return round(input_cost + output_cost, 6)
