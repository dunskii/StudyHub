# Implementation Plan: Phase 6 QA Priority 1 & 2 Recommendations

## Overview

Implement the four priority recommendations from the Phase 6 QA review to make the Revision & Spaced Repetition feature production-ready:

1. **Auth Integration** - Complete ownership verification for all revision endpoints
2. **Rate Limiting** - Protect AI generation endpoint from cost abuse
3. **Streak Bug Fix** - Fix month boundary bug in streak calculation
4. **API Integration Tests** - Add comprehensive endpoint tests

---

## Prerequisites

- [x] Phase 6 implementation complete
- [x] Auth system working (Supabase Auth + JWT)
- [x] `AuthenticatedUser` dependency defined in security.py
- [x] Chat rate limiter pattern available (socratic.py)
- [x] API test fixtures pattern available (conftest.py)

---

## Phase 1: Auth Integration (Priority 1)

### 1.1 Update verify_student_access Function

**File:** `backend/app/api/v1/endpoints/revision.py`

- [ ] Import `AuthenticatedUser` from `app.core.security`
- [ ] Update `verify_student_access()` signature to include `current_user: AuthenticatedUser`
- [ ] Add ownership check: `if student.parent_id != current_user.id`
- [ ] Return 403 Forbidden when student exists but user doesn't own it

**Implementation:**
```python
from app.core.security import AuthenticatedUser

async def verify_student_access(
    student_id: UUID,
    current_user: AuthenticatedUser,  # NEW
    db: AsyncSession,
) -> Student:
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # NEW: Verify ownership
    if student.parent_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only access your own students",
        )

    return student
```

### 1.2 Update All 12 Endpoints

- [ ] `POST /flashcards` - Add `current_user: AuthenticatedUser` parameter
- [ ] `POST /flashcards/bulk` - Add `current_user: AuthenticatedUser` parameter
- [ ] `GET /flashcards` - Add `current_user: AuthenticatedUser` parameter
- [ ] `GET /flashcards/{flashcard_id}` - Add `current_user: AuthenticatedUser` parameter
- [ ] `PUT /flashcards/{flashcard_id}` - Add `current_user: AuthenticatedUser` parameter
- [ ] `DELETE /flashcards/{flashcard_id}` - Add `current_user: AuthenticatedUser` parameter
- [ ] `POST /flashcards/generate` - Add `current_user: AuthenticatedUser` parameter
- [ ] `GET /due` - Add `current_user: AuthenticatedUser` parameter
- [ ] `POST /answer` - Add `current_user: AuthenticatedUser` parameter
- [ ] `GET /progress` - Add `current_user: AuthenticatedUser` parameter
- [ ] `GET /progress/by-subject` - Add `current_user: AuthenticatedUser` parameter
- [ ] `GET /history` - Add `current_user: AuthenticatedUser` parameter

---

## Phase 2: Rate Limiting (Priority 1)

### 2.1 Create GenerationRateLimiter Class

**File:** `backend/app/api/v1/endpoints/revision.py`

- [ ] Create `GenerationRateLimiter` class with dual limits (hourly + daily)
- [ ] Implement `check_limit()` method with 429 response
- [ ] Implement `record_request()` method for successful requests
- [ ] Add `Retry-After` header to rate limit responses
- [ ] Create global instance with recommended limits (5/hour, 20/day)

**Implementation:**
```python
class GenerationRateLimiter:
    def __init__(
        self,
        max_per_hour: int = 5,
        max_per_day: int = 20,
    ):
        self.max_per_hour = max_per_hour
        self.max_per_day = max_per_day
        self._hourly: dict[str, list[float]] = defaultdict(list)
        self._daily: dict[str, list[float]] = defaultdict(list)

    def check_limit(self, student_id: UUID) -> None:
        # Check hourly and daily limits
        # Raise HTTPException 429 if exceeded

    def record_request(self, student_id: UUID) -> None:
        # Record timestamp for rate limiting

generation_rate_limiter = GenerationRateLimiter()
```

### 2.2 Integrate with Generation Endpoint

**File:** `backend/app/api/v1/endpoints/revision.py`

- [ ] Call `generation_rate_limiter.check_limit()` before AI call
- [ ] Call `generation_rate_limiter.record_request()` after successful generation
- [ ] Don't count failed generations against quota

---

## Phase 3: Streak Bug Fix (Priority 2)

### 3.1 Fix Month Boundary Bug

**File:** `backend/app/services/revision_service.py`

- [ ] Import `timedelta` from datetime
- [ ] Replace `today.replace(day=today.day - 1)` with `today - timedelta(days=1)`
- [ ] Replace `dates[i - 1].replace(day=...)` with `dates[i - 1] - timedelta(days=1)`

**Before:**
```python
if dates[0] != today and dates[0] != today.replace(day=today.day - 1):
    return 0

expected_date = dates[i - 1].replace(day=dates[i - 1].day - 1)
```

**After:**
```python
yesterday = today - timedelta(days=1)
if dates[0] != today and dates[0] != yesterday:
    return 0

expected_date = dates[i - 1] - timedelta(days=1)
```

### 3.2 Add Streak Unit Tests

**File:** `backend/tests/services/test_spaced_repetition.py`

- [ ] Add test for streak calculation at month boundary (Jan 1 → Dec 31)
- [ ] Add test for streak calculation at year boundary
- [ ] Add test for streak calculation at February end (leap year edge case)

---

## Phase 4: API Integration Tests (Priority 2)

### 4.1 Create Test Fixtures

**File:** `backend/tests/conftest.py`

- [ ] Add `sample_flashcard` fixture - single flashcard for a student
- [ ] Add `sample_flashcards` fixture - multiple flashcards (same subject)
- [ ] Add `sample_flashcards_multi_subject` fixture - flashcards across subjects

### 4.2 Create Test File

**File:** `backend/tests/api/test_revision.py`

#### TestFlashcardCRUD Class
- [ ] `test_create_flashcard_success` - Valid creation
- [ ] `test_create_flashcard_unauthenticated` - 401 without auth
- [ ] `test_create_flashcard_wrong_student` - 403 for other's student
- [ ] `test_get_flashcard_success` - Retrieve by ID
- [ ] `test_get_flashcard_not_found` - 404 for missing
- [ ] `test_list_flashcards_with_filters` - Subject filter, search
- [ ] `test_update_flashcard_success` - Valid update
- [ ] `test_delete_flashcard_success` - Valid deletion

#### TestFlashcardGeneration Class
- [ ] `test_generate_from_note_success` - Valid generation (mock Claude)
- [ ] `test_generate_from_outcome_success` - Valid generation (mock Claude)
- [ ] `test_generate_requires_source` - 400 without note_id or outcome_id
- [ ] `test_generate_rate_limit` - 429 after exceeding limit

#### TestRevisionReview Class
- [ ] `test_submit_correct_answer` - Updates SM-2 state correctly
- [ ] `test_submit_incorrect_answer` - Resets interval to 1
- [ ] `test_answer_creates_history` - RevisionHistory record created

#### TestRevisionProgress Class
- [ ] `test_get_progress_empty` - Zero stats for new student
- [ ] `test_get_progress_with_data` - Accurate stats calculation
- [ ] `test_get_progress_by_subject` - Grouped by subject correctly

---

## Phase 5: Code Cleanup (Priority 3)

### 5.1 Remove Unused Import

**File:** `backend/app/api/v1/endpoints/revision.py`

- [ ] Remove unused `selectinload` import (line 14)

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Auth breaks existing tests | Medium | Update test fixtures to include auth |
| Rate limiter memory leak | Low | Add cleanup for old entries (already implemented) |
| Streak fix edge cases | Low | Add comprehensive unit tests for edge cases |
| Test mocking complexity | Low | Use pytest-mock for Claude API |

---

## Security/Privacy Checklist

- [x] All endpoints require authentication
- [x] Parent can only access their own students (ownership verification)
- [x] Rate limiting prevents cost abuse
- [x] 403 vs 404 differentiation protects against enumeration attacks
- [x] No PII exposed in rate limit error messages

---

## Estimated Complexity

**Simple-Medium** - All patterns exist in codebase, straightforward implementation.

| Component | Complexity | Time |
|-----------|------------|------|
| Auth Integration | Simple | 1.25 hours |
| Rate Limiting | Simple | 0.5 hours |
| Streak Bug Fix | Simple | 0.25 hours |
| API Tests | Medium | 2 hours |
| **Total** | | **4 hours** |

---

## Dependencies on Other Features

- **None** - All required infrastructure is in place
- Auth system (Phase 3) ✓
- Rate limiting pattern (Phase 4) ✓
- Test framework (Phase 1) ✓

---

## Implementation Order

1. **Streak Bug Fix** (15 min) - Quick win, no dependencies
2. **Auth Integration** (75 min) - Must be done before tests
3. **Rate Limiting** (30 min) - Independent of auth
4. **API Integration Tests** (120 min) - After auth is complete
5. **Code Cleanup** (5 min) - Final polish

---

## Validation

After implementation, run:

```bash
# Backend tests
cd backend && python -m pytest tests/ -v --cov=app

# Specifically test revision
cd backend && python -m pytest tests/api/test_revision.py -v
cd backend && python -m pytest tests/services/test_spaced_repetition.py -v

# Type checking
cd backend && mypy app --strict

# Frontend tests (unchanged, but verify no regressions)
cd frontend && npm test -- --run
```

---

## Recommended Agent

**backend-architect** or **full-stack-developer** - These are backend-focused changes with no frontend modifications needed.
