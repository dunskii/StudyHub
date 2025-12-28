# Study: Phase 7 QA Medium and Low Priority Recommendations

## Summary

This document analyses the 8 recommendations from the Phase 7 QA review (4 medium priority, 4 low priority) and provides technical approaches, effort estimates, and implementation guidance for each.

**Total Estimated Effort:** 20-30 hours

---

## Medium Priority Issues

### 1. Missing Tests for NotificationsTab

**Location:** `frontend/src/features/parent-dashboard/components/NotificationsTab.tsx` (~362 lines)

**Current State:**
- Component exists with 3 sub-components: `NotificationCard`, `NotificationDataPreview`
- Helper functions: `getNotificationStyle()`, `getNotificationTypeLabel()`, `formatTimeAgo()`
- No dedicated test file exists

**Key Features to Test:**
- Loading state display
- Error handling with retry
- Notification filtering (7 types: all, milestone, streak, goal_achieved, struggle_alert, weekly_summary, insight)
- Unread-only toggle filtering
- Mark as read functionality (single and batch)
- Empty state handling
- Notification card rendering with correct icons/colors
- Data preview for different notification types
- Relative time formatting

**Test Pattern to Follow:**
From `GoalsTab.test.tsx`:
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

vi.mock('@/lib/api');

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
};
```

**Estimated Effort:** 4-6 hours (~15-20 test cases)

---

### 2. Missing Tests for InsightsTab

**Location:** `frontend/src/features/parent-dashboard/components/InsightsTab.tsx` (~496 lines)

**Current State:**
- Main component with 5 sub-components: `InsightSection`, `RecommendationsSection`, `TalkingPointsSection`, `PathwayReadinessSection`, `HSCProjectionSection`
- Expandable/collapsible sections
- Conditional rendering based on student stage (Stage 5 vs Stage 6)

**Key Features to Test:**
- Loading state during insights generation
- Error handling and retry functionality
- Weekly insights data display
- Expandable section toggle (aria-expanded needed)
- Wins and areas to watch sections
- Recommendations rendering
- Teacher talking points
- Stage 5 pathway readiness (conditional)
- Stage 6 HSC projection (conditional)
- Regenerate functionality with loading state
- Empty states

**Accessibility Issue Found:**
Expandable sections missing `aria-expanded` attribute:
```typescript
// Current - missing aria-expanded
<button onClick={() => setIsExpanded(!isExpanded)}>

// Required
<button
  aria-expanded={isExpanded}
  aria-label={isExpanded ? "Collapse section" : "Expand section"}
  onClick={() => setIsExpanded(!isExpanded)}
>
```

**Estimated Effort:** 5-7 hours (~18-22 test cases)

---

### 3. Missing Tests for HSCDashboard

**Location:** `frontend/src/features/parent-dashboard/components/HSCDashboard.tsx` (~560 lines)

**Current State:**
- Complex component with Recharts integration
- 9 sub-components: `CountdownCard`, `ATARProjectionCard`, `ExamReadinessCard`, `BandPredictionCard`, `SubjectBandChart`, `StrengthsCard`, `FocusAreasCard`, `HSCRecommendations`, `TrajectoryIndicator`
- Multiple helper functions for colors and labels

**Key Features to Test:**
- Loading state
- Error state ("HSC Data Not Available")
- Countdown card with urgency colors
- ATAR projection with trajectory indicator
- Exam readiness progress bar (ARIA attributes present)
- Band prediction visual indicators
- Subject band chart (currently uses mock data)
- Strengths and focus areas
- HSC recommendations generation
- Color and label helper functions

**Test Pattern for Recharts:**
From `ProgressTab.test.tsx`:
```typescript
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
}));
```

**Estimated Effort:** 5-7 hours (~16-20 test cases)

---

### 4. API Error Messages Could Be More Specific

**Location:** `backend/app/api/v1/endpoints/parent_dashboard.py`

**Current State:**
```python
# Generic errors like:
raise HTTPException(status_code=404, detail="Goal not found")
```

**Improved Pattern:**
```python
# More specific with context:
raise HTTPException(
    status_code=404,
    detail={
        "error": "resource_not_found",
        "resource_type": "goal",
        "message": f"Goal not found or not accessible",
        "hint": "Verify the goal ID and that you have access to this goal"
    }
)
```

**Security Consideration:**
- Do NOT include resource IDs in error messages (prevents enumeration attacks)
- Do NOT reveal whether resource exists vs unauthorized
- Keep messages helpful but vague about exact reason

**Endpoints to Update:**
- GET/PUT/DELETE /goals/{goal_id}
- GET /students/{student_id}/progress
- GET /students/{student_id}/insights
- POST/DELETE /notifications/{notification_id}/read
- All endpoints with 404/403 responses (~15-20 locations)

**Estimated Effort:** 2-3 hours

---

## Low Priority Issues

### 5. Unused `_trajectory` Parameter

**Location:** `HSCDashboard.tsx`, line 200, `ExamReadinessCard` component

**Current Code:**
```typescript
function ExamReadinessCard({
  readiness,
  trajectory: _trajectory  // Received but never used
}: ExamReadinessCardProps) {
  const readinessColor = getReadinessColor(readiness);
  // _trajectory is ignored
}
```

**Options:**
1. **Remove parameter** if not needed
2. **Use parameter** to show trajectory alongside readiness (recommended)

**Recommended Implementation:**
```typescript
function ExamReadinessCard({ readiness, trajectory }: ExamReadinessCardProps) {
  const readinessColor = getReadinessColor(readiness);
  const readinessLabel = getReadinessLabel(readiness);

  return (
    <Card>
      {/* Existing readiness display */}
      <div className="flex items-center gap-2">
        <span>{readiness}%</span>
        {trajectory && (
          <TrajectoryIndicator trajectory={trajectory} />
        )}
      </div>
    </Card>
  );
}
```

**Estimated Effort:** 15-30 minutes

---

### 6. Consider Caching Framework Lookups

**Location:** `backend/app/services/parent_analytics_service.py`, line 469

**Current Code:**
```python
# Called every time get_student_progress() runs
framework = await self.db.get(CurriculumFramework, student_obj.framework_id)
```

**Caching Options:**

**Option 1: functools.lru_cache (in-memory)**
```python
from functools import lru_cache

@lru_cache(maxsize=32)
def _get_framework_code(framework_id: UUID) -> str | None:
    """Get framework code with caching."""
    # Note: Can't use async with lru_cache directly
    # Need synchronous lookup or alternative
```

**Option 2: Simple dict cache (per-request)**
```python
class ParentAnalyticsService:
    _framework_cache: dict[UUID, CurriculumFramework] = {}

    async def _get_framework_cached(self, framework_id: UUID) -> CurriculumFramework | None:
        if framework_id in self._framework_cache:
            return self._framework_cache[framework_id]
        framework = await self.db.get(CurriculumFramework, framework_id)
        if framework:
            self._framework_cache[framework_id] = framework
        return framework
```

**Option 3: Redis cache (distributed)**
```python
# Project already has Redis support in config
# TTL: 3600 seconds (1 hour) - frameworks rarely change
```

**Recommended:** Option 2 (simple dict cache) for immediate improvement, Option 3 for scale.

**Estimated Effort:** 1-2 hours

---

### 7. Mock Subject Data in HSCDashboard

**Location:** `HSCDashboard.tsx`, lines 287-293

**Current Code:**
```typescript
// Mock subject data - in real app, this would come from the API
const subjectData = [
  { subject: 'English', band: projection.predictedBand, target: 5 },
  { subject: 'Maths', band: Math.min(projection.predictedBand + 1, 6), target: 5 },
  { subject: 'Physics', band: projection.predictedBand, target: 5 },
  { subject: 'Chemistry', band: Math.max(projection.predictedBand - 1, 1), target: 5 },
];
```

**Issues:**
- Hardcoded 4 subjects (not student's actual subjects)
- Mock band calculations don't reflect real mastery
- Doesn't use `subject_progress` data already available

**Real Data Approach:**

**Backend Enhancement:**
```python
# In HSCProjection schema, add:
class SubjectBandPrediction(BaseModel):
    subject_name: str
    subject_code: str
    predicted_band: int
    target_band: int
    mastery_level: Decimal

class HSCProjection(BaseModel):
    # existing fields...
    subject_predictions: list[SubjectBandPrediction]
```

**Frontend Update:**
```typescript
// Use actual data from API
const subjectData = projection.subjectPredictions.map(sp => ({
  subject: sp.subjectName,
  band: sp.predictedBand,
  target: sp.targetBand
}));
```

**Estimated Effort:** 2-3 hours (backend schema + frontend integration)

---

### 8. Some aria-labels Missing

**Locations Identified:**

**NotificationsTab.tsx (lines 129-155):**
```typescript
// Filter select - MISSING
<select value={filter} onChange={...}>

// Should be:
<select
  aria-label="Filter notifications by type"
  value={filter}
  onChange={...}
>
```

```typescript
// Checkbox - MISSING
<input type="checkbox" checked={unreadOnly} onChange={...} />

// Should be:
<input
  type="checkbox"
  aria-label="Show unread notifications only"
  checked={unreadOnly}
  onChange={...}
/>
```

**InsightsTab.tsx (expandable sections):**
```typescript
// Expandable button - MISSING aria-expanded
<button onClick={() => setIsExpanded(!isExpanded)}>

// Should be:
<button
  aria-expanded={isExpanded}
  aria-controls="section-content-id"
  onClick={() => setIsExpanded(!isExpanded)}
>
```

**Full Audit Checklist:**
- [ ] NotificationsTab filter select
- [ ] NotificationsTab unread-only checkbox
- [ ] InsightsTab InsightSection expand button
- [ ] InsightsTab TalkingPointsSection expand button
- [ ] Any other interactive elements without labels

**Estimated Effort:** 1-2 hours

---

## Implementation Priority Order

| Order | Issue | Effort | Impact | Reason |
|-------|-------|--------|--------|--------|
| 1 | Unused `_trajectory` | 0.5h | Low | Quick fix, code cleanup |
| 2 | Aria-labels | 1-2h | Medium | Accessibility compliance |
| 3 | NotificationsTab tests | 4-6h | High | Test coverage |
| 4 | InsightsTab tests | 5-7h | High | Test coverage + aria-expanded fix |
| 5 | HSCDashboard tests | 5-7h | High | Test coverage |
| 6 | API error messages | 2-3h | Medium | Developer experience |
| 7 | Framework caching | 1-2h | Medium | Performance |
| 8 | Mock subject data | 2-3h | Medium | Data accuracy |

---

## Dependencies

**For Frontend Tests:**
- Vitest (configured) ✓
- React Testing Library (configured) ✓
- @tanstack/react-query (configured) ✓
- Recharts mocking pattern in ProgressTab.test.tsx ✓

**For Backend Changes:**
- No new dependencies needed
- functools.lru_cache in stdlib
- Redis support already in config (optional)

**For Accessibility:**
- No dependencies, just attribute additions

---

## Sources Referenced

- `md/review/phase 7.md` - QA review with issue list
- `frontend/src/features/parent-dashboard/components/NotificationsTab.tsx`
- `frontend/src/features/parent-dashboard/components/InsightsTab.tsx`
- `frontend/src/features/parent-dashboard/components/HSCDashboard.tsx`
- `frontend/src/features/parent-dashboard/__tests__/GoalsTab.test.tsx`
- `frontend/src/features/parent-dashboard/__tests__/ProgressTab.test.tsx`
- `backend/app/services/parent_analytics_service.py`
- `backend/app/api/v1/endpoints/parent_dashboard.py`
- `backend/app/core/config.py` (caching infrastructure)

---

## Open Questions

1. **For mock subject data:** Should we add band prediction to the existing `get_student_progress` endpoint or create a separate HSC-specific endpoint?

2. **For caching:** Is Redis already deployed in production, or should we stick with in-memory caching initially?

3. **For error messages:** Should we standardize error response format across all API endpoints (not just parent dashboard)?
