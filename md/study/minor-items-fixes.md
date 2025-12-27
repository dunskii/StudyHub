# Study: Minor Items from Critical Fixes Review

**Date**: 2025-12-27
**Topic**: Follow-up improvements identified in Phase 4 critical fixes QA
**Status**: Research Complete

---

## Overview

The critical fixes QA review identified several minor issues that should be addressed for code quality. This document analyses each issue and provides implementation guidance.

---

## Issue 1: React Hooks Order Violation

### Problem

In `TutorPage.tsx` and `NotesPage.tsx`, `useEffect` is called after conditional returns, violating React's rules of hooks.

```tsx
// Lines 37-56: Early returns
if (!isLoading && !isAuthenticated) {
  return <Navigate to="/login" replace />
}
if (!isLoading && isAuthenticated && !activeStudent) {
  return (...) // Error state
}

// Line 62: Hook called after conditionals - VIOLATION
useEffect(() => {
  // URL param handling
}, [searchParams])
```

### Why This Matters

React hooks must be called in the same order on every render. When hooks appear after conditional returns, they may not be called consistently, leading to:
- React errors in development
- Unpredictable behaviour
- Difficult debugging

### Solution Options

#### Option A: Move All Hooks Before Returns (Quick Fix)

Move all `useState`, `useEffect`, and other hooks before any conditional returns:

```tsx
export function TutorPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { activeStudent, isAuthenticated, isLoading } = useAuthStore()
  const [viewMode, setViewMode] = useState<ViewMode>('select')
  const [selectedSubject, setSelectedSubject] = useState<typeof SUBJECTS[number] | null>(null)

  // Move useEffect here, BEFORE any returns
  useEffect(() => {
    const subjectCode = searchParams.get('subject')
    const view = searchParams.get('view')
    // ... rest of effect
  }, [searchParams])

  // Now do conditional returns
  if (!isLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  // ...
}
```

#### Option B: Use AuthGuard Wrapper (Recommended)

The codebase already has an `AuthGuard` component at `frontend/src/features/auth/AuthGuard.tsx`:

```tsx
export function AuthGuard({
  children,
  requireStudent = false,
  redirectTo = '/login'
}: AuthGuardProps) {
  const { session, isLoading } = useAuth()
  const { isAuthenticated, activeStudent } = useAuthStore()

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  }

  if (!session || !isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  if (requireStudent && !activeStudent) {
    return <Navigate to="/select-student" replace />
  }

  return <>{children}</>
}
```

**Benefits:**
- Separation of concerns - auth logic in one place
- No hooks order issues in page components
- Consistent auth handling across app
- Already implemented and tested

**Implementation:**

Update `App.tsx` routes:

```tsx
// Current (no guard)
<Route path="/tutor" element={<TutorPage />} />

// Recommended (with guard)
<Route path="/tutor" element={
  <AuthGuard requireStudent>
    <TutorPage />
  </AuthGuard>
} />
```

Then simplify `TutorPage.tsx`:

```tsx
export function TutorPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { activeStudent } = useAuthStore()
  const [viewMode, setViewMode] = useState<ViewMode>('select')
  const [selectedSubject, setSelectedSubject] = useState<typeof SUBJECTS[number] | null>(null)

  // Safe: AuthGuard guarantees activeStudent exists
  const studentId = activeStudent!.id

  useEffect(() => {
    // URL param handling - now safely before any returns
  }, [searchParams])

  // No auth checks needed - AuthGuard handles it
  return (...)
}
```

### Recommendation

**Use Option B (AuthGuard wrapper)** because:
1. The component already exists and is tested
2. Provides consistent auth handling
3. Eliminates auth logic duplication
4. Prevents hooks order issues by design

---

## Issue 2: Unused Import

### Problem

`socratic.py` line 20 imports `Request` but never uses it:

```python
from fastapi import APIRouter, Depends, HTTPException, status, Request  # Request unused
```

### Solution

Remove the unused import:

```python
from fastapi import APIRouter, Depends, HTTPException, status
```

### Note

The `Request` object was likely added anticipating needing client IP for rate limiting, but the implementation uses student ID instead (which is the correct approach for this use case).

---

## Issue 3: window.location.href Usage

### Problem

Both `TutorPage.tsx` and `NotesPage.tsx` use `window.location.href` for navigation:

```tsx
<Button onClick={() => window.location.href = '/students'}>
  Select Student
</Button>
```

### Why This Matters

- `window.location.href` causes a full page reload
- Loses React state
- Slower than client-side routing
- Breaks SPA user experience

### Solution

Use React Router's `useNavigate()` hook:

```tsx
import { useNavigate } from 'react-router-dom'

export function TutorPage() {
  const navigate = useNavigate()

  // In error state JSX:
  <Button onClick={() => navigate('/students')}>
    Select Student
  </Button>
}
```

### Existing Pattern

`LoginForm.tsx` already uses this pattern correctly:

```tsx
const navigate = useNavigate()

const handleSubmit = async (data: FormData) => {
  // ... login logic
  navigate('/dashboard')
}
```

### Note

If using AuthGuard (Option B from Issue 1), this becomes moot since the error state with the button would be removed from the page components entirely.

---

## Issue 4: Rate Limiter Test Coverage

### Problem

The new `ChatRateLimiter` class has no unit tests.

### Existing Pattern

`backend/tests/unit/test_auth_rate_limit.py` provides a template for rate limiter tests:

```python
import pytest
from unittest.mock import patch
import time

from app.api.v1.endpoints.auth import auth_rate_limiter

class TestAuthRateLimiter:
    def setup_method(self):
        """Clear rate limiter state between tests."""
        auth_rate_limiter._attempts.clear()

    def test_allows_requests_under_limit(self):
        """Test that requests under the limit are allowed."""
        ip = "192.168.1.1"
        for _ in range(auth_rate_limiter.max_attempts - 1):
            auth_rate_limiter.check_limit(ip)
        # Should not raise

    def test_blocks_requests_over_limit(self):
        """Test that requests over the limit are blocked."""
        ip = "192.168.1.2"
        for _ in range(auth_rate_limiter.max_attempts):
            auth_rate_limiter.check_limit(ip)

        with pytest.raises(HTTPException) as exc_info:
            auth_rate_limiter.check_limit(ip)

        assert exc_info.value.status_code == 429
        assert "Retry-After" in exc_info.value.headers
```

### Recommended Tests

Create `backend/tests/unit/test_chat_rate_limit.py`:

```python
"""Tests for chat rate limiter."""
import pytest
from unittest.mock import patch
import time
from uuid import uuid4

from fastapi import HTTPException

from app.api.v1.endpoints.socratic import chat_rate_limiter, ChatRateLimiter


class TestChatRateLimiter:
    """Tests for ChatRateLimiter class."""

    def setup_method(self):
        """Clear rate limiter state between tests."""
        chat_rate_limiter._messages.clear()

    def test_allows_messages_under_limit(self):
        """Test that messages under the limit are allowed."""
        student_id = uuid4()

        # Should allow up to max_messages - 1
        for _ in range(chat_rate_limiter.max_messages - 1):
            chat_rate_limiter.record_message(student_id)
            chat_rate_limiter.check_limit(student_id)

        # Should not raise

    def test_blocks_messages_at_limit(self):
        """Test that messages at the limit are blocked."""
        student_id = uuid4()

        # Fill up to limit
        for _ in range(chat_rate_limiter.max_messages):
            chat_rate_limiter.record_message(student_id)

        # Next check should fail
        with pytest.raises(HTTPException) as exc_info:
            chat_rate_limiter.check_limit(student_id)

        assert exc_info.value.status_code == 429
        assert "Retry-After" in exc_info.value.headers

    def test_per_student_isolation(self):
        """Test that rate limits are per-student."""
        student_a = uuid4()
        student_b = uuid4()

        # Fill up student A's limit
        for _ in range(chat_rate_limiter.max_messages):
            chat_rate_limiter.record_message(student_a)

        # Student B should still be allowed
        chat_rate_limiter.check_limit(student_b)  # Should not raise

        # Student A should be blocked
        with pytest.raises(HTTPException):
            chat_rate_limiter.check_limit(student_a)

    def test_sliding_window_cleanup(self):
        """Test that old messages are cleaned up."""
        student_id = uuid4()

        # Record a message
        chat_rate_limiter.record_message(student_id)

        # Simulate time passing beyond window
        with patch('time.time', return_value=time.time() + 61):
            # Old message should be cleaned up
            chat_rate_limiter.check_limit(student_id)

            # Should be empty after cleanup
            assert len(chat_rate_limiter._messages[str(student_id)]) == 0

    def test_retry_after_header_calculation(self):
        """Test that Retry-After header is calculated correctly."""
        student_id = uuid4()

        # Fill up limit
        for _ in range(chat_rate_limiter.max_messages):
            chat_rate_limiter.record_message(student_id)

        with pytest.raises(HTTPException) as exc_info:
            chat_rate_limiter.check_limit(student_id)

        retry_after = int(exc_info.value.headers["Retry-After"])
        assert 0 < retry_after <= chat_rate_limiter.window_seconds

    def test_failed_requests_not_counted(self):
        """Verify that only successful requests are counted.

        Note: This is a design verification - record_message is only
        called after successful processing in the chat endpoint.
        """
        student_id = uuid4()

        # Check limit multiple times without recording
        for _ in range(100):
            chat_rate_limiter.check_limit(student_id)

        # Should still be empty since we didn't record
        assert len(chat_rate_limiter._messages[str(student_id)]) == 0
```

---

## Issue 5: Duplicate Verification Functions (Optional)

### Problem

Both `sessions.py` and `socratic.py` have their own `verify_student_ownership` and `verify_session_ownership` functions.

### Solution

Extract to a shared module:

```python
# app/api/v1/deps.py (new file)
"""Shared API dependencies."""
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.student import Student
from app.models.session import Session
from app.api.v1.endpoints.auth import AuthenticatedUser


async def verify_student_ownership(
    student_id: UUID,
    current_user: AuthenticatedUser,
    db: AsyncSession,
) -> Student:
    """Verify that the current user owns the specified student.

    Args:
        student_id: The student ID to verify.
        current_user: The authenticated user.
        db: Database session.

    Returns:
        The verified Student object.

    Raises:
        HTTPException: 404 if student not found, 403 if not owned.
    """
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )
    if student.parent_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this student"
        )
    return student


async def verify_session_ownership(
    session: Session,
    current_user: AuthenticatedUser,
    db: AsyncSession,
) -> Student:
    """Verify that the current user owns the session's student.

    Args:
        session: The session to verify.
        current_user: The authenticated user.
        db: Database session.

    Returns:
        The verified Student object.

    Raises:
        HTTPException: 404 if student not found, 403 if not owned.
    """
    return await verify_student_ownership(session.student_id, current_user, db)
```

### Benefits

- Single source of truth
- Consistent error messages
- Easier to maintain
- Can add logging/auditing in one place

### Priority

This is a nice-to-have refactoring, not a bug fix. Can be done during a cleanup sprint.

---

## Implementation Priority

| Issue | Priority | Effort | Impact |
|-------|----------|--------|--------|
| React hooks order (with AuthGuard) | P1 | Medium | High - prevents bugs |
| Rate limiter tests | P1 | Low | High - test coverage |
| Unused import | P3 | Trivial | Low - code cleanliness |
| useNavigate | P2 | Low | Medium - UX improvement |
| Shared deps module | P3 | Medium | Low - maintainability |

---

## Recommended Action Plan

1. **Immediate** (before next feature):
   - Add rate limiter tests
   - Fix React hooks order using AuthGuard wrapper

2. **Next cleanup sprint**:
   - Remove unused Request import
   - Replace window.location.href with useNavigate
   - Extract shared auth dependencies

3. **Future consideration**:
   - Add aria-live for dynamic error states
   - Optimize double student lookups

---

## Related Files

- `frontend/src/pages/TutorPage.tsx` - Hooks order issue
- `frontend/src/pages/NotesPage.tsx` - Hooks order issue
- `frontend/src/features/auth/AuthGuard.tsx` - Existing guard component
- `frontend/src/App.tsx` - Route configuration
- `backend/app/api/v1/endpoints/socratic.py` - Unused import, rate limiter
- `backend/tests/unit/test_auth_rate_limit.py` - Template for rate limiter tests
- `md/review/critical-fixes.md` - Source of identified issues
