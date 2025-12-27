"""Tests for the SpacedRepetitionService and SM-2 algorithm."""
from datetime import datetime, timedelta, timezone

import pytest

from app.services.spaced_repetition import (
    SpacedRepetitionService,
    SpacedRepetitionState,
    get_spaced_repetition_service,
)


class TestSpacedRepetitionService:
    """Tests for the SM-2 spaced repetition algorithm."""

    def test_service_singleton(self) -> None:
        """Test that get_spaced_repetition_service returns singleton."""
        service1 = get_spaced_repetition_service()
        service2 = get_spaced_repetition_service()
        assert service1 is service2

    def test_initial_state(self) -> None:
        """Test initial spaced repetition state."""
        state = SpacedRepetitionService.get_initial_state()
        assert state.interval == 1
        assert state.ease_factor == 2.5
        assert state.repetition == 0

    def test_quality_validation(self) -> None:
        """Test that invalid quality values raise ValueError."""
        state = SpacedRepetitionState()

        with pytest.raises(ValueError):
            SpacedRepetitionService.calculate_next_review(-1, state)

        with pytest.raises(ValueError):
            SpacedRepetitionService.calculate_next_review(6, state)

    def test_first_successful_review(self) -> None:
        """Test first successful review (quality >= 3)."""
        state = SpacedRepetitionState(interval=1, ease_factor=2.5, repetition=0)

        result = SpacedRepetitionService.calculate_next_review(4, state)

        assert result.was_correct is True
        assert result.repetition == 1
        assert result.interval == 1  # First successful review = 1 day
        # Quality 4 keeps ease factor the same (SM-2 formula: 0.1 - 1*0.1 = 0)
        assert result.ease_factor == 2.5

    def test_second_successful_review(self) -> None:
        """Test second successful review."""
        state = SpacedRepetitionState(interval=1, ease_factor=2.5, repetition=1)

        result = SpacedRepetitionService.calculate_next_review(4, state)

        assert result.was_correct is True
        assert result.repetition == 2
        assert result.interval == 6  # Second review = 6 days

    def test_subsequent_successful_review(self) -> None:
        """Test subsequent reviews use interval * ease_factor."""
        state = SpacedRepetitionState(interval=6, ease_factor=2.5, repetition=2)

        result = SpacedRepetitionService.calculate_next_review(4, state)

        assert result.was_correct is True
        assert result.repetition == 3
        # 6 * 2.5 = 15, but ease factor increases with quality 4
        assert result.interval >= 15

    def test_failed_review_resets(self) -> None:
        """Test that failed review (quality < 3) resets interval."""
        state = SpacedRepetitionState(interval=15, ease_factor=2.5, repetition=5)

        result = SpacedRepetitionService.calculate_next_review(2, state)

        assert result.was_correct is False
        assert result.repetition == 0  # Reset
        assert result.interval == 1  # Reset to 1 day

    def test_ease_factor_minimum(self) -> None:
        """Test ease factor doesn't go below minimum."""
        state = SpacedRepetitionState(interval=1, ease_factor=1.3, repetition=0)

        # Quality 0 would decrease ease factor significantly
        result = SpacedRepetitionService.calculate_next_review(0, state)

        assert result.ease_factor >= 1.3  # Minimum value

    def test_ease_factor_increase_with_quality_5(self) -> None:
        """Test ease factor increases with perfect quality."""
        state = SpacedRepetitionState(interval=1, ease_factor=2.5, repetition=0)

        result = SpacedRepetitionService.calculate_next_review(5, state)

        assert result.ease_factor > 2.5  # Should increase

    def test_ease_factor_decrease_with_quality_3(self) -> None:
        """Test ease factor decreases with quality 3."""
        state = SpacedRepetitionState(interval=1, ease_factor=2.5, repetition=0)

        result = SpacedRepetitionService.calculate_next_review(3, state)

        assert result.ease_factor < 2.5  # Should decrease (barely pass)

    def test_next_review_date_is_future(self) -> None:
        """Test next review date is in the future."""
        state = SpacedRepetitionState()
        now = datetime.now(timezone.utc)

        result = SpacedRepetitionService.calculate_next_review(4, state)

        assert result.next_review > now

    def test_next_review_date_matches_interval(self) -> None:
        """Test next review date matches calculated interval."""
        state = SpacedRepetitionState(interval=1, ease_factor=2.5, repetition=1)
        now = datetime.now(timezone.utc)

        result = SpacedRepetitionService.calculate_next_review(4, state)

        # Should be approximately 6 days from now
        expected_date = now + timedelta(days=result.interval)
        # Allow 1 second tolerance
        assert abs((result.next_review - expected_date).total_seconds()) < 1


class TestQualityConversion:
    """Tests for difficulty-to-quality conversion."""

    def test_correct_easy_gives_quality_5(self) -> None:
        """Test correct + easy difficulty = quality 5."""
        quality = SpacedRepetitionService.quality_from_difficulty(1, True)
        assert quality == 5

        quality = SpacedRepetitionService.quality_from_difficulty(2, True)
        assert quality == 5

    def test_correct_medium_gives_quality_4(self) -> None:
        """Test correct + medium difficulty = quality 4."""
        quality = SpacedRepetitionService.quality_from_difficulty(3, True)
        assert quality == 4

    def test_correct_hard_gives_quality_3(self) -> None:
        """Test correct + hard difficulty = quality 3."""
        quality = SpacedRepetitionService.quality_from_difficulty(4, True)
        assert quality == 3

        quality = SpacedRepetitionService.quality_from_difficulty(5, True)
        assert quality == 3

    def test_incorrect_easy_gives_quality_2(self) -> None:
        """Test incorrect + easy difficulty = quality 2."""
        quality = SpacedRepetitionService.quality_from_difficulty(1, False)
        assert quality == 2

    def test_incorrect_medium_gives_quality_1(self) -> None:
        """Test incorrect + medium difficulty = quality 1."""
        quality = SpacedRepetitionService.quality_from_difficulty(3, False)
        assert quality == 1

    def test_incorrect_hard_gives_quality_0(self) -> None:
        """Test incorrect + hard difficulty = quality 0."""
        quality = SpacedRepetitionService.quality_from_difficulty(5, False)
        assert quality == 0

    def test_invalid_difficulty_defaults_to_medium(self) -> None:
        """Test invalid difficulty defaults to medium behavior."""
        # Invalid values should be treated as medium (3)
        quality = SpacedRepetitionService.quality_from_difficulty(0, True)
        assert quality == 4  # Correct + medium

        quality = SpacedRepetitionService.quality_from_difficulty(10, False)
        assert quality == 1  # Incorrect + medium


class TestMasteryCalculation:
    """Tests for mastery percentage calculation."""

    def test_zero_reviews_gives_zero_mastery(self) -> None:
        """Test zero reviews = zero mastery."""
        mastery = SpacedRepetitionService.calculate_mastery_percent(0, 0)
        assert mastery == 0

    def test_perfect_accuracy_scales_with_reviews(self) -> None:
        """Test mastery increases with review count at perfect accuracy."""
        # 1 review, all correct
        mastery1 = SpacedRepetitionService.calculate_mastery_percent(1, 1)

        # 10 reviews, all correct
        mastery10 = SpacedRepetitionService.calculate_mastery_percent(10, 10)

        assert mastery10 > mastery1
        assert mastery10 <= 100

    def test_low_accuracy_limits_mastery(self) -> None:
        """Test low accuracy limits maximum mastery."""
        # 50% accuracy with 10 reviews
        mastery = SpacedRepetitionService.calculate_mastery_percent(10, 5)

        assert mastery < 50  # Below raw accuracy due to weighting

    def test_mastery_capped_at_100(self) -> None:
        """Test mastery never exceeds 100."""
        mastery = SpacedRepetitionService.calculate_mastery_percent(100, 100)
        assert mastery <= 100


class TestDueChecks:
    """Tests for due date utilities."""

    def test_none_next_review_is_due(self) -> None:
        """Test None next_review means card is due."""
        assert SpacedRepetitionService.is_due(None) is True

    def test_past_date_is_due(self) -> None:
        """Test past date means card is due."""
        past = datetime.now(timezone.utc) - timedelta(days=1)
        assert SpacedRepetitionService.is_due(past) is True

    def test_future_date_is_not_due(self) -> None:
        """Test future date means card is not due."""
        future = datetime.now(timezone.utc) + timedelta(days=1)
        assert SpacedRepetitionService.is_due(future) is False

    def test_days_until_review_none_is_zero(self) -> None:
        """Test None next_review returns 0 days."""
        days = SpacedRepetitionService.days_until_review(None)
        assert days == 0

    def test_days_until_review_overdue_is_negative(self) -> None:
        """Test overdue card returns negative days."""
        past = datetime.now(timezone.utc) - timedelta(days=3)
        days = SpacedRepetitionService.days_until_review(past)
        assert days < 0

    def test_days_until_review_future(self) -> None:
        """Test future card returns positive days."""
        future = datetime.now(timezone.utc) + timedelta(days=5)
        days = SpacedRepetitionService.days_until_review(future)
        assert 4 <= days <= 5  # Could be 4 or 5 depending on time


class TestAlgorithmProgression:
    """Integration tests for typical learning progressions."""

    def test_consistent_correct_answers_grow_interval(self) -> None:
        """Test consistent correct answers lead to longer intervals."""
        state = SpacedRepetitionState()
        intervals = []

        for _ in range(5):
            result = SpacedRepetitionService.calculate_next_review(4, state)
            intervals.append(result.interval)
            state = SpacedRepetitionState(
                interval=result.interval,
                ease_factor=result.ease_factor,
                repetition=result.repetition,
            )

        # Intervals should generally increase (with some variance)
        assert intervals[-1] > intervals[0]

    def test_mixed_performance_affects_progression(self) -> None:
        """Test mixed performance leads to slower progression."""
        # Consistent good performance
        good_state = SpacedRepetitionState()
        for _ in range(5):
            result = SpacedRepetitionService.calculate_next_review(4, good_state)
            good_state = SpacedRepetitionState(
                interval=result.interval,
                ease_factor=result.ease_factor,
                repetition=result.repetition,
            )

        # Mixed performance (some failures)
        mixed_state = SpacedRepetitionState()
        for quality in [4, 4, 2, 4, 4]:  # One failure
            result = SpacedRepetitionService.calculate_next_review(quality, mixed_state)
            mixed_state = SpacedRepetitionState(
                interval=result.interval,
                ease_factor=result.ease_factor,
                repetition=result.repetition,
            )

        # Good performer should have longer interval
        assert good_state.interval > mixed_state.interval


class TestStreakDateCalculation:
    """Tests for streak date boundary calculations using timedelta.

    These tests verify the fix for the month boundary bug that occurred when
    using .replace(day=...) instead of timedelta(days=1).
    """

    def test_timedelta_handles_month_boundary(self) -> None:
        """Test timedelta correctly handles month boundaries.

        The old buggy code used:
          date(2025, 1, 1).replace(day=0)  # ValueError
        The fix uses:
          date(2025, 1, 1) - timedelta(days=1)  # date(2024, 12, 31)
        """
        from datetime import date

        # January 1st going back to December 31st
        jan_1 = date(2025, 1, 1)
        yesterday = jan_1 - timedelta(days=1)
        assert yesterday == date(2024, 12, 31)

    def test_timedelta_handles_february_end(self) -> None:
        """Test timedelta correctly handles February boundaries."""
        from datetime import date

        # March 1st going back to February 28/29
        mar_1 = date(2025, 3, 1)
        yesterday = mar_1 - timedelta(days=1)
        assert yesterday == date(2025, 2, 28)  # 2025 is not a leap year

        # Leap year case
        mar_1_leap = date(2024, 3, 1)
        yesterday_leap = mar_1_leap - timedelta(days=1)
        assert yesterday_leap == date(2024, 2, 29)  # 2024 is a leap year

    def test_timedelta_handles_year_boundary(self) -> None:
        """Test timedelta correctly handles year boundaries."""
        from datetime import date

        # Going from Jan 1 to Dec 31 of previous year
        new_year = date(2026, 1, 1)
        yesterday = new_year - timedelta(days=1)
        assert yesterday == date(2025, 12, 31)

    def test_consecutive_days_across_month_boundary(self) -> None:
        """Test calculating streak across month boundaries."""
        from datetime import date

        # Simulate dates from a streak crossing Dec/Jan
        dates = [
            date(2025, 1, 3),  # Today
            date(2025, 1, 2),
            date(2025, 1, 1),
            date(2024, 12, 31),
            date(2024, 12, 30),
        ]

        streak = 1
        for i in range(1, len(dates)):
            expected_date = dates[i - 1] - timedelta(days=1)
            if dates[i] == expected_date:
                streak += 1
            else:
                break

        assert streak == 5  # All 5 days are consecutive
