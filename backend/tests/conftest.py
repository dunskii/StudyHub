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
from app.core.security import create_access_token, auth_rate_limiter, push_rate_limiter
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


@pytest.fixture(autouse=True)
def reset_rate_limiters():
    """Reset rate limiters before each test to prevent cross-test interference."""
    auth_rate_limiter._attempts.clear()
    auth_rate_limiter._lockouts.clear()
    push_rate_limiter._attempts.clear()
    push_rate_limiter._lockouts.clear()
    yield
    # Also clear after test
    auth_rate_limiter._attempts.clear()
    auth_rate_limiter._lockouts.clear()
    push_rate_limiter._attempts.clear()
    push_rate_limiter._lockouts.clear()


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


@pytest_asyncio.fixture(scope="function")
async def sample_flashcard(
    db_session: AsyncSession,
    sample_student: Any,
    sample_subject: Any,
) -> Any:
    """Create a sample flashcard in the database."""
    from app.models.flashcard import Flashcard
    import uuid

    flashcard = Flashcard(
        id=uuid.uuid4(),
        student_id=sample_student.id,
        subject_id=sample_subject.id,
        front="What is 2 + 2?",
        back="4",
        generated_by="user",
        sr_interval=1,
        sr_ease_factor=2.5,
        sr_repetition=0,
        review_count=0,
        correct_count=0,
        mastery_percent=0,
        difficulty_level=3,
        tags=["math", "addition"],
    )
    db_session.add(flashcard)
    await db_session.commit()
    await db_session.refresh(flashcard)
    return flashcard


@pytest_asyncio.fixture(scope="function")
async def sample_flashcards(
    db_session: AsyncSession,
    sample_student: Any,
    sample_subject: Any,
) -> list[Any]:
    """Create multiple sample flashcards in the database."""
    from app.models.flashcard import Flashcard
    import uuid

    flashcards_data = [
        {"front": "What is 2 + 2?", "back": "4", "difficulty_level": 1},
        {"front": "What is 5 x 5?", "back": "25", "difficulty_level": 2},
        {"front": "What is the square root of 16?", "back": "4", "difficulty_level": 3},
        {"front": "What is 12 ÷ 4?", "back": "3", "difficulty_level": 2},
        {"front": "What is 7 x 8?", "back": "56", "difficulty_level": 3},
    ]

    flashcards = []
    for data in flashcards_data:
        flashcard = Flashcard(
            id=uuid.uuid4(),
            student_id=sample_student.id,
            subject_id=sample_subject.id,
            front=data["front"],
            back=data["back"],
            generated_by="user",
            sr_interval=1,
            sr_ease_factor=2.5,
            sr_repetition=0,
            review_count=0,
            correct_count=0,
            mastery_percent=0,
            difficulty_level=data["difficulty_level"],
            tags=["math"],
        )
        db_session.add(flashcard)
        flashcards.append(flashcard)

    await db_session.commit()
    for fc in flashcards:
        await db_session.refresh(fc)
    return flashcards


@pytest_asyncio.fixture(scope="function")
async def sample_flashcards_multi_subject(
    db_session: AsyncSession,
    sample_student: Any,
    sample_subjects: list[Any],
) -> list[Any]:
    """Create flashcards across multiple subjects in the database."""
    from app.models.flashcard import Flashcard
    import uuid

    flashcards = []

    for subject in sample_subjects:
        for i in range(3):
            flashcard = Flashcard(
                id=uuid.uuid4(),
                student_id=sample_student.id,
                subject_id=subject.id,
                front=f"{subject.code} Question {i + 1}?",
                back=f"{subject.code} Answer {i + 1}",
                generated_by="user",
                sr_interval=1,
                sr_ease_factor=2.5,
                sr_repetition=0,
                review_count=0,
                correct_count=0,
                mastery_percent=0,
                difficulty_level=i + 1,
                tags=[subject.code.lower()],
            )
            db_session.add(flashcard)
            flashcards.append(flashcard)

    await db_session.commit()
    for fc in flashcards:
        await db_session.refresh(fc)
    return flashcards


@pytest_asyncio.fixture(scope="function")
async def sample_note(
    db_session: AsyncSession,
    sample_student: Any,
    sample_subject: Any,
) -> Any:
    """Create a sample note in the database."""
    from app.models.note import Note
    import uuid

    note = Note(
        id=uuid.uuid4(),
        student_id=sample_student.id,
        subject_id=sample_subject.id,
        title="Photosynthesis Notes",
        content_type="text",
        ocr_text="Photosynthesis is the process by which plants convert sunlight into energy. "
                 "Plants need sunlight, water, and carbon dioxide for photosynthesis. "
                 "The process produces glucose and oxygen.",
        ocr_status="completed",
        tags=["science", "biology"],
        note_metadata={"source": "test"},
    )
    db_session.add(note)
    await db_session.commit()
    await db_session.refresh(note)
    return note


# =============================================================================
# Gamification Test Fixtures
# =============================================================================


@pytest_asyncio.fixture(scope="function")
async def sample_session(
    db_session: AsyncSession,
    sample_student: Any,
    sample_subject: Any,
) -> Any:
    """Create a perfect revision session (100% correct) in the database."""
    from app.models.session import Session
    from datetime import datetime, timezone, timedelta
    import uuid

    started = datetime.now(timezone.utc) - timedelta(minutes=15)
    ended = datetime.now(timezone.utc)

    session = Session(
        id=uuid.uuid4(),
        student_id=sample_student.id,
        subject_id=sample_subject.id,
        session_type="revision",
        started_at=started,
        ended_at=ended,
        duration_minutes=15,
        xp_earned=75,
        data={
            "outcomesWorkedOn": ["MA3-RN-01", "MA3-MR-01"],
            "questionsAttempted": 10,
            "questionsCorrect": 10,  # Perfect session
            "flashcardsReviewed": 5,
        },
    )
    db_session.add(session)
    await db_session.commit()
    await db_session.refresh(session)
    return session


@pytest_asyncio.fixture(scope="function")
async def sample_imperfect_session(
    db_session: AsyncSession,
    sample_student: Any,
    sample_subject: Any,
) -> Any:
    """Create an imperfect revision session (70% correct) in the database."""
    from app.models.session import Session
    from datetime import datetime, timezone, timedelta
    import uuid

    started = datetime.now(timezone.utc) - timedelta(minutes=20)
    ended = datetime.now(timezone.utc)

    session = Session(
        id=uuid.uuid4(),
        student_id=sample_student.id,
        subject_id=sample_subject.id,
        session_type="revision",
        started_at=started,
        ended_at=ended,
        duration_minutes=20,
        xp_earned=50,
        data={
            "outcomesWorkedOn": ["MA3-RN-01"],
            "questionsAttempted": 10,
            "questionsCorrect": 7,  # 70% correct - not perfect
            "flashcardsReviewed": 8,
        },
    )
    db_session.add(session)
    await db_session.commit()
    await db_session.refresh(session)
    return session


@pytest_asyncio.fixture(scope="function")
async def sample_tutor_session(
    db_session: AsyncSession,
    sample_student: Any,
    sample_subject: Any,
) -> Any:
    """Create a tutor chat session in the database."""
    from app.models.session import Session
    from datetime import datetime, timezone, timedelta
    import uuid

    started = datetime.now(timezone.utc) - timedelta(minutes=25)
    ended = datetime.now(timezone.utc)

    session = Session(
        id=uuid.uuid4(),
        student_id=sample_student.id,
        subject_id=sample_subject.id,
        session_type="tutor_chat",
        started_at=started,
        ended_at=ended,
        duration_minutes=25,
        xp_earned=60,
        data={
            "outcomesWorkedOn": ["MA3-RN-01"],
            "questionsAttempted": 0,
            "questionsCorrect": 0,
            "flashcardsReviewed": 0,
            "messagesExchanged": 12,
        },
    )
    db_session.add(session)
    await db_session.commit()
    await db_session.refresh(session)
    return session


@pytest_asyncio.fixture(scope="function")
async def sample_achievement_definition(db_session: AsyncSession) -> Any:
    """Create a sample achievement definition in the database."""
    from app.models.achievement_definition import AchievementDefinition
    import uuid

    achievement = AchievementDefinition(
        id=uuid.uuid4(),
        code="first_session",
        name="First Steps",
        description="Complete your first study session",
        category="engagement",
        subject_code=None,
        requirements={"sessions_completed": 1},
        xp_reward=50,
        icon="star",
        is_active=True,
    )
    db_session.add(achievement)
    await db_session.commit()
    await db_session.refresh(achievement)
    return achievement


@pytest_asyncio.fixture(scope="function")
async def sample_achievement_definitions(db_session: AsyncSession) -> list[Any]:
    """Create multiple achievement definitions in the database."""
    from app.models.achievement_definition import AchievementDefinition
    import uuid

    achievements_data = [
        {
            "code": "first_session",
            "name": "First Steps",
            "description": "Complete your first study session",
            "category": "engagement",
            "requirements": {"sessions_completed": 1},
            "xp_reward": 50,
            "icon": "star",
        },
        {
            "code": "week_streak",
            "name": "Week Warrior",
            "description": "Maintain a 7-day study streak",
            "category": "streak",
            "requirements": {"streak_days": 7},
            "xp_reward": 100,
            "icon": "flame",
        },
        {
            "code": "level_5",
            "name": "Scholar",
            "description": "Reach level 5",
            "category": "level",
            "requirements": {"level": 5},
            "xp_reward": 150,
            "icon": "trophy",
        },
        {
            "code": "xp_master",
            "name": "XP Master",
            "description": "Earn 1000 total XP",
            "category": "xp",
            "requirements": {"total_xp": 1000},
            "xp_reward": 100,
            "icon": "gem",
        },
        {
            "code": "perfect_five",
            "name": "Perfect Five",
            "description": "Complete 5 perfect sessions (100% correct)",
            "category": "mastery",
            "requirements": {"perfect_sessions": 5},
            "xp_reward": 200,
            "icon": "sparkles",
        },
        {
            "code": "outcome_explorer",
            "name": "Outcome Explorer",
            "description": "Master 10 curriculum outcomes",
            "category": "curriculum",
            "requirements": {"outcomes_mastered": 10},
            "xp_reward": 150,
            "icon": "compass",
        },
        {
            "code": "flashcard_fan",
            "name": "Flashcard Fan",
            "description": "Review 100 flashcards",
            "category": "revision",
            "requirements": {"flashcards_reviewed": 100},
            "xp_reward": 75,
            "icon": "layers",
        },
        {
            "code": "math_champion",
            "name": "Math Champion",
            "description": "Complete 20 maths sessions",
            "category": "subject",
            "subject_code": "MATH",
            "requirements": {"subject_sessions": {"MATH": 20}},
            "xp_reward": 100,
            "icon": "calculator",
        },
    ]

    achievements = []
    for data in achievements_data:
        achievement = AchievementDefinition(
            id=uuid.uuid4(),
            is_active=True,
            **data,
        )
        db_session.add(achievement)
        achievements.append(achievement)

    await db_session.commit()
    for ach in achievements:
        await db_session.refresh(ach)
    return achievements


@pytest_asyncio.fixture(scope="function")
async def sample_student_subject_with_outcomes(
    db_session: AsyncSession,
    sample_student: Any,
    sample_subject: Any,
) -> Any:
    """Create a student subject enrolment with completed outcomes."""
    from app.models.student_subject import StudentSubject
    from datetime import datetime, timezone
    import uuid

    student_subject = StudentSubject(
        id=uuid.uuid4(),
        student_id=sample_student.id,
        subject_id=sample_subject.id,
        pathway=None,
        progress={
            "outcomesCompleted": ["MA3-RN-01", "MA3-RN-02", "MA3-GM-01"],
            "outcomesInProgress": ["MA3-MR-01"],
            "overallPercentage": 45,
            "lastActivity": datetime.now(timezone.utc).isoformat(),
            "xpEarned": 250,
        },
        last_activity_at=datetime.now(timezone.utc),
    )
    db_session.add(student_subject)
    await db_session.commit()
    await db_session.refresh(student_subject)
    return student_subject


@pytest_asyncio.fixture(scope="function")
async def sample_student_subjects_multi(
    db_session: AsyncSession,
    sample_student: Any,
    sample_subjects: list[Any],
) -> list[Any]:
    """Create student subject enrolments across multiple subjects with outcomes."""
    from app.models.student_subject import StudentSubject
    from datetime import datetime, timezone
    import uuid

    outcomes_data = [
        # MATH - 3 outcomes mastered
        {
            "outcomesCompleted": ["MA3-RN-01", "MA3-RN-02", "MA3-MR-01"],
            "outcomesInProgress": ["MA3-GM-01"],
            "overallPercentage": 60,
            "xpEarned": 300,
        },
        # ENG - 2 outcomes mastered
        {
            "outcomesCompleted": ["EN3-VOCAB-01", "EN3-SPELL-01"],
            "outcomesInProgress": ["EN3-GRAM-01"],
            "overallPercentage": 40,
            "xpEarned": 200,
        },
        # SCI - 2 outcomes mastered (1 overlapping code for uniqueness test)
        {
            "outcomesCompleted": ["SC3-WS-01", "SC3-LW-01"],
            "outcomesInProgress": [],
            "overallPercentage": 50,
            "xpEarned": 150,
        },
    ]

    student_subjects = []
    for i, subject in enumerate(sample_subjects):
        student_subject = StudentSubject(
            id=uuid.uuid4(),
            student_id=sample_student.id,
            subject_id=subject.id,
            pathway=None,
            progress={
                **outcomes_data[i],
                "lastActivity": datetime.now(timezone.utc).isoformat(),
            },
            last_activity_at=datetime.now(timezone.utc),
        )
        db_session.add(student_subject)
        student_subjects.append(student_subject)

    await db_session.commit()
    for ss in student_subjects:
        await db_session.refresh(ss)
    return student_subjects


@pytest_asyncio.fixture(scope="function")
async def sample_gamification_student(
    db_session: AsyncSession,
    sample_user: Any,
    sample_framework: Any,
) -> Any:
    """Create a student with pre-populated gamification data for testing."""
    from app.models.student import Student
    from datetime import date, timedelta
    import uuid

    student = Student(
        id=uuid.uuid4(),
        parent_id=sample_user.id,
        display_name="Gamification Test Student",
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
            "totalXP": 500,
            "level": 4,
            "achievements": [
                {
                    "id": "first_session",
                    "name": "First Steps",
                    "category": "engagement",
                    "xpReward": 50,
                    "unlockedAt": "2025-01-15T10:30:00Z",
                },
            ],
            "streaks": {
                "current": 5,
                "longest": 10,
                "lastActiveDate": (date.today() - timedelta(days=1)).isoformat(),
            },
            "dailyXPEarned": {
                "date": date.today().isoformat(),
                "session_complete": 50,
                "flashcard_review": 20,
            },
        },
    )
    db_session.add(student)
    await db_session.commit()
    await db_session.refresh(student)
    return student
