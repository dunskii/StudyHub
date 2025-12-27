"""Spaced Repetition Service implementing the SM-2 algorithm.

The SM-2 (SuperMemo 2) algorithm is a proven spaced repetition algorithm
that calculates optimal review intervals based on user performance.

Quality ratings (0-5):
    0 - Complete blackout, no memory
    1 - Incorrect response, but upon seeing correct answer it felt familiar
    2 - Incorrect response, but correct answer seemed easy to recall
    3 - Correct response with serious difficulty
    4 - Correct response after hesitation
    5 - Perfect response with no hesitation

Algorithm:
    - If quality < 3: Reset repetition count, interval = 1 day
    - If quality >= 3: Increase interval based on ease factor
    - Ease factor adjusted after each review (minimum 1.3)
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import NamedTuple


class ReviewResult(NamedTuple):
    """Result of applying SM-2 algorithm to a review."""

    interval: int  # Days until next review
    ease_factor: float  # Updated ease factor
    repetition: int  # Updated repetition count
    next_review: datetime  # Next review datetime
    was_correct: bool  # Whether the review was considered successful


@dataclass
class SpacedRepetitionState:
    """Current spaced repetition state for a flashcard."""

    interval: int = 1  # Current interval in days
    ease_factor: float = 2.5  # Current ease factor
    repetition: int = 0  # Number of successful reviews in a row


class SpacedRepetitionService:
    """Service implementing the SM-2 spaced repetition algorithm."""

    # Constants for SM-2 algorithm
    MIN_EASE_FACTOR = 1.3
    DEFAULT_EASE_FACTOR = 2.5
    INITIAL_INTERVAL = 1
    SECOND_INTERVAL = 6

    # Quality thresholds
    QUALITY_THRESHOLD = 3  # Minimum quality for successful review

    @classmethod
    def calculate_next_review(
        cls,
        quality: int,
        current_state: SpacedRepetitionState,
    ) -> ReviewResult:
        """Calculate the next review schedule using SM-2 algorithm.

        Args:
            quality: Quality of response (0-5).
                0 = complete blackout
                1 = incorrect, but answer felt familiar
                2 = incorrect, but answer seemed easy to recall
                3 = correct with serious difficulty
                4 = correct after hesitation
                5 = perfect response

            current_state: Current spaced repetition state.

        Returns:
            ReviewResult with updated interval, ease factor, and next review date.

        Raises:
            ValueError: If quality is not between 0 and 5.
        """
        if not 0 <= quality <= 5:
            raise ValueError(f"Quality must be between 0 and 5, got {quality}")

        # Calculate new ease factor using SM-2 formula
        new_ease = cls._calculate_ease_factor(quality, current_state.ease_factor)

        # Determine if this was a successful review
        was_correct = quality >= cls.QUALITY_THRESHOLD

        if was_correct:
            # Successful review - increase interval
            new_repetition = current_state.repetition + 1
            new_interval = cls._calculate_interval(
                new_repetition, current_state.interval, new_ease
            )
        else:
            # Failed review - reset to beginning
            new_repetition = 0
            new_interval = cls.INITIAL_INTERVAL

        # Calculate next review datetime
        next_review = datetime.now(timezone.utc) + timedelta(days=new_interval)

        return ReviewResult(
            interval=new_interval,
            ease_factor=new_ease,
            repetition=new_repetition,
            next_review=next_review,
            was_correct=was_correct,
        )

    @classmethod
    def _calculate_ease_factor(cls, quality: int, current_ease: float) -> float:
        """Calculate new ease factor using SM-2 formula.

        Formula: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))

        Where:
            EF = current ease factor
            q = quality of response (0-5)
            EF' = new ease factor

        The ease factor determines how quickly intervals grow.
        Higher quality responses increase the ease factor.
        Lower quality responses decrease it (making reviews more frequent).
        """
        new_ease = current_ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))

        # Ensure ease factor doesn't fall below minimum
        return max(cls.MIN_EASE_FACTOR, new_ease)

    @classmethod
    def _calculate_interval(
        cls, repetition: int, current_interval: int, ease_factor: float
    ) -> int:
        """Calculate the next interval based on repetition count.

        SM-2 interval schedule:
            - First review: 1 day
            - Second review: 6 days
            - Subsequent: previous_interval * ease_factor
        """
        if repetition == 1:
            return cls.INITIAL_INTERVAL
        elif repetition == 2:
            return cls.SECOND_INTERVAL
        else:
            # Round to nearest integer, minimum 1 day
            return max(1, round(current_interval * ease_factor))

    @classmethod
    def quality_from_difficulty(cls, difficulty: int, was_correct: bool) -> int:
        """Convert user difficulty rating to SM-2 quality score.

        Maps a 1-5 difficulty rating and correctness to 0-5 quality:
            - Incorrect + easy difficulty (1-2): quality 1-2
            - Incorrect + hard difficulty (3-5): quality 0-1
            - Correct + easy difficulty (1-2): quality 5
            - Correct + medium difficulty (3): quality 4
            - Correct + hard difficulty (4-5): quality 3

        Args:
            difficulty: User-rated difficulty (1=easy, 5=hard).
            was_correct: Whether the user got the answer correct.

        Returns:
            SM-2 quality rating (0-5).
        """
        if not 1 <= difficulty <= 5:
            difficulty = 3  # Default to medium if invalid

        if was_correct:
            # Map difficulty to quality for correct answers
            if difficulty <= 2:
                return 5  # Easy - perfect
            elif difficulty == 3:
                return 4  # Medium - correct with hesitation
            else:
                return 3  # Hard - correct with difficulty
        else:
            # Map difficulty to quality for incorrect answers
            if difficulty <= 2:
                return 2  # Easy but wrong - should have been easy
            elif difficulty == 3:
                return 1  # Medium and wrong
            else:
                return 0  # Hard and wrong - complete blackout

    @classmethod
    def calculate_mastery_percent(cls, review_count: int, correct_count: int) -> int:
        """Calculate mastery percentage based on review history.

        Uses a weighted formula that considers:
        - Overall accuracy
        - Number of reviews (more reviews = more confident in score)

        Args:
            review_count: Total number of reviews.
            correct_count: Number of correct reviews.

        Returns:
            Mastery percentage (0-100).
        """
        if review_count == 0:
            return 0

        # Base accuracy
        accuracy = correct_count / review_count

        # Confidence factor based on review count
        # Reaches ~95% confidence at 10 reviews
        confidence = 1 - (0.5 ** (review_count / 2))

        # Weighted mastery
        mastery = accuracy * confidence * 100

        return min(100, max(0, round(mastery)))

    @classmethod
    def get_initial_state(cls) -> SpacedRepetitionState:
        """Get the initial spaced repetition state for a new flashcard."""
        return SpacedRepetitionState(
            interval=cls.INITIAL_INTERVAL,
            ease_factor=cls.DEFAULT_EASE_FACTOR,
            repetition=0,
        )

    @classmethod
    def is_due(cls, next_review: datetime | None) -> bool:
        """Check if a flashcard is due for review.

        Args:
            next_review: The next scheduled review datetime.

        Returns:
            True if the card is due (or has never been reviewed).
        """
        if next_review is None:
            return True
        return datetime.now(timezone.utc) >= next_review

    @classmethod
    def days_until_review(cls, next_review: datetime | None) -> int:
        """Calculate days until the next review.

        Args:
            next_review: The next scheduled review datetime.

        Returns:
            Number of days until review (negative if overdue, 0 if due today).
        """
        if next_review is None:
            return 0

        now = datetime.now(timezone.utc)
        delta = next_review - now
        return delta.days


# Singleton instance for convenience
_spaced_repetition_service: SpacedRepetitionService | None = None


def get_spaced_repetition_service() -> SpacedRepetitionService:
    """Get the spaced repetition service singleton."""
    global _spaced_repetition_service
    if _spaced_repetition_service is None:
        _spaced_repetition_service = SpacedRepetitionService()
    return _spaced_repetition_service
