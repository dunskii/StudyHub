# Study: Phase 7 - Parent Dashboard

## Summary

Phase 7 implements the Parent Dashboard feature - a comprehensive progress visibility system allowing parents to monitor their children's learning journey without surveillance. This phase builds on the completed foundation of Phases 1-6 (authentication, curriculum, tutoring, revision) and leverages existing database tables, endpoints, and services.

**Status**: NOT STARTED (0% complete)
**Dependencies**: Phases 1-6 ✅ Complete
**Estimated Effort**: 2 weeks

## Key Requirements

### Core Features

1. **Progress Dashboard**
   - Overall curriculum progress percentage
   - Weekly study metrics (sessions, time, topics covered)
   - Foundation strength indicator
   - Subject-by-subject mastery breakdown

2. **Curriculum Mastery Visualisation**
   - Progress bars by subject and strand
   - Mastery levels (0-100%)
   - Foundation gap identification

3. **AI Conversation Review**
   - View child's AI tutoring interactions
   - Flagged interaction highlighting
   - Usage statistics and costs

4. **Weekly Insights (AI-Generated)**
   - Wins and achievements this week
   - Areas needing attention
   - Pathway readiness (Stage 5)
   - Teacher conversation starters

5. **Notification System**
   - Weekly summary emails
   - Achievement alerts
   - Concern notifications
   - Configurable preferences

6. **Goal Setting & Family Collaboration**
   - Create academic targets together
   - Family rewards for milestones
   - Collaborative study planning

7. **Grade-Specific Views**
   - Years 3-6: Foundation building, learning habits
   - Years 7-8: Transition support, subject breadth
   - Years 9-10: Pathway performance, HSC prep
   - Years 11-12: HSC Dashboard, Band predictions, ATAR tracking

## Existing Patterns

### Backend Endpoints Already Implemented

From `backend/app/api/v1/endpoints/users.py`:

```python
# Line 249 - Parent viewing child's AI interactions
@router.get("/me/students/{student_id}/ai-interactions")
async def get_child_ai_interactions(...)

# Line 319 - Flagged interactions only
@router.get("/me/students/{student_id}/ai-interactions/flagged")
async def get_child_flagged_interactions(...)

# Line 378 - AI usage statistics
@router.get("/me/students/{student_id}/ai-usage")
async def get_child_ai_usage(...)
```

### Database Tables Ready for Use

| Table | Phase | Purpose for Parent Dashboard |
|-------|-------|------------------------------|
| `users` | 3 | Parent accounts with preferences |
| `students` | 3 | Student profiles with gamification |
| `student_subjects` | 2 | Mastery levels, activity tracking |
| `sessions` | 4 | Learning analytics, metrics |
| `ai_interactions` | 4 | AI conversation logs |
| `flashcards` | 6 | Revision card data |
| `revision_history` | 6 | Spaced repetition tracking |
| `communications` | 3 | Email/notification logs |
| `daily_analytics` | 4 | Aggregated daily metrics |

### Frontend Patterns

```typescript
// Hook pattern from existing code
export function useStudentProgress(studentId: string) {
  return useQuery({
    queryKey: ['student-progress', studentId],
    queryFn: () => api.parent.getStudentProgress(studentId),
  });
}

// Component pattern
export function ProgressCard({ studentId }: { studentId: string }) {
  const { data, isLoading } = useStudentProgress(studentId);
  if (isLoading) return <Spinner />;
  return <Card>...</Card>;
}
```

## Technical Considerations

### New Database Tables Required

```sql
-- Goals table for family collaboration
CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_outcomes TEXT[],
    target_mastery DECIMAL(5,2),
    due_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    achieved_at TIMESTAMPTZ,
    reward VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) CHECK (type IN ('achievement', 'concern', 'insight', 'reminder')),
    title VARCHAR(255),
    message TEXT,
    related_student_id UUID REFERENCES students(id),
    related_subject_id UUID REFERENCES subjects(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    delivery_method VARCHAR(20) DEFAULT 'in_app'
);

-- Notification preferences
CREATE TABLE notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    weekly_reports BOOLEAN DEFAULT TRUE,
    achievement_alerts BOOLEAN DEFAULT TRUE,
    concern_alerts BOOLEAN DEFAULT TRUE,
    email_frequency VARCHAR(20) DEFAULT 'weekly',
    preferred_time TIME DEFAULT '18:00',
    preferred_day VARCHAR(20) DEFAULT 'sunday',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### New API Endpoints Required

```
GET  /api/v1/parent/dashboard/overview
GET  /api/v1/parent/students/{student_id}/progress
GET  /api/v1/parent/students/{student_id}/subject-progress/{subject_id}
GET  /api/v1/parent/students/{student_id}/insights
GET  /api/v1/parent/students/{student_id}/weekly-summary
POST /api/v1/parent/students/{student_id}/send-weekly-summary
PUT  /api/v1/parent/notification-preferences
POST /api/v1/parent/goals
GET  /api/v1/parent/goals/{student_id}
PUT  /api/v1/parent/goals/{goal_id}
DELETE /api/v1/parent/goals/{goal_id}
```

### New Backend Services Required

1. **ParentAnalyticsService**
   - Calculate weekly progress metrics
   - Aggregate mastery by strand/subject
   - Compute foundation strength
   - Identify struggling areas

2. **InsightGenerationService**
   - AI-powered weekly insights (Claude Haiku)
   - Generate teacher conversation starters
   - Create actionable recommendations
   - Pathway readiness assessment

3. **NotificationService**
   - Manage notification preferences
   - Schedule weekly emails
   - Send achievement/concern alerts
   - Track delivery status

### Frontend Components Required

```
frontend/src/features/parent-dashboard/
├── ParentDashboard.tsx          # Main page
├── DashboardOverview.tsx        # Summary cards
├── StudentSelector.tsx          # Multi-child switcher
├── ProgressOverview.tsx         # Overall progress
├── WeeklyMetrics.tsx            # Study time, sessions
├── CurriculumMasteryChart.tsx   # Strand progress bars
├── SubjectProgressCard.tsx      # Per-subject card
├── SubjectProgressDetail.tsx    # Detailed view
├── FoundationStrengthIndicator.tsx
├── AIConversationReview.tsx     # Parent AI review
├── AIInteractionList.tsx
├── AIInteractionDetail.tsx
├── FlaggedInteractionsList.tsx
├── AIUsageSummary.tsx
├── WeeklyInsights.tsx           # AI insights
├── InsightCard.tsx
├── PathwayReadinessCard.tsx     # Stage 5 specific
├── GoalSetting.tsx              # Family goals
├── GoalCard.tsx
├── RewardTracker.tsx
├── NotificationPreferences.tsx
├── HSCDashboard.tsx             # Y11-12 specific
├── BandPredictionChart.tsx
└── ATARContributionTracker.tsx
```

### Frontend Dependencies

```json
{
  "recharts": "^2.10.0"  // For mastery charts
}
```

## Curriculum Alignment

### Grade-Specific Dashboard Features

| Stage | Years | Focus Areas | Key Metrics |
|-------|-------|-------------|-------------|
| Stage 2-3 | 3-6 | Foundation building | Daily engagement, concept mastery |
| Stage 4 | 7-8 | Transition support | Subject balance, foundation gaps |
| Stage 5 | 9-10 | Pathway performance | Pathway suitability, prerequisites |
| Stage 6 | 11-12 | HSC focus | Band predictions, ATAR contribution |

### HSC-Specific Features (Years 11-12)

```
📊 HSC Dashboard Shows:
├── Current trajectory (e.g., Band 5: 76-84 marks)
├── Estimated ATAR contribution
├── Strengths and areas for improvement
├── Recommended focus areas with percentages
└── Days until HSC countdown
```

### Pathway Readiness (Years 9-10)

For Stage 5 students, show:
- Current pathway (5.1, 5.2, 5.3)
- Readiness for higher pathway
- Foundation gaps blocking progression
- Course recommendations for Year 11

## Security/Privacy Considerations

### Access Control (CRITICAL)

```python
async def verify_parent_access(parent_id: UUID, student_id: UUID, db: AsyncSession):
    """Parent can ONLY access their own children's data."""
    student = await db.get(Student, student_id)
    if not student or student.parent_id != parent_id:
        raise ForbiddenError("Access denied")
    return student
```

### Data Privacy Principles

1. **Progress visibility, not surveillance**
   - Parents see progress summaries, not keystroke logs
   - No real-time monitoring of study sessions
   - Focus on outcomes, not process

2. **AI interaction redaction**
   - Don't show sensitive student messages verbatim
   - Flag concerning content for review
   - Age-appropriate filtering

3. **Rate limiting**
   - Prevent data scraping (10 requests/min)
   - Audit all parent dashboard accesses

### Child Safety

1. **Automatic flagging**: AI interactions flagged for concerning content
2. **Content filtering**: Inappropriate content not shown to parents
3. **Parental consent**: Required for under-15s (Australian Privacy Act)

### Compliance

- **Australian Privacy Act**: Parental consent for under-15s
- **COPPA best practices**: Minimal data collection from children
- **Data minimisation**: Only collect what's necessary
- **Right to deletion**: Support deletion on request

## Dependencies

### Completed Prerequisites (Phases 1-6)

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Production-ready foundation | ✅ Complete |
| 2 | Core Curriculum System | ✅ Complete |
| 3 | User System & Authentication | ✅ Complete |
| 4 | AI Tutoring | ✅ Complete |
| 5 | Gamification & Rewards | ✅ Complete |
| 6 | Revision & Spaced Repetition | ✅ Complete |

### External Services Ready

| Service | Purpose | Status |
|---------|---------|--------|
| Resend API | Email delivery | ✅ Configured |
| Anthropic Claude | Insight generation (Haiku) | ✅ Integrated |
| Supabase Auth | Parent authentication | ✅ Integrated |

### Backend Infrastructure

- FastAPI async endpoints ✅
- SQLAlchemy 2.0 async ORM ✅
- Pydantic v2 validation ✅
- Rate limiting middleware ✅
- CORS configuration ✅

## Open Questions

1. **Insight Generation Frequency**
   - Generate insights on-demand or pre-compute weekly?
   - Cache duration for insights?

2. **Email Delivery Timing**
   - What time/day for weekly summaries? (Configurable per parent)
   - Timezone handling for Australian states?

3. **Multi-Child Dashboard**
   - Side-by-side comparison view?
   - Combined insights or per-child?

4. **Teacher Integration**
   - Should teachers have access to parent dashboard?
   - Teacher-specific reports format?

5. **Mobile Experience**
   - PWA push notifications in addition to email?
   - Mobile-optimised dashboard layout?

## Implementation Tasks

### Backend (Week 1)

1. Create database migration for goals, notifications, notification_preferences
2. Implement ParentAnalyticsService
3. Implement InsightGenerationService (Claude Haiku)
4. Create parent dashboard endpoints
5. Implement NotificationService
6. Set up email templates (Resend)
7. Write unit tests

### Frontend (Week 2)

1. Create ParentDashboard layout component
2. Implement progress visualisation components
3. Build AI conversation review components
4. Create weekly insights components
5. Implement goal setting UI
6. Build notification preferences
7. Add HSC-specific dashboard
8. Write component tests
9. Integration testing

## Sources Referenced

- `C:\Users\dunsk\code\StudyHub\PROGRESS.md` - Phase status
- `C:\Users\dunsk\code\StudyHub\TASKLIST.md` - Detailed task breakdown
- `C:\Users\dunsk\code\StudyHub\Complete_Development_Plan.md` - Technical specs
- `C:\Users\dunsk\code\StudyHub\studyhub_overview.md` - Feature requirements
- `C:\Users\dunsk\code\StudyHub\CLAUDE.md` - Project configuration
- `C:\Users\dunsk\code\StudyHub\backend\app\api\v1\endpoints\users.py` - Existing parent endpoints
- `C:\Users\dunsk\code\StudyHub\backend\app\models\` - Database models
- `C:\Users\dunsk\code\StudyHub\backend\alembic\versions\` - Migrations

---

*Study completed: 2025-12-28*
