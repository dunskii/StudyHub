# Implementation Plan: Priority 1 and Priority 2 Fixes

**Date**: 2025-12-28
**Type**: QA Remediation
**Scope**: Phase 7 - Parent Dashboard fixes
**Study Reference**: `md/study/priority 1 and priority 2 fixes.md`

## Overview

This plan addresses 7 remaining issues from the Phase 7 QA review, organized by implementation order for maximum impact and minimum risk.

## Prerequisites
- [x] Phase 7 Parent Dashboard completed
- [x] Frontend accessibility fixes completed
- [x] Backend test fixtures corrected
- [x] Study document reviewed

---

## Phase 1: Critical Bug Fix (Division by Zero)

**Target File**: `backend/app/services/goal_service.py`

### Task 1.1: Add Division Guard at Line 255-259
- [ ] Read current code around line 255-261
- [ ] Add zero check before division: `if goal.target_mastery and goal.target_mastery != 0:`
- [ ] Handle edge case where target_mastery is 0 (return 100% if current >= 0)

### Task 1.2: Add Division Guard at Line 275-278
- [ ] Read current code around line 275-278
- [ ] Same fix pattern as above
- [ ] Ensure both branches handle zero correctly

**Verification**:
- [ ] Run existing goal_service tests
- [ ] Manually test goal creation with target_mastery=0

---

## Phase 2: Code Quality Quick Fixes

### Task 2.1: Remove Unused Imports
**File**: `backend/app/api/v1/endpoints/parent_dashboard.py`
- [ ] Remove line 20: `from app.models.notification import NotificationType, NotificationPriority`
- [ ] Verify no other references to these in the file

### Task 2.2: Remove Duplicate Service Instantiation
**File**: `backend/app/api/v1/endpoints/parent_dashboard.py`
- [ ] Find line 96: `analytics_service_for_agg = ParentAnalyticsService(db)`
- [ ] Replace usage with existing `analytics_service` from line 75
- [ ] Update lines 97-99 to use `analytics_service` instead

### Task 2.3: Consolidate Duplicate Import
**File**: `backend/app/services/notification_service.py`
- [ ] Add `timedelta` to line 12: `from datetime import datetime, time, timezone, timedelta`
- [ ] Remove line 279: `from datetime import timedelta`
- [ ] Verify no other inline imports

**Verification**:
- [ ] Run Python import check (pyflakes or similar)
- [ ] Run backend tests to ensure no import errors

---

## Phase 3: Performance - N+1 Query Fixes

### Task 3.1: Fix Dashboard Overview N+1 Query
**File**: `backend/app/api/v1/endpoints/parent_dashboard.py`

**Current Code (lines 83-87)**:
```python
summaries: list[DashboardStudentSummary] = []
for student in students:
    summary = await analytics_service.get_student_summary(student.id)
    if summary:
        summaries.append(summary)
```

**Steps**:
- [ ] Check if `get_students_summary()` method exists in `ParentAnalyticsService`
- [ ] If exists, refactor to use batch method
- [ ] If not, create batch method that takes `parent_id` and returns all summaries
- [ ] Replace loop with single batch call

**New Code Pattern**:
```python
summaries = await analytics_service.get_students_summaries_for_parent(current_user.id)
```

### Task 3.2: Fix Goal Progress N+1 Query
**File**: `backend/app/api/v1/endpoints/parent_dashboard.py`

**Current Code (lines 298-306)**:
```python
goals_with_progress: list[GoalWithProgress] = []
for goal in goals:
    progress = await goal_service.calculate_progress(goal)
    goals_with_progress.append(...)
```

**Steps**:
- [ ] Create new method in `goal_service.py`: `calculate_progress_batch(goals: list[Goal])`
- [ ] Method should:
  1. Collect all unique student_ids from goals
  2. Fetch all StudentSubject records for those students in one query
  3. Calculate progress for each goal using the prefetched data
  4. Return dict of `{goal_id: GoalProgress}`
- [ ] Update endpoint to use batch method
- [ ] Remove the loop

**Verification**:
- [ ] Test with multiple goals
- [ ] Verify database query count reduced (use SQL logging)
- [ ] Run E2E tests for parent dashboard

---

## Phase 4: Backend Test Coverage (Extended)

### Task 4.1: Implement Goal Service Tests
**File**: `backend/tests/services/test_goal_service.py`

- [ ] Implement `test_create_goal_success` - verify goal creation
- [ ] Implement `test_create_goal_validates_student_ownership` - verify ownership check
- [ ] Implement `test_calculate_progress_no_target` - verify 0% progress when no target
- [ ] Implement `test_calculate_progress_with_target_mastery` - verify percentage calculation
- [ ] Implement `test_calculate_days_remaining` - verify days calculation
- [ ] Implement `test_is_on_track_calculation` - verify on-track logic
- [ ] Implement `test_check_achievement_met` - verify goal marked achieved
- [ ] Implement `test_delete_goal_verifies_ownership` - verify security
- [ ] Add test for division by zero edge case (target_mastery=0)

### Task 4.2: Implement Notification Service Tests
**File**: `backend/tests/services/test_notification_service.py`

- [ ] Implement `test_create_milestone_notification`
- [ ] Implement `test_create_streak_notification`
- [ ] Implement `test_mark_single_read` - verify read_at set
- [ ] Implement `test_mark_all_read` - verify batch update
- [ ] Implement `test_list_all_notifications`
- [ ] Implement `test_list_unread_only` - verify filter
- [ ] Implement `test_get_preferences` - verify defaults
- [ ] Implement `test_update_preferences` - verify partial update

### Task 4.3: Create Parent Analytics Service Tests
**File**: `backend/tests/services/test_parent_analytics_service.py` (NEW)

- [ ] Create test file with fixtures
- [ ] Implement `test_get_student_summary` - verify stats calculation
- [ ] Implement `test_get_aggregate_stats` - verify totals
- [ ] Implement `test_get_student_progress` - verify mastery data
- [ ] Mock database responses for each test

### Task 4.4: Implement Parent Dashboard Endpoint Tests
**File**: `backend/tests/api/test_parent_dashboard.py`

- [ ] Review existing skeleton
- [ ] Implement `test_get_dashboard_overview_success`
- [ ] Implement `test_get_dashboard_requires_auth`
- [ ] Implement `test_get_student_progress_success`
- [ ] Implement `test_get_student_progress_not_own_child`
- [ ] Implement `test_create_goal_success`
- [ ] Implement `test_delete_goal_success`
- [ ] Mock services appropriately

**Verification**:
- [ ] Run full test suite: `pytest backend/tests/services/ -v`
- [ ] Check coverage: `pytest --cov=app.services backend/tests/services/`
- [ ] Target: 70%+ coverage on critical paths

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Division by zero fix changes progress calculation | Medium | Test with various target_mastery values |
| N+1 fix changes response structure | Low | Keep same API contract, only internal change |
| Removing imports breaks something | Low | Search for all usages before removing |
| Batch method logic error | Medium | Compare results with original loop method |

---

## Privacy/Security Checklist

- [x] No new data exposure
- [x] No API contract changes
- [x] All fixes are internal refactoring
- [x] Test data uses synthetic values
- [x] No student data logged

---

## Implementation Order

1. **Phase 1** - Critical bug fix (15 min)
2. **Phase 2** - Code quality quick fixes (15 min)
3. **Phase 3** - N+1 query optimization (1 hour)
4. **Phase 4** - Test coverage (2-3 days)

**Total Estimate**: 2-3 days (mostly testing)

---

## Validation Criteria

### Before Marking Complete
- [ ] All Phase 1-3 fixes applied
- [ ] No Python linting errors
- [ ] Backend tests pass
- [ ] E2E tests pass
- [ ] Test coverage improved

### Acceptance Test
```bash
# Run all parent dashboard tests
cd backend
pytest tests/services/test_goal_service.py tests/services/test_notification_service.py tests/api/test_parent_dashboard.py -v

# Check coverage
pytest --cov=app.services.goal_service --cov=app.services.notification_service --cov=app.api.v1.endpoints.parent_dashboard tests/ --cov-report=term-missing
```

---

## Agent Assignment

| Phase | Recommended Agent |
|-------|------------------|
| Phase 1-3 | `backend-architect` or direct implementation |
| Phase 4 | `testing-qa-specialist` |

---

## Notes

- Phases 1-3 can be done quickly without tests (fixes are straightforward)
- Phase 4 is significant investment but important for production readiness
- Consider prioritising critical path tests over 100% coverage
- The division by zero fix is highest priority - production crash potential

---

*Plan created for Phase 7 QA Remediation*
