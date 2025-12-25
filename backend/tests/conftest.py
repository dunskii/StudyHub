"""Pytest configuration and fixtures."""
import asyncio
import os
from collections.abc import AsyncGenerator, Generator
from typing import Any

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db
from app.core.security import create_access_token
from app.main import app
from app.models import *  # noqa: F401, F403


# Test database URL from environment variable (required for security)
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")
if not TEST_DATABASE_URL:
    raise ValueError(
        "TEST_DATABASE_URL environment variable must be set. "
        "Example: TEST_DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/testdb"
    )


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create an event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def test_engine():
    """Create a test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
    )

    async with engine.begin() as conn:
        # Drop all tables first to ensure clean state
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a test database session."""
    async_session = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session() as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create an async test client with database session override."""

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="function")
async def authenticated_client(
    db_session: AsyncSession,
    sample_user: Any,
) -> AsyncGenerator[AsyncClient, None]:
    """Create an authenticated async test client."""

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    # Create access token for the test user
    token = create_access_token(data={"sub": str(sample_user.supabase_auth_id)})

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": f"Bearer {token}"},
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="function")
async def sample_user(db_session: AsyncSession) -> Any:
    """Create a sample user in the database."""
    from app.models.user import User
    import uuid

    user = User(
        id=uuid.uuid4(),
        supabase_auth_id=uuid.uuid4(),
        email="test@example.com",
        display_name="Test User",
        subscription_tier="free",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
def sample_framework_data() -> dict[str, Any]:
    """Sample framework data for tests."""
    return {
        "code": "TEST",
        "name": "Test Framework",
        "country": "Australia",
        "region_type": "state",
        "syllabus_authority": "Test Authority",
        "syllabus_url": "https://test.edu.au",
        "structure": {
            "stages": {
                "S1": {"name": "Stage 1", "years": ["1", "2"]},
            }
        },
        "is_active": True,
        "is_default": False,
        "display_order": 1,
    }


@pytest.fixture
def sample_user_data() -> dict[str, Any]:
    """Sample user data for tests."""
    return {
        "supabase_auth_id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "test@example.com",
        "display_name": "Test User",
        "phone_number": "+61400000000",
        "subscription_tier": "free",
    }


@pytest.fixture
def sample_student_data() -> dict[str, Any]:
    """Sample student data for tests."""
    return {
        "display_name": "Test Student",
        "grade_level": 5,
        "school_stage": "S3",
        "preferences": {},
    }


@pytest.fixture
def auth_token(sample_user_data: dict[str, Any]) -> str:
    """Create a valid auth token for testing."""
    return create_access_token(data={"sub": sample_user_data["supabase_auth_id"]})
