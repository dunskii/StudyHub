"""Tutor Prompt Factory for dynamic prompt generation.

This module provides a factory for generating subject-specific tutor prompts
based on student context, subject, and curriculum information.
"""
from __future__ import annotations

from typing import Callable

from app.services.tutor_prompts.base_tutor import Stage, TutorContext, get_base_system_prompt
from app.services.tutor_prompts.maths_tutor import get_maths_system_prompt
from app.services.tutor_prompts.english_tutor import get_english_system_prompt
from app.services.tutor_prompts.science_tutor import get_science_system_prompt
from app.services.tutor_prompts.hsie_tutor import get_hsie_system_prompt
from app.services.tutor_prompts.pdhpe_tutor import get_pdhpe_system_prompt
from app.services.tutor_prompts.tas_tutor import get_tas_system_prompt
from app.services.tutor_prompts.creative_arts_tutor import get_creative_arts_system_prompt
from app.services.tutor_prompts.languages_tutor import get_languages_system_prompt


# Mapping of subject codes to their prompt generators
SUBJECT_PROMPT_GENERATORS: dict[str, Callable[[TutorContext], str]] = {
    "MATH": get_maths_system_prompt,
    "ENG": get_english_system_prompt,
    "SCI": get_science_system_prompt,
    "HSIE": get_hsie_system_prompt,
    "PDHPE": get_pdhpe_system_prompt,
    "TAS": get_tas_system_prompt,
    "CA": get_creative_arts_system_prompt,
    "LANG": get_languages_system_prompt,
}

# Mapping of subject codes to display names
SUBJECT_NAMES: dict[str, str] = {
    "MATH": "Mathematics",
    "ENG": "English",
    "SCI": "Science",
    "HSIE": "History and Geography",
    "PDHPE": "PDHPE",
    "TAS": "Technology",
    "CA": "Creative Arts",
    "LANG": "Languages",
}

# Mapping of tutor styles for each subject
TUTOR_STYLES: dict[str, str] = {
    "MATH": "socratic_stepwise",
    "ENG": "socratic_analytical",
    "SCI": "inquiry_based",
    "HSIE": "socratic_analytical",
    "PDHPE": "discussion_based",
    "TAS": "project_based",
    "CA": "creative_mentoring",
    "LANG": "immersive",
}

# Mapping of grade/year to stage
YEAR_TO_STAGE: dict[str, Stage] = {
    "K": Stage.EARLY_STAGE_1,
    "1": Stage.STAGE_1,
    "2": Stage.STAGE_1,
    "3": Stage.STAGE_2,
    "4": Stage.STAGE_2,
    "5": Stage.STAGE_3,
    "6": Stage.STAGE_3,
    "7": Stage.STAGE_4,
    "8": Stage.STAGE_4,
    "9": Stage.STAGE_5,
    "10": Stage.STAGE_5,
    "11": Stage.STAGE_6,
    "12": Stage.STAGE_6,
}


class TutorPromptFactory:
    """Factory for generating subject-specific tutor system prompts."""

    @staticmethod
    def get_stage_from_year(year: str | int) -> Stage:
        """Convert a year level to a curriculum stage.

        Args:
            year: Year level as string or int (K, 1-12).

        Returns:
            The corresponding Stage enum value.
        """
        year_str = str(year).upper().strip()
        return YEAR_TO_STAGE.get(year_str, Stage.STAGE_4)  # Default to Stage 4

    @staticmethod
    def build_context(
        subject_code: str,
        stage: Stage | str,
        pathway: str | None = None,
        outcome_code: str | None = None,
        outcome_description: str | None = None,
        strand: str | None = None,
        student_name: str | None = None,
    ) -> TutorContext:
        """Build a TutorContext from the provided parameters.

        Args:
            subject_code: The subject code (MATH, ENG, etc.).
            stage: The curriculum stage (Stage enum or year string).
            pathway: Optional pathway for Stage 5 (5.1, 5.2, 5.3).
            outcome_code: Optional curriculum outcome code.
            outcome_description: Optional outcome description.
            strand: Optional curriculum strand.
            student_name: Optional student name for personalisation.

        Returns:
            A TutorContext object.
        """
        # Convert stage if it's a string (year)
        if isinstance(stage, str):
            stage = TutorPromptFactory.get_stage_from_year(stage)

        subject_name = SUBJECT_NAMES.get(subject_code.upper(), subject_code)

        return TutorContext(
            subject_name=subject_name,
            subject_code=subject_code.upper(),
            stage=stage,
            pathway=pathway,
            outcome_code=outcome_code,
            outcome_description=outcome_description,
            strand=strand,
            student_name=student_name,
        )

    @staticmethod
    def get_system_prompt(context: TutorContext) -> str:
        """Get the complete system prompt for a subject and context.

        Args:
            context: The TutorContext with all relevant information.

        Returns:
            The complete system prompt string.
        """
        subject_code = context.subject_code.upper()

        # Get the subject-specific generator
        generator = SUBJECT_PROMPT_GENERATORS.get(subject_code)

        if generator:
            return generator(context)
        else:
            # Fall back to base prompt for unknown subjects
            return get_base_system_prompt(context)

    @staticmethod
    def get_prompt_for_subject(
        subject_code: str,
        stage: Stage | str,
        **kwargs: str | None,
    ) -> str:
        """Convenience method to get a prompt directly from subject and stage.

        Args:
            subject_code: The subject code.
            stage: The curriculum stage or year.
            **kwargs: Additional context parameters (pathway, outcome_code, etc.).

        Returns:
            The complete system prompt string.
        """
        context = TutorPromptFactory.build_context(
            subject_code=subject_code,
            stage=stage,
            **kwargs,  # type: ignore[arg-type]
        )
        return TutorPromptFactory.get_system_prompt(context)

    @staticmethod
    def get_tutor_style(subject_code: str) -> str:
        """Get the tutor style for a subject.

        Args:
            subject_code: The subject code.

        Returns:
            The tutor style identifier.
        """
        return TUTOR_STYLES.get(subject_code.upper(), "socratic_stepwise")

    @staticmethod
    def get_available_subjects() -> list[dict[str, str]]:
        """Get list of available subjects with their metadata.

        Returns:
            List of dictionaries with subject info.
        """
        return [
            {
                "code": code,
                "name": SUBJECT_NAMES[code],
                "tutor_style": TUTOR_STYLES[code],
            }
            for code in SUBJECT_NAMES
        ]

    @staticmethod
    def is_valid_subject(subject_code: str) -> bool:
        """Check if a subject code is valid.

        Args:
            subject_code: The subject code to check.

        Returns:
            True if valid, False otherwise.
        """
        return subject_code.upper() in SUBJECT_PROMPT_GENERATORS
