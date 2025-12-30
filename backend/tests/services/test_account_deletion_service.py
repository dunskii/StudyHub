"""Tests for AccountDeletionService."""
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.deletion_request import DeletionRequest, DeletionStatus
from app.schemas.deletion import DeletionRequestCreate
from app.services.account_deletion_service import (
    AccountDeletionService,
    DELETION_GRACE_PERIOD_DAYS,
    TOKEN_EXPIRY_HOURS,
)


@pytest.mark.asyncio
async def test_request_deletion_success(db_session: AsyncSession, sample_user):
    """Test successfully creating a deletion request."""
    service = AccountDeletionService(db_session)

    request_data = DeletionRequestCreate(
        reason="Testing account deletion",
        export_data=True,
    )

    result = await service.request_deletion(
        user_id=sample_user.id,
        request_data=request_data,
        ip_address="192.168.1.1",
    )

    assert result is not None
    assert result.id is not None
    assert result.user_id == sample_user.id
    assert result.status == DeletionStatus.PENDING.value
    assert result.reason == "Testing account deletion"
    assert result.data_export_requested is True
    assert result.ip_address == "192.168.1.1"
    assert result.confirmation_token is not None

    # Check scheduled date is ~7 days in the future
    expected_date = datetime.now(timezone.utc) + timedelta(days=DELETION_GRACE_PERIOD_DAYS)
    assert abs((result.scheduled_deletion_at - expected_date).total_seconds()) < 60


@pytest.mark.asyncio
async def test_request_deletion_no_reason(db_session: AsyncSession, sample_user):
    """Test creating a deletion request without a reason."""
    service = AccountDeletionService(db_session)

    request_data = DeletionRequestCreate()

    result = await service.request_deletion(
        user_id=sample_user.id,
        request_data=request_data,
    )

    assert result is not None
    assert result.reason is None
    assert result.data_export_requested is False


@pytest.mark.asyncio
async def test_request_deletion_duplicate_fails(db_session: AsyncSession, sample_user):
    """Test that duplicate deletion requests are rejected."""
    service = AccountDeletionService(db_session)

    request_data = DeletionRequestCreate()

    # First request succeeds
    await service.request_deletion(
        user_id=sample_user.id,
        request_data=request_data,
    )

    # Second request fails
    with pytest.raises(ValueError, match="active deletion request already exists"):
        await service.request_deletion(
            user_id=sample_user.id,
            request_data=request_data,
        )


@pytest.mark.asyncio
async def test_confirm_deletion_success(db_session: AsyncSession, sample_user):
    """Test successfully confirming a deletion request."""
    service = AccountDeletionService(db_session)

    # Create request first
    request_data = DeletionRequestCreate()
    created_request = await service.request_deletion(
        user_id=sample_user.id,
        request_data=request_data,
    )

    # Confirm with the token
    result = await service.confirm_deletion(
        user_id=sample_user.id,
        confirmation_token=created_request.confirmation_token,
    )

    assert result is not None
    assert result.status == DeletionStatus.CONFIRMED.value
    assert result.confirmed_at is not None


@pytest.mark.asyncio
async def test_confirm_deletion_invalid_token(db_session: AsyncSession, sample_user):
    """Test that invalid tokens are rejected."""
    service = AccountDeletionService(db_session)

    # Create request first
    request_data = DeletionRequestCreate()
    await service.request_deletion(
        user_id=sample_user.id,
        request_data=request_data,
    )

    # Try to confirm with wrong token
    with pytest.raises(ValueError, match="Invalid or expired confirmation token"):
        await service.confirm_deletion(
            user_id=sample_user.id,
            confirmation_token=uuid.uuid4(),  # Wrong token
        )


@pytest.mark.asyncio
async def test_confirm_deletion_wrong_user(
    db_session: AsyncSession,
    sample_user,
    another_user,
):
    """Test that a user cannot confirm another user's request."""
    service = AccountDeletionService(db_session)

    # Create request for sample_user
    request_data = DeletionRequestCreate()
    created_request = await service.request_deletion(
        user_id=sample_user.id,
        request_data=request_data,
    )

    # Another user tries to confirm
    with pytest.raises(ValueError, match="Invalid or expired confirmation token"):
        await service.confirm_deletion(
            user_id=another_user.id,
            confirmation_token=created_request.confirmation_token,
        )


@pytest.mark.asyncio
async def test_cancel_deletion_pending(db_session: AsyncSession, sample_user):
    """Test cancelling a pending deletion request."""
    service = AccountDeletionService(db_session)

    # Create request
    request_data = DeletionRequestCreate()
    await service.request_deletion(
        user_id=sample_user.id,
        request_data=request_data,
    )

    # Cancel it
    result = await service.cancel_deletion(user_id=sample_user.id)

    assert result is not None
    assert result.status == DeletionStatus.CANCELLED.value
    assert result.cancelled_at is not None


@pytest.mark.asyncio
async def test_cancel_deletion_confirmed(db_session: AsyncSession, sample_user):
    """Test cancelling a confirmed deletion request."""
    service = AccountDeletionService(db_session)

    # Create and confirm request
    request_data = DeletionRequestCreate()
    created_request = await service.request_deletion(
        user_id=sample_user.id,
        request_data=request_data,
    )
    await service.confirm_deletion(
        user_id=sample_user.id,
        confirmation_token=created_request.confirmation_token,
    )

    # Cancel it
    result = await service.cancel_deletion(user_id=sample_user.id)

    assert result is not None
    assert result.status == DeletionStatus.CANCELLED.value


@pytest.mark.asyncio
async def test_cancel_deletion_no_request(db_session: AsyncSession, sample_user):
    """Test cancelling when no active request exists."""
    service = AccountDeletionService(db_session)

    with pytest.raises(ValueError, match="No active deletion request to cancel"):
        await service.cancel_deletion(user_id=sample_user.id)


@pytest.mark.asyncio
async def test_get_active_request_pending(db_session: AsyncSession, sample_user):
    """Test getting a pending deletion request."""
    service = AccountDeletionService(db_session)

    request_data = DeletionRequestCreate()
    created = await service.request_deletion(
        user_id=sample_user.id,
        request_data=request_data,
    )

    result = await service.get_active_request(sample_user.id)

    assert result is not None
    assert result.id == created.id
    assert result.status == DeletionStatus.PENDING.value


@pytest.mark.asyncio
async def test_get_active_request_confirmed(db_session: AsyncSession, sample_user):
    """Test getting a confirmed deletion request."""
    service = AccountDeletionService(db_session)

    request_data = DeletionRequestCreate()
    created = await service.request_deletion(
        user_id=sample_user.id,
        request_data=request_data,
    )
    await service.confirm_deletion(
        user_id=sample_user.id,
        confirmation_token=created.confirmation_token,
    )

    result = await service.get_active_request(sample_user.id)

    assert result is not None
    assert result.status == DeletionStatus.CONFIRMED.value


@pytest.mark.asyncio
async def test_get_active_request_none(db_session: AsyncSession, sample_user):
    """Test getting request when none exists."""
    service = AccountDeletionService(db_session)

    result = await service.get_active_request(sample_user.id)

    assert result is None


@pytest.mark.asyncio
async def test_get_active_request_cancelled_not_returned(
    db_session: AsyncSession,
    sample_user,
):
    """Test that cancelled requests are not returned as active."""
    service = AccountDeletionService(db_session)

    request_data = DeletionRequestCreate()
    await service.request_deletion(
        user_id=sample_user.id,
        request_data=request_data,
    )
    await service.cancel_deletion(user_id=sample_user.id)

    result = await service.get_active_request(sample_user.id)

    assert result is None


@pytest.mark.asyncio
async def test_get_deletion_status(db_session: AsyncSession, sample_user):
    """Test getting deletion status."""
    service = AccountDeletionService(db_session)

    request_data = DeletionRequestCreate()
    await service.request_deletion(
        user_id=sample_user.id,
        request_data=request_data,
    )

    result = await service.get_deletion_status(sample_user.id)

    assert result is not None
    assert result.status == DeletionStatus.PENDING.value
    # Days remaining can be 6 or 7 depending on time of day (rounding)
    assert result.days_remaining in [DELETION_GRACE_PERIOD_DAYS - 1, DELETION_GRACE_PERIOD_DAYS]
    assert result.can_cancel is True


@pytest.mark.asyncio
async def test_get_deletion_status_none(db_session: AsyncSession, sample_user):
    """Test getting deletion status when none exists."""
    service = AccountDeletionService(db_session)

    result = await service.get_deletion_status(sample_user.id)

    assert result is None


@pytest.mark.asyncio
async def test_execute_deletion(db_session: AsyncSession, sample_user):
    """Test executing account deletion."""
    service = AccountDeletionService(db_session)
    from app.services.user_service import UserService

    # Execute deletion
    summary = await service.execute_deletion(sample_user.id)

    assert summary is not None
    assert summary.user_deleted is True
    assert summary.students_deleted == 0
    assert summary.total_records_deleted >= 1

    # Verify user is deleted
    user_service = UserService(db_session)
    user = await user_service.get_by_id(sample_user.id)
    assert user is None


@pytest.mark.asyncio
async def test_execute_deletion_with_student(
    db_session: AsyncSession,
    sample_user,
    sample_student,
):
    """Test executing account deletion cascades to students."""
    service = AccountDeletionService(db_session)
    from app.services.student_service import StudentService

    summary = await service.execute_deletion(sample_user.id)

    assert summary.user_deleted is True
    assert summary.students_deleted == 1

    # Verify student is deleted
    student_service = StudentService(db_session)
    student = await student_service.get_by_id(sample_student.id)
    assert student is None


@pytest.mark.asyncio
async def test_execute_deletion_with_notes_flashcards(
    db_session: AsyncSession,
    sample_user,
    sample_student,
    sample_note,
    sample_flashcards,
):
    """Test executing account deletion cascades to notes and flashcards."""
    service = AccountDeletionService(db_session)

    summary = await service.execute_deletion(sample_user.id)

    assert summary.user_deleted is True
    assert summary.students_deleted == 1
    assert summary.notes_deleted == 1
    assert summary.flashcards_deleted == len(sample_flashcards)


@pytest.mark.asyncio
async def test_execute_deletion_updates_request_status(
    db_session: AsyncSession,
    sample_user,
):
    """Test that executing deletion updates the request status."""
    service = AccountDeletionService(db_session)

    # Create and confirm request
    request_data = DeletionRequestCreate()
    created = await service.request_deletion(
        user_id=sample_user.id,
        request_data=request_data,
    )
    await service.confirm_deletion(
        user_id=sample_user.id,
        confirmation_token=created.confirmation_token,
    )

    # Execute deletion
    await service.execute_deletion(sample_user.id)

    # Check request status (need to query directly as user is deleted)
    from sqlalchemy import select

    result = await db_session.execute(
        select(DeletionRequest).where(DeletionRequest.id == created.id)
    )
    request = result.scalar_one_or_none()

    assert request is not None
    assert request.status == DeletionStatus.EXECUTED.value
    assert request.executed_at is not None


@pytest.mark.asyncio
async def test_execute_deletion_user_not_found(db_session: AsyncSession):
    """Test executing deletion for non-existent user."""
    service = AccountDeletionService(db_session)

    with pytest.raises(ValueError, match="User not found"):
        await service.execute_deletion(uuid.uuid4())


@pytest.mark.asyncio
async def test_get_due_deletions(db_session: AsyncSession, sample_user):
    """Test getting due deletions for scheduled job."""
    service = AccountDeletionService(db_session)

    # Create and confirm request
    request_data = DeletionRequestCreate()
    created = await service.request_deletion(
        user_id=sample_user.id,
        request_data=request_data,
    )
    await service.confirm_deletion(
        user_id=sample_user.id,
        confirmation_token=created.confirmation_token,
    )

    # Manually set scheduled date to past
    created.scheduled_deletion_at = datetime.now(timezone.utc) - timedelta(hours=1)
    await db_session.commit()

    due = await service.get_due_deletions()

    assert len(due) == 1
    assert due[0].id == created.id


@pytest.mark.asyncio
async def test_get_due_deletions_pending_not_included(
    db_session: AsyncSession,
    sample_user,
):
    """Test that pending (unconfirmed) requests are not included in due deletions."""
    service = AccountDeletionService(db_session)

    # Create request but don't confirm
    request_data = DeletionRequestCreate()
    created = await service.request_deletion(
        user_id=sample_user.id,
        request_data=request_data,
    )

    # Set scheduled date to past
    created.scheduled_deletion_at = datetime.now(timezone.utc) - timedelta(hours=1)
    await db_session.commit()

    due = await service.get_due_deletions()

    assert len(due) == 0


@pytest.mark.asyncio
async def test_cleanup_expired_pending_requests(db_session: AsyncSession, sample_user):
    """Test cleaning up expired pending requests."""
    service = AccountDeletionService(db_session)

    # Create request
    request_data = DeletionRequestCreate()
    created = await service.request_deletion(
        user_id=sample_user.id,
        request_data=request_data,
    )

    # Set requested_at to more than 24 hours ago
    created.requested_at = datetime.now(timezone.utc) - timedelta(hours=25)
    await db_session.commit()

    cleaned = await service.cleanup_expired_pending_requests()

    assert cleaned == 1

    # Verify request is now cancelled
    request = await service.get_active_request(sample_user.id)
    assert request is None


@pytest.mark.asyncio
async def test_cleanup_expired_pending_requests_confirmed_not_affected(
    db_session: AsyncSession,
    sample_user,
):
    """Test that confirmed requests are not cleaned up."""
    service = AccountDeletionService(db_session)

    # Create and confirm request
    request_data = DeletionRequestCreate()
    created = await service.request_deletion(
        user_id=sample_user.id,
        request_data=request_data,
    )
    await service.confirm_deletion(
        user_id=sample_user.id,
        confirmation_token=created.confirmation_token,
    )

    # Set requested_at to more than 24 hours ago
    created.requested_at = datetime.now(timezone.utc) - timedelta(hours=25)
    await db_session.commit()

    cleaned = await service.cleanup_expired_pending_requests()

    assert cleaned == 0

    # Verify request is still active
    request = await service.get_active_request(sample_user.id)
    assert request is not None
    assert request.status == DeletionStatus.CONFIRMED.value


@pytest.mark.asyncio
async def test_can_create_new_request_after_cancellation(
    db_session: AsyncSession,
    sample_user,
):
    """Test that a new request can be created after cancelling the previous one."""
    service = AccountDeletionService(db_session)

    # Create and cancel first request
    request_data = DeletionRequestCreate(reason="First request")
    await service.request_deletion(
        user_id=sample_user.id,
        request_data=request_data,
    )
    await service.cancel_deletion(user_id=sample_user.id)

    # Create new request
    new_request_data = DeletionRequestCreate(reason="Second request")
    result = await service.request_deletion(
        user_id=sample_user.id,
        request_data=new_request_data,
    )

    assert result is not None
    assert result.reason == "Second request"
    assert result.status == DeletionStatus.PENDING.value


# =============================================================================
# Token Expiry Tests (Recommendation 1)
# =============================================================================


@pytest.mark.asyncio
async def test_token_expires_at_set_on_request(db_session: AsyncSession, sample_user):
    """Test that token_expires_at is set when creating a deletion request."""
    service = AccountDeletionService(db_session)

    request_data = DeletionRequestCreate()
    result = await service.request_deletion(
        user_id=sample_user.id,
        request_data=request_data,
    )

    assert result.token_expires_at is not None
    # Token should expire approximately TOKEN_EXPIRY_HOURS from now
    expected_expiry = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRY_HOURS)
    assert abs((result.token_expires_at - expected_expiry).total_seconds()) < 60


@pytest.mark.asyncio
async def test_confirm_deletion_with_expired_token(
    db_session: AsyncSession,
    sample_user,
):
    """Test that expired tokens are rejected."""
    service = AccountDeletionService(db_session)

    # Create request
    request_data = DeletionRequestCreate()
    created_request = await service.request_deletion(
        user_id=sample_user.id,
        request_data=request_data,
    )

    # Manually expire the token (set to 25 hours ago)
    created_request.token_expires_at = datetime.now(timezone.utc) - timedelta(hours=25)
    await db_session.commit()

    # Try to confirm with expired token
    with pytest.raises(ValueError, match="Confirmation token has expired"):
        await service.confirm_deletion(
            user_id=sample_user.id,
            confirmation_token=created_request.confirmation_token,
        )


@pytest.mark.asyncio
async def test_confirm_deletion_with_valid_token(db_session: AsyncSession, sample_user):
    """Test that non-expired tokens work correctly."""
    service = AccountDeletionService(db_session)

    # Create request
    request_data = DeletionRequestCreate()
    created_request = await service.request_deletion(
        user_id=sample_user.id,
        request_data=request_data,
    )

    # Confirm within expiry window
    result = await service.confirm_deletion(
        user_id=sample_user.id,
        confirmation_token=created_request.confirmation_token,
    )

    assert result.status == DeletionStatus.CONFIRMED.value


@pytest.mark.asyncio
async def test_is_token_expired_property(db_session: AsyncSession, sample_user):
    """Test the is_token_expired property on DeletionRequest."""
    service = AccountDeletionService(db_session)

    request_data = DeletionRequestCreate()
    created_request = await service.request_deletion(
        user_id=sample_user.id,
        request_data=request_data,
    )

    # Token should not be expired initially
    assert created_request.is_token_expired is False

    # Expire the token
    created_request.token_expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
    assert created_request.is_token_expired is True


# =============================================================================
# Query Optimization Tests (Recommendation 2)
# =============================================================================


@pytest.mark.asyncio
async def test_count_user_data_with_multiple_students(
    db_session: AsyncSession,
    sample_user,
    sample_student,
):
    """Test that _count_user_data correctly counts all related data."""
    from app.models.note import Note
    from app.models.flashcard import Flashcard
    from app.models.session import Session

    service = AccountDeletionService(db_session)

    # Add some notes (using correct model attributes)
    for i in range(3):
        note = Note(
            student_id=sample_student.id,
            title=f"Test Note {i}",
            content_type="text/plain",
        )
        db_session.add(note)

    # Add some flashcards
    for i in range(5):
        flashcard = Flashcard(
            student_id=sample_student.id,
            front=f"Question {i}",
            back=f"Answer {i}",
        )
        db_session.add(flashcard)

    # Add some sessions
    for i in range(2):
        session = Session(
            student_id=sample_student.id,
            session_type="revision",
        )
        db_session.add(session)

    await db_session.commit()

    # Count user data using the optimised query
    summary = await service._count_user_data(sample_user.id)

    assert summary.students_deleted == 1
    assert summary.notes_deleted == 3
    assert summary.flashcards_deleted == 5
    assert summary.sessions_deleted == 2
    assert summary.user_deleted is True
    # Total = 1 user + 1 student + 3 notes + 5 flashcards + 2 sessions + 0 AI interactions
    assert summary.total_records_deleted == 12


@pytest.mark.asyncio
async def test_count_user_data_no_data(db_session: AsyncSession, sample_user):
    """Test that _count_user_data handles users with no related data."""
    service = AccountDeletionService(db_session)

    summary = await service._count_user_data(sample_user.id)

    assert summary.students_deleted == 0
    assert summary.notes_deleted == 0
    assert summary.flashcards_deleted == 0
    assert summary.sessions_deleted == 0
    assert summary.ai_interactions_deleted == 0
    assert summary.total_records_deleted == 1  # Just the user


# =============================================================================
# Email Reminder Tests (Recommendation 3)
# =============================================================================


@pytest.mark.asyncio
async def test_get_requests_needing_reminder(db_session: AsyncSession, sample_user):
    """Test finding confirmed requests that need reminders."""
    service = AccountDeletionService(db_session)

    # Create and confirm a request
    request_data = DeletionRequestCreate()
    created = await service.request_deletion(
        user_id=sample_user.id,
        request_data=request_data,
    )
    await service.confirm_deletion(
        user_id=sample_user.id,
        confirmation_token=created.confirmation_token,
    )

    # Set scheduled deletion to tomorrow
    created.scheduled_deletion_at = datetime.now(timezone.utc) + timedelta(days=1)
    await db_session.commit()

    # Should find this request
    needing_reminder = await service.get_requests_needing_reminder()

    assert len(needing_reminder) == 1
    assert needing_reminder[0].id == created.id


@pytest.mark.asyncio
async def test_get_requests_needing_reminder_already_sent(
    db_session: AsyncSession,
    sample_user,
):
    """Test that requests with reminders already sent are not included."""
    service = AccountDeletionService(db_session)

    # Create and confirm a request
    request_data = DeletionRequestCreate()
    created = await service.request_deletion(
        user_id=sample_user.id,
        request_data=request_data,
    )
    await service.confirm_deletion(
        user_id=sample_user.id,
        confirmation_token=created.confirmation_token,
    )

    # Set scheduled deletion to tomorrow and mark reminder as sent
    created.scheduled_deletion_at = datetime.now(timezone.utc) + timedelta(days=1)
    created.reminder_sent_at = datetime.now(timezone.utc)
    await db_session.commit()

    # Should not find this request
    needing_reminder = await service.get_requests_needing_reminder()

    assert len(needing_reminder) == 0


@pytest.mark.asyncio
async def test_get_requests_needing_reminder_too_far(
    db_session: AsyncSession,
    sample_user,
):
    """Test that requests too far in the future are not included."""
    service = AccountDeletionService(db_session)

    # Create and confirm a request
    request_data = DeletionRequestCreate()
    created = await service.request_deletion(
        user_id=sample_user.id,
        request_data=request_data,
    )
    await service.confirm_deletion(
        user_id=sample_user.id,
        confirmation_token=created.confirmation_token,
    )

    # Set scheduled deletion to 5 days from now (outside reminder window)
    created.scheduled_deletion_at = datetime.now(timezone.utc) + timedelta(days=5)
    await db_session.commit()

    # Should not find this request
    needing_reminder = await service.get_requests_needing_reminder()

    assert len(needing_reminder) == 0


@pytest.mark.asyncio
async def test_get_requests_needing_reminder_pending_excluded(
    db_session: AsyncSession,
    sample_user,
):
    """Test that pending (unconfirmed) requests are not included."""
    service = AccountDeletionService(db_session)

    # Create request but don't confirm
    request_data = DeletionRequestCreate()
    created = await service.request_deletion(
        user_id=sample_user.id,
        request_data=request_data,
    )

    # Set scheduled deletion to tomorrow
    created.scheduled_deletion_at = datetime.now(timezone.utc) + timedelta(days=1)
    await db_session.commit()

    # Should not find this request (not confirmed)
    needing_reminder = await service.get_requests_needing_reminder()

    assert len(needing_reminder) == 0


@pytest.mark.asyncio
async def test_generate_reminder_email_html(db_session: AsyncSession):
    """Test reminder email HTML generation."""
    service = AccountDeletionService(db_session)

    scheduled_date = datetime(2024, 1, 15, 10, 0, tzinfo=timezone.utc)
    html = service._generate_reminder_email_html(
        user_name="Test User",
        days_left=1,
        scheduled_date=scheduled_date,
    )

    # Check key content is present
    assert "Test User" in html
    assert "1 day" in html
    assert "Monday, 15 January 2024" in html
    assert "Account Deletion Reminder" in html
    assert "permanent deletion" in html.lower()
    assert "cancel" in html.lower()
