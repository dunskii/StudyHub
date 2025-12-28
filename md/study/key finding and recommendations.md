# Study: Phase 7 QA Key Findings and Recommendations

## Summary

This study consolidates all key findings from the Phase 7 Parent Dashboard QA review and provides actionable implementation guidance. The review identified 1 HIGH severity security issue, 4 MEDIUM performance issues, and several test coverage gaps. All issues are resolvable within the current architecture.

**Overall Assessment:** PASS with 10 recommendations across 3 priority levels

---

## Key Requirements

### Priority 1 - Before Production

1. **Fix ownership verification gap in `ParentAnalyticsService.get_student_summary()`**
   - Current method accepts only `student_id` with no ownership check
   - Risk: Method is unsafe for reuse - any caller could fetch any student's data
   - Mitigation: Endpoint level filters by parent first, but service is unsafe

2. **Add Zod validation to frontend API responses**
   - Current: Heavy use of `as Record<string, unknown>` casting
   - Risk: Runtime errors if API structure changes

### Priority 2 - Current Sprint

3. **Implement N+1 query batching in `ParentAnalyticsService`**
4. **Add HTTP endpoint integration tests**
5. **Implement SettingsTab component** (backend notification preferences ready)

### Priority 3 - Next Sprint

6. **Database-level pagination for goals/notifications**
7. **Framework isolation tests**
8. **Extract date formatting to shared utility**
9. **Remove TODO comments from production code**
10. **Add E2E tests for parent dashboard flows**

---

## Existing Patterns

### GoalService Batch Pattern (Reference Implementation)

The `GoalService.calculate_progress_batch()` method demonstrates the correct N+1 prevention pattern:

```python
# File: backend/app/services/goal_service.py:305-402

async def calculate_progress_batch(
    self, goals: list[Goal]
) -> dict[UUID, GoalProgress]:
    """Calculate progress for multiple goals efficiently.

    Prefetches all required student subject data in a single query
    to avoid N+1 query pattern.
    """
    if not goals:
        return {}

    # Step 1: Collect all unique student IDs
    student_ids = list({goal.student_id for goal in goals})

    # Step 2: Prefetch all student subjects in ONE query
    result = await self.db.execute(
        select(StudentSubject)
        .where(StudentSubject.student_id.in_(student_ids))
    )
    all_subjects = result.scalars().all()

    # Step 3: Group for O(1) lookup
    subjects_by_student: dict[UUID, list[StudentSubject]] = {}
    for subject in all_subjects:
        if subject.student_id not in subjects_by_student:
            subjects_by_student[subject.student_id] = []
        subjects_by_student[subject.student_id].append(subject)

    # Step 4: Calculate using prefetched data
    progress_map: dict[UUID, GoalProgress] = {}
    for goal in goals:
        subjects = subjects_by_student.get(goal.student_id, [])
        # ... calculation using in-memory data
```

**Key Benefits:**
- Single database query regardless of goal count
- O(1) lookups via dictionary grouping
- Same pattern applicable to `ParentAnalyticsService`

### Ownership Verification Pattern (Reference Implementation)

The `GoalService._verify_student_ownership()` pattern:

```python
# File: backend/app/services/goal_service.py

async def _verify_student_ownership(
    self, parent_id: UUID, student_id: UUID
) -> Student | None:
    """Verify student belongs to parent."""
    result = await self.db.execute(
        select(Student)
        .where(Student.id == student_id)
        .where(Student.parent_id == parent_id)
    )
    return result.scalar_one_or_none()
```

---

## Technical Considerations

### Security Fix: ParentAnalyticsService

**Current (Unsafe):**
```python
# backend/app/services/parent_analytics_service.py:81-92
async def get_student_summary(self, student_id: UUID) -> DashboardStudentSummary | None:
    student = await self.db.get(Student, student_id)  # No ownership check!
    if not student:
        return None
    # ...
```

**Option A: Add parent_id parameter (Recommended)**
```python
async def get_student_summary(
    self, student_id: UUID, parent_id: UUID
) -> DashboardStudentSummary | None:
    """Get student summary with ownership verification."""
    result = await self.db.execute(
        select(Student)
        .where(Student.id == student_id)
        .where(Student.parent_id == parent_id)
    )
    student = result.scalar_one_or_none()
    if not student:
        return None
    # ...
```

**Option B: Mark as private method**
```python
async def _get_student_summary(self, student_id: UUID) -> DashboardStudentSummary | None:
    """Internal method - caller must verify ownership."""
    # Rename to indicate internal use only
```

### Performance Fix: N+1 in get_students_summary

**Current (N+1):**
```python
# backend/app/services/parent_analytics_service.py:118-143
async def get_students_summary(self, parent_id: UUID) -> list[DashboardStudentSummary]:
    result = await self.db.execute(
        select(Student).where(Student.parent_id == parent_id)
    )
    students = result.scalars().all()

    summaries = []
    for student in students:
        summary = await self.get_student_summary(student.id)  # N+1 query!
        if summary:
            summaries.append(summary)
    return summaries
```

**Recommended Fix: Inline calculation with batch prefetch**
```python
async def get_students_summary(self, parent_id: UUID) -> list[DashboardStudentSummary]:
    # Single query for all students
    result = await self.db.execute(
        select(Student).where(Student.parent_id == parent_id)
    )
    students = result.scalars().all()

    if not students:
        return []

    student_ids = [s.id for s in students]
    week_start = self._get_week_start()

    # Batch prefetch: sessions count per student
    sessions_result = await self.db.execute(
        select(Session.student_id, func.count(Session.id))
        .where(Session.student_id.in_(student_ids))
        .where(Session.started_at >= week_start)
        .group_by(Session.student_id)
    )
    sessions_by_student = dict(sessions_result.all())

    # Batch prefetch: study time per student
    time_result = await self.db.execute(
        select(Session.student_id, func.sum(Session.duration_minutes))
        .where(Session.student_id.in_(student_ids))
        .where(Session.started_at >= week_start)
        .group_by(Session.student_id)
    )
    time_by_student = dict(time_result.all())

    # Build summaries from in-memory data
    summaries = []
    for student in students:
        gamification = student.gamification or {}
        streaks = gamification.get("streaks", {})

        summaries.append(DashboardStudentSummary(
            id=student.id,
            display_name=student.display_name,
            grade_level=student.grade_level,
            school_stage=student.school_stage,
            framework_id=student.framework_id,
            total_xp=gamification.get("totalXP", 0),
            level=gamification.get("level", 1),
            current_streak=streaks.get("current", 0),
            longest_streak=streaks.get("longest", 0),
            last_active_at=student.last_active_at,
            sessions_this_week=sessions_by_student.get(student.id, 0),
            study_time_this_week_minutes=time_by_student.get(student.id, 0) or 0,
        ))

    return summaries
```

### Frontend Fix: Zod Validation

**Current (Unsafe):**
```typescript
// frontend/src/lib/api/parent-dashboard.ts:331-340
overallStrength: Number(
  (response.foundation_strength as Record<string, unknown>)?.overall_strength ?? 0
)
```

**Recommended: Add Zod schemas**
```typescript
// frontend/src/lib/api/schemas/parent-dashboard.ts
import { z } from 'zod';

export const FoundationStrengthSchema = z.object({
  overall_strength: z.number().min(0).max(100),
  strongest_strands: z.array(z.string()),
  weakest_strands: z.array(z.string()),
  blocking_gaps: z.array(z.string()),
});

export const StudentProgressResponseSchema = z.object({
  student: StudentSummarySchema,
  weekly_stats: WeeklyStatsSchema,
  subject_progress: z.array(SubjectProgressSchema),
  foundation_strength: FoundationStrengthSchema.nullable(),
});

// Usage in API function
export async function getStudentProgress(studentId: string): Promise<StudentProgress> {
  const response = await apiClient.get(`/parent/students/${studentId}/progress`);
  const validated = StudentProgressResponseSchema.parse(response.data);
  return transformStudentProgress(validated);
}
```

---

## Test Coverage Gaps

### Backend API Integration Tests

**Current State:** Tests check method signatures, not actual HTTP requests

**Recommended Test Cases:**

```python
# backend/tests/api/test_parent_dashboard_integration.py

import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_get_dashboard_requires_auth(client: AsyncClient):
    """Dashboard endpoint requires authentication."""
    response = await client.get("/api/v1/parent/dashboard")
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_get_student_progress_ownership(
    client: AsyncClient,
    auth_headers: dict,
    other_parent_student_id: str
):
    """Cannot access another parent's student."""
    response = await client.get(
        f"/api/v1/parent/students/{other_parent_student_id}/progress",
        headers=auth_headers
    )
    assert response.status_code == 403

@pytest.mark.asyncio
async def test_create_goal_validates_student_ownership(
    client: AsyncClient,
    auth_headers: dict,
    other_parent_student_id: str
):
    """Cannot create goal for another parent's student."""
    response = await client.post(
        "/api/v1/parent/goals",
        headers=auth_headers,
        json={
            "student_id": other_parent_student_id,
            "title": "Test Goal",
            "target_mastery": 80
        }
    )
    assert response.status_code in (403, 404)
```

### Framework Isolation Tests

```python
@pytest.mark.asyncio
async def test_curriculum_filtered_by_framework(
    client: AsyncClient,
    nsw_student_id: str,
    vic_outcomes: list
):
    """NSW student should not see VIC curriculum outcomes."""
    response = await client.get(
        f"/api/v1/parent/students/{nsw_student_id}/progress",
        headers=auth_headers
    )
    data = response.json()

    # Verify no VIC outcomes in response
    for subject in data["subject_progress"]:
        for outcome in subject.get("current_focus_outcomes", []):
            assert not outcome.startswith("VC")  # VIC outcome prefix
```

---

## Curriculum Alignment

### Framework Isolation Status

| Query | Framework Filter | Status |
|-------|------------------|--------|
| Subject progress | `framework_id` in join | OK |
| Curriculum outcomes | `framework_id` filter | OK |
| HSC projections | Stage 6 only | OK |
| Pathway readiness | Stage 5 only | OK |

**Gap:** No integration tests verify framework isolation

### Stage Awareness

- **Stage 5 (Years 9-10):** Shows pathway readiness (5.1, 5.2, 5.3 for Maths)
- **Stage 6 (Years 11-12):** Shows HSC projection, ATAR contribution
- **Other stages:** Shows general progress without senior-specific features

---

## Security/Privacy Considerations

### Ownership Verification

| Component | Pattern | Coverage |
|-----------|---------|----------|
| GoalService | `parent_id` in all queries | Complete |
| NotificationService | `user_id` in all queries | Complete |
| ParentAnalyticsService | Mixed | **Gap in get_student_summary** |

### Error Response Differentiation

**Correctly implemented:**
```python
# 404 for not found
raise NotFoundError("Goal", hint="Verify the goal ID is correct")

# 403 for ownership violation
raise ForbiddenError("You do not have access to this student")
```

This prevents enumeration attacks by not revealing whether a resource exists.

### Data Exposure

| Data Type | Exposed to Parent | Status |
|-----------|-------------------|--------|
| Student progress | Yes | OK |
| AI conversation logs | No (only insights) | OK |
| Raw session data | No (only aggregates) | OK |
| Other family's data | No | OK |

---

## Dependencies

### For Security Fix
- No external dependencies
- Internal refactor only

### For Performance Fix
- No external dependencies
- Follows existing `GoalService` pattern

### For Frontend Validation
- Already has `zod` installed (used elsewhere)
- Create new schema files

### For SettingsTab
- Backend `NotificationPreference` model complete
- Backend API endpoints complete
- Only UI component needed

---

## Implementation Order

```
Week 1 (Priority 1):
├── Fix get_student_summary ownership verification
├── Add Zod validation to API responses
└── Run existing test suite to verify no regressions

Week 2 (Priority 2):
├── Implement batch query pattern in ParentAnalyticsService
├── Add HTTP integration tests
└── Implement SettingsTab component

Week 3 (Priority 3):
├── Add database-level pagination
├── Add framework isolation tests
└── Clean up code quality issues
```

---

## Open Questions

1. **SettingsTab Scope:** Should it include notification delivery testing (send test notification)?

2. **Pagination Strategy:** LIMIT/OFFSET vs cursor-based? Cursor is better for real-time data.

3. **Batch Query Performance:** Should we add a limit (e.g., max 20 students per parent)?

4. **Framework Isolation Tests:** Should these be in separate test file or integrated with existing?

---

## Sources Referenced

### QA Review
- `md/review/phase 7.md` - Comprehensive QA findings

### Backend Services
- `backend/app/services/parent_analytics_service.py` - Analytics service with N+1 issues
- `backend/app/services/goal_service.py` - Reference batch pattern implementation
- `backend/app/services/notification_service.py` - Notification management
- `backend/app/api/v1/endpoints/parent_dashboard.py` - API endpoints

### Frontend
- `frontend/src/lib/api/parent-dashboard.ts` - API client with type casting
- `frontend/src/features/parent-dashboard/` - UI components

### Tests
- `backend/tests/services/test_goal_service.py` - Unit tests
- `backend/tests/api/test_parent_dashboard.py` - API tests (structural only)
- `frontend/src/features/parent-dashboard/__tests__/` - Component tests

### Project Documentation
- `CLAUDE.md` - Project conventions
- `PROGRESS.md` - Phase completion status
- `Complete_Development_Plan.md` - Technical specifications

---

## Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Security issues | 1 HIGH, 1 MEDIUM | 0 HIGH |
| N+1 queries | 4 | 0 |
| Test count | 173 | 200+ |
| HTTP integration tests | 0 | 20+ |
| Missing components | 1 (SettingsTab) | 0 |
