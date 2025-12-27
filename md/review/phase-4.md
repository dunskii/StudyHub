# Code Review: Phase 4 - AI Tutoring Foundation

**Date**: 2025-12-27
**Reviewer**: Claude Code
**Phase**: 4 - AI Tutoring

## Summary

**Overall Assessment: PASS with MINOR ISSUES**

Phase 4 implements a well-structured AI tutoring system with the Socratic method at its core. The code demonstrates strong architectural decisions, proper security measures, and good separation of concerns. A few medium-priority issues should be addressed before production deployment.

---

## Security Findings

| Issue | Severity | Location | Recommendation |
|-------|----------|----------|----------------|
| Hardcoded student ID | HIGH | `TutorPage.tsx:36`, `NotesPage.tsx:36` | Replace `demo-student-id` with actual auth context |
| No authentication on endpoints | MEDIUM | `sessions.py`, `socratic.py` | Add auth dependency to all endpoints |
| No rate limiting on chat endpoint | MEDIUM | `socratic.py:104` | Add per-student rate limiting to prevent abuse |
| Missing input sanitisation on logs | LOW | `ai_interaction_service.py` | Sanitise user messages before logging for XSS in admin views |

### Authentication Gap
The session and socratic endpoints currently lack authentication middleware. While ownership verification exists in services, endpoints are publicly accessible:

```python
# Current (socratic.py:104)
@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, db: Annotated[AsyncSession, Depends(get_db)])

# Recommended
@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],  # Add auth
)
```

---

## Code Quality Issues

| Issue | Location | Recommendation |
|-------|----------|----------------|
| Unused import | `session_service.py:4` | Remove `Any` from typing import if unused |
| Type ignore comment | `socratic.py:145`, `prompt_factory.py:172` | Investigate and resolve properly |
| Inconsistent error handling | `socratic.py:209-214` | Log specific exception types |
| Magic string duplication | Multiple files | Define session types as enum/constants |
| Missing return type | `session_service.py:346-379` | `cleanup_stale_sessions` cutoff calculation may overflow |

### Session Type Constants
Session types are strings scattered across files:

```python
# Current
session_type: str = "tutor_chat"

# Recommended - create constants
class SessionType(str, Enum):
    TUTOR_CHAT = "tutor_chat"
    REVISION = "revision"
    HOMEWORK_HELP = "homework_help"
```

### Stale Session Cleanup Bug
In `session_service.py:359-360`, the datetime arithmetic is incorrect:

```python
# Bug: This will fail when minute < timeout
cutoff = datetime.now(timezone.utc).replace(
    minute=datetime.now(timezone.utc).minute - timeout_minutes  # Can be negative!
)

# Fix: Use timedelta
from datetime import timedelta
cutoff = datetime.now(timezone.utc) - timedelta(minutes=timeout_minutes)
```

---

## Curriculum/AI Considerations

### Socratic Method Enforcement
**Status: EXCELLENT**

The base tutor prompt at `base_tutor.py:135-159` strongly enforces the Socratic method with clear examples and anti-patterns. The moderation service additionally checks AI responses for direct answer patterns.

### Subject-Specific Tutor Styles
**Status: COMPLETE**

All 8 NSW curriculum subjects have dedicated tutor prompts:
- MATH: `socratic_stepwise` approach
- ENG: `socratic_analytical` approach
- SCI: `inquiry_based` approach
- HSIE: `socratic_analytical` approach
- PDHPE: `discussion_based` approach
- TAS: `project_based` approach
- CA: `creative_mentoring` approach
- LANG: `immersive` approach

### Age-Appropriate Language
**Status: COMPLETE**

Stage-specific language guidelines are well-defined in `base_tutor.py:26-83` covering all stages from Early Stage 1 (Kindergarten) to Stage 6 (HSC).

### Model Routing
**Status: APPROPRIATE**

- Complex tasks (tutoring, essay feedback) use Sonnet 4
- Simple tasks (flashcards, summaries) use Haiku 3.5
- Cost tracking implemented per interaction

---

## Test Coverage

**Current: 0% (no tests found for Phase 4)**

### Recommended Test Additions

#### Backend Tests
1. `test_claude_service.py` - Mock API responses, cost calculation
2. `test_session_service.py` - Session lifecycle, ownership verification
3. `test_ai_interaction_service.py` - Logging, flagging, token usage
4. `test_moderation_service.py` - All pattern categories
5. `test_tutor_prompts.py` - Prompt generation per subject/stage
6. `test_socratic_endpoints.py` - Integration tests with mocked Claude

#### Frontend Tests
1. `TutorChat.test.tsx` - Message flow, session management
2. `ChatMessage.test.tsx` - Markdown rendering, flagged display
3. `ChatInput.test.tsx` - Send on Enter, character limit
4. `tutorStore.test.ts` - State management
5. `useTutor.test.ts` - Hook behaviour, error handling

### Priority Test Cases
- Moderation blocks inappropriate content
- Socratic method violations are flagged
- Session ownership prevents cross-student access
- Token limits are enforced
- Distress keywords trigger appropriate response

---

## Performance Concerns

| Concern | Location | Impact | Recommendation |
|---------|----------|--------|----------------|
| N+1 query for subjects | `sessions.py:249-254` | O(n) DB queries | Batch load subjects in single query |
| Large conversation context | `socratic.py:194-200` | High token usage | Consider summarising old messages |
| Regex compilation | `moderation_service.py:87-101` | Minor CPU | Already optimised with pre-compilation |

### N+1 Query Fix
```python
# Current (sessions.py:249-254)
for session in sessions:
    if session.subject_id:
        subject = await db.get(Subject, session.subject_id)  # N queries!

# Recommended
subject_ids = [s.subject_id for s in sessions if s.subject_id]
subjects_result = await db.execute(select(Subject).where(Subject.id.in_(subject_ids)))
subjects_map = {s.id: s for s in subjects_result.scalars()}
```

---

## Accessibility Issues

| Issue | Location | Recommendation |
|-------|----------|----------------|
| Missing skip link | `TutorChat.tsx` | Add skip to main content |
| No focus management | `TutorChat.tsx` | Focus input after sending |
| Missing heading structure | `EmptyChat.tsx` | Use semantic headings |

### Good Practices Found
- `role="log"` with `aria-live="polite"` on messages container
- `aria-label` on message input
- `aria-hidden="true"` on decorative icons
- `role="article"` on chat messages

---

## Recommendations

### Priority 1 (Critical - Before Production)
1. **Add authentication to all endpoints** - Currently no auth on session/socratic routes
2. **Replace hardcoded student ID** - `demo-student-id` used in TutorPage and NotesPage
3. **Add rate limiting** - Prevent AI abuse and cost overruns

### Priority 2 (High - Should Fix Soon)
4. **Fix stale session cleanup bug** - Negative minute calculation
5. **Add backend tests** - 0% coverage for Phase 4 services
6. **Implement token limits per student** - Config exists but not enforced

### Priority 3 (Medium - Code Quality)
7. **Create session type enum** - Replace magic strings
8. **Fix N+1 query** - Batch load subjects in session list
9. **Add frontend tests** - Component and hook coverage

### Priority 4 (Low - Nice to Have)
10. **Add focus management** - Better keyboard navigation
11. **Implement conversation summarisation** - Reduce token usage for long sessions

---

## Files Reviewed

### Backend
- `backend/app/services/claude_service.py` (307 lines)
- `backend/app/services/session_service.py` (380 lines)
- `backend/app/services/ai_interaction_service.py` (403 lines)
- `backend/app/services/moderation_service.py` (284 lines)
- `backend/app/services/tutor_prompts/base_tutor.py` (277 lines)
- `backend/app/services/tutor_prompts/prompt_factory.py` (215 lines)
- `backend/app/services/tutor_prompts/maths_tutor.py` (113 lines)
- `backend/app/api/v1/endpoints/socratic.py` (406 lines)
- `backend/app/api/v1/endpoints/sessions.py` (295 lines)
- `backend/app/schemas/session.py` (99 lines)
- `backend/app/schemas/ai_interaction.py` (220 lines)

### Frontend
- `frontend/src/features/socratic-tutor/TutorChat.tsx` (211 lines)
- `frontend/src/features/socratic-tutor/ChatMessage.tsx` (223 lines)
- `frontend/src/features/socratic-tutor/ChatInput.tsx` (117 lines)
- `frontend/src/stores/tutorStore.ts` (99 lines)
- `frontend/src/hooks/useTutor.ts` (320 lines)
- `frontend/src/pages/TutorPage.tsx` (186 lines)

---

## Conclusion

Phase 4 demonstrates solid implementation of an AI tutoring system with:
- Strong Socratic method enforcement
- Subject-specific tutoring styles
- Safety and moderation features
- Parent visibility through interaction logging
- Cost tracking and model routing

The main gaps are:
1. Missing authentication integration
2. No test coverage
3. A few code quality issues

**Recommendation**: Address Priority 1 issues before any production deployment. The authentication gap is the most critical finding.
