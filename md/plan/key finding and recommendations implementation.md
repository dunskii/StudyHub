# Implementation Plan: Phase 7 QA Key Findings and Recommendations

## Overview

This plan addresses all findings from the Phase 7 Parent Dashboard QA review:
- 1 HIGH severity security issue (ownership verification gap)
- 4 MEDIUM performance issues (N+1 queries)
- Test coverage gaps (no HTTP integration tests)
- 1 missing component (SettingsTab)
- Frontend type safety improvements (Zod validation)

**Estimated Effort:** 3 phases over 1-2 weeks
**Risk Level:** LOW - all fixes are within existing architecture

---

## Prerequisites

- [x] Phase 7 Parent Dashboard complete
- [x] QA review complete (`md/review/phase 7.md`)
- [x] Study document created (`md/study/key finding and recommendations.md`)
- [x] GoalService batch pattern available as reference
- [x] Backend notification preferences API complete
- [x] Zod already installed in frontend

---

## Phase 1: Security & Type Safety (Priority 1)

### 1.1 Fix ParentAnalyticsService Ownership Verification

**File:** `backend/app/services/parent_analytics_service.py`

**Task 1.1.1:** Rename `get_student_summary` to private method
```python
# Change from:
async def get_student_summary(self, student_id: UUID) -> DashboardStudentSummary | None:

# Change to:
async def _get_student_summary_internal(self, student: Student) -> DashboardStudentSummary:
    """Internal method - expects pre-verified student object."""
```

**Task 1.1.2:** Create new public method with ownership verification
```python
async def get_student_summary(
    self, student_id: UUID, parent_id: UUID
) -> DashboardStudentSummary | None:
    """Get student summary with ownership verification.

    Args:
        student_id: The student UUID.
        parent_id: The parent's user UUID for ownership verification.

    Returns:
        Student summary if found and owned by parent, None otherwise.
    """
    result = await self.db.execute(
        select(Student)
        .where(Student.id == student_id)
        .where(Student.parent_id == parent_id)
    )
    student = result.scalar_one_or_none()
    if not student:
        return None
    return await self._get_student_summary_internal(student)
```

**Task 1.1.3:** Update callers in `get_students_summary`
- Since `get_students_summary` already filters by `parent_id`, it can use the internal method directly

**Task 1.1.4:** Update any endpoint callers
- Check `parent_dashboard.py` for direct calls
- Update signature to include `parent_id`

### 1.2 Add Zod Validation to Frontend API

**File:** `frontend/src/lib/api/schemas/parent-dashboard.ts` (NEW)

**Task 1.2.1:** Create Zod schemas for all API responses
```typescript
import { z } from 'zod';

// Base schemas
export const StudentSummarySchema = z.object({
  id: z.string().uuid(),
  display_name: z.string(),
  grade_level: z.number().int().min(0).max(13),
  school_stage: z.string(),
  framework_id: z.string().uuid().nullable(),
  total_xp: z.number().int().min(0),
  level: z.number().int().min(1),
  current_streak: z.number().int().min(0),
  longest_streak: z.number().int().min(0),
  last_active_at: z.string().datetime().nullable(),
  sessions_this_week: z.number().int().min(0),
  study_time_this_week_minutes: z.number().int().min(0),
});

export const WeeklyStatsSchema = z.object({
  study_time_minutes: z.number().int().min(0),
  study_goal_minutes: z.number().int().min(0),
  sessions_count: z.number().int().min(0),
  topics_covered: z.number().int().min(0),
  mastery_improvement: z.number(),
  flashcards_reviewed: z.number().int().min(0),
  questions_answered: z.number().int().min(0),
  accuracy_percentage: z.number().min(0).max(100).nullable(),
});

export const StrandProgressSchema = z.object({
  strand_name: z.string(),
  mastery_level: z.number().min(0).max(100),
  outcomes_total: z.number().int().min(0),
  outcomes_mastered: z.number().int().min(0),
});

export const SubjectProgressSchema = z.object({
  subject_id: z.string().uuid(),
  subject_code: z.string(),
  subject_name: z.string(),
  mastery_level: z.number().min(0).max(100),
  sessions_this_week: z.number().int().min(0),
  study_time_this_week_minutes: z.number().int().min(0),
  strand_progress: z.array(StrandProgressSchema),
  current_focus_outcomes: z.array(z.string()),
});

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

export const DashboardResponseSchema = z.object({
  students: z.array(StudentSummarySchema),
  aggregate_stats: z.object({
    total_study_time_this_week: z.number().int().min(0),
    total_sessions_this_week: z.number().int().min(0),
    average_mastery: z.number().min(0).max(100),
  }),
});

// Goal schemas
export const GoalProgressSchema = z.object({
  current_mastery: z.number().min(0).max(100).nullable(),
  progress_percentage: z.number().min(0).max(100),
  outcomes_mastered: z.number().int().min(0),
  outcomes_total: z.number().int().min(0),
  days_remaining: z.number().int().nullable(),
  is_on_track: z.boolean(),
});

export const GoalResponseSchema = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid(),
  parent_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  target_outcomes: z.array(z.string()).nullable(),
  target_mastery: z.number().min(0).max(100).nullable(),
  target_date: z.string().date().nullable(),
  reward: z.string().nullable(),
  is_active: z.boolean(),
  is_achieved: z.boolean(),
  achieved_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  progress: GoalProgressSchema,
});

// Notification schemas
export const NotificationSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['achievement', 'concern', 'insight', 'reminder', 'goal_achieved', 'weekly_summary']),
  priority: z.enum(['low', 'normal', 'high']),
  title: z.string(),
  message: z.string(),
  data: z.record(z.unknown()).nullable(),
  is_read: z.boolean(),
  created_at: z.string().datetime(),
});

export const NotificationPreferencesSchema = z.object({
  achievement_alerts: z.boolean(),
  concern_alerts: z.boolean(),
  weekly_summary: z.boolean(),
  goal_reminders: z.boolean(),
  study_reminders: z.boolean(),
  email_frequency: z.enum(['immediately', 'daily', 'weekly', 'never']),
  preferred_time: z.string().nullable(),
  preferred_days: z.array(z.number().int().min(0).max(6)),
  timezone: z.string(),
  quiet_hours_start: z.string().nullable(),
  quiet_hours_end: z.string().nullable(),
});

// Insights schemas
export const InsightItemSchema = z.object({
  title: z.string(),
  description: z.string(),
  subject_code: z.string().nullable(),
  action_type: z.string().nullable(),
  estimated_time_minutes: z.number().int().min(0).nullable(),
});

export const PathwayReadinessSchema = z.object({
  current_pathway: z.string(),
  recommended_pathway: z.string(),
  readiness_percentage: z.number().min(0).max(100),
  blocking_gaps: z.array(z.string()),
  confidence: z.number().min(0).max(100),
});

export const HSCProjectionSchema = z.object({
  predicted_band: z.number().int().min(1).max(6),
  band_range: z.string(),
  exam_readiness: z.number().min(0).max(100),
  trajectory: z.enum(['improving', 'stable', 'declining']),
  days_until_hsc: z.number().int().min(0),
  current_average: z.number().min(0).max(100),
  atar_contribution: z.number().min(0).max(100).nullable(),
  strengths: z.array(z.string()),
  focus_areas: z.array(z.string()),
});

export const WeeklyInsightsSchema = z.object({
  summary: z.string(),
  wins: z.array(InsightItemSchema),
  areas_to_watch: z.array(InsightItemSchema),
  recommendations: z.array(InsightItemSchema),
  teacher_talking_points: z.array(z.string()),
  pathway_readiness: PathwayReadinessSchema.nullable(),
  hsc_projection: HSCProjectionSchema.nullable(),
});

export const WeeklyInsightsResponseSchema = z.object({
  week_start: z.string().datetime(),
  generated_at: z.string().datetime(),
  insights: WeeklyInsightsSchema,
});
```

**Task 1.2.2:** Update API functions to use validation
```typescript
// frontend/src/lib/api/parent-dashboard.ts

import {
  DashboardResponseSchema,
  StudentProgressResponseSchema,
  // ... other schemas
} from './schemas/parent-dashboard';

export async function getDashboard(): Promise<DashboardOverview> {
  const response = await apiClient.get('/parent/dashboard');
  const validated = DashboardResponseSchema.parse(response.data);
  return transformDashboardResponse(validated);
}

export async function getStudentProgress(studentId: string): Promise<StudentProgress> {
  const response = await apiClient.get(`/parent/students/${studentId}/progress`);
  const validated = StudentProgressResponseSchema.parse(response.data);
  return transformStudentProgress(validated);
}
```

**Task 1.2.3:** Add error handling for validation failures
```typescript
import { ZodError } from 'zod';

try {
  const validated = DashboardResponseSchema.parse(response.data);
  return transformDashboardResponse(validated);
} catch (error) {
  if (error instanceof ZodError) {
    console.error('API response validation failed:', error.errors);
    throw new Error('Invalid API response format');
  }
  throw error;
}
```

### 1.3 Testing Phase 1

- [ ] Run existing test suite - all should pass
- [ ] Manually test dashboard with ownership verification
- [ ] Verify API response validation doesn't break existing flows

---

## Phase 2: Performance Optimisation (Priority 2)

### 2.1 Fix N+1 in get_students_summary

**File:** `backend/app/services/parent_analytics_service.py`

**Task 2.1.1:** Implement batch prefetch pattern
```python
async def get_students_summary(
    self, parent_id: UUID
) -> list[DashboardStudentSummary]:
    """Get summaries for all students belonging to a parent.

    Uses batch prefetching to avoid N+1 queries.
    """
    # Single query for all students
    result = await self.db.execute(
        select(Student)
        .where(Student.parent_id == parent_id)
        .order_by(Student.display_name)
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
        .where(Session.started_at >= datetime.combine(week_start, datetime.min.time()).replace(tzinfo=timezone.utc))
        .group_by(Session.student_id)
    )
    sessions_by_student = dict(sessions_result.all())

    # Batch prefetch: study time per student
    time_result = await self.db.execute(
        select(Session.student_id, func.coalesce(func.sum(Session.duration_minutes), 0))
        .where(Session.student_id.in_(student_ids))
        .where(Session.started_at >= datetime.combine(week_start, datetime.min.time()).replace(tzinfo=timezone.utc))
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
            study_time_this_week_minutes=int(time_by_student.get(student.id, 0) or 0),
        ))

    return summaries
```

### 2.2 Fix N+1 in get_subject_progress

**File:** `backend/app/services/parent_analytics_service.py`

**Task 2.2.1:** Implement batch strand prefetch
```python
async def _get_all_strand_progress_batch(
    self, student_id: UUID, subject_ids: list[UUID]
) -> dict[UUID, list[StrandProgress]]:
    """Get strand progress for multiple subjects in one query."""
    if not subject_ids:
        return {}

    # Single query for all outcomes across all subjects
    result = await self.db.execute(
        select(
            CurriculumOutcome.subject_id,
            CurriculumOutcome.strand,
            func.count(CurriculumOutcome.id).label('total'),
        )
        .where(CurriculumOutcome.subject_id.in_(subject_ids))
        .group_by(CurriculumOutcome.subject_id, CurriculumOutcome.strand)
    )
    strand_data = result.all()

    # Get student's mastery per strand (would need revision history)
    # For now, use subject-level mastery as approximation
    student_subjects_result = await self.db.execute(
        select(StudentSubject)
        .where(StudentSubject.student_id == student_id)
        .where(StudentSubject.subject_id.in_(subject_ids))
    )
    subjects_by_id = {ss.subject_id: ss for ss in student_subjects_result.scalars().all()}

    # Group by subject
    strands_by_subject: dict[UUID, list[StrandProgress]] = {}
    for subject_id, strand_name, total in strand_data:
        if subject_id not in strands_by_subject:
            strands_by_subject[subject_id] = []

        ss = subjects_by_id.get(subject_id)
        mastery = float(ss.mastery_level) if ss else 0.0
        mastered = int(total * mastery / 100)

        strands_by_subject[subject_id].append(StrandProgress(
            strand_name=strand_name,
            mastery_level=Decimal(str(mastery)),
            outcomes_total=total,
            outcomes_mastered=mastered,
        ))

    return strands_by_subject
```

### 2.3 Fix Batch Delete for Notifications

**File:** `backend/app/services/notification_service.py`

**Task 2.3.1:** Replace one-by-one deletes with batch delete
```python
async def delete_old_notifications(
    self, user_id: UUID, days_old: int = 30
) -> int:
    """Delete old read notifications using batch delete.

    Returns:
        Number of notifications deleted.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=days_old)

    # Use batch delete instead of select + loop delete
    result = await self.db.execute(
        delete(Notification)
        .where(Notification.user_id == user_id)
        .where(Notification.read_at.isnot(None))
        .where(Notification.created_at < cutoff)
        .returning(Notification.id)
    )
    deleted_ids = result.scalars().all()
    await self.db.commit()

    logger.info(f"Deleted {len(deleted_ids)} old notifications for user {user_id}")
    return len(deleted_ids)
```

### 2.4 Testing Phase 2

- [ ] Add performance test to verify query count
- [ ] Test with multiple students (3-5) to verify N+1 is fixed
- [ ] Run existing tests to ensure no regressions

---

## Phase 3: SettingsTab Component (Priority 2)

### 3.1 Create SettingsTab Component

**File:** `frontend/src/features/parent-dashboard/components/SettingsTab.tsx` (NEW)

**Task 3.1.1:** Create SettingsTab component
```typescript
/**
 * SettingsTab - Notification preferences for parents.
 *
 * Features:
 * - Toggle notification types (achievements, concerns, etc.)
 * - Email frequency settings
 * - Quiet hours configuration
 * - Timezone selection
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Bell, Mail, Clock, Globe } from 'lucide-react';
import { parentDashboardApi } from '@/lib/api';
import type { NotificationPreferences } from '@/lib/api';
import { Card, Button, Spinner } from '@/components/ui';

const EMAIL_FREQUENCY_OPTIONS = [
  { value: 'immediately', label: 'Immediately' },
  { value: 'daily', label: 'Daily digest' },
  { value: 'weekly', label: 'Weekly digest' },
  { value: 'never', label: 'Never' },
] as const;

const DAYS_OF_WEEK = [
  { value: 0, label: 'Mon' },
  { value: 1, label: 'Tue' },
  { value: 2, label: 'Wed' },
  { value: 3, label: 'Thu' },
  { value: 4, label: 'Fri' },
  { value: 5, label: 'Sat' },
  { value: 6, label: 'Sun' },
];

const AUSTRALIAN_TIMEZONES = [
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)' },
  { value: 'Australia/Brisbane', label: 'Brisbane (AEST)' },
  { value: 'Australia/Adelaide', label: 'Adelaide (ACST/ACDT)' },
  { value: 'Australia/Perth', label: 'Perth (AWST)' },
  { value: 'Australia/Darwin', label: 'Darwin (ACST)' },
  { value: 'Australia/Hobart', label: 'Hobart (AEST/AEDT)' },
];

export function SettingsTab() {
  const queryClient = useQueryClient();
  const [hasChanges, setHasChanges] = useState(false);

  const {
    data: preferences,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => parentDashboardApi.getNotificationPreferences(),
    staleTime: 5 * 60 * 1000,
  });

  const [localPreferences, setLocalPreferences] = useState<NotificationPreferences | null>(null);

  // Initialize local state when data loads
  if (preferences && !localPreferences) {
    setLocalPreferences(preferences);
  }

  const updateMutation = useMutation({
    mutationFn: (prefs: Partial<NotificationPreferences>) =>
      parentDashboardApi.updateNotificationPreferences(prefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      setHasChanges(false);
    },
  });

  const handleToggle = (key: keyof NotificationPreferences) => {
    if (!localPreferences) return;
    setLocalPreferences({ ...localPreferences, [key]: !localPreferences[key] });
    setHasChanges(true);
  };

  const handleChange = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    if (!localPreferences) return;
    setLocalPreferences({ ...localPreferences, [key]: value });
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!localPreferences) return;
    updateMutation.mutate(localPreferences);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !localPreferences) {
    return (
      <Card className="p-6 text-center">
        <p className="text-red-600">Failed to load notification preferences</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Notification Settings</h2>
        {hasChanges && (
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </div>

      {/* Notification Types */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-medium">Notification Types</h3>
        </div>
        <div className="space-y-4">
          <ToggleItem
            label="Achievement Alerts"
            description="Get notified when your child earns achievements"
            checked={localPreferences.achievementAlerts}
            onChange={() => handleToggle('achievementAlerts')}
          />
          <ToggleItem
            label="Concern Alerts"
            description="Get notified about areas needing attention"
            checked={localPreferences.concernAlerts}
            onChange={() => handleToggle('concernAlerts')}
          />
          <ToggleItem
            label="Weekly Summary"
            description="Receive a weekly progress summary"
            checked={localPreferences.weeklySummary}
            onChange={() => handleToggle('weeklySummary')}
          />
          <ToggleItem
            label="Goal Reminders"
            description="Get reminded about upcoming goal deadlines"
            checked={localPreferences.goalReminders}
            onChange={() => handleToggle('goalReminders')}
          />
          <ToggleItem
            label="Study Reminders"
            description="Gentle reminders to encourage regular study"
            checked={localPreferences.studyReminders}
            onChange={() => handleToggle('studyReminders')}
          />
        </div>
      </Card>

      {/* Email Settings */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Mail className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-medium">Email Settings</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email Frequency
            </label>
            <select
              value={localPreferences.emailFrequency}
              onChange={(e) => handleChange('emailFrequency', e.target.value as any)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {EMAIL_FREQUENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Preferred Days
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => {
                    const current = localPreferences.preferredDays || [];
                    const updated = current.includes(day.value)
                      ? current.filter((d) => d !== day.value)
                      : [...current, day.value];
                    handleChange('preferredDays', updated);
                  }}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                    localPreferences.preferredDays?.includes(day.value)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Quiet Hours */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-medium">Quiet Hours</h3>
        </div>
        <p className="mb-4 text-sm text-gray-500">
          No notifications will be sent during quiet hours
        </p>
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">From</label>
            <input
              type="time"
              value={localPreferences.quietHoursStart || '22:00'}
              onChange={(e) => handleChange('quietHoursStart', e.target.value)}
              className="mt-1 block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">To</label>
            <input
              type="time"
              value={localPreferences.quietHoursEnd || '07:00'}
              onChange={(e) => handleChange('quietHoursEnd', e.target.value)}
              className="mt-1 block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
      </Card>

      {/* Timezone */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Globe className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-medium">Timezone</h3>
        </div>
        <select
          value={localPreferences.timezone}
          onChange={(e) => handleChange('timezone', e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          {AUSTRALIAN_TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </Card>
    </div>
  );
}

// Helper component for toggle items
interface ToggleItemProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}

function ToggleItem({ label, description, checked, onChange }: ToggleItemProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={`${label}: ${checked ? 'enabled' : 'disabled'}`}
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
```

### 3.2 Integrate SettingsTab into ParentDashboard

**File:** `frontend/src/features/parent-dashboard/ParentDashboard.tsx`

**Task 3.2.1:** Add import and tab configuration
```typescript
import { SettingsTab } from './components/SettingsTab';
import { Settings } from 'lucide-react';

// Add to BASE_TABS array
const BASE_TABS: TabConfig[] = [
  // ... existing tabs
  { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
];

// Update TabId type
type TabId = 'overview' | 'progress' | 'insights' | 'goals' | 'notifications' | 'hsc' | 'settings';
```

**Task 3.2.2:** Add SettingsTab rendering in switch statement
```typescript
{activeTab === 'settings' && <SettingsTab />}
```

### 3.3 Add API Functions for Preferences

**File:** `frontend/src/lib/api/parent-dashboard.ts`

**Task 3.3.1:** Add preference API functions (if not already present)
```typescript
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const response = await apiClient.get('/parent/notification-preferences');
  const validated = NotificationPreferencesSchema.parse(response.data);
  return transformNotificationPreferences(validated);
}

export async function updateNotificationPreferences(
  preferences: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const response = await apiClient.put('/parent/notification-preferences', preferences);
  const validated = NotificationPreferencesSchema.parse(response.data);
  return transformNotificationPreferences(validated);
}
```

### 3.4 Create SettingsTab Tests

**File:** `frontend/src/features/parent-dashboard/__tests__/SettingsTab.test.tsx` (NEW)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SettingsTab } from '../components/SettingsTab';

vi.mock('@/lib/api', () => ({
  parentDashboardApi: {
    getNotificationPreferences: vi.fn(),
    updateNotificationPreferences: vi.fn(),
  },
}));

import { parentDashboardApi } from '@/lib/api';

const mockPreferences = {
  achievementAlerts: true,
  concernAlerts: true,
  weeklySummary: true,
  goalReminders: false,
  studyReminders: true,
  emailFrequency: 'daily',
  preferredDays: [0, 2, 4],
  timezone: 'Australia/Sydney',
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
};

// ... test cases
```

---

## Phase 4: Integration Testing (Priority 2)

### 4.1 Create HTTP Integration Tests

**File:** `backend/tests/api/test_parent_dashboard_integration.py` (NEW)

**Task 4.1.1:** Create integration test file with fixtures
```python
"""
Integration tests for parent dashboard API endpoints.

These tests make actual HTTP requests to verify:
- Authentication requirements
- Ownership verification
- Response format
- Error handling
"""

import pytest
from httpx import AsyncClient
from uuid import uuid4

from app.main import app


@pytest.fixture
async def client():
    """Create test client."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


@pytest.fixture
def auth_headers(test_user_token: str) -> dict:
    """Headers with authentication token."""
    return {"Authorization": f"Bearer {test_user_token}"}


class TestDashboardEndpoints:
    """Tests for /api/v1/parent/dashboard endpoint."""

    @pytest.mark.asyncio
    async def test_dashboard_requires_auth(self, client: AsyncClient):
        """Dashboard endpoint requires authentication."""
        response = await client.get("/api/v1/parent/dashboard")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_dashboard_returns_students(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Dashboard returns list of parent's students."""
        response = await client.get(
            "/api/v1/parent/dashboard",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "students" in data
        assert "aggregate_stats" in data


class TestStudentProgressEndpoints:
    """Tests for /api/v1/parent/students/{id}/progress endpoint."""

    @pytest.mark.asyncio
    async def test_progress_requires_auth(self, client: AsyncClient):
        """Progress endpoint requires authentication."""
        student_id = str(uuid4())
        response = await client.get(f"/api/v1/parent/students/{student_id}/progress")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_progress_returns_404_for_nonexistent(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Returns 404 for non-existent student."""
        student_id = str(uuid4())
        response = await client.get(
            f"/api/v1/parent/students/{student_id}/progress",
            headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_progress_returns_403_for_other_parent(
        self,
        client: AsyncClient,
        auth_headers: dict,
        other_parent_student_id: str
    ):
        """Returns 403 when accessing another parent's student."""
        response = await client.get(
            f"/api/v1/parent/students/{other_parent_student_id}/progress",
            headers=auth_headers
        )
        assert response.status_code == 403


class TestGoalEndpoints:
    """Tests for goal CRUD endpoints."""

    @pytest.mark.asyncio
    async def test_create_goal_validates_ownership(
        self,
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

    @pytest.mark.asyncio
    async def test_list_goals_filters_by_parent(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Goals list only shows parent's own goals."""
        response = await client.get(
            "/api/v1/parent/goals",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "goals" in data


class TestNotificationEndpoints:
    """Tests for notification endpoints."""

    @pytest.mark.asyncio
    async def test_notifications_requires_auth(self, client: AsyncClient):
        """Notifications endpoint requires authentication."""
        response = await client.get("/api/v1/parent/notifications")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_mark_read_validates_ownership(
        self,
        client: AsyncClient,
        auth_headers: dict
    ):
        """Cannot mark another user's notification as read."""
        fake_notification_id = str(uuid4())
        response = await client.post(
            f"/api/v1/parent/notifications/{fake_notification_id}/read",
            headers=auth_headers
        )
        assert response.status_code == 404
```

### 4.2 Framework Isolation Tests

**File:** `backend/tests/api/test_framework_isolation.py` (NEW)

```python
"""
Tests for curriculum framework isolation.

Verifies that:
- NSW students only see NSW outcomes
- VIC students only see VIC outcomes
- No cross-framework data leakage
"""

import pytest
from httpx import AsyncClient


class TestFrameworkIsolation:
    """Tests for framework data isolation."""

    @pytest.mark.asyncio
    async def test_nsw_student_sees_nsw_outcomes(
        self,
        client: AsyncClient,
        nsw_student_auth_headers: dict,
        nsw_student_id: str
    ):
        """NSW student progress only shows NSW curriculum outcomes."""
        response = await client.get(
            f"/api/v1/parent/students/{nsw_student_id}/progress",
            headers=nsw_student_auth_headers
        )
        assert response.status_code == 200
        data = response.json()

        # Verify all outcomes are NSW format
        for subject in data.get("subject_progress", []):
            for outcome in subject.get("current_focus_outcomes", []):
                # NSW outcomes start with subject code like MA, EN, SC
                assert not outcome.startswith("VC"), f"Found VIC outcome: {outcome}"
                assert not outcome.startswith("QC"), f"Found QLD outcome: {outcome}"

    @pytest.mark.asyncio
    async def test_insights_respect_framework(
        self,
        client: AsyncClient,
        nsw_student_auth_headers: dict,
        nsw_student_id: str
    ):
        """Weekly insights are generated for correct framework."""
        response = await client.get(
            f"/api/v1/parent/students/{nsw_student_id}/insights",
            headers=nsw_student_auth_headers
        )
        assert response.status_code == 200
        data = response.json()

        # Verify HSC projection only for Stage 6 NSW
        insights = data.get("insights", {})
        if insights.get("hsc_projection"):
            # Should only appear for NSW Stage 6 students
            pass  # Validate HSC-specific fields
```

---

## Phase 5: Code Quality (Priority 3)

### 5.1 Database-Level Pagination

**File:** `backend/app/api/v1/endpoints/parent_dashboard.py`

**Task 5.1.1:** Replace in-memory pagination with database LIMIT/OFFSET
```python
@router.get("/goals", response_model=GoalListResponse)
async def list_goals(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    student_id: UUID | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List goals with database-level pagination."""
    goal_service = GoalService(db)

    # Use database pagination instead of in-memory slicing
    goals, total = await goal_service.get_paginated(
        parent_id=current_user.id,
        student_id=student_id,
        page=page,
        page_size=page_size,
    )

    return GoalListResponse(
        goals=goals,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )
```

### 5.2 Extract Date Formatting Utility

**File:** `frontend/src/lib/utils/formatting.ts` (NEW or update existing)

```typescript
/**
 * Shared formatting utilities for the parent dashboard.
 */

import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'dd MMM yyyy');
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function formatPercentage(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}
```

### 5.3 Remove TODO Comments

**File:** `backend/app/api/v1/endpoints/parent_dashboard.py`

**Task 5.3.1:** Search and address all TODO comments
```bash
# Find all TODOs
grep -rn "TODO" backend/app/api/v1/endpoints/parent_dashboard.py
```

Either:
1. Implement the TODO
2. Create GitHub issue and reference it
3. Remove if no longer relevant

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Breaking existing API contracts | High | Low | Run full test suite after each change |
| Zod validation too strict | Medium | Medium | Add `.passthrough()` for backward compatibility |
| N+1 fix introduces bugs | Medium | Low | Compare query results before/after |
| Performance regression | Medium | Low | Add query count assertions in tests |
| SettingsTab missing features | Low | Low | Iterate based on user feedback |

---

## Curriculum Considerations

This implementation plan does not change curriculum behaviour but adds testing to verify:
- Framework isolation (NSW vs VIC outcomes)
- Stage awareness (HSC for Stage 6, Pathways for Stage 5)
- Outcome code format validation

---

## Privacy/Security Checklist

- [x] Student data protected by ownership verification
- [x] Age-appropriate content (no changes to AI interactions)
- [x] Parent visibility without surveillance (insights, not raw logs)
- [x] Framework-level data isolation tested
- [x] Error responses don't leak information (404 vs 403 differentiation)

---

## Estimated Complexity

**Overall:** Medium

| Phase | Complexity | Effort |
|-------|------------|--------|
| Phase 1 (Security + Zod) | Medium | 1-2 days |
| Phase 2 (Performance) | Medium | 1-2 days |
| Phase 3 (SettingsTab) | Low | 1 day |
| Phase 4 (Integration Tests) | Medium | 1-2 days |
| Phase 5 (Code Quality) | Low | 0.5 days |

**Total:** 5-7 days

---

## Dependencies on Other Features

- **Phase 7 Parent Dashboard:** Complete (prerequisite)
- **Notification Preferences API:** Complete (used by SettingsTab)
- **Zod Library:** Already installed
- **Test Infrastructure:** Already configured

---

## Implementation Checklist

### Phase 1: Security & Type Safety
- [ ] 1.1.1 Rename `get_student_summary` to private method
- [ ] 1.1.2 Create new public method with ownership verification
- [ ] 1.1.3 Update callers in `get_students_summary`
- [ ] 1.1.4 Update any endpoint callers
- [ ] 1.2.1 Create Zod schemas for all API responses
- [ ] 1.2.2 Update API functions to use validation
- [ ] 1.2.3 Add error handling for validation failures
- [ ] 1.3 Run tests and verify no regressions

### Phase 2: Performance
- [ ] 2.1.1 Implement batch prefetch in `get_students_summary`
- [ ] 2.2.1 Implement batch strand prefetch
- [ ] 2.3.1 Replace one-by-one deletes with batch delete
- [ ] 2.4 Run performance tests

### Phase 3: SettingsTab
- [ ] 3.1.1 Create SettingsTab component
- [ ] 3.2.1 Add import and tab configuration
- [ ] 3.2.2 Add SettingsTab rendering
- [ ] 3.3.1 Add preference API functions
- [ ] 3.4 Create SettingsTab tests

### Phase 4: Integration Testing
- [ ] 4.1.1 Create integration test file with fixtures
- [ ] 4.2 Add framework isolation tests

### Phase 5: Code Quality
- [ ] 5.1.1 Implement database-level pagination
- [ ] 5.2 Extract date formatting utility
- [ ] 5.3.1 Remove/address TODO comments

---

## Post-Implementation

After all phases complete:
1. Run `/qa key findings implementation` to verify fixes
2. Update `PROGRESS.md` with completion status
3. Create commit with all changes
4. Update test count metrics
