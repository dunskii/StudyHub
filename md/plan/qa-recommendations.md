# Implementation Plan: Phase 8 QA Recommendations

## Overview

This plan addresses the medium and low priority recommendations from the Phase 8 Gamification QA review. The fixes improve test accuracy, complete placeholder implementations, optimise database queries, and follow SQLAlchemy best practices.

## Prerequisites

- [x] Phase 8 Gamification implementation complete
- [x] QA review completed with findings documented
- [x] Study document created with detailed analysis

---

## Phase 1: Quick Wins (30 minutes) - COMPLETED

### 1.1 Fix Test Level Title Assertions

**File**: `backend/tests/services/test_gamification_services.py`

- [x] Update `test_get_level_title` assertions to match `LEVEL_TITLES` config:
  - Level 5: "Explorer" → "Scholar"
  - Level 10: "Scholar" → "Senior Researcher"
  - Level 15: "Expert" → "Senior Master"
  - Level 20: "Master" → "Supreme Scholar"

### 1.2 Use `.is_(True)` SQLAlchemy Syntax

**Files**: 3 service files, 8 locations

- [x] `achievement_service.py` line 60: Replace `is_active == True` with `is_active.is_(True)`
- [x] `achievement_service.py` line 206: Same change
- [x] `achievement_service.py` line 481: Same change
- [x] `framework_service.py` line 100: Replace `is_default == True` with `is_default.is_(True)`
- [x] `goal_service.py` line 130: Replace `is_active == True` with `is_active.is_(True)`
- [x] `goal_service.py` line 139: Same change
- [x] `goal_service.py` line 167: Same change
- [x] `goal_service.py` line 501: Same change

### 1.3 Fix N+1 Query in `_get_student_stats`

**File**: `backend/app/services/achievement_service.py` lines 361-381

- [x] Replace loop-based subject code fetching with JOIN query
- [x] Test with student having multiple subjects

---

## Phase 2: Achievement Progress Implementation (1 hour) - COMPLETED

### 2.1 Implement `perfect_sessions` Tracking

**File**: `backend/app/services/achievement_service.py` lines 343-351

- [x] Replace placeholder `perfect_sessions = 0` with JSONB query
- [x] Query sessions where `data["questionsCorrect"] == data["questionsAttempted"]`
- [x] Ensure `questionsAttempted > 0` to avoid counting empty sessions

### 2.2 Implement `outcomes_mastered` Tracking

**File**: `backend/app/services/achievement_service.py` line 386

- [x] Query `StudentSubject.progress["outcomesCompleted"]` across all subjects
- [x] Aggregate unique outcome codes into set
- [x] Return count of unique mastered outcomes

### 2.3 Implement `_calculate_progress` Method

**File**: `backend/app/services/achievement_service.py` lines 429-453

- [x] Update `_calculate_progress` to accept requirements dict directly
- [x] Updated `get_achievements_with_progress` to fetch from database with requirements
- [x] Implement progress calculation for each requirement type:
  - `sessions_completed`: current/target sessions
  - `streak_days`: current/target days
  - `level`: current/target level
  - `total_xp`: current/target XP
  - `outcomes_mastered`: current/target outcomes
  - `perfect_sessions`: current/target perfect sessions
  - `flashcards_reviewed`: current/target cards
  - `subject_sessions`: current/target per subject
- [x] Return progress as decimal percentage and human-readable text

---

## Phase 3: Daily XP Cap Implementation (45 minutes) - COMPLETED

### 3.1 Implement `_apply_daily_cap` Using JSONB

**File**: `backend/app/services/xp_service.py` lines 291-311

- [x] Fetch student's `gamification["dailyXPEarned"]` JSONB field
- [x] Check if stored date matches today, reset if different day
- [x] Track XP earned per activity type for current day
- [x] Calculate remaining allowance for activity
- [x] Update JSONB tracking (committed in `award_xp`)

### 3.2 Update `get_daily_xp_summary` Method

**File**: `backend/app/services/xp_service.py` lines 318-324

- [x] Return actual daily XP data from `gamification["dailyXPEarned"]`
- [x] Parse and return activity-type to XP mapping

---

## Phase 4: XP Events Table (Deferred - 3 hours)

> **Note**: This is a larger enhancement that can be implemented in a future sprint for full daily cap enforcement and XP history tracking.

### 4.1 Database Schema

- [ ] Create `backend/app/models/xp_event.py` model
- [ ] Fields: id, student_id, session_id, subject_id, activity_type, base_amount, multiplier, final_amount, earned_date, created_at
- [ ] Add relationship to Student model
- [ ] Update models `__init__.py`

### 4.2 Migration

- [ ] Generate Alembic migration: `alembic revision --autogenerate -m "Add xp_events table"`
- [ ] Add indexes for (student_id, earned_date), (student_id, activity_type, earned_date)
- [ ] Test migration up/down

### 4.3 Service Updates

- [ ] Update `award_xp` to create XPEvent records
- [ ] Update `_apply_daily_cap` to query XPEvent table
- [ ] Update `get_daily_xp_summary` to aggregate from XPEvent
- [ ] Implement `get_recent_xp_events` for detailed stats

### 4.4 API Updates

- [ ] Add endpoint for XP history (optional)
- [ ] Update detailed stats to include recent XP events

---

## Testing Plan

### Unit Tests

- [x] Test level title assertions match config
- [x] Configuration tests passing (13/13)

### Edge Cases (Verified via implementation)

- [x] Student with no sessions (perfect_sessions = 0)
- [x] Student with no enrolled subjects (outcomes_mastered = 0)
- [x] Daily cap reached (returns 0 XP)
- [x] Daily cap not set for activity (returns full amount)
- [x] New day resets daily tracking
- [x] Achievement 100% progress when unlocked

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| JSONB query performance | Medium | Add indexes on JSONB paths if needed |
| Daily cap JSONB concurrent updates | Low | Single user unlikely to have concurrent requests |
| Test failures in CI | Low | Run tests locally before committing |
| Breaking existing achievements | Medium | Test all achievement types after changes |

---

## Implementation Order - COMPLETED

### Batch 1: Quick Wins (Priority: High) - DONE
1. ✅ Fix test assertions
2. ✅ Use `.is_(True)` syntax
3. ✅ Fix N+1 query

### Batch 2: Achievement Progress (Priority: Medium) - DONE
4. ✅ Implement `perfect_sessions` tracking
5. ✅ Implement `outcomes_mastered` tracking
6. ✅ Implement `_calculate_progress` method

### Batch 3: Daily XP Cap (Priority: Medium) - DONE
7. ✅ Implement `_apply_daily_cap` with JSONB
8. ✅ Update `get_daily_xp_summary`

### Batch 4: XP Events Table (Priority: Low - Deferred)
9. Full XP events implementation (future sprint)

---

## Additional Fixes Made

- Fixed import error in `sessions.py`: Changed `SessionCompleteResult` to `SessionGamificationResult`

---

## Estimated Complexity

**Overall**: Medium

- Quick wins: Simple (30 minutes) ✅
- Achievement progress: Medium (1 hour) ✅
- Daily XP cap: Medium (45 minutes) ✅
- XP events table: Complex (3 hours, deferred)

**Total for immediate implementation**: ~2.5 hours ✅

---

## Dependencies

- No external dependencies
- No frontend changes required
- No API contract changes (internal implementation only)
- No migration required for immediate fixes

---

## Files Modified

### Backend (Immediate) - COMPLETED
1. ✅ `backend/tests/services/test_gamification_services.py` - Fixed level title assertions
2. ✅ `backend/app/services/achievement_service.py` - Multiple fixes:
   - `.is_(True)` syntax (3 locations)
   - N+1 query fix with JOIN
   - `perfect_sessions` JSONB query
   - `outcomes_mastered` aggregation
   - `_calculate_progress` full implementation
   - `get_achievements_with_progress` updated to use db definitions
3. ✅ `backend/app/services/xp_service.py` - Daily cap implementation
4. ✅ `backend/app/services/framework_service.py` - `.is_(True)` syntax
5. ✅ `backend/app/services/goal_service.py` - `.is_(True)` syntax (4 locations)
6. ✅ `backend/app/api/v1/endpoints/sessions.py` - Fixed import error

### Backend (Deferred - XP Events)
6. `backend/app/models/xp_event.py` - New model
7. `backend/app/models/__init__.py` - Export model
8. `backend/app/models/student.py` - Add relationship
9. `backend/alembic/versions/021_xp_events.py` - New migration
