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


# Test database URL from environment variable or settings (required for security)
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")
if not TEST_DATABASE_URL:
    # Try to get from settings (which reads from .env)
    try:
        from app.core.config import get_settings
        settings = get_settings()
        TEST_DATABASE_URL = settings.test_database_url
    except Exception:
        pass

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


@pytest_asyncio.fixture(scope="function")
async def sample_framework(db_session: AsyncSession) -> Any:
    """Create a sample curriculum framework in the database."""
    from app.models.curriculum_framework import CurriculumFramework
    import uuid

    framework = CurriculumFramework(
        id=uuid.uuid4(),
        code="NSW",
        name="NSW Education Standards Authority (NESA)",
        country="Australia",
        region_type="state",
        syllabus_authority="NESA",
        syllabus_url="https://curriculum.nsw.edu.au/",
        structure={
            "stages": {
                "ES1": {"name": "Early Stage 1", "years": ["K"]},
                "S1": {"name": "Stage 1", "years": ["1", "2"]},
                "S2": {"name": "Stage 2", "years": ["3", "4"]},
                "S3": {"name": "Stage 3", "years": ["5", "6"]},
                "S4": {"name": "Stage 4", "years": ["7", "8"]},
                "S5": {"name": "Stage 5", "years": ["9", "10"]},
            },
        },
        is_active=True,
        is_default=True,
        display_order=1,
    )
    db_session.add(framework)
    await db_session.commit()
    await db_session.refresh(framework)
    return framework


@pytest_asyncio.fixture(scope="function")
async def sample_subject(db_session: AsyncSession, sample_framework: Any) -> Any:
    """Create a sample subject in the database."""
    from app.models.subject import Subject
    import uuid

    subject = Subject(
        id=uuid.uuid4(),
        framework_id=sample_framework.id,
        code="MATH",
        name="Mathematics",
        kla="Mathematics",
        description="Development of mathematical understanding.",
        icon="calculator",
        color="#3B82F6",
        available_stages=["ES1", "S1", "S2", "S3", "S4", "S5"],
        config={
            "hasPathways": True,
            "pathways": ["5.1", "5.2", "5.3"],
            "tutorStyle": "socratic_stepwise",
        },
        display_order=1,
        is_active=True,
    )
    db_session.add(subject)
    await db_session.commit()
    await db_session.refresh(subject)
    return subject


@pytest_asyncio.fixture(scope="function")
async def sample_subjects(db_session: AsyncSession, sample_framework: Any) -> list[Any]:
    """Create multiple sample subjects in the database."""
    from app.models.subject import Subject
    import uuid

    subjects_data = [
        {
            "code": "MATH",
            "name": "Mathematics",
            "kla": "Mathematics",
            "icon": "calculator",
            "color": "#3B82F6",
            "available_stages": ["S1", "S2", "S3", "S4", "S5"],
            "config": {"hasPathways": True, "pathways": ["5.1", "5.2", "5.3"], "tutorStyle": "socratic_stepwise"},
            "display_order": 1,
        },
        {
            "code": "ENG",
            "name": "English",
            "kla": "English",
            "icon": "book-open",
            "color": "#8B5CF6",
            "available_stages": ["S1", "S2", "S3", "S4", "S5"],
            "config": {"hasPathways": False, "pathways": [], "tutorStyle": "socratic_analytical"},
            "display_order": 2,
        },
        {
            "code": "SCI",
            "name": "Science",
            "kla": "Science and Technology",
            "icon": "flask-conical",
            "color": "#10B981",
            "available_stages": ["S1", "S2", "S3", "S4", "S5"],
            "config": {"hasPathways": False, "pathways": [], "tutorStyle": "inquiry_based"},
            "display_order": 3,
        },
    ]

    subjects = []
    for data in subjects_data:
        subject = Subject(
            id=uuid.uuid4(),
            framework_id=sample_framework.id,
            **data,
            is_active=True,
        )
        db_session.add(subject)
        subjects.append(subject)

    await db_session.commit()
    for subject in subjects:
        await db_session.refresh(subject)
    return subjects


@pytest_asyncio.fixture(scope="function")
async def sample_outcomes(db_session: AsyncSession, sample_subject: Any, sample_framework: Any) -> list[Any]:
    """Create sample curriculum outcomes in the database."""
    from app.models.curriculum_outcome import CurriculumOutcome
    import uuid

    outcomes_data = [
        {
            "outcome_code": "MA3-RN-01",
            "description": "Applies an understanding of place value to represent decimals.",
            "stage": "S3",
            "strand": "Number and Algebra",
            "substrand": "Representing Numbers",
        },
        {
            "outcome_code": "MA3-MR-01",
            "description": "Selects and applies strategies for multiplication and division.",
            "stage": "S3",
            "strand": "Number and Algebra",
            "substrand": "Multiplicative Relations",
        },
        {
            "outcome_code": "MA4-INT-01",
            "description": "Compares, orders and calculates with integers.",
            "stage": "S4",
            "strand": "Number and Algebra",
            "substrand": "Integers",
        },
        {
            "outcome_code": "MA5.1-RN-01",
            "description": "Operates with rational numbers to solve problems.",
            "stage": "S5",
            "strand": "Number and Algebra",
            "substrand": "Rational Numbers",
            "pathway": "5.1",
        },
        {
            "outcome_code": "MA5.2-IND-01",
            "description": "Simplifies algebraic expressions involving indices.",
            "stage": "S5",
            "strand": "Number and Algebra",
            "substrand": "Indices",
            "pathway": "5.2",
        },
    ]

    outcomes = []
    for i, data in enumerate(outcomes_data):
        outcome = CurriculumOutcome(
            id=uuid.uuid4(),
            framework_id=sample_framework.id,
            subject_id=sample_subject.id,
            display_order=i,
            **data,
        )
        db_session.add(outcome)
        outcomes.append(outcome)

    await db_session.commit()
    for outcome in outcomes:
        await db_session.refresh(outcome)
    return outcomes


@pytest_asyncio.fixture(scope="function")
async def sample_senior_course(db_session: AsyncSession, sample_subject: Any, sample_framework: Any) -> Any:
    """Create a sample senior course in the database."""
    from app.models.senior_course import SeniorCourse
    import uuid

    course = SeniorCourse(
        id=uuid.uuid4(),
        framework_id=sample_framework.id,
        subject_id=sample_subject.id,
        code="HSC_MATH_ADV",
        name="Mathematics Advanced",
        description="Advanced mathematics for HSC.",
        course_type="Advanced",
        units=2.0,
        is_atar=True,
        prerequisites=["Stage 5.3 Mathematics"],
        display_order=1,
        is_active=True,
    )
    db_session.add(course)
    await db_session.commit()
    await db_session.refresh(course)
    return course


@pytest_asyncio.fixture(scope="function")
async def sample_senior_courses(db_session: AsyncSession, sample_subject: Any, sample_framework: Any) -> list[Any]:
    """Create multiple sample senior courses in the database."""
    from app.models.senior_course import SeniorCourse
    import uuid

    courses_data = [
        {
            "code": "HSC_MATH_STD1",
            "name": "Mathematics Standard 1",
            "course_type": "Standard",
            "units": 2.0,
            "is_atar": False,
        },
        {
            "code": "HSC_MATH_STD2",
            "name": "Mathematics Standard 2",
            "course_type": "Standard",
            "units": 2.0,
            "is_atar": True,
        },
        {
            "code": "HSC_MATH_ADV",
            "name": "Mathematics Advanced",
            "course_type": "Advanced",
            "units": 2.0,
            "is_atar": True,
        },
        {
            "code": "HSC_MATH_EXT1",
            "name": "Mathematics Extension 1",
            "course_type": "Extension",
            "units": 1.0,
            "is_atar": True,
        },
    ]

    courses = []
    for i, data in enumerate(courses_data):
        course = SeniorCourse(
            id=uuid.uuid4(),
            framework_id=sample_framework.id,
            subject_id=sample_subject.id,
            display_order=i,
            is_active=True,
            **data,
        )
        db_session.add(course)
        courses.append(course)

    await db_session.commit()
    for course in courses:
        await db_session.refresh(course)
    return courses


@pytest_asyncio.fixture(scope="function")
async def sample_student(
    db_session: AsyncSession,
    sample_user: Any,
    sample_framework: Any,
) -> Any:
    """Create a sample student in the database."""
    from app.models.student import Student
    import uuid

    student = Student(
        id=uuid.uuid4(),
        parent_id=sample_user.id,
        display_name="Test Student",
        grade_level=5,
        school_stage="S3",
        framework_id=sample_framework.id,
        preferences={
            "theme": "auto",
            "studyReminders": True,
            "dailyGoalMinutes": 30,
            "language": "en-AU",
        },
        gamification={
            "totalXP": 0,
            "level": 1,
            "achievements": [],
            "streaks": {"current": 0, "longest": 0, "lastActiveDate": None},
        },
    )
    db_session.add(student)
    await db_session.commit()
    await db_session.refresh(student)
    return student


@pytest_asyncio.fixture(scope="function")
async def sample_stage5_student(
    db_session: AsyncSession,
    sample_user: Any,
    sample_framework: Any,
) -> Any:
    """Create a Stage 5 student in the database."""
    from app.models.student import Student
    import uuid

    student = Student(
        id=uuid.uuid4(),
        parent_id=sample_user.id,
        display_name="Stage 5 Student",
        grade_level=9,
        school_stage="S5",
        framework_id=sample_framework.id,
    )
    db_session.add(student)
    await db_session.commit()
    await db_session.refresh(student)
    return student


@pytest_asyncio.fixture(scope="function")
async def another_user(db_session: AsyncSession) -> Any:
    """Create another user for access control tests."""
    from app.models.user import User
    import uuid

    user = User(
        id=uuid.uuid4(),
        supabase_auth_id=uuid.uuid4(),
        email="other@example.com",
        display_name="Other User",
        subscription_tier="free",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user
