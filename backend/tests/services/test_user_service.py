"""Tests for UserService."""
import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.user import UserCreate, UserUpdate
from app.services.user_service import UserService


@pytest.mark.asyncio
async def test_create_user(db_session: AsyncSession):
    """Test creating a new user."""
    service = UserService(db_session)

    data = UserCreate(
        supabase_auth_id=uuid.uuid4(),
        email="newuser@example.com",
        display_name="New User",
        phone_number="+61400000001",
    )

    user = await service.create(data)

    assert user is not None
    assert user.id is not None
    assert user.email == "newuser@example.com"
    assert user.display_name == "New User"
    assert user.subscription_tier == "free"
    assert "emailNotifications" in user.preferences


@pytest.mark.asyncio
async def test_get_user_by_id(db_session: AsyncSession, sample_user):
    """Test getting a user by ID."""
    service = UserService(db_session)

    user = await service.get_by_id(sample_user.id)

    assert user is not None
    assert user.id == sample_user.id
    assert user.email == sample_user.email


@pytest.mark.asyncio
async def test_get_user_by_id_not_found(db_session: AsyncSession):
    """Test getting a non-existent user by ID."""
    service = UserService(db_session)

    user = await service.get_by_id(uuid.uuid4())

    assert user is None


@pytest.mark.asyncio
async def test_get_user_by_supabase_id(db_session: AsyncSession, sample_user):
    """Test getting a user by Supabase auth ID."""
    service = UserService(db_session)

    user = await service.get_by_supabase_id(sample_user.supabase_auth_id)

    assert user is not None
    assert user.id == sample_user.id


@pytest.mark.asyncio
async def test_get_user_by_email(db_session: AsyncSession, sample_user):
    """Test getting a user by email."""
    service = UserService(db_session)

    user = await service.get_by_email(sample_user.email)

    assert user is not None
    assert user.id == sample_user.id


@pytest.mark.asyncio
async def test_update_user(db_session: AsyncSession, sample_user):
    """Test updating a user."""
    service = UserService(db_session)

    data = UserUpdate(
        display_name="Updated Name",
        phone_number="+61400000002",
    )

    user = await service.update(sample_user.id, data)

    assert user is not None
    assert user.display_name == "Updated Name"
    assert user.phone_number == "+61400000002"


@pytest.mark.asyncio
async def test_update_user_not_found(db_session: AsyncSession):
    """Test updating a non-existent user."""
    service = UserService(db_session)

    data = UserUpdate(display_name="New Name")

    user = await service.update(uuid.uuid4(), data)

    assert user is None


@pytest.mark.asyncio
async def test_update_last_login(db_session: AsyncSession, sample_user):
    """Test updating user's last login timestamp."""
    service = UserService(db_session)

    assert sample_user.last_login_at is None

    await service.update_last_login(sample_user.id)

    # Refresh to get updated value
    user = await service.get_by_id(sample_user.id)
    assert user is not None
    assert user.last_login_at is not None


@pytest.mark.asyncio
async def test_verify_owns_student_success(
    db_session: AsyncSession,
    sample_user,
    sample_student,
):
    """Test verifying user owns their student."""
    service = UserService(db_session)

    result = await service.verify_owns_student(sample_user.id, sample_student.id)

    assert result is True


@pytest.mark.asyncio
async def test_verify_owns_student_failure(
    db_session: AsyncSession,
    sample_user,
    sample_student,
    another_user,
):
    """Test verifying user doesn't own another's student."""
    service = UserService(db_session)

    # Another user trying to access sample_user's student
    result = await service.verify_owns_student(another_user.id, sample_student.id)

    assert result is False


@pytest.mark.asyncio
async def test_verify_owns_student_nonexistent(db_session: AsyncSession, sample_user):
    """Test verifying ownership of non-existent student."""
    service = UserService(db_session)

    result = await service.verify_owns_student(sample_user.id, uuid.uuid4())

    assert result is False


@pytest.mark.asyncio
async def test_get_with_students(
    db_session: AsyncSession,
    sample_user,
    sample_student,
):
    """Test getting user with students loaded."""
    service = UserService(db_session)

    user = await service.get_with_students(sample_user.id)

    assert user is not None
    assert len(user.students) == 1
    assert user.students[0].id == sample_student.id


@pytest.mark.asyncio
async def test_delete_user(db_session: AsyncSession, sample_user):
    """Test deleting a user."""
    service = UserService(db_session)

    result = await service.delete(sample_user.id)
    assert result is True

    # Verify user is deleted
    user = await service.get_by_id(sample_user.id)
    assert user is None


@pytest.mark.asyncio
async def test_delete_user_cascades_to_students(
    db_session: AsyncSession,
    sample_user,
    sample_student,
):
    """Test that deleting a user cascades to their students."""
    from app.services.student_service import StudentService

    user_service = UserService(db_session)
    student_service = StudentService(db_session)

    # Delete the user
    await user_service.delete(sample_user.id)

    # Verify student is also deleted
    student = await student_service.get_by_id(sample_student.id)
    assert student is None


@pytest.mark.asyncio
async def test_accept_privacy_policy(db_session: AsyncSession, sample_user):
    """Test recording privacy policy acceptance."""
    service = UserService(db_session)

    assert sample_user.privacy_policy_accepted_at is None

    user = await service.accept_privacy_policy(sample_user.id)

    assert user is not None
    assert user.privacy_policy_accepted_at is not None


@pytest.mark.asyncio
async def test_accept_terms(db_session: AsyncSession, sample_user):
    """Test recording terms acceptance."""
    service = UserService(db_session)

    assert sample_user.terms_accepted_at is None

    user = await service.accept_terms(sample_user.id)

    assert user is not None
    assert user.terms_accepted_at is not None
