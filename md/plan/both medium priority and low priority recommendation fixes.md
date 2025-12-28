# Implementation Plan: Phase 7 QA Medium and Low Priority Fixes

## Overview

This plan addresses all 8 recommendations from the Phase 7 QA review:
- 4 Medium Priority: Missing frontend tests (3) + API error message improvements (1)
- 4 Low Priority: Code cleanup, accessibility, caching, and data accuracy fixes

**Total Estimated Effort:** 20-30 hours
**Recommended Agent:** testing-qa-specialist (for tests), frontend-developer (for accessibility)

---

## Prerequisites

- [x] Phase 7 Parent Dashboard complete
- [x] Existing test patterns in GoalsTab.test.tsx and ProgressTab.test.tsx
- [x] Vitest and React Testing Library configured
- [x] Study document completed (`md/study/both medium priority and low priority recommendations.md`)

---

## Phase 1: Quick Wins (Low Priority Code Cleanup)

**Estimated Time:** 1 hour
**Files to Modify:** 2

### Task 1.1: Fix Unused `_trajectory` Parameter
**File:** `frontend/src/features/parent-dashboard/components/HSCDashboard.tsx`
**Location:** Line ~200, `ExamReadinessCard` component

**Current:**
```typescript
function ExamReadinessCard({
  readiness,
  trajectory: _trajectory
}: ExamReadinessCardProps) {
```

**Change to:**
```typescript
function ExamReadinessCard({
  readiness,
  trajectory
}: ExamReadinessCardProps) {
  // Add TrajectoryIndicator alongside readiness
  return (
    <Card>
      {/* ... existing content ... */}
      <div className="flex items-center gap-2">
        <span>{readiness}%</span>
        {trajectory && <TrajectoryIndicator trajectory={trajectory} />}
      </div>
    </Card>
  );
}
```

**Acceptance Criteria:**
- [ ] Parameter is used (not prefixed with underscore)
- [ ] Trajectory indicator displays when trajectory data exists
- [ ] No linting warnings about unused variables

---

## Phase 2: Accessibility Improvements (Low Priority)

**Estimated Time:** 1.5 hours
**Files to Modify:** 2

### Task 2.1: Add aria-labels to NotificationsTab
**File:** `frontend/src/features/parent-dashboard/components/NotificationsTab.tsx`

**Changes Required:**

1. Filter select dropdown:
```typescript
<select
  aria-label="Filter notifications by type"
  value={filter}
  onChange={(e) => setFilter(e.target.value)}
  className="..."
>
```

2. Unread-only checkbox:
```typescript
<input
  type="checkbox"
  id="unread-only"
  aria-label="Show unread notifications only"
  checked={unreadOnly}
  onChange={(e) => setUnreadOnly(e.target.checked)}
/>
<label htmlFor="unread-only">Unread only</label>
```

### Task 2.2: Add aria-expanded to InsightsTab
**File:** `frontend/src/features/parent-dashboard/components/InsightsTab.tsx`

**Changes Required for InsightSection component:**
```typescript
<button
  aria-expanded={isExpanded}
  aria-controls={`insight-section-${sectionId}`}
  onClick={() => setIsExpanded(!isExpanded)}
  className="..."
>
  {/* button content */}
</button>
<div
  id={`insight-section-${sectionId}`}
  hidden={!isExpanded}
>
  {/* collapsible content */}
</div>
```

**Same pattern for TalkingPointsSection.**

**Acceptance Criteria:**
- [ ] All interactive elements have aria-labels
- [ ] Expandable sections have aria-expanded and aria-controls
- [ ] No accessibility audit warnings
- [ ] Screen reader announces state changes

---

## Phase 3: Frontend Test Coverage (Medium Priority)

**Estimated Time:** 15-20 hours
**Files to Create:** 3 test files

### Task 3.1: NotificationsTab.test.tsx
**File:** `frontend/src/features/parent-dashboard/__tests__/NotificationsTab.test.tsx`

**Test Cases to Implement:**

```typescript
describe('NotificationsTab', () => {
  // Rendering Tests
  describe('rendering', () => {
    it('shows loading spinner while fetching notifications');
    it('renders notification list when data loads');
    it('displays empty state when no notifications');
    it('shows error message with retry button on failure');
  });

  // Filtering Tests
  describe('filtering', () => {
    it('filters notifications by type when filter changes');
    it('shows only unread notifications when toggle enabled');
    it('combines type filter with unread filter');
    it('resets to all notifications when "all" selected');
  });

  // Notification Card Tests
  describe('NotificationCard', () => {
    it('renders milestone notification with correct icon and color');
    it('renders streak notification with correct styling');
    it('renders goal_achieved notification correctly');
    it('renders struggle_alert notification with warning style');
    it('displays relative time (e.g., "2 hours ago")');
    it('shows unread indicator for unread notifications');
  });

  // Actions Tests
  describe('actions', () => {
    it('marks single notification as read on click');
    it('marks all notifications as read when button clicked');
    it('shows optimistic update while marking as read');
    it('reverts on error when mark as read fails');
  });

  // Data Preview Tests
  describe('NotificationDataPreview', () => {
    it('renders goal achievement data correctly');
    it('renders milestone data with flashcard count');
    it('renders struggle alert with subject info');
    it('handles missing data gracefully');
  });
});
```

**Estimated:** 15-18 test cases

### Task 3.2: InsightsTab.test.tsx
**File:** `frontend/src/features/parent-dashboard/__tests__/InsightsTab.test.tsx`

**Test Cases to Implement:**

```typescript
describe('InsightsTab', () => {
  // Loading & Error States
  describe('states', () => {
    it('shows loading spinner during insights generation');
    it('displays error message with retry on failure');
    it('shows empty state when no insights available');
  });

  // Weekly Insights Display
  describe('weekly insights', () => {
    it('renders summary card with week dates');
    it('displays wins section with achievements');
    it('displays areas to watch with concerns');
    it('renders recommendations section');
  });

  // Expandable Sections
  describe('expandable sections', () => {
    it('collapses section by default');
    it('expands section on button click');
    it('toggles aria-expanded attribute');
    it('announces state change to screen readers');
  });

  // Conditional Rendering
  describe('conditional content', () => {
    it('shows pathway readiness for Stage 5 students');
    it('shows HSC projection for Stage 6 students');
    it('hides pathway section for non-Stage 5 students');
    it('hides HSC section for non-Stage 6 students');
  });

  // Regenerate Functionality
  describe('regenerate', () => {
    it('shows loading state during regeneration');
    it('calls API with force flag on regenerate click');
    it('updates insights after successful regeneration');
  });

  // Teacher Talking Points
  describe('talking points', () => {
    it('renders list of talking points');
    it('expands/collapses talking points section');
    it('handles empty talking points gracefully');
  });
});
```

**Estimated:** 18-22 test cases

### Task 3.3: HSCDashboard.test.tsx
**File:** `frontend/src/features/parent-dashboard/__tests__/HSCDashboard.test.tsx`

**Test Cases to Implement:**

```typescript
// Mock Recharts components
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="chart-container">{children}</div>,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Cell: () => null,
}));

describe('HSCDashboard', () => {
  // Loading & Error
  describe('states', () => {
    it('shows loading spinner while fetching HSC data');
    it('displays "HSC Data Not Available" on error');
    it('renders dashboard when data loads');
  });

  // Countdown Card
  describe('CountdownCard', () => {
    it('displays days until HSC exams');
    it('shows red color when less than 30 days');
    it('shows yellow color when less than 90 days');
    it('shows green color when more than 90 days');
  });

  // ATAR Projection
  describe('ATARProjectionCard', () => {
    it('displays predicted ATAR range');
    it('shows trajectory indicator (improving/declining/stable)');
    it('renders confidence level');
  });

  // Exam Readiness
  describe('ExamReadinessCard', () => {
    it('renders progress bar with correct percentage');
    it('has proper ARIA attributes for accessibility');
    it('shows trajectory indicator when available');
    it('displays readiness label (e.g., "Good Progress")');
  });

  // Subject Band Chart
  describe('SubjectBandChart', () => {
    it('renders bar chart with Recharts');
    it('displays subject names on X axis');
    it('shows band predictions for each subject');
    it('handles empty subject list');
  });

  // Strengths & Focus Areas
  describe('StrengthsCard and FocusAreasCard', () => {
    it('renders list of strengths');
    it('renders list of focus areas');
    it('handles empty strengths gracefully');
    it('handles empty focus areas gracefully');
  });

  // Recommendations
  describe('HSCRecommendations', () => {
    it('generates recommendations based on readiness');
    it('shows urgent recommendations when readiness low');
    it('shows maintenance recommendations when readiness high');
  });

  // Helper Functions
  describe('helper functions', () => {
    it('getReadinessColor returns correct color codes');
    it('getReadinessLabel returns appropriate labels');
    it('getBandColor returns correct band colors');
  });
});
```

**Estimated:** 16-20 test cases

---

## Phase 4: Backend Improvements (Medium + Low Priority)

**Estimated Time:** 4-5 hours
**Files to Modify:** 2

### Task 4.1: Improve API Error Messages
**File:** `backend/app/api/v1/endpoints/parent_dashboard.py`

**Create standardized error format:**
```python
from typing import TypedDict

class ErrorDetail(TypedDict):
    error: str
    resource_type: str
    message: str
    hint: str | None

def not_found_error(resource_type: str, hint: str | None = None) -> HTTPException:
    """Create standardized 404 error."""
    return HTTPException(
        status_code=404,
        detail={
            "error": "not_found",
            "resource_type": resource_type,
            "message": f"{resource_type.title()} not found or not accessible",
            "hint": hint or f"Verify the {resource_type} ID and your access permissions"
        }
    )

def forbidden_error(resource_type: str) -> HTTPException:
    """Create standardized 403 error."""
    return HTTPException(
        status_code=403,
        detail={
            "error": "forbidden",
            "resource_type": resource_type,
            "message": f"Access denied to this {resource_type}",
            "hint": "You can only access resources belonging to your account"
        }
    )
```

**Apply to endpoints:**
- [ ] GET /goals/{goal_id}
- [ ] PUT /goals/{goal_id}
- [ ] DELETE /goals/{goal_id}
- [ ] POST /goals/{goal_id}/check-achievement
- [ ] GET /students/{student_id}/progress
- [ ] GET /students/{student_id}/insights
- [ ] POST /notifications/{notification_id}/read
- [ ] All other 404/403 error locations

**Acceptance Criteria:**
- [ ] All error responses follow consistent format
- [ ] No sensitive information in error messages
- [ ] Helpful hints guide debugging without leaking data

### Task 4.2: Add Framework Caching
**File:** `backend/app/services/parent_analytics_service.py`

**Implementation:**
```python
class ParentAnalyticsService:
    """Service for parent dashboard analytics."""

    # Class-level cache for frameworks (shared across instances)
    _framework_cache: dict[UUID, tuple[CurriculumFramework, float]] = {}
    _cache_ttl: float = 3600.0  # 1 hour

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def _get_framework_cached(
        self, framework_id: UUID
    ) -> CurriculumFramework | None:
        """Get framework with caching."""
        import time

        now = time.time()
        if framework_id in self._framework_cache:
            framework, cached_at = self._framework_cache[framework_id]
            if now - cached_at < self._cache_ttl:
                return framework

        framework = await self.db.get(CurriculumFramework, framework_id)
        if framework:
            self._framework_cache[framework_id] = (framework, now)
        return framework

    @classmethod
    def clear_cache(cls) -> None:
        """Clear the framework cache (for testing/admin)."""
        cls._framework_cache.clear()
```

**Update usage in `get_student_progress`:**
```python
# Before
framework = await self.db.get(CurriculumFramework, student_obj.framework_id)

# After
framework = await self._get_framework_cached(student_obj.framework_id)
```

**Acceptance Criteria:**
- [ ] Framework lookups use cache
- [ ] Cache expires after TTL
- [ ] Cache can be cleared for testing
- [ ] No performance regression

---

## Phase 5: Data Accuracy Enhancement (Low Priority)

**Estimated Time:** 2-3 hours
**Files to Modify:** 3 (backend schema, backend service, frontend component)

### Task 5.1: Replace Mock Subject Data in HSCDashboard

**Backend Schema Update:**
```python
# In backend/app/schemas/parent_dashboard.py

class SubjectBandPrediction(BaseSchema):
    """Predicted band for a subject."""
    subject_id: str
    subject_code: str
    subject_name: str
    predicted_band: int = Field(ge=1, le=6)
    target_band: int = Field(ge=1, le=6)
    current_mastery: Decimal
    confidence: Decimal | None = None

class HSCProjection(BaseSchema):
    """HSC projection data."""
    # existing fields...
    subject_predictions: list[SubjectBandPrediction] = []
```

**Backend Service Update:**
In `parent_analytics_service.py`, add band prediction calculation:
```python
async def _calculate_subject_bands(
    self, student_id: UUID, subject_progress: list[SubjectProgress]
) -> list[SubjectBandPrediction]:
    """Calculate band predictions based on mastery levels."""
    predictions = []
    for sp in subject_progress:
        # Convert mastery (0-100) to band (1-6)
        # Band 6: 90-100%, Band 5: 80-89%, etc.
        mastery = float(sp.mastery_level)
        if mastery >= 90:
            predicted_band = 6
        elif mastery >= 80:
            predicted_band = 5
        elif mastery >= 70:
            predicted_band = 4
        elif mastery >= 60:
            predicted_band = 3
        elif mastery >= 50:
            predicted_band = 2
        else:
            predicted_band = 1

        predictions.append(SubjectBandPrediction(
            subject_id=str(sp.subject_id),
            subject_code=sp.subject_code,
            subject_name=sp.subject_name,
            predicted_band=predicted_band,
            target_band=5,  # Default target, could be student preference
            current_mastery=sp.mastery_level,
        ))
    return predictions
```

**Frontend Update:**
In `HSCDashboard.tsx`, replace mock data:
```typescript
// Replace mock data with API data
const subjectData = projection.subjectPredictions?.map(sp => ({
  subject: sp.subjectName,
  band: sp.predictedBand,
  target: sp.targetBand,
})) ?? [];
```

**Acceptance Criteria:**
- [ ] Subject bands calculated from actual mastery
- [ ] Student's enrolled subjects displayed (not hardcoded)
- [ ] Band prediction logic documented
- [ ] Chart updates when student data changes

---

## Phase 6: Verification

### Task 6.1: Run All Tests
```bash
# Backend tests
cd backend && pytest tests/ -v

# Frontend tests
cd frontend && npm run test

# Specific new tests
cd frontend && npm run test -- --grep "NotificationsTab|InsightsTab|HSCDashboard"
```

### Task 6.2: Accessibility Audit
```bash
# Run accessibility checks
cd frontend && npm run test:a11y  # If configured
# Or manual check with browser dev tools
```

### Task 6.3: Performance Check
- [ ] Verify framework caching reduces DB queries
- [ ] Check dashboard load time before/after caching

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Test flakiness with async operations | Medium | Use proper waitFor and act wrappers |
| Cache staleness | Low | 1-hour TTL, can force refresh |
| Accessibility regressions | Low | Run a11y audit before merge |
| Breaking changes to HSC data | Low | Feature flag or gradual rollout |

---

## Privacy/Security Checklist

- [x] Error messages don't leak sensitive data
- [x] No enumeration attacks possible via error differences
- [x] Cache doesn't expose cross-user data
- [x] All changes maintain existing ownership verification

---

## Estimated Complexity

**Overall: Medium**

- Quick wins (Phase 1-2): Simple, low risk
- Test coverage (Phase 3): Medium, time-intensive
- Backend improvements (Phase 4): Simple, well-defined
- Data enhancement (Phase 5): Medium, requires coordination

---

## Dependencies on Other Features

- None - these are improvements to existing Phase 7 functionality

---

## Implementation Order

| Order | Task | Effort | Priority | Blocking |
|-------|------|--------|----------|----------|
| 1 | Fix unused _trajectory | 0.5h | Low | None |
| 2 | Add aria-labels | 1.5h | Low | None |
| 3 | NotificationsTab tests | 5h | Medium | Tasks 1-2 |
| 4 | InsightsTab tests | 6h | Medium | Task 2 |
| 5 | HSCDashboard tests | 6h | Medium | Task 1 |
| 6 | API error messages | 2h | Medium | None |
| 7 | Framework caching | 1.5h | Low | None |
| 8 | Real subject data | 3h | Low | None |

---

## Recommended Agent Assignment

- **Tasks 1-5**: `testing-qa-specialist` or `frontend-developer`
- **Tasks 6-7**: `backend-architect`
- **Task 8**: `full-stack-developer` (spans backend + frontend)

---

## Success Metrics

- [ ] All 3 new test files created with 50+ combined test cases
- [ ] Test coverage for parent-dashboard components > 80%
- [ ] Zero accessibility warnings in audit
- [ ] Framework cache hit rate > 90%
- [ ] HSCDashboard displays real student subjects
