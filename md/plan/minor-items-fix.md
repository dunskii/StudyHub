# Implementation Plan: Minor Items Fix

## Overview

Fix the minor code quality issues identified in the Phase 4 critical fixes QA review. These are non-critical improvements that enhance code quality, maintainability, and test coverage.

## Prerequisites

- [x] Phase 4 critical fixes completed and verified
- [x] All tests passing (236 backend, 266 frontend)
- [x] Study document completed (`md/study/minor-items-fixes.md`)

---

## Phase 1: Backend Cleanup

### Task 1.1: Remove Unused Import
**File:** `backend/app/api/v1/endpoints/socratic.py`
**Effort:** Trivial

Remove the unused `Request` import from line 20:

```python
# Before
from fastapi import APIRouter, Depends, HTTPException, status, Request

# After
from fastapi import APIRouter, Depends, HTTPException, status
```

### Task 1.2: Add Rate Limiter Tests
**File:** `backend/tests/unit/test_chat_rate_limit.py` (new)
**Effort:** Low

Create comprehensive tests for `ChatRateLimiter`:

- [ ] `test_allows_messages_under_limit` - Messages below limit pass
- [ ] `test_blocks_messages_at_limit` - Messages at limit get 429
- [ ] `test_per_student_isolation` - Student A's limit doesn't affect Student B
- [ ] `test_sliding_window_cleanup` - Old messages expire after window
- [ ] `test_retry_after_header_calculation` - Header has correct value
- [ ] `test_record_only_on_success` - check_limit doesn't auto-record

Follow pattern from `test_auth_rate_limit.py`.

---

## Phase 2: Frontend Auth Refactoring

### Task 2.1: Wrap Protected Routes with AuthGuard
**File:** `frontend/src/App.tsx`
**Effort:** Low

Update route configuration to use existing `AuthGuard` component:

```tsx
import { AuthGuard } from '@/features/auth/AuthGuard'

// Protected routes requiring student selection
<Route path="/tutor" element={
  <AuthGuard requireStudent>
    <TutorPage />
  </AuthGuard>
} />
<Route path="/notes" element={
  <AuthGuard requireStudent>
    <NotesPage />
  </AuthGuard>
} />
```

### Task 2.2: Simplify TutorPage
**File:** `frontend/src/pages/TutorPage.tsx`
**Effort:** Medium

Remove in-component auth handling since AuthGuard now handles it:

- [ ] Remove auth-related imports (`Navigate`, `AlertCircle`)
- [ ] Remove `isAuthenticated`, `isLoading` from useAuthStore destructure
- [ ] Remove conditional returns for auth/student checks
- [ ] Use non-null assertion for `activeStudent` (guaranteed by AuthGuard)
- [ ] Ensure all hooks are before any returns
- [ ] Remove the error state JSX for "No Student Selected"

```tsx
// Before (problematic)
const { activeStudent, isAuthenticated, isLoading } = useAuthStore()
if (!isLoading && !isAuthenticated) {
  return <Navigate to="/login" replace />
}
// ... more conditionals
useEffect(() => { ... }, [searchParams])  // AFTER returns - bad!

// After (clean)
const { activeStudent } = useAuthStore()
const studentId = activeStudent!.id  // AuthGuard guarantees this

useEffect(() => { ... }, [searchParams])  // All hooks before returns - good!
```

### Task 2.3: Simplify NotesPage
**File:** `frontend/src/pages/NotesPage.tsx`
**Effort:** Medium

Same refactoring as TutorPage:

- [ ] Remove auth-related imports
- [ ] Remove auth checks and conditional returns
- [ ] Use non-null assertion for `activeStudent`
- [ ] Ensure all hooks before any returns
- [ ] Remove error state JSX

---

## Phase 3: Navigation Pattern Fix

### Task 3.1: Replace window.location.href
**Files:** Both pages already refactored in Phase 2
**Effort:** N/A - Removed

Since we're removing the "No Student Selected" error states (AuthGuard redirects to `/select-student` instead), the `window.location.href` usage is eliminated.

If other `window.location.href` usages exist elsewhere:
- [ ] Search codebase for remaining instances
- [ ] Replace with `useNavigate()` hook

---

## Phase 4: Optional Refactoring

### Task 4.1: Extract Shared Auth Dependencies (Optional)
**File:** `backend/app/api/v1/deps.py` (new)
**Effort:** Medium
**Priority:** P3 - Can defer to cleanup sprint

Extract duplicated verification functions:

```python
# app/api/v1/deps.py
async def verify_student_ownership(
    student_id: UUID,
    current_user: AuthenticatedUser,
    db: AsyncSession,
) -> Student:
    """Verify user owns the specified student."""
    ...

async def verify_session_ownership(
    session: Session,
    current_user: AuthenticatedUser,
    db: AsyncSession,
) -> Student:
    """Verify user owns the session's student."""
    ...
```

Then update imports in:
- `backend/app/api/v1/endpoints/sessions.py`
- `backend/app/api/v1/endpoints/socratic.py`

---

## Phase 5: Testing & Verification

### Task 5.1: Run Backend Tests
```bash
cd backend && pytest --cov=app tests/
```

Expected: All tests pass, including new rate limiter tests.

### Task 5.2: Run Frontend Tests
```bash
cd frontend && npm test
```

Expected: All tests pass. Some TutorPage/NotesPage tests may need updates.

### Task 5.3: Manual Verification
- [ ] Visit `/tutor` when not logged in → Redirects to `/login`
- [ ] Visit `/tutor` when logged in but no student → Redirects to `/select-student`
- [ ] Visit `/tutor` with student selected → Shows tutor page
- [ ] Same checks for `/notes`
- [ ] Verify no React hooks warnings in console

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| AuthGuard redirect breaks deep links | Low | AuthGuard preserves `from` location in state |
| TutorPage tests fail after refactor | Low | Update tests to mock AuthGuard or render within guard |
| Missing edge case in rate limiter | Low | Comprehensive test suite covers main scenarios |

---

## Curriculum Considerations

None - These are pure code quality fixes with no curriculum impact.

---

## Privacy/Security Checklist

- [x] No new data exposure
- [x] Auth handling remains secure
- [x] Rate limiting unchanged (just adding tests)
- [x] No changes to student data access patterns

---

## Estimated Complexity

**Simple** - Mostly straightforward refactoring with clear patterns to follow.

---

## Dependencies on Other Features

None - These fixes are isolated to Phase 4 code.

---

## Implementation Order

1. **Backend first** (no frontend dependencies):
   - Remove unused import
   - Add rate limiter tests
   - Run backend tests

2. **Frontend second**:
   - Update App.tsx with AuthGuard wrappers
   - Simplify TutorPage
   - Simplify NotesPage
   - Run frontend tests

3. **Verification**:
   - Manual testing of auth flows
   - Check browser console for warnings

---

## Files to Modify

| File | Changes |
|------|---------|
| `backend/app/api/v1/endpoints/socratic.py` | Remove unused import |
| `backend/tests/unit/test_chat_rate_limit.py` | Create new test file |
| `frontend/src/App.tsx` | Add AuthGuard wrappers |
| `frontend/src/pages/TutorPage.tsx` | Remove auth logic, fix hooks order |
| `frontend/src/pages/NotesPage.tsx` | Remove auth logic, fix hooks order |

---

## Recommended Agent

**frontend-developer** for the React refactoring, **testing-qa-specialist** for rate limiter tests, or **full-stack-developer** for the complete implementation.
