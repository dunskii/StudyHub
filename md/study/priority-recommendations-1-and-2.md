# Study: Phase 6 QA Priority 1 & 2 Recommendations

**Research Date:** 2025-12-27
**Focus:** Auth integration, rate limiting, streak calculation bug, and API integration tests

## Summary

Comprehensive research into implementing the Priority 1 and Priority 2 recommendations from the Phase 6 QA review. All four items have clear implementation paths with existing patterns in the codebase.

---

## Key Requirements

### Priority 1 (Before Production)
1. **Complete auth integration** - Wire up `verify_student_access()` with Supabase Auth
2. **Add rate limiting** - Protect AI generation endpoint from abuse

### Priority 2 (Should Fix)
3. **Fix streak calculation** - Use `timedelta` instead of `.replace(day=...)` to avoid month boundary bugs
4. **Add API integration tests** - Test full request/response cycle for revision endpoints

---

## Existing Patterns

### 1. Auth Integration Pattern

**Current state in revision.py:52-75:**
```python
async def verify_student_access(
    student_id: UUID,
    db: AsyncSession,
) -> Student:
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    # TODO: Verify that current user owns this student when auth is integrated
    return student
```

**Pattern from students.py (verified working):**
```python
@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(
    student_id: UUID,
    current_user: AuthenticatedUser,  # ← Auth dependency
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StudentResponse:
    service = StudentService(db)
    student = await service.get_by_id_for_user(student_id, current_user.id)

    if not student:
        exists = await service.get_by_id(student_id)
        if exists:
            raise ForbiddenError("You do not have access to this student")
        raise NotFoundError("Student")
```

**AuthenticatedUser type (security.py:173-174):**
```python
AuthenticatedUser = Annotated[CurrentUser, Depends(get_current_user)]
```

### 2. Rate Limiting Pattern

**Existing chat rate limiter (socratic.py:56-117):**
```python
class ChatRateLimiter:
    def __init__(self, max_messages: int = 30, window_seconds: int = 60):
        self.max_messages = max_messages
        self.window_seconds = window_seconds
        self._messages: dict[str, list[float]] = defaultdict(list)

    def check_limit(self, student_id: UUID) -> None:
        key = str(student_id)
        now = time.time()
        self._cleanup_old(key, now)

        if len(self._messages[key]) >= self.max_messages:
            remaining = int(self.window_seconds - (now - self._messages[key][0]))
            raise HTTPException(
                status_code=429,
                detail=f"Too many messages. Please wait {remaining} seconds.",
                headers={"Retry-After": str(remaining)},
            )

# Usage in endpoint:
chat_rate_limiter.check_limit(student.id)
# ... process ...
chat_rate_limiter.record_message(student.id)
```

### 3. Streak Bug Pattern

**Current buggy code (revision_service.py:656-662):**
```python
# BUG: .replace(day=...) fails at month boundaries
today = datetime.now(timezone.utc).date()
if dates[0] != today and dates[0] != today.replace(day=today.day - 1):  # ← FAILS on Jan 1
    return 0

for i in range(1, len(dates)):
    expected_date = dates[i - 1].replace(day=dates[i - 1].day - 1)  # ← FAILS on Mar 1
```

**Working pattern (student_service.py:328):**
```python
from datetime import timedelta
yesterday = (today - timedelta(days=1)).isoformat()
```

### 4. API Test Pattern

**Example from test_students.py:**
```python
@pytest.mark.asyncio
async def test_list_students(authenticated_client: AsyncClient, sample_student):
    response = await authenticated_client.get("/api/v1/students")

    assert response.status_code == 200
    result = response.json()
    assert result["total"] == 1
```

---

## Technical Considerations

### Auth Integration Changes

**Files to modify:**
- `backend/app/api/v1/endpoints/revision.py`

**Changes needed:**
1. Import `AuthenticatedUser` from `app.core.security`
2. Update `verify_student_access()` signature to include `current_user: AuthenticatedUser`
3. Add ownership check: `if student.parent_id != current_user.id`
4. Update all 12 endpoints to pass `current_user` parameter

**Endpoints affected:**
1. `POST /flashcards`
2. `POST /flashcards/bulk`
3. `GET /flashcards`
4. `GET /flashcards/{flashcard_id}`
5. `PUT /flashcards/{flashcard_id}`
6. `DELETE /flashcards/{flashcard_id}`
7. `POST /flashcards/generate`
8. `GET /due`
9. `POST /answer`
10. `GET /progress`
11. `GET /progress/by-subject`
12. `GET /history`

### Rate Limiting for AI Generation

**Recommended limits:**
- 5 requests per hour per student
- 20 requests per day per student

**Cost rationale:**
- Per-request cost: ~$0.001-0.002 USD (Claude Haiku)
- 20 per day = max ~$0.04 per student/day
- Prevents runaway costs from bugs or abuse

### Streak Bug Fix

**Problem:**
```python
date(2025, 1, 1).replace(day=0)  # ValueError: day is out of range
```

**Solution:**
```python
date(2025, 1, 1) - timedelta(days=1)  # date(2024, 12, 31) ✓
```

### API Integration Tests

**Test file:** `backend/tests/api/test_revision.py`

**Test classes to create:**
1. `TestFlashcardCRUD` - CRUD operations
2. `TestFlashcardGeneration` - AI generation + rate limiting
3. `TestRevisionReview` - Answer submission + SM-2 updates
4. `TestRevisionProgress` - Progress endpoints

**Required fixtures:**
- `sample_flashcard` - Single flashcard
- `sample_flashcards` - Multiple flashcards (same subject)
- `sample_flashcards_multi_subject` - Flashcards across subjects

---

## Security/Privacy Considerations

- **Auth verification**: All endpoints must verify parent owns the student
- **Rate limiting**: Prevents cost abuse and potential DDoS
- **Error differentiation**: Return 403 Forbidden (not 404) when student exists but access denied
- **Logging**: Consider logging rate limit violations for monitoring

---

## Dependencies

### For Auth Integration:
- Supabase Auth configured (already in place)
- JWT tokens working (already in place)
- `AuthenticatedUser` dependency (already defined)

### For Rate Limiting:
- None - can use in-memory dict (same as chat rate limiter)
- Consider Redis for distributed deployments (future)

### For Tests:
- pytest fixtures for flashcards (need to add to conftest.py)
- Sample note fixture (for generation tests)

---

## Implementation Estimates

| Item | Time |
|------|------|
| Auth Integration (12 endpoints) | 1.25 hours |
| Rate Limiting (GenerationRateLimiter) | 0.5 hours |
| Streak Bug Fix | 0.25 hours |
| API Integration Tests (~15 tests) | 2 hours |
| **Total** | **4 hours** |

---

## Open Questions

1. **Rate limit persistence**: Should rate limits persist across server restarts? (Current: No, in-memory only)
2. **Rate limit by IP or student**: Currently student-based (same as chat). Consider IP-based for unauthenticated abuse?
3. **Test mocking**: Should AI generation tests mock Claude API or use real calls? (Recommend: Mock for speed/cost)

---

## Sources Referenced

- `backend/app/api/v1/endpoints/revision.py` - Current implementation
- `backend/app/api/v1/endpoints/students.py:90-124` - Auth pattern
- `backend/app/api/v1/endpoints/users.py:249-292` - Parent-child verification
- `backend/app/api/v1/endpoints/socratic.py:56-117` - Chat rate limiter
- `backend/app/core/security.py:37-44, 173-174` - AuthenticatedUser type
- `backend/app/services/revision_service.py:638-668` - Streak calculation
- `backend/app/services/student_service.py:328` - timedelta pattern
- `backend/tests/api/test_students.py` - API test pattern
- `backend/tests/conftest.py` - Test fixtures
