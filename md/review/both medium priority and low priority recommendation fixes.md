# QA Review: Phase 7 Medium and Low Priority Recommendation Fixes

**Review Date:** 2025-12-28
**Reviewer:** Claude Code QA
**Status:** PASS

---

## Summary

This review covers the Phase 7 medium and low priority fixes across frontend and backend:

### Frontend Changes
1. **HSCDashboard.tsx** - Trajectory parameter handling (no unused parameter issue found)
2. **NotificationsTab.tsx** - Accessibility improvements with aria-labels
3. **InsightsTab.tsx** - Accessibility improvements with aria-expanded attributes
4. **New Test Files** - Comprehensive test coverage for all three components

### Backend Changes
1. **app/core/exceptions.py** - Enhanced NotFoundError with hint parameter
2. **app/api/v1/endpoints/parent_dashboard.py** - Improved error messages with hints
3. **app/services/parent_analytics_service.py** - Framework caching implementation

**Overall Assessment:** All changes are well-implemented, follow project conventions, and address the identified issues appropriately.

---

## Security Findings

| Severity | Location | Issue | Status |
|----------|----------|-------|--------|
| NONE | exceptions.py | NotFoundError properly sanitises identifiers | PASS |
| NONE | exceptions.py | User-provided data never included in error messages | PASS |
| NONE | parent_dashboard.py | Hints use generic guidance, no PII exposure | PASS |
| NONE | parent_dashboard.py | All endpoints verify ownership before access | PASS |
| NONE | Frontend | No sensitive data in client-side error messages | PASS |

### Security Analysis

#### Backend NotFoundError Enhancement
```python
class NotFoundError(AppException):
    def __init__(
        self,
        resource: str,
        identifier: str | None = None,
        hint: str | None = None,
    ):
        # Sanitize - don't include user-provided identifier in message
        message = f"{resource} not found or not accessible"
        details: dict[str, Any] = {"resource_type": resource}
        if hint:
            details["hint"] = hint
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            error_code=ErrorCode.NOT_FOUND,
            message=message,
            details=details if identifier is None else None,
        )
```

**Strengths:**
- User-provided identifier is deliberately excluded from error message
- Message uses safe, generic text: "not found or not accessible"
- Hint only appears in details when no identifier is provided
- This prevents enumeration attacks and PII leakage

#### Parent Dashboard Error Hints
The hints added to parent_dashboard.py are all generic guidance:
- "Verify the student ID is correct and belongs to your account"
- "Verify the goal ID is correct and you have access to it"
- "Verify the notification ID is correct and belongs to your account"

**These are safe because:**
1. No user-provided data is echoed back
2. No information about whether a resource exists is disclosed
3. Hints provide actionable guidance without revealing system internals

---

## Code Quality Issues

| Severity | File | Issue | Status |
|----------|------|-------|--------|
| LOW | HSCDashboard.tsx | Mock subject data should come from API | ACKNOWLEDGED |
| INFO | InsightsTab.tsx | Uses string-based trajectory checking | ACCEPTABLE |
| INFO | NotificationsTab.tsx | studentId prop unused (prefixed with _) | ACCEPTABLE |
| INFO | parent_analytics_service.py | Class-level cache needs careful management | IMPLEMENTED CORRECTLY |

### Frontend Code Quality

#### HSCDashboard.tsx Analysis

**Reviewed Component: ExamReadinessCard**
```typescript
interface ExamReadinessCardProps {
  readiness: number;
  trajectory: string;
}

function ExamReadinessCard({ readiness, trajectory }: ExamReadinessCardProps) {
  const readinessColor = getReadinessColor(readiness);
  const readinessLabel = getReadinessLabel(readiness);
  // ... component uses trajectory in TrajectoryIndicator
```

**Finding:** The `trajectory` parameter is properly used in the component. It is passed to `TrajectoryIndicator` component. No unused parameter issue exists.

**Accessibility Improvements:**
- Progress bar has proper ARIA attributes (`role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`)
- Chart has accessible description

#### NotificationsTab.tsx Analysis

**Accessibility Improvements:**
```typescript
<select
  aria-label="Filter notifications by type"
  value={filter}
  onChange={(e) => setFilter(e.target.value as NotificationType)}
  // ...
>

<input
  type="checkbox"
  aria-label="Show unread notifications only"
  checked={showUnreadOnly}
  // ...
/>

<button
  onClick={onMarkRead}
  disabled={isMarking}
  title="Mark as read"
  aria-label="Mark notification as read"
>
```

**WCAG 2.1 AA Compliance:**
- Form controls have accessible names via aria-label
- Interactive elements have visible focus states
- Colour is not the only means of conveying information

#### InsightsTab.tsx Analysis

**Accessibility Improvements:**
```typescript
<button
  aria-expanded={isExpanded}
  aria-controls={sectionId}
  aria-label={isExpanded ? `Collapse ${title}` : `Expand ${title}`}
  className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50"
  onClick={() => setIsExpanded(!isExpanded)}
>
```

**Collapsible Sections Pattern:**
- `aria-expanded` properly indicates open/closed state
- `aria-controls` links button to controlled content
- Dynamic `aria-label` describes action based on state
- Content has matching `id` for `aria-controls`

### Backend Code Quality

#### exceptions.py Analysis

**Type Hints:** Fully typed with proper Python 3.11+ syntax
```python
def __init__(
    self,
    resource: str,
    identifier: str | None = None,
    hint: str | None = None,
):
```

**Error Response Structure:**
- Consistent with existing ErrorResponse schema
- Properly uses ErrorCode enum
- Follows project conventions

#### parent_analytics_service.py Caching Analysis

```python
class ParentAnalyticsService:
    # Instance-level framework cache to avoid repeated lookups within same request
    _framework_cache: dict[UUID, str | None] = {}

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        # Clear cache for each new service instance (per-request)
        self._framework_cache = {}
```

**Issue Analysis:**
The class-level type annotation `_framework_cache: dict[UUID, str | None] = {}` creates a class variable, but the `__init__` properly reinitialises it as an instance variable. This is correct behaviour.

**Cache Implementation Quality:**
```python
async def _get_framework_code_cached(self, framework_id: UUID | None) -> str | None:
    if not framework_id:
        return None

    if framework_id in self._framework_cache:
        return self._framework_cache[framework_id]

    from app.models.curriculum_framework import CurriculumFramework

    framework = await self.db.get(CurriculumFramework, framework_id)
    code = framework.code if framework else None
    self._framework_cache[framework_id] = code
    return code
```

**Strengths:**
- Handles None framework_id gracefully
- Uses lazy import to avoid circular dependencies
- Caches both positive results and None (prevents repeated lookups)
- Per-request caching is appropriate for this use case

---

## Test Coverage Assessment

### New Test Files

| File | Tests | Coverage Areas |
|------|-------|----------------|
| HSCDashboard.test.tsx | 22 tests | Rendering, countdown, readiness, bands, trajectory, errors |
| NotificationsTab.test.tsx | 21 tests | Rendering, filtering, mark as read, accessibility, errors |
| InsightsTab.test.tsx | 26 tests | Rendering, wins, areas, recommendations, pathway, HSC, errors |

### Test Quality Analysis

#### HSCDashboard.test.tsx

**Strengths:**
- Mocks Recharts components to avoid rendering issues
- Tests multiple scenarios (normal, urgent, high band, no HSC)
- Verifies trajectory indicators (improving, declining, stable)
- Tests error handling for API failures
- Tests colour assignments for different readiness levels

**Coverage:**
- Loading states
- Error states
- Data rendering
- Conditional rendering (no HSC projection)
- Helper function behaviour (colours, labels)

#### NotificationsTab.test.tsx

**Strengths:**
- Tests all notification types (milestone, streak, goal, alert)
- Verifies filtering functionality
- Tests mark as read (individual and all)
- Tests accessibility attributes (aria-labels)
- Verifies empty states

**Coverage:**
- Loading states
- Rendering notification data
- Notification data previews (goal, milestone, struggle alert, streak)
- Filter controls with accessibility
- Mark as read functionality
- Error handling

#### InsightsTab.test.tsx

**Strengths:**
- Tests aria-expanded toggle behaviour
- Tests pathway readiness (Stage 5)
- Tests HSC projection (Stage 6)
- Tests recommendations section
- Tests regenerate functionality

**Coverage:**
- Loading states with message
- Summary display
- Wins section with count
- Areas to watch section
- Recommendations with time estimates
- Teacher talking points (collapsed by default)
- Pathway readiness (when available)
- HSC projection (when available)
- Regenerate API call
- Error handling with retry

---

## Accessibility Review

### WCAG 2.1 AA Compliance

| Criterion | Component | Status |
|-----------|-----------|--------|
| 1.1.1 Non-text Content | HSCDashboard chart | PASS (aria-label) |
| 1.3.1 Info and Relationships | InsightsTab sections | PASS (aria-controls) |
| 2.1.1 Keyboard | All components | PASS (focusable) |
| 4.1.2 Name, Role, Value | NotificationsTab controls | PASS (aria-label) |
| 4.1.2 Name, Role, Value | InsightsTab expandables | PASS (aria-expanded) |

### Accessibility Improvements Summary

1. **NotificationsTab.tsx:**
   - Filter select: `aria-label="Filter notifications by type"`
   - Unread checkbox: `aria-label="Show unread notifications only"`
   - Mark read button: `aria-label="Mark notification as read"`

2. **InsightsTab.tsx:**
   - Section buttons: `aria-expanded`, `aria-controls`, dynamic `aria-label`
   - Content sections: matching `id` attributes

3. **HSCDashboard.tsx:**
   - Progress bar: `role="progressbar"` with full ARIA attributes
   - Chart: `role="img"` with `aria-label` describing data

---

## Performance Implications

### Backend Framework Caching

**Before:** Each call to `get_student_progress` would query the `curriculum_frameworks` table separately.

**After:** Framework codes are cached per-request in `_framework_cache`.

**Impact:**
- Reduces database queries for students with same framework
- Cache is cleared per-request (no stale data issues)
- Memory overhead is negligible (small dict of UUID -> string)

**Recommendation:** Consider moving to a shared cache (Redis) if framework codes are frequently accessed across requests.

### Frontend Query Optimisation

The test files confirm proper use of React Query with stale times:
- Insights: 5 minutes stale time
- Notifications: 2 minutes stale time (more responsive)

---

## Recommendations

### Completed (No Action Needed)

1. **Accessibility aria-labels** - Properly implemented
2. **NotFoundError hints** - Generic and safe
3. **Framework caching** - Appropriate per-request implementation
4. **Test coverage** - Comprehensive for new components

### Future Considerations

| Priority | Recommendation | Rationale |
|----------|----------------|-----------|
| LOW | Add HSC projection subject data from API | Currently uses mock data in SubjectBandChart |
| LOW | Consider global framework cache | If framework lookups become bottleneck |
| INFO | Add E2E tests for accessibility | Verify screen reader compatibility |

---

## Files Reviewed

### Frontend

| File | Path | Lines |
|------|------|-------|
| HSCDashboard.tsx | `frontend/src/features/parent-dashboard/components/HSCDashboard.tsx` | 563 |
| NotificationsTab.tsx | `frontend/src/features/parent-dashboard/components/NotificationsTab.tsx` | 364 |
| InsightsTab.tsx | `frontend/src/features/parent-dashboard/components/InsightsTab.tsx` | 504 |
| HSCDashboard.test.tsx | `frontend/src/features/parent-dashboard/__tests__/HSCDashboard.test.tsx` | 370 |
| NotificationsTab.test.tsx | `frontend/src/features/parent-dashboard/__tests__/NotificationsTab.test.tsx` | 356 |
| InsightsTab.test.tsx | `frontend/src/features/parent-dashboard/__tests__/InsightsTab.test.tsx` | 480 |

### Backend

| File | Path | Lines |
|------|------|-------|
| exceptions.py | `backend/app/core/exceptions.py` | 218 |
| parent_dashboard.py | `backend/app/api/v1/endpoints/parent_dashboard.py` | 676 |
| parent_analytics_service.py | `backend/app/services/parent_analytics_service.py` | 642 |

---

## Conclusion

All Phase 7 medium and low priority fixes have been properly implemented:

1. **Security:** Error messages and hints do not expose PII or enable enumeration attacks
2. **Accessibility:** WCAG 2.1 AA compliance improvements correctly implemented
3. **Performance:** Framework caching appropriately scoped to per-request
4. **Testing:** Comprehensive test coverage for all new functionality
5. **Code Quality:** Follows project conventions and TypeScript/Python best practices

**Verdict: PASS**

No blocking issues identified. The codebase is ready for continued development.
