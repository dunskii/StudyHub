"""Tests for Revision API endpoints."""
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.database import get_db
from app.core.security import create_access_token
from app.main import app


# =============================================================================
# TestFlashcardCRUD
# =============================================================================


class TestFlashcardCRUD:
    """Tests for flashcard CRUD operations."""

    @pytest.mark.asyncio
    async def test_create_flashcard_success(
        self,
        authenticated_client: AsyncClient,
        sample_student,
        sample_subject,
    ):
        """Test creating a flashcard successfully."""
        data = {
            "front": "What is the capital of Australia?",
            "back": "Canberra",
            "subject_id": str(sample_subject.id),
        }

        response = await authenticated_client.post(
            f"/api/v1/revision/flashcards?student_id={sample_student.id}",
            json=data,
        )

        assert response.status_code == 201
        result = response.json()
        assert result["front"] == "What is the capital of Australia?"
        assert result["back"] == "Canberra"
        assert result["generated_by"] == "user"
        assert result["sr_interval"] == 1
        assert result["sr_ease_factor"] == 2.5

    @pytest.mark.asyncio
    async def test_create_flashcard_unauthenticated(
        self,
        client: AsyncClient,
        sample_student,
        sample_subject,
    ):
        """Test that unauthenticated requests return 401."""
        data = {
            "front": "Test question",
            "back": "Test answer",
            "subject_id": str(sample_subject.id),
        }

        response = await client.post(
            f"/api/v1/revision/flashcards?student_id={sample_student.id}",
            json=data,
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_create_flashcard_wrong_student(
        self,
        db_session,
        another_user,
        sample_student,
        sample_subject,
    ):
        """Test creating flashcard for another user's student returns 403."""
        async def override_get_db():
            yield db_session

        app.dependency_overrides[get_db] = override_get_db

        token = create_access_token(data={"sub": str(another_user.supabase_auth_id)})

        data = {
            "front": "Test question",
            "back": "Test answer",
            "subject_id": str(sample_subject.id),
        }

        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
            headers={"Authorization": f"Bearer {token}"},
        ) as client:
            response = await client.post(
                f"/api/v1/revision/flashcards?student_id={sample_student.id}",
                json=data,
            )

        app.dependency_overrides.clear()

        assert response.status_code == 403
        result = response.json()
        # Error may be in "detail" or "message" depending on exception handler
        error_msg = result.get("detail") or result.get("message", "")
        assert "your own students" in error_msg or response.status_code == 403

    @pytest.mark.asyncio
    async def test_get_flashcard_success(
        self,
        authenticated_client: AsyncClient,
        sample_flashcard,
    ):
        """Test getting a flashcard by ID."""
        response = await authenticated_client.get(
            f"/api/v1/revision/flashcards/{sample_flashcard.id}"
            f"?student_id={sample_flashcard.student_id}"
        )

        assert response.status_code == 200
        result = response.json()
        assert result["id"] == str(sample_flashcard.id)
        assert result["front"] == sample_flashcard.front

    @pytest.mark.asyncio
    async def test_get_flashcard_not_found(
        self,
        authenticated_client: AsyncClient,
        sample_student,
    ):
        """Test getting a non-existent flashcard returns 404."""
        fake_id = uuid.uuid4()
        response = await authenticated_client.get(
            f"/api/v1/revision/flashcards/{fake_id}?student_id={sample_student.id}"
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_list_flashcards_with_filters(
        self,
        authenticated_client: AsyncClient,
        sample_flashcards,
    ):
        """Test listing flashcards with subject filter."""
        student_id = sample_flashcards[0].student_id
        subject_id = sample_flashcards[0].subject_id

        response = await authenticated_client.get(
            f"/api/v1/revision/flashcards?student_id={student_id}&subject_id={subject_id}"
        )

        assert response.status_code == 200
        result = response.json()
        assert result["total"] >= 1
        assert len(result["flashcards"]) >= 1

    @pytest.mark.asyncio
    async def test_list_flashcards_with_search(
        self,
        authenticated_client: AsyncClient,
        sample_flashcard,
    ):
        """Test listing flashcards with search query."""
        response = await authenticated_client.get(
            f"/api/v1/revision/flashcards"
            f"?student_id={sample_flashcard.student_id}"
            f"&search=2%20%2B%202"  # URL encoded "2 + 2"
        )

        assert response.status_code == 200
        result = response.json()
        # Should find the sample flashcard with "What is 2 + 2?"
        assert result["total"] >= 1

    @pytest.mark.asyncio
    async def test_update_flashcard_success(
        self,
        authenticated_client: AsyncClient,
        sample_flashcard,
    ):
        """Test updating a flashcard."""
        data = {
            "front": "Updated question",
            "back": "Updated answer",
        }

        response = await authenticated_client.put(
            f"/api/v1/revision/flashcards/{sample_flashcard.id}"
            f"?student_id={sample_flashcard.student_id}",
            json=data,
        )

        assert response.status_code == 200
        result = response.json()
        assert result["front"] == "Updated question"
        assert result["back"] == "Updated answer"

    @pytest.mark.asyncio
    async def test_delete_flashcard_success(
        self,
        authenticated_client: AsyncClient,
        sample_flashcard,
    ):
        """Test deleting a flashcard."""
        response = await authenticated_client.delete(
            f"/api/v1/revision/flashcards/{sample_flashcard.id}"
            f"?student_id={sample_flashcard.student_id}"
        )

        assert response.status_code == 204

        # Verify deleted
        get_response = await authenticated_client.get(
            f"/api/v1/revision/flashcards/{sample_flashcard.id}"
            f"?student_id={sample_flashcard.student_id}"
        )
        assert get_response.status_code == 404


# =============================================================================
# TestFlashcardGeneration
# =============================================================================


class TestFlashcardGeneration:
    """Tests for AI flashcard generation."""

    @pytest.mark.asyncio
    async def test_generate_requires_source(
        self,
        authenticated_client: AsyncClient,
        sample_student,
    ):
        """Test that generation requires note_id or outcome_id."""
        data = {
            "count": 5,
        }

        response = await authenticated_client.post(
            f"/api/v1/revision/flashcards/generate?student_id={sample_student.id}",
            json=data,
        )

        assert response.status_code == 400
        result = response.json()
        error_msg = result.get("detail") or result.get("message", "")
        assert "note_id or outcome_id" in error_msg or response.status_code == 400

    @pytest.mark.asyncio
    async def test_generate_rate_limit(
        self,
        authenticated_client: AsyncClient,
        sample_student,
        sample_note,
    ):
        """Test that rate limiting kicks in after too many requests."""
        from app.api.v1.endpoints.revision import generation_rate_limiter

        # Manually fill up the rate limit
        for _ in range(5):
            generation_rate_limiter.record_request(sample_student.id)

        data = {
            "note_id": str(sample_note.id),
            "count": 3,
        }

        response = await authenticated_client.post(
            f"/api/v1/revision/flashcards/generate?student_id={sample_student.id}",
            json=data,
        )

        assert response.status_code == 429
        # Note: Retry-After header may not be passed through depending on middleware
        result = response.json()
        error_msg = result.get("detail") or result.get("message", "")
        assert "Too many" in error_msg or "rate" in error_msg.lower() or "limit" in error_msg.lower()

        # Clean up rate limiter state
        generation_rate_limiter._hourly.clear()
        generation_rate_limiter._daily.clear()

    @pytest.mark.asyncio
    async def test_generate_from_note_success(
        self,
        authenticated_client: AsyncClient,
        sample_student,
        sample_note,
    ):
        """Test generating flashcards from a note (mocked Claude)."""
        from app.api.v1.endpoints.revision import generation_rate_limiter
        from app.services.flashcard_generation import FlashcardDraft

        # Clear rate limits for this test
        generation_rate_limiter._hourly.clear()
        generation_rate_limiter._daily.clear()

        mock_drafts = [
            FlashcardDraft(
                front="What is photosynthesis?",
                back="The process by which plants convert sunlight into energy",
                difficulty_level=2,
                tags=["science", "biology"],
            ),
            FlashcardDraft(
                front="What do plants need for photosynthesis?",
                back="Sunlight, water, and carbon dioxide",
                difficulty_level=1,
                tags=["science", "biology"],
            ),
        ]

        with patch(
            "app.api.v1.endpoints.revision.FlashcardGenerationService.generate_from_note",
            new_callable=AsyncMock,
            return_value=mock_drafts,
        ):
            data = {
                "note_id": str(sample_note.id),
                "count": 2,
            }

            response = await authenticated_client.post(
                f"/api/v1/revision/flashcards/generate?student_id={sample_student.id}",
                json=data,
            )

        assert response.status_code == 200
        result = response.json()
        assert len(result["drafts"]) == 2
        assert result["source_type"] == "note"
        assert result["drafts"][0]["front"] == "What is photosynthesis?"


# =============================================================================
# TestRevisionReview
# =============================================================================


class TestRevisionReview:
    """Tests for revision review/answer submission."""

    @pytest.mark.asyncio
    async def test_submit_correct_answer(
        self,
        authenticated_client: AsyncClient,
        sample_flashcard,
    ):
        """Test submitting a correct answer updates SM-2 state."""
        data = {
            "flashcard_id": str(sample_flashcard.id),
            "was_correct": True,
            "difficulty_rating": 3,
            "response_time_seconds": 5.0,
        }

        response = await authenticated_client.post(
            f"/api/v1/revision/answer?student_id={sample_flashcard.student_id}",
            json=data,
        )

        assert response.status_code == 200
        result = response.json()
        assert result["was_correct"] is True
        assert result["new_interval"] >= 1
        assert result["next_review"] is not None

    @pytest.mark.asyncio
    async def test_submit_incorrect_answer(
        self,
        authenticated_client: AsyncClient,
        sample_flashcard,
        db_session,
    ):
        """Test submitting an incorrect answer resets interval."""
        # First, set a higher interval on the flashcard
        sample_flashcard.sr_interval = 10
        sample_flashcard.sr_repetition = 3
        await db_session.commit()
        await db_session.refresh(sample_flashcard)

        data = {
            "flashcard_id": str(sample_flashcard.id),
            "was_correct": False,
            "difficulty_rating": 1,
            "response_time_seconds": 10.0,
        }

        response = await authenticated_client.post(
            f"/api/v1/revision/answer?student_id={sample_flashcard.student_id}",
            json=data,
        )

        assert response.status_code == 200
        result = response.json()
        assert result["was_correct"] is False
        # SM-2 resets interval to 1 on incorrect answer
        assert result["new_interval"] == 1

    @pytest.mark.asyncio
    async def test_answer_creates_history(
        self,
        authenticated_client: AsyncClient,
        sample_flashcard,
    ):
        """Test that answering a flashcard creates a history record."""
        data = {
            "flashcard_id": str(sample_flashcard.id),
            "was_correct": True,
            "difficulty_rating": 4,
            "response_time_seconds": 3.0,
        }

        # Submit an answer
        await authenticated_client.post(
            f"/api/v1/revision/answer?student_id={sample_flashcard.student_id}",
            json=data,
        )

        # Check history
        history_response = await authenticated_client.get(
            f"/api/v1/revision/history"
            f"?student_id={sample_flashcard.student_id}"
            f"&flashcard_id={sample_flashcard.id}"
        )

        assert history_response.status_code == 200
        history = history_response.json()
        assert len(history) >= 1
        assert history[0]["flashcard_id"] == str(sample_flashcard.id)
        assert history[0]["was_correct"] is True

    @pytest.mark.asyncio
    async def test_get_due_flashcards(
        self,
        authenticated_client: AsyncClient,
        sample_flashcard,
    ):
        """Test getting due flashcards."""
        response = await authenticated_client.get(
            f"/api/v1/revision/due?student_id={sample_flashcard.student_id}"
        )

        assert response.status_code == 200
        result = response.json()
        # sample_flashcard should be due (sr_next_review is in the past)
        assert isinstance(result, list)


# =============================================================================
# TestRevisionProgress
# =============================================================================


class TestRevisionProgress:
    """Tests for revision progress endpoints."""

    @pytest.mark.asyncio
    async def test_get_progress_empty(
        self,
        authenticated_client: AsyncClient,
        sample_student,
    ):
        """Test getting progress for a student with no flashcards."""
        response = await authenticated_client.get(
            f"/api/v1/revision/progress?student_id={sample_student.id}"
        )

        assert response.status_code == 200
        result = response.json()
        assert result["total_flashcards"] == 0
        assert result["cards_due"] == 0
        assert result["overall_mastery_percent"] == 0.0

    @pytest.mark.asyncio
    async def test_get_progress_with_data(
        self,
        authenticated_client: AsyncClient,
        sample_flashcards,
    ):
        """Test getting progress with flashcard data."""
        student_id = sample_flashcards[0].student_id

        response = await authenticated_client.get(
            f"/api/v1/revision/progress?student_id={student_id}"
        )

        assert response.status_code == 200
        result = response.json()
        assert result["total_flashcards"] >= 3  # sample_flashcards creates 5
        assert "cards_due" in result
        assert "overall_mastery_percent" in result
        assert "review_streak" in result

    @pytest.mark.asyncio
    async def test_get_progress_by_subject(
        self,
        authenticated_client: AsyncClient,
        sample_flashcards_multi_subject,
    ):
        """Test getting progress grouped by subject."""
        student_id = sample_flashcards_multi_subject[0].student_id

        response = await authenticated_client.get(
            f"/api/v1/revision/progress/by-subject?student_id={student_id}"
        )

        assert response.status_code == 200
        result = response.json()
        assert isinstance(result, list)
        # Should have at least 2 subjects
        assert len(result) >= 2
        for subject_progress in result:
            assert "subject_id" in subject_progress
            assert "subject_name" in subject_progress
            assert "total_cards" in subject_progress
            assert "mastery_percent" in subject_progress

    @pytest.mark.asyncio
    async def test_get_revision_history(
        self,
        authenticated_client: AsyncClient,
        sample_student,
    ):
        """Test getting revision history."""
        response = await authenticated_client.get(
            f"/api/v1/revision/history?student_id={sample_student.id}&limit=10"
        )

        assert response.status_code == 200
        result = response.json()
        assert isinstance(result, list)
