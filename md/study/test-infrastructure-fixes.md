# Study: Test Infrastructure Fixes for Gamification Services

## Summary

The gamification service test suite has **5 critical method signature mismatches** causing 21 test failures. Additionally, **6 new test suites are needed** to cover recently implemented features (perfect_sessions, outcomes_mastered, daily XP caps, and progress calculations). This document details all issues and recommended fixes.

---

## Key Requirements

1. **Fix method signature mismatches** in existing tests (5 critical issues)
2. **Add unit tests** for new implementations:
   - `perfect_sessions` tracking via JSONB query
   - `outcomes_mastered` aggregation
   - `_calculate_progress` method (8 requirement types)
   - `_apply_daily_cap` method
   - `get_daily_xp_summary` method
3. **Add integration test fixtures** for sessions and achievement definitions
4. **Maintain async/await patterns** consistent with existing tests

---

## Existing Test Patterns

### Test Framework
- **Framework**: pytest with pytest-asyncio
- **Async Mode**: All service tests use `@pytest.mark.asyncio` and `async/await`
- **Mocking**: `unittest.mock` (AsyncMock, MagicMock, patch)
- **Fixtures**: pytest fixtures (function-scoped by default)
- **Database**: AsyncSession for integration tests

### Current Test Structure
```
backend/tests/
├── api/                           # API endpoint tests
│   ├── test_gamification_api.py   # Gamification API tests
│   └── test_*.py                  # Other endpoint tests
├── services/                      # Service layer tests
│   ├── test_gamification_services.py   # Main gamification tests
│   ├── test_goal_service.py
│   └── test_*.py
├── middleware/                    # Middleware tests
└── conftest.py                    # Shared fixtures
```

### Conftest Fixtures Available
| Fixture | Purpose | Type |
|---------|---------|------|
| `db_session` | Async database session | AsyncSession |
| `sample_user` | Test user in DB | User model |
| `sample_framework` | NSW curriculum framework | CurriculumFramework |
| `sample_subject` | Test MATH subject | Subject |
| `sample_subjects` | 3 subjects (MATH, ENG, SCI) | List[Subject] |
| `sample_student` | Test student linked to user | Student |
| `sample_flashcards` | 5 test flashcards | List[Flashcard] |

---

## Critical Method Signature Mismatches

### Issue 1: `XPService.award_xp()` Parameter Name

**Current Test** (line 248):
```python
await xp_service.award_xp(
    student_id=sample_student.id,
    amount=xp_to_add,
    activity_type="session_complete",  # ❌ WRONG
)
```

**Actual Signature**:
```python
async def award_xp(
    self,
    student_id: UUID,
    amount: int,
    source: ActivityType,           # ✓ Parameter is "source"
    session_id: UUID | None = None,
    subject_id: UUID | None = None,
    apply_multiplier: bool = True,
) -> dict[str, Any]:
```

**Fix**: Change `activity_type=` to `source=ActivityType.SESSION_COMPLETE`

---

### Issue 2: `LevelService.check_level_up()` Missing Parameters

**Current Test** (line 301):
```python
result = await level_service.check_level_up(sample_student.id)  # Only 1 param
```

**Actual Signature**:
```python
async def check_level_up(
    self,
    student_id: UUID,
    old_xp: int,        # ✓ REQUIRED
    new_xp: int,        # ✓ REQUIRED
) -> tuple[bool, int | None, str | None]:
```

**Fix**: Pass `old_xp` and `new_xp` parameters

---

### Issue 3: `StreakService.update_streak()` Return Type

**Current Test** (line 362):
```python
result = await streak_service.update_streak(sample_student.id)
assert result is not None
assert sample_student.gamification["streaks"]["current"] == 6  # Access as dict
```

**Actual Return Type**:
```python
async def update_streak(self, student_id: UUID) -> tuple[int, list[int]]:
    """Returns: Tuple of (new_streak, milestones_reached)."""
    return current_streak, milestones_reached
```

**Fix**: Unpack tuple: `new_streak, milestones = await streak_service.update_streak(...)`

---

### Issue 4: `GamificationService.on_session_complete()` Signature

**Current Test** (line 536):
```python
result = await gamification_service.on_session_complete(
    student_id=sample_student.id,
    session_type="tutor_chat",
    subject_id=None,
    duration_minutes=15,        # ❌ NOT IN SIGNATURE
    questions_correct=5,        # ❌ NOT IN SIGNATURE
    flashcards_reviewed=10,     # ❌ NOT IN SIGNATURE
)
```

**Actual Signature**:
```python
async def on_session_complete(
    self, session_id: UUID      # ✓ Only session_id
) -> SessionGamificationResult:
```

**Fix**: Pass only `session_id`, create mock session with data fields

---

### Issue 5: `GamificationService.get_parent_summary()` Missing Parameter

**Current Test** (line 560):
```python
summary = await gamification_service.get_parent_summary(
    parent_id=sample_student.parent_id,
    student_id=sample_student.id,
)
```

**Actual Signature**:
```python
async def get_parent_summary(
    self,
    student_id: UUID,           # ✓ Required
    student_name: str,          # ✓ Also required (missing in test)
) -> ParentGamificationSummary:
```

**Fix**: Add `student_name` parameter, remove incorrect `parent_id`

---

## New Tests Needed

### 1. TestXPServiceDailyCap

Test `_apply_daily_cap()` functionality:

```python
class TestXPServiceDailyCap:
    """Tests for daily XP cap enforcement."""

    @pytest.mark.asyncio
    async def test_daily_cap_first_award(self, xp_service, sample_student):
        """Test XP awarded when cap not reached."""
        # Setup: Activity has max_per_day limit
        # Assert: Full amount returned when under cap

    @pytest.mark.asyncio
    async def test_daily_cap_partial(self, xp_service, sample_student):
        """Test XP capped to remaining allowance."""
        # Setup: Already earned some XP today
        # Assert: Returns only remaining amount

    @pytest.mark.asyncio
    async def test_daily_cap_reached(self, xp_service, sample_student):
        """Test returns 0 when cap reached."""
        # Setup: Already at max for today
        # Assert: Returns 0

    @pytest.mark.asyncio
    async def test_daily_cap_new_day_reset(self, xp_service, sample_student):
        """Test cap resets on new day."""
        # Setup: Previous day's tracking in gamification
        # Assert: Full amount returned (new day)

    @pytest.mark.asyncio
    async def test_daily_cap_no_limit(self, xp_service, sample_student):
        """Test activities without daily cap."""
        # Setup: Activity with max_per_day = None
        # Assert: Full amount returned
```

### 2. TestXPServiceDailySummary

Test `get_daily_xp_summary()` functionality:

```python
class TestXPServiceDailySummary:
    """Tests for daily XP summary retrieval."""

    @pytest.mark.asyncio
    async def test_summary_with_xp_today(self, xp_service, sample_student):
        """Test returns activity->XP mapping for today."""
        # Setup: dailyXPEarned with today's date
        # Assert: Returns correct mapping

    @pytest.mark.asyncio
    async def test_summary_no_xp_today(self, xp_service, sample_student):
        """Test returns empty when no XP earned today."""
        # Setup: No dailyXPEarned or old date
        # Assert: Returns {}

    @pytest.mark.asyncio
    async def test_summary_excludes_date_key(self, xp_service, sample_student):
        """Test 'date' key not included in response."""
        # Assert: Only activity types in result
```

### 3. TestAchievementProgress

Test `_calculate_progress()` for all requirement types:

```python
class TestAchievementProgress:
    """Tests for achievement progress calculation."""

    @pytest.mark.asyncio
    async def test_progress_sessions_completed(self, achievement_service):
        """Test progress for sessions_completed requirement."""
        requirements = {"sessions_completed": 10}
        stats = {"sessions_completed": 5}
        progress, text = achievement_service._calculate_progress(
            requirements, stats, is_unlocked=False
        )
        assert progress == Decimal("50")
        assert text == "5/10 sessions"

    @pytest.mark.asyncio
    async def test_progress_streak_days(self, achievement_service):
        """Test progress for streak_days requirement."""

    @pytest.mark.asyncio
    async def test_progress_level(self, achievement_service):
        """Test progress for level requirement."""

    @pytest.mark.asyncio
    async def test_progress_total_xp(self, achievement_service):
        """Test progress for total_xp requirement."""

    @pytest.mark.asyncio
    async def test_progress_outcomes_mastered(self, achievement_service):
        """Test progress for outcomes_mastered requirement."""

    @pytest.mark.asyncio
    async def test_progress_perfect_sessions(self, achievement_service):
        """Test progress for perfect_sessions requirement."""

    @pytest.mark.asyncio
    async def test_progress_flashcards_reviewed(self, achievement_service):
        """Test progress for flashcards_reviewed requirement."""

    @pytest.mark.asyncio
    async def test_progress_subject_sessions(self, achievement_service):
        """Test progress for subject_sessions requirement."""

    @pytest.mark.asyncio
    async def test_progress_unlocked_shows_100(self, achievement_service):
        """Test unlocked achievements show 100% and 'Completed!'"""
        progress, text = achievement_service._calculate_progress(
            {"sessions_completed": 10}, {"sessions_completed": 5}, is_unlocked=True
        )
        assert progress == Decimal("100")
        assert text == "Completed!"

    @pytest.mark.asyncio
    async def test_progress_capped_at_100(self, achievement_service):
        """Test progress doesn't exceed 100%."""
        requirements = {"level": 5}
        stats = {"level": 10}  # Exceeds target
        progress, _ = achievement_service._calculate_progress(
            requirements, stats, is_unlocked=False
        )
        assert progress == Decimal("100")
```

### 4. TestPerfectSessions

Test perfect session detection:

```python
class TestPerfectSessions:
    """Tests for perfect session detection via JSONB query."""

    @pytest.mark.asyncio
    async def test_perfect_session_detected(
        self, db_session, sample_student, sample_subject
    ):
        """Test sessions with 100% correct answers are counted."""
        # Create session with questionsAttempted=10, questionsCorrect=10
        # Assert: perfect_sessions count includes it

    @pytest.mark.asyncio
    async def test_imperfect_session_not_counted(
        self, db_session, sample_student, sample_subject
    ):
        """Test sessions with <100% correct not counted."""
        # Create session with questionsAttempted=10, questionsCorrect=8
        # Assert: perfect_sessions count excludes it

    @pytest.mark.asyncio
    async def test_empty_session_not_counted(
        self, db_session, sample_student, sample_subject
    ):
        """Test sessions with 0 questions not counted as perfect."""
        # Create session with questionsAttempted=0, questionsCorrect=0
        # Assert: perfect_sessions count excludes it

    @pytest.mark.asyncio
    async def test_only_revision_sessions_counted(
        self, db_session, sample_student, sample_subject
    ):
        """Test only revision session type counted for perfect."""
        # Create tutor session with 100% correct
        # Assert: Not counted as perfect_session
```

### 5. TestOutcomesMastery

Test outcomes mastered calculation:

```python
class TestOutcomesMastery:
    """Tests for outcomes mastered calculation."""

    @pytest.mark.asyncio
    async def test_counts_unique_outcomes(
        self, db_session, sample_student, sample_subjects
    ):
        """Test unique outcomes counted across subjects."""
        # Create StudentSubjects with overlapping outcomes
        # Assert: Unique count returned

    @pytest.mark.asyncio
    async def test_empty_with_no_subjects(self, db_session, sample_student):
        """Test returns 0 when no subjects enrolled."""
        # Assert: outcomes_mastered == 0

    @pytest.mark.asyncio
    async def test_handles_empty_progress(
        self, db_session, sample_student, sample_subject
    ):
        """Test handles subjects with no completed outcomes."""
        # Create StudentSubject with empty outcomesCompleted
        # Assert: outcomes_mastered == 0
```

---

## New Fixtures Needed

Add to `conftest.py`:

```python
@pytest_asyncio.fixture
async def sample_session(
    db_session: AsyncSession,
    sample_student: Any,
    sample_subject: Any
) -> Any:
    """Create a sample completed study session."""
    from app.models.session import Session
    from datetime import datetime, timezone, timedelta
    import uuid

    session = Session(
        id=uuid.uuid4(),
        student_id=sample_student.id,
        subject_id=sample_subject.id,
        session_type="revision",
        data={
            "questionsAttempted": 10,
            "questionsCorrect": 10,
            "flashcardsReviewed": 20,
            "outcomesWorkedOn": [],
        },
        started_at=datetime.now(timezone.utc) - timedelta(minutes=30),
        ended_at=datetime.now(timezone.utc),
        xp_earned=0,
    )
    db_session.add(session)
    await db_session.commit()
    await db_session.refresh(session)
    return session


@pytest_asyncio.fixture
async def sample_imperfect_session(
    db_session: AsyncSession,
    sample_student: Any,
    sample_subject: Any
) -> Any:
    """Create a session with less than 100% correct."""
    from app.models.session import Session
    from datetime import datetime, timezone, timedelta
    import uuid

    session = Session(
        id=uuid.uuid4(),
        student_id=sample_student.id,
        subject_id=sample_subject.id,
        session_type="revision",
        data={
            "questionsAttempted": 10,
            "questionsCorrect": 7,  # 70% correct
            "flashcardsReviewed": 15,
            "outcomesWorkedOn": [],
        },
        started_at=datetime.now(timezone.utc) - timedelta(minutes=20),
        ended_at=datetime.now(timezone.utc),
        xp_earned=0,
    )
    db_session.add(session)
    await db_session.commit()
    await db_session.refresh(session)
    return session


@pytest_asyncio.fixture
async def sample_achievement_definition(db_session: AsyncSession) -> Any:
    """Create a sample achievement definition."""
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


@pytest_asyncio.fixture
async def sample_student_subject_with_outcomes(
    db_session: AsyncSession,
    sample_student: Any,
    sample_subject: Any,
) -> Any:
    """Create a StudentSubject with completed outcomes."""
    from app.models.student_subject import StudentSubject
    import uuid

    student_subject = StudentSubject(
        id=uuid.uuid4(),
        student_id=sample_student.id,
        subject_id=sample_subject.id,
        progress={
            "outcomesCompleted": ["MA3-RN-01", "MA3-RN-02", "MA3-GM-01"],
            "outcomesInProgress": [],
            "overallPercentage": 60,
            "lastActivity": None,
            "xpEarned": 500,
        },
    )
    db_session.add(student_subject)
    await db_session.commit()
    await db_session.refresh(student_subject)
    return student_subject
```

---

## Technical Considerations

### Mock Patterns for AsyncSession

**Pattern for scalar_one_or_none:**
```python
mock_result = AsyncMock()
mock_result.scalar_one_or_none = AsyncMock(return_value=sample_student)
mock_db.execute = AsyncMock(return_value=mock_result)
```

**Pattern for scalars().all():**
```python
mock_result = MagicMock()
mock_result.scalars.return_value.all.return_value = [item1, item2]
mock_db.execute = AsyncMock(return_value=mock_result)
```

**Pattern for scalar() (count queries):**
```python
mock_result = AsyncMock()
mock_result.scalar = MagicMock(return_value=5)
mock_db.execute = AsyncMock(return_value=mock_result)
```

### JSONB Query Testing

When testing JSONB queries for perfect_sessions, ensure test data includes:
```python
session.data = {
    "questionsAttempted": 10,
    "questionsCorrect": 10,  # Must equal questionsAttempted for perfect
    "flashcardsReviewed": 20,
    "outcomesWorkedOn": ["MA3-RN-01"],
}
```

---

## Security/Privacy Considerations

- Tests should use mock UUIDs, not real user data
- Gamification data contains no PII (XP, levels, streaks)
- Achievement progress calculations don't expose student identities
- Test fixtures properly isolated per test function

---

## Dependencies

1. **pytest-asyncio** for async test support
2. **Existing conftest fixtures** (sample_student, sample_subject, etc.)
3. **Service implementations** completed (all done)
4. **AchievementDefinition model** for testing achievement queries

---

## Open Questions

1. Should we use integration tests (real DB) or mocks for JSONB query tests?
   - **Recommendation**: Use integration tests with real DB for JSONB queries since mock patterns are complex

2. Should daily XP cap tests mock `date.today()` or use real dates?
   - **Recommendation**: Mock `date.today()` for predictable testing

3. What edge cases need coverage for progress calculation?
   - Zero target values
   - Negative current values (shouldn't happen but defensive)
   - Missing requirement keys

---

## Implementation Order

### Phase 1: Fix Existing Tests (High Priority)
1. Fix `award_xp()` parameter name (2 locations)
2. Fix `check_level_up()` parameters (2 locations)
3. Fix `update_streak()` return type handling (4 locations)
4. Fix `on_session_complete()` signature (1 location)
5. Fix `get_parent_summary()` signature (1 location)

### Phase 2: Add Fixtures
1. Add `sample_session` fixture
2. Add `sample_imperfect_session` fixture
3. Add `sample_achievement_definition` fixture
4. Add `sample_student_subject_with_outcomes` fixture

### Phase 3: Add New Test Classes
1. `TestXPServiceDailyCap` (5 tests)
2. `TestXPServiceDailySummary` (3 tests)
3. `TestAchievementProgress` (10 tests)
4. `TestPerfectSessions` (4 tests)
5. `TestOutcomesMastery` (3 tests)

---

## Sources Referenced

- `backend/tests/conftest.py` - Shared fixtures
- `backend/tests/services/test_gamification_services.py` - Current tests
- `backend/app/services/xp_service.py` - XP service implementation
- `backend/app/services/level_service.py` - Level service implementation
- `backend/app/services/streak_service.py` - Streak service implementation
- `backend/app/services/achievement_service.py` - Achievement service implementation
- `backend/app/services/gamification_service.py` - Orchestration service
- `backend/app/schemas/gamification.py` - Response schemas
- `backend/app/config/gamification.py` - Configuration values
