# Implementation Plan: Test Infrastructure Fixes

## Overview

This plan addresses the test infrastructure issues for the gamification services. It includes fixing 5 critical method signature mismatches causing 21 test failures, and adding 25+ new tests to cover recently implemented features (perfect_sessions, outcomes_mastered, daily XP caps, and progress calculations).

## Prerequisites

- [x] Phase 8 Gamification services implementation complete
- [x] QA recommendations implemented (perfect_sessions, outcomes_mastered, daily caps)
- [x] Study document created with detailed analysis
- [x] All current tests passing (33/33 tests pass)

---

## Phase 1: Fix Method Signature Mismatches (High Priority)

### 1.1 Fix `XPService.award_xp()` Parameter Name

**File**: `backend/tests/services/test_gamification_services.py`

- [x] Line ~248: Change `activity_type="session_complete"` to `source=ActivityType.SESSION_COMPLETE`
- [x] Line ~263: Same change for second test case
- [x] Add import: `from app.config.gamification import ActivityType`

### 1.2 Fix `LevelService.check_level_up()` Parameters

**File**: `backend/tests/services/test_gamification_services.py`

- [x] Line ~301 (`test_check_level_up_no_change`): Add `old_xp` and `new_xp` parameters
- [x] Line ~320 (`test_check_level_up_with_level_change`): Same fix
- [x] Update assertions to unpack tuple return: `leveled_up, new_level, title = await ...`

### 1.3 Fix `StreakService.update_streak()` Return Type

**File**: `backend/tests/services/test_gamification_services.py`

- [x] Line ~362 (`test_update_streak_consecutive_day`): Unpack tuple `new_streak, milestones = await ...`
- [x] Line ~381 (`test_update_streak_same_day`): Same fix
- [x] Line ~401 (`test_update_streak_broken`): Same fix
- [x] Line ~422 (`test_update_streak_new_longest`): Same fix
- [x] Update assertions to use `new_streak` instead of `result`

### 1.4 Fix `GamificationService.on_session_complete()` Signature

**File**: `backend/tests/services/test_gamification_services.py`

- [x] Line ~536: Change from multiple params to `session_id=sample_session.id`
- [x] Update mock setup to create a mock Session object with data fields
- [x] Remove invalid parameters: `student_id`, `session_type`, `duration_minutes`, `questions_correct`, `flashcards_reviewed`

### 1.5 Fix `GamificationService.get_parent_summary()` Signature

**File**: `backend/tests/services/test_gamification_services.py`

- [x] Line ~560: Remove `parent_id` parameter
- [x] Add `student_name=sample_student.display_name` parameter
- [x] Update assertions to match `ParentGamificationSummary` schema

---

## Phase 2: Add Test Fixtures - COMPLETED

**File**: `backend/tests/conftest.py`

### 2.1 Session Fixtures

- [x] Add `sample_session` fixture (100% correct revision session)
  - Perfect session: questionsAttempted=10, questionsCorrect=10
  - Lines 685-718

- [x] Add `sample_imperfect_session` fixture (70% correct)
  - Imperfect: questionsAttempted=10, questionsCorrect=7
  - Lines 721-754

- [x] Add `sample_tutor_session` fixture (for session type tests)
  - Tutor session type with messagesExchanged
  - Lines 757-791

### 2.2 Achievement Fixtures

- [x] Add `sample_achievement_definition` fixture
  - code="first_session", requirements={"sessions_completed": 1}
  - Lines 794-815

- [x] Add `sample_achievement_definitions` fixture (multiple achievements)
  - 8 achievements covering all requirement types
  - Lines 818-913

### 2.3 StudentSubject Fixtures

- [x] Add `sample_student_subject_with_outcomes` fixture
  - progress["outcomesCompleted"] = ["MA3-RN-01", "MA3-RN-02", "MA3-GM-01"]
  - Lines 916-944

### 2.4 Additional Fixtures Added

- [x] Add `sample_student_subjects_multi` fixture
  - Multi-subject enrolments with 7 unique outcomes across 3 subjects
  - Lines 947-1001

- [x] Add `sample_gamification_student` fixture
  - Student with pre-populated gamification data (XP, level, streak, achievements)
  - Lines 1004-1055

---

## Phase 3: Add New Test Classes - COMPLETED

**File**: `backend/tests/services/test_gamification_services.py`

### 3.1 TestXPServiceDailyCap (5 tests) - Lines 700-809

- [x] `test_daily_cap_first_award` - Full amount when under cap
- [x] `test_daily_cap_partial` - Returns remaining allowance
- [x] `test_daily_cap_reached` - Returns 0 when cap reached
- [x] `test_daily_cap_new_day_reset` - Cap resets on new day
- [x] `test_daily_cap_no_limit` - Full amount for activities without cap

### 3.2 TestXPServiceDailySummary (3 tests) - Lines 817-876

- [x] `test_summary_with_xp_today` - Returns activity→XP mapping
- [x] `test_summary_no_xp_today` - Returns empty dict
- [x] `test_summary_excludes_date_key` - 'date' key not in response

### 3.3 TestAchievementProgress (10 tests) - Lines 884-1027

- [x] `test_progress_sessions_completed` - 5/10 sessions = 50%
- [x] `test_progress_streak_days` - 3/7 days = 42.86%
- [x] `test_progress_level` - Level 3/5 = 60%
- [x] `test_progress_total_xp` - 500/1000 XP = 50%
- [x] `test_progress_outcomes_mastered` - 3/10 outcomes = 30%
- [x] `test_progress_perfect_sessions` - 2/5 perfect = 40%
- [x] `test_progress_flashcards_reviewed` - 50/100 cards = 50%
- [x] `test_progress_subject_sessions` - Subject-specific count
- [x] `test_progress_unlocked_shows_100` - Unlocked = 100%, "Completed!"
- [x] `test_progress_capped_at_100` - Exceeding target still shows 100%

### 3.4 TestPerfectSessions (4 tests) - Lines 1035-1084

- [x] `test_perfect_session_detected` - 100% correct counted
- [x] `test_imperfect_session_not_counted` - <100% not counted
- [x] `test_empty_session_not_counted` - 0 questions not counted
- [x] `test_only_revision_sessions_counted` - Tutor sessions excluded

### 3.5 TestOutcomesMastery (3 tests) - Lines 1092-1136

- [x] `test_counts_unique_outcomes` - Unique across subjects
- [x] `test_empty_with_no_subjects` - Returns 0
- [x] `test_handles_empty_progress` - Empty outcomesCompleted = 0

**Test Count**: 58 tests total (33 original + 25 new)

---

## Phase 4: Update Mock Patterns - COMPLETED

### 4.1 Fix Async Mock Issues

**File**: `backend/tests/services/test_gamification_services.py`

- [x] Update mock patterns for `db.execute()` to properly handle async
- [x] Fixed `'coroutine' object has no attribute` errors by awaiting mock setup

### 4.2 Add Helper Mock Functions - Lines 117-183

- [x] Create `mock_student_query(student)` helper - Configures mock for student queries
- [x] Create `mock_session_query(session)` helper - Configures mock for session queries
- [x] Create `mock_count_query(count)` helper - Configures mock for count queries
- [x] Create `mock_multi_query(results)` helper - Configures mock for sequential queries

---

## Phase 5: Integration Tests - COMPLETED

### 5.1 JSONB Query Integration Tests

**File**: `backend/tests/services/test_gamification_integration.py` (new file - 519 lines)

#### TestPerfectSessionsIntegration (2 tests)
- [x] `test_perfect_sessions_jsonb_query` - Real DB test for JSONB query (counts 2 perfect sessions)
- [x] `test_perfect_sessions_excludes_tutor` - Verifies tutor sessions excluded

#### TestOutcomesMasteredIntegration (3 tests)
- [x] `test_outcomes_mastered_aggregation` - Real DB test for outcome counting (7 unique outcomes)
- [x] `test_outcomes_mastered_empty_subjects` - Returns 0 for no subjects
- [x] `test_outcomes_mastered_deduplication` - Shared outcomes counted once

#### TestDailyXPTrackingIntegration (4 tests)
- [x] `test_daily_xp_tracking_persistence` - Real DB test for JSONB updates
- [x] `test_daily_xp_cap_enforcement` - Verifies cap with streak multiplier (20 * 1.05 = 21)
- [x] `test_daily_xp_summary_returns_correct_data` - Verifies summary excludes date key
- [x] `test_daily_xp_resets_on_new_day` - Verifies cap resets on new day

**Total Integration Tests**: 9 tests

---

## Testing Plan

### Run Order

1. Run Phase 1 fixes → expect 13 passing (config tests)
2. Run Phase 2 fixtures → should not break existing tests
3. Run Phase 3 new tests → expect 25+ new passing tests
4. Run Phase 4 mock fixes → expect remaining tests to pass
5. Run Phase 5 integration → full coverage

### Expected Results - ACTUAL RESULTS

| Phase | Tests Fixed/Added | Actual Passing |
|-------|-------------------|----------------|
| Phase 1 | 10 fixes | 33 tests |
| Phase 2 | 8 fixtures | 33 tests (no change) |
| Phase 3 | 25 new tests | 58 tests |
| Phase 4 | 4 mock helpers | 58 tests |
| Phase 5 | 9 integration tests | **67 tests total** |

**Final Result**: 67 tests passing in 3.07s

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Mock pattern complexity | Medium | Use integration tests for JSONB queries |
| Test isolation issues | Low | Function-scoped fixtures ensure isolation |
| Date-dependent tests | Medium | Mock `date.today()` for predictable testing |
| Database state leakage | Low | Transaction rollback per test |

---

## Files to Modify

### Backend Tests
1. `backend/tests/conftest.py` - Add 6 new fixtures
2. `backend/tests/services/test_gamification_services.py` - Fix signatures, add 25+ tests
3. `backend/tests/services/test_gamification_integration.py` - New file (3 tests)

### No Production Code Changes

This plan only modifies test files. All service implementations are complete.

---

## Estimated Complexity

**Overall**: Medium

- Phase 1 (Signature fixes): Simple - 30 minutes
- Phase 2 (Fixtures): Simple - 30 minutes
- Phase 3 (New tests): Medium - 2 hours
- Phase 4 (Mock fixes): Medium - 1 hour
- Phase 5 (Integration): Simple - 30 minutes

**Total**: ~4.5 hours

---

## Dependencies on Other Features

- [x] XP Service with `_apply_daily_cap` implementation
- [x] Achievement Service with `_calculate_progress` implementation
- [x] Achievement Service with `_get_student_stats` (perfect_sessions, outcomes_mastered)
- [x] XP Service with `get_daily_xp_summary` implementation
- [x] Session model with JSONB data field

---

## Privacy/Security Checklist

- [x] Tests use mock UUIDs, not real user data
- [x] No PII in gamification test data
- [x] Test fixtures properly isolated per test
- [x] No sensitive data in test assertions

---

## Curriculum Considerations

Not applicable - test infrastructure changes only. No curriculum-related logic modified.

---

## Recommended Agent

**testing-qa-specialist** agent is recommended for this implementation as it involves:
- pytest fixtures and patterns
- Async test handling
- Mock patterns for SQLAlchemy
- Integration test setup

---

## Completion Status

**ALL PHASES COMPLETE** - 2025-12-29

### Final Summary
- **Total Tests**: 67 (58 unit + 9 integration)
- **Execution Time**: 3.07s
- **Pass Rate**: 100%

### Files Modified/Created
1. `backend/tests/conftest.py` - Added 8 gamification fixtures
2. `backend/tests/services/test_gamification_services.py` - Fixed signatures, added 25 tests, added 4 mock helpers
3. `backend/tests/services/test_gamification_integration.py` - NEW file with 9 integration tests

### Key Technical Notes
- `Session.ended_at` uses naive datetime (`DateTime`), while `started_at` uses timezone-aware (`DateTime(timezone=True)`)
- XP cap tests must account for streak multipliers (e.g., 3-day streak = 1.05x)
- JSONB fields require `dict()` copy before modification to trigger SQLAlchemy change detection

## Next Steps (Optional)

1. ~~Run full test suite to verify all passing~~ DONE
2. Update CI/CD pipeline if needed
3. Add test coverage reporting
4. Document new fixtures in test README
