"""Tutor prompts for subject-specific Socratic tutoring.

This package contains the base tutor prompt and subject-specific prompts
for each NSW curriculum KLA (Key Learning Area).

Subject Codes and Tutor Styles:
- MATH: Mathematics (socratic_stepwise)
- ENG: English (socratic_analytical)
- SCI: Science (inquiry_based)
- HSIE: History and Geography (socratic_analytical)
- PDHPE: Personal Development, Health and Physical Education (discussion_based)
- TAS: Technology and Applied Studies (project_based)
- CA: Creative Arts (creative_mentoring)
- LANG: Languages (immersive)

Usage:
    from app.services.tutor_prompts import TutorPromptFactory, Stage

    # Get a prompt for a specific subject and stage
    prompt = TutorPromptFactory.get_prompt_for_subject(
        subject_code="MATH",
        stage=Stage.STAGE_4,
        outcome_code="MA4-NA-01",
    )

    # Or build context manually for more control
    context = TutorPromptFactory.build_context(
        subject_code="ENG",
        stage="9",  # Will be converted to Stage 5
        student_name="Alex",
    )
    prompt = TutorPromptFactory.get_system_prompt(context)
"""
from app.services.tutor_prompts.base_tutor import (
    Stage,
    TutorContext,
    get_base_system_prompt,
    get_encouragement_phrases,
    get_stuck_prompts,
    STAGE_LANGUAGE_GUIDELINES,
)
from app.services.tutor_prompts.prompt_factory import (
    TutorPromptFactory,
    SUBJECT_NAMES,
    SUBJECT_PROMPT_GENERATORS,
    TUTOR_STYLES,
    YEAR_TO_STAGE,
)

__all__ = [
    # Base tutor
    "Stage",
    "TutorContext",
    "get_base_system_prompt",
    "get_encouragement_phrases",
    "get_stuck_prompts",
    "STAGE_LANGUAGE_GUIDELINES",
    # Factory
    "TutorPromptFactory",
    "SUBJECT_NAMES",
    "SUBJECT_PROMPT_GENERATORS",
    "TUTOR_STYLES",
    "YEAR_TO_STAGE",
]
