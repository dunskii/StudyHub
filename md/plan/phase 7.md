# Implementation Plan: Phase 7 - Parent Dashboard

## Overview

Phase 7 implements the Parent Dashboard - a comprehensive progress visibility system that allows parents to monitor their children's learning journey. This follows the "progress visibility, not surveillance" philosophy, providing actionable insights while respecting student autonomy.

**Key Features:**
- Progress overview with curriculum mastery
- AI conversation review (parent oversight)
- AI-generated weekly insights
- Email notifications (Resend API)
- Goal setting & family collaboration
- HSC-specific dashboard (Years 11-12)

---

## Prerequisites

- [x] Phase 1: Foundation & Infrastructure - COMPLETE
- [x] Phase 2: Core Curriculum System - COMPLETE
- [x] Phase 3: User System & Authentication - COMPLETE
- [x] Phase 4: AI Tutoring Foundation - COMPLETE
- [x] Phase 5: Gamification & Rewards - COMPLETE
- [x] Phase 6: Revision & Spaced Repetition - COMPLETE
- [x] Existing parent AI visibility endpoints (users.py:249-438)
- [x] Resend API configured for email delivery
- [x] Claude API integrated for AI insights

---

## Phase 1: Database

### 1.1 New Tables

**Migration 015: Goals Table**
```sql
CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_outcomes TEXT[],          -- Curriculum outcome codes to focus on
    target_mastery DECIMAL(5,2),     -- Target mastery percentage (e.g., 80.00)
    target_date DATE,
    reward VARCHAR(255),             -- Family reward for achieving goal
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    achieved_at TIMESTAMPTZ,

    CONSTRAINT goals_parent_student_fk FOREIGN KEY (parent_id, student_id)
        REFERENCES students(parent_id, id) -- Ensures parent owns student
);

CREATE INDEX idx_goals_parent ON goals(parent_id);
CREATE INDEX idx_goals_student ON goals(student_id);
CREATE INDEX idx_goals_active ON goals(is_active) WHERE is_active = TRUE;
```

**Migration 016: Notifications Table**
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('achievement', 'concern', 'insight', 'reminder', 'goal_achieved')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    related_subject_id UUID REFERENCES subjects(id),
    related_goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    delivery_method VARCHAR(20) DEFAULT 'in_app' CHECK (delivery_method IN ('in_app', 'email', 'both'))
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
```

**Migration 017: Notification Preferences Table**
```sql
CREATE TABLE notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    weekly_reports BOOLEAN DEFAULT TRUE,
    achievement_alerts BOOLEAN DEFAULT TRUE,
    concern_alerts BOOLEAN DEFAULT TRUE,
    goal_reminders BOOLEAN DEFAULT TRUE,
    email_frequency VARCHAR(20) DEFAULT 'weekly' CHECK (email_frequency IN ('daily', 'weekly', 'monthly', 'never')),
    preferred_time TIME DEFAULT '18:00',
    preferred_day VARCHAR(20) DEFAULT 'sunday',
    timezone VARCHAR(50) DEFAULT 'Australia/Sydney',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Migration 018: Weekly Insights Cache Table**
```sql
CREATE TABLE weekly_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    insights JSONB NOT NULL,          -- AI-generated insights
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    sent_to_parent_at TIMESTAMPTZ,

    CONSTRAINT unique_student_week UNIQUE (student_id, week_start)
);

CREATE INDEX idx_weekly_insights_student ON weekly_insights(student_id);
CREATE INDEX idx_weekly_insights_week ON weekly_insights(week_start DESC);
```

### 1.2 Model Files to Create

- [ ] `backend/app/models/goal.py`
- [ ] `backend/app/models/notification.py`
- [ ] `backend/app/models/notification_preference.py`
- [ ] `backend/app/models/weekly_insight.py`
- [ ] Update `backend/app/models/__init__.py`

### 1.3 Migration Files

- [ ] `015_goals.py`
- [ ] `016_notifications.py`
- [ ] `017_notification_preferences.py`
- [ ] `018_weekly_insights.py`

---

## Phase 2: Backend API

### 2.1 Pydantic Schemas

**File: `backend/app/schemas/parent_dashboard.py`**

```python
# Dashboard overview
class DashboardOverviewResponse(BaseSchema):
    students: list[StudentSummary]
    total_study_time_week: int  # minutes
    total_sessions_week: int
    overall_progress: float
    unread_notifications: int

class StudentSummary(BaseSchema):
    id: UUID
    display_name: str
    grade_level: int
    school_stage: str
    total_xp: int
    level: int
    current_streak: int
    last_active_at: datetime | None

# Student progress
class StudentProgressResponse(BaseSchema):
    student_id: UUID
    overall_mastery: float
    foundation_strength: float
    weekly_stats: WeeklyStats
    subject_progress: list[SubjectProgress]

class WeeklyStats(BaseSchema):
    study_time_minutes: int
    study_goal_minutes: int
    sessions_count: int
    topics_covered: int
    mastery_improvement: float

class SubjectProgress(BaseSchema):
    subject_id: UUID
    subject_code: str
    subject_name: str
    mastery_level: float
    strand_progress: list[StrandProgress]
    recent_activity: datetime | None

class StrandProgress(BaseSchema):
    strand: str
    mastery: float
    outcomes_mastered: int
    outcomes_total: int

# Insights
class WeeklyInsightsResponse(BaseSchema):
    student_id: UUID
    week_start: date
    wins: list[InsightItem]
    areas_to_watch: list[InsightItem]
    recommendations: list[InsightItem]
    teacher_talking_points: list[str]
    pathway_readiness: PathwayReadiness | None  # Stage 5 only
    hsc_projection: HSCProjection | None  # Stage 6 only
    generated_at: datetime

class InsightItem(BaseSchema):
    title: str
    description: str
    subject_id: UUID | None
    priority: str  # low, medium, high

class PathwayReadiness(BaseSchema):
    current_pathway: str  # 5.1, 5.2, 5.3
    ready_for_higher: bool
    blocking_gaps: list[str]
    recommendation: str

class HSCProjection(BaseSchema):
    predicted_band: int
    band_range: str  # e.g., "76-84"
    atar_contribution: float | None
    days_until_hsc: int
    strengths: list[str]
    focus_areas: list[str]
```

**File: `backend/app/schemas/goal.py`**

```python
class GoalCreate(BaseSchema):
    student_id: UUID
    title: str
    description: str | None
    target_outcomes: list[str] | None
    target_mastery: float | None
    target_date: date | None
    reward: str | None

class GoalUpdate(BaseSchema):
    title: str | None
    description: str | None
    target_mastery: float | None
    target_date: date | None
    reward: str | None
    is_active: bool | None

class GoalResponse(BaseSchema):
    id: UUID
    student_id: UUID
    title: str
    description: str | None
    target_outcomes: list[str] | None
    target_mastery: float | None
    current_mastery: float | None  # Calculated
    target_date: date | None
    reward: str | None
    is_active: bool
    progress_percentage: float  # Calculated
    created_at: datetime
    achieved_at: datetime | None
```

**File: `backend/app/schemas/notification.py`**

```python
class NotificationResponse(BaseSchema):
    id: UUID
    type: str
    title: str
    message: str
    priority: str
    related_student_id: UUID | None
    related_subject_id: UUID | None
    created_at: datetime
    read_at: datetime | None

class NotificationListResponse(BaseSchema):
    notifications: list[NotificationResponse]
    total: int
    unread_count: int

class NotificationPreferencesUpdate(BaseSchema):
    weekly_reports: bool | None
    achievement_alerts: bool | None
    concern_alerts: bool | None
    goal_reminders: bool | None
    email_frequency: str | None
    preferred_time: time | None
    preferred_day: str | None
    timezone: str | None

class NotificationPreferencesResponse(BaseSchema):
    weekly_reports: bool
    achievement_alerts: bool
    concern_alerts: bool
    goal_reminders: bool
    email_frequency: str
    preferred_time: time
    preferred_day: str
    timezone: str
```

### 2.2 API Endpoints

**File: `backend/app/api/v1/endpoints/parent_dashboard.py`**

```python
router = APIRouter(prefix="/parent", tags=["parent-dashboard"])

# Dashboard Overview
@router.get("/dashboard", response_model=DashboardOverviewResponse)
async def get_dashboard_overview(...)

# Student Progress
@router.get("/students/{student_id}/progress", response_model=StudentProgressResponse)
async def get_student_progress(...)

@router.get("/students/{student_id}/subject-progress/{subject_id}", response_model=SubjectProgressDetailResponse)
async def get_student_subject_progress(...)

# Weekly Insights
@router.get("/students/{student_id}/insights", response_model=WeeklyInsightsResponse)
async def get_weekly_insights(...)

@router.post("/students/{student_id}/insights/regenerate", response_model=WeeklyInsightsResponse)
async def regenerate_insights(...)

# Weekly Summary Email
@router.get("/students/{student_id}/weekly-summary")
async def get_weekly_summary(...)  # Returns formatted HTML

@router.post("/students/{student_id}/send-weekly-summary")
async def send_weekly_summary(...)  # Sends via Resend

# Goals
@router.post("/goals", response_model=GoalResponse)
async def create_goal(...)

@router.get("/students/{student_id}/goals", response_model=list[GoalResponse])
async def get_student_goals(...)

@router.put("/goals/{goal_id}", response_model=GoalResponse)
async def update_goal(...)

@router.delete("/goals/{goal_id}")
async def delete_goal(...)

# Notifications
@router.get("/notifications", response_model=NotificationListResponse)
async def get_notifications(...)

@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(...)

@router.post("/notifications/read-all")
async def mark_all_notifications_read(...)

# Notification Preferences
@router.get("/notification-preferences", response_model=NotificationPreferencesResponse)
async def get_notification_preferences(...)

@router.put("/notification-preferences", response_model=NotificationPreferencesResponse)
async def update_notification_preferences(...)
```

### 2.3 Services

**File: `backend/app/services/parent_analytics_service.py`**

Core analytics calculations:
- [ ] `get_student_overall_mastery(student_id)` - Aggregate mastery across subjects
- [ ] `get_foundation_strength(student_id)` - Prior year outcomes mastery
- [ ] `get_weekly_stats(student_id, week_start)` - Study time, sessions, topics
- [ ] `get_subject_progress(student_id)` - Per-subject mastery with strands
- [ ] `get_strand_progress(student_id, subject_id)` - Strand-level breakdown
- [ ] `calculate_mastery_improvement(student_id, period)` - Trend calculation

**File: `backend/app/services/insight_generation_service.py`**

AI-powered insight generation (Claude Haiku for cost efficiency):
- [ ] `generate_weekly_insights(student_id)` - Main insight generation
- [ ] `identify_wins(student_id, week_start)` - Achievements this week
- [ ] `identify_areas_to_watch(student_id)` - Struggling areas
- [ ] `generate_recommendations(student_id)` - Actionable next steps
- [ ] `generate_teacher_talking_points(student_id)` - Parent-teacher prep
- [ ] `assess_pathway_readiness(student_id)` - Stage 5 pathway analysis
- [ ] `project_hsc_band(student_id)` - Stage 6 HSC projection

**File: `backend/app/services/notification_service.py`**

Notification management:
- [ ] `create_notification(user_id, type, title, message, ...)`
- [ ] `get_user_notifications(user_id, unread_only, limit, offset)`
- [ ] `mark_read(notification_id)`
- [ ] `mark_all_read(user_id)`
- [ ] `get_unread_count(user_id)`
- [ ] `should_send_notification(user_id, type)` - Check preferences

**File: `backend/app/services/email_service.py`**

Email delivery via Resend API:
- [ ] `send_weekly_summary(parent_id, student_id)` - Weekly digest email
- [ ] `send_achievement_alert(parent_id, student_id, achievement)` - Milestone emails
- [ ] `send_concern_alert(parent_id, student_id, concern)` - Warning emails
- [ ] `send_goal_achieved(parent_id, goal)` - Goal completion email
- [ ] Email templates in `backend/app/templates/emails/`

**File: `backend/app/services/goal_service.py`**

Goal management:
- [ ] `create_goal(parent_id, data)` - With ownership validation
- [ ] `get_goals(parent_id, student_id)` - List goals
- [ ] `update_goal(parent_id, goal_id, data)` - With ownership validation
- [ ] `delete_goal(parent_id, goal_id)` - With ownership validation
- [ ] `calculate_goal_progress(goal_id)` - Current progress vs target
- [ ] `check_goal_achieved(goal_id)` - Auto-mark achieved goals

### 2.4 Scheduled Tasks

Background jobs (implement with APScheduler or Celery later):
- [ ] Weekly insight generation (Saturday night)
- [ ] Weekly summary email dispatch (Sunday morning, per user timezone)
- [ ] Goal progress check (daily, create notifications for achieved goals)

---

## Phase 3: AI Integration

### 3.1 Insight Generation Prompts

**File: `backend/app/services/insight_prompts/weekly_insights.py`**

```python
WEEKLY_INSIGHTS_SYSTEM_PROMPT = """
You are an educational analyst generating weekly insights for parents about their child's learning progress.

Guidelines:
- Be encouraging but honest
- Focus on actionable insights
- Use age-appropriate language based on student's grade level
- Highlight specific curriculum outcomes where relevant
- Never be alarming - frame concerns as "areas to watch"
- Provide specific, practical recommendations

Student Context:
- Grade Level: {grade_level}
- Stage: {stage}
- Framework: {framework}
- Subjects Enrolled: {subjects}
"""

WINS_PROMPT = """
Based on this week's activity data, identify 2-3 key wins:
{activity_data}

Return JSON:
{
  "wins": [
    {"title": "...", "description": "...", "subject_id": "..." or null, "priority": "high"}
  ]
}
"""

AREAS_TO_WATCH_PROMPT = """
Based on the mastery data and recent struggles, identify areas needing attention:
{mastery_data}
{struggle_data}

Return JSON with 1-3 areas (be gentle, not alarming):
{
  "areas_to_watch": [...]
}
"""

TEACHER_TALKING_POINTS_PROMPT = """
Generate 3 curriculum-aligned talking points for parent-teacher conversations:
{curriculum_context}
{progress_data}

Return JSON:
{
  "talking_points": ["How is {student_name} progressing with {outcome}?", ...]
}
"""
```

### 3.2 Model Routing

- **Claude Haiku (claude-3-5-haiku)**: Weekly insights, recommendations (cost-efficient)
- **Claude Sonnet (claude-sonnet-4)**: Complex HSC projections, pathway assessments

### 3.3 Cost Tracking

All AI insight generation logged to `ai_interactions` table with:
- `interaction_type = 'parent_insight'`
- `model_used = 'claude-3-5-haiku'`
- `cost_estimate` calculated

---

## Phase 4: Frontend Components

### 4.1 Directory Structure

```
frontend/src/features/parent-dashboard/
├── index.ts                          # Barrel export
├── ParentDashboard.tsx               # Main page component
├── components/
│   ├── overview/
│   │   ├── DashboardOverview.tsx     # Top-level summary
│   │   ├── StudentSelector.tsx       # Multi-child dropdown
│   │   ├── QuickStats.tsx            # Weekly metrics cards
│   │   └── NotificationBell.tsx      # Unread notifications
│   ├── progress/
│   │   ├── ProgressOverview.tsx      # Overall progress circle
│   │   ├── SubjectProgressCard.tsx   # Per-subject card
│   │   ├── SubjectProgressDetail.tsx # Detailed subject view
│   │   ├── StrandProgressBar.tsx     # Strand-level bars
│   │   ├── MasteryChart.tsx          # Recharts visualisation
│   │   └── FoundationIndicator.tsx   # Foundation strength
│   ├── insights/
│   │   ├── WeeklyInsights.tsx        # Main insights panel
│   │   ├── InsightCard.tsx           # Individual insight
│   │   ├── WinsSection.tsx           # This week's wins
│   │   ├── AreasToWatch.tsx          # Concerns section
│   │   ├── Recommendations.tsx       # Action items
│   │   └── TeacherPrepCard.tsx       # Talking points
│   ├── ai-review/
│   │   ├── AIConversationReview.tsx  # Main AI review panel
│   │   ├── AIInteractionList.tsx     # List of conversations
│   │   ├── AIInteractionDetail.tsx   # Single conversation view
│   │   ├── FlaggedBadge.tsx          # Flagged indicator
│   │   └── AIUsageSummary.tsx        # Token/cost summary
│   ├── goals/
│   │   ├── GoalSetting.tsx           # Goal management panel
│   │   ├── GoalCard.tsx              # Individual goal
│   │   ├── GoalForm.tsx              # Create/edit goal
│   │   ├── GoalProgress.tsx          # Progress indicator
│   │   └── RewardTracker.tsx         # Family rewards
│   ├── notifications/
│   │   ├── NotificationCenter.tsx    # Full notification list
│   │   ├── NotificationItem.tsx      # Single notification
│   │   └── NotificationPreferences.tsx # Settings
│   └── hsc/
│       ├── HSCDashboard.tsx          # Year 11-12 specific
│       ├── BandPrediction.tsx        # Band projection
│       ├── ATARContribution.tsx      # ATAR tracking
│       └── HSCCountdown.tsx          # Days until HSC
├── hooks/
│   ├── useParentDashboard.ts         # Dashboard overview
│   ├── useStudentProgress.ts         # Student progress
│   ├── useWeeklyInsights.ts          # AI insights
│   ├── useGoals.ts                   # Goal management
│   ├── useNotifications.ts           # Notifications
│   └── useAIReview.ts                # AI conversation review
└── __tests__/
    ├── ParentDashboard.test.tsx
    ├── ProgressOverview.test.tsx
    ├── WeeklyInsights.test.tsx
    ├── GoalSetting.test.tsx
    └── NotificationCenter.test.tsx
```

### 4.2 Core Components

**ParentDashboard.tsx** - Main page with tabs:
- Overview (default)
- Progress
- Insights
- AI Review
- Goals
- Settings

**DashboardOverview.tsx** - Summary view:
- Student selector (if multiple children)
- Quick stats cards
- Recent activity
- Notification bell

**ProgressOverview.tsx** - Progress visualisation:
- Circular progress chart (overall mastery)
- Subject cards grid
- Foundation strength indicator
- Weekly comparison

**WeeklyInsights.tsx** - AI-generated insights:
- Wins this week (green cards)
- Areas to watch (amber cards)
- Recommendations (action items)
- Teacher prep section

**AIConversationReview.tsx** - AI oversight:
- Conversation list with filters
- Flagged conversation highlighting
- Usage statistics
- Date range selector

**GoalSetting.tsx** - Family goals:
- Active goals list
- Create goal modal
- Progress tracking
- Reward display

### 4.3 React Query Hooks

```typescript
// hooks/useParentDashboard.ts
export function useParentDashboard() {
  return useQuery({
    queryKey: ['parent-dashboard'],
    queryFn: () => api.parent.getDashboardOverview(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// hooks/useStudentProgress.ts
export function useStudentProgress(studentId: string) {
  return useQuery({
    queryKey: ['student-progress', studentId],
    queryFn: () => api.parent.getStudentProgress(studentId),
    enabled: !!studentId,
  });
}

// hooks/useWeeklyInsights.ts
export function useWeeklyInsights(studentId: string) {
  return useQuery({
    queryKey: ['weekly-insights', studentId],
    queryFn: () => api.parent.getWeeklyInsights(studentId),
    enabled: !!studentId,
    staleTime: 60 * 60 * 1000, // 1 hour (insights regenerate weekly)
  });
}

// hooks/useGoals.ts
export function useGoals(studentId: string) {
  const queryClient = useQueryClient();

  const goalsQuery = useQuery({...});

  const createGoal = useMutation({
    mutationFn: (data: GoalCreate) => api.parent.createGoal(data),
    onSuccess: () => queryClient.invalidateQueries(['goals', studentId]),
  });

  const updateGoal = useMutation({...});
  const deleteGoal = useMutation({...});

  return { goalsQuery, createGoal, updateGoal, deleteGoal };
}
```

### 4.4 Charts (Recharts)

```typescript
// MasteryChart.tsx
import { RadialBarChart, RadialBar, PieChart, Pie, BarChart, Bar } from 'recharts';

// Overall mastery - radial progress
// Subject comparison - bar chart
// Strand breakdown - horizontal bars
// Weekly trend - line chart
```

### 4.5 Zustand Store

```typescript
// stores/parentDashboardStore.ts
interface ParentDashboardStore {
  selectedStudentId: string | null;
  dateRange: { start: Date; end: Date };
  activeTab: 'overview' | 'progress' | 'insights' | 'ai-review' | 'goals' | 'settings';

  setSelectedStudent: (id: string) => void;
  setDateRange: (range: { start: Date; end: Date }) => void;
  setActiveTab: (tab: string) => void;
}
```

---

## Phase 5: Integration

### 5.1 API Client Extensions

**File: `frontend/src/lib/api/parent.ts`**

```typescript
export const parentApi = {
  getDashboardOverview: () => get<DashboardOverviewResponse>('/parent/dashboard'),
  getStudentProgress: (studentId: string) => get<StudentProgressResponse>(`/parent/students/${studentId}/progress`),
  getWeeklyInsights: (studentId: string) => get<WeeklyInsightsResponse>(`/parent/students/${studentId}/insights`),
  getGoals: (studentId: string) => get<GoalResponse[]>(`/parent/students/${studentId}/goals`),
  createGoal: (data: GoalCreate) => post<GoalResponse>('/parent/goals', data),
  updateGoal: (goalId: string, data: GoalUpdate) => put<GoalResponse>(`/parent/goals/${goalId}`, data),
  deleteGoal: (goalId: string) => del(`/parent/goals/${goalId}`),
  getNotifications: (params?: { unread_only?: boolean }) => get<NotificationListResponse>('/parent/notifications', params),
  markNotificationRead: (id: string) => post(`/parent/notifications/${id}/read`),
  getNotificationPreferences: () => get<NotificationPreferencesResponse>('/parent/notification-preferences'),
  updateNotificationPreferences: (data: NotificationPreferencesUpdate) => put<NotificationPreferencesResponse>('/parent/notification-preferences', data),
  sendWeeklySummary: (studentId: string) => post(`/parent/students/${studentId}/send-weekly-summary`),
};
```

### 5.2 Routing

```typescript
// App.tsx routes
<Route path="/parent" element={<AuthGuard requireParent><ParentLayout /></AuthGuard>}>
  <Route index element={<ParentDashboard />} />
  <Route path="student/:studentId" element={<StudentProgressPage />} />
  <Route path="student/:studentId/subject/:subjectId" element={<SubjectDetailPage />} />
  <Route path="insights" element={<InsightsPage />} />
  <Route path="ai-review" element={<AIReviewPage />} />
  <Route path="goals" element={<GoalsPage />} />
  <Route path="settings" element={<ParentSettingsPage />} />
</Route>
```

### 5.3 Error Handling

- API errors: Toast notifications with retry option
- No data states: Empty state components with helpful messages
- Loading states: Skeleton loaders matching component shape
- Offline: Graceful degradation with cached data

### 5.4 Accessibility

- ARIA labels on all interactive elements
- Keyboard navigation through dashboard
- Screen reader announcements for notifications
- Color contrast meeting WCAG AA
- Focus management in modals

---

## Phase 6: Testing

### 6.1 Backend Unit Tests

**File: `backend/tests/services/test_parent_analytics_service.py`**
- [ ] Test mastery calculation
- [ ] Test foundation strength calculation
- [ ] Test weekly stats aggregation
- [ ] Test strand progress calculation

**File: `backend/tests/services/test_insight_generation_service.py`**
- [ ] Test insight generation (mock Claude API)
- [ ] Test wins identification
- [ ] Test areas to watch identification
- [ ] Test pathway readiness assessment
- [ ] Test HSC projection

**File: `backend/tests/services/test_goal_service.py`**
- [ ] Test goal CRUD
- [ ] Test ownership validation
- [ ] Test progress calculation
- [ ] Test auto-achievement

**File: `backend/tests/services/test_notification_service.py`**
- [ ] Test notification creation
- [ ] Test preference checking
- [ ] Test mark read

**File: `backend/tests/services/test_email_service.py`**
- [ ] Test email sending (mock Resend)
- [ ] Test template rendering

### 6.2 Backend Integration Tests

**File: `backend/tests/api/test_parent_dashboard_endpoints.py`**
- [ ] Test GET /parent/dashboard
- [ ] Test GET /parent/students/{id}/progress
- [ ] Test GET /parent/students/{id}/insights
- [ ] Test goal endpoints (CRUD)
- [ ] Test notification endpoints
- [ ] Test preference endpoints
- [ ] Test parent-child ownership validation
- [ ] Test unauthorized access rejection

### 6.3 Frontend Unit Tests

- [ ] ParentDashboard.test.tsx - Tab navigation, student selection
- [ ] ProgressOverview.test.tsx - Progress display, chart rendering
- [ ] WeeklyInsights.test.tsx - Insight cards, loading states
- [ ] GoalSetting.test.tsx - Goal CRUD, form validation
- [ ] NotificationCenter.test.tsx - Notification list, mark read
- [ ] AIConversationReview.test.tsx - Conversation list, filtering

### 6.4 E2E Tests (Playwright)

**File: `frontend/e2e/parent-dashboard.spec.ts`**
- [ ] Parent login and dashboard view
- [ ] Switch between students
- [ ] View student progress
- [ ] View AI insights
- [ ] Create/edit/delete goal
- [ ] Mark notification read
- [ ] Update notification preferences

---

## Phase 7: Documentation

### 7.1 API Documentation

- [ ] OpenAPI schema updates for all new endpoints
- [ ] Swagger UI descriptions
- [ ] Example requests/responses

### 7.2 Component Documentation

- [ ] JSDoc comments on all components
- [ ] Props documentation
- [ ] Usage examples

### 7.3 User-Facing Documentation

- [ ] Parent dashboard help text (in-app)
- [ ] FAQ for common questions
- [ ] Privacy explanation ("visibility not surveillance")

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| AI insight generation costs | Medium | Medium | Use Haiku, cache insights weekly |
| Parent-child relationship bypass | High | Low | Strict ownership checks, audit logging |
| Email delivery failures | Medium | Low | Resend retry logic, fallback to in-app |
| Performance with large datasets | Medium | Medium | Pagination, query optimisation, caching |
| Insight quality inconsistency | Medium | Medium | Prompt engineering, fallback messages |
| Timezone handling errors | Low | Medium | Use timezone-aware datetimes, test edge cases |

---

## Curriculum Considerations

### Stage-Specific Features

| Stage | Years | Dashboard Focus |
|-------|-------|-----------------|
| Stage 2-3 | 3-6 | Foundation building, streaks, simple metrics |
| Stage 4 | 7-8 | Subject balance, transition tracking |
| Stage 5 | 9-10 | Pathway readiness, prerequisites |
| Stage 6 | 11-12 | HSC dashboard, band predictions, ATAR |

### Curriculum Alignment in Insights

- Reference specific outcome codes in recommendations
- Show strand-level progress (e.g., "Number & Algebra: 78%")
- Identify prerequisite gaps blocking advancement
- Generate curriculum-aligned teacher talking points

---

## Privacy/Security Checklist

- [ ] Parent can only access their own children's data (verify in every endpoint)
- [ ] AI interactions redacted for sensitive content
- [ ] Rate limiting on all endpoints (10 req/min)
- [ ] Audit logging for dashboard access
- [ ] Email preferences respected (no spam)
- [ ] Data minimisation in weekly summaries
- [ ] Child data deletion cascades correctly
- [ ] Australian Privacy Act compliant
- [ ] No real-time surveillance capabilities
- [ ] Progress focus, not behaviour monitoring

---

## Estimated Complexity

**Overall: Medium-High**

| Component | Complexity | Reason |
|-----------|------------|--------|
| Database | Low | Simple tables, clear relationships |
| Backend Services | Medium | Analytics calculations, AI integration |
| Insight Generation | High | AI prompting, quality control |
| Frontend | Medium | Many components, charts, state management |
| Email System | Low | Resend integration straightforward |
| Testing | Medium | Many edge cases, AI mocking |

---

## Dependencies on Other Features

| Feature | Dependency Type | Notes |
|---------|-----------------|-------|
| Phase 3 User System | Required | Parent accounts, student relationships |
| Phase 4 AI Tutoring | Required | AI interactions to review |
| Phase 5 Gamification | Required | XP, levels, streaks for display |
| Phase 6 Revision | Required | Flashcard data for insights |
| Existing AI endpoints | Partial | Lines 249-438 in users.py |

---

## Implementation Order

### Week 1: Backend Foundation
1. Database migrations (015-018)
2. Models and schemas
3. ParentAnalyticsService
4. GoalService
5. NotificationService
6. Basic API endpoints

### Week 2: AI & Frontend
1. InsightGenerationService (Claude Haiku)
2. EmailService (Resend)
3. Frontend components (overview, progress)
4. Frontend components (insights, goals)
5. Frontend components (AI review, notifications)
6. Integration testing
7. E2E testing

---

## Recommended Agents

| Task | Agent |
|------|-------|
| Database migrations | `database-architect` |
| Backend services | `backend-architect` |
| AI prompts | `ai-tutor-engineer` |
| Frontend components | `frontend-developer` |
| Security review | `multi-tenancy-enforcer` |
| Testing | `testing-qa-specialist` |
| Full implementation | `full-stack-developer` |

---

*Plan created: 2025-12-28*
