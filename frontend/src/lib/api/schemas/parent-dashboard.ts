/**
 * Zod schemas for Parent Dashboard API responses.
 *
 * Provides runtime validation to protect against API contract changes
 * and ensure type safety for complex nested response structures.
 */
import { z } from 'zod';

// =============================================================================
// Base Schemas
// =============================================================================

const uuidSchema = z.string().uuid();
const dateTimeSchema = z.string().datetime({ offset: true }).nullable();
const prioritySchema = z.enum(['low', 'medium', 'high']);
const trendSchema = z.enum(['improving', 'stable', 'declining']);

// =============================================================================
// Dashboard Overview Schemas
// =============================================================================

export const DashboardStudentSummaryResponseSchema = z.object({
  id: uuidSchema,
  display_name: z.string(),
  grade_level: z.number().int().min(0).max(13),
  school_stage: z.string(),
  framework_id: uuidSchema.nullable(),
  total_xp: z.number().int().min(0),
  level: z.number().int().min(1),
  current_streak: z.number().int().min(0),
  longest_streak: z.number().int().min(0),
  last_active_at: dateTimeSchema,
  sessions_this_week: z.number().int().min(0),
  study_time_this_week_minutes: z.number().int().min(0),
});

export const DashboardOverviewResponseSchema = z.object({
  students: z.array(DashboardStudentSummaryResponseSchema),
  total_study_time_week_minutes: z.number().int().min(0),
  total_sessions_week: z.number().int().min(0),
  unread_notifications: z.number().int().min(0),
  active_goals_count: z.number().int().min(0),
  achievements_this_week: z.number().int().min(0),
});

// =============================================================================
// Student Progress Schemas
// =============================================================================

export const WeeklyStatsResponseSchema = z.object({
  study_time_minutes: z.number().int().min(0),
  study_goal_minutes: z.number().int().min(0),
  sessions_count: z.number().int().min(0),
  topics_covered: z.number().int().min(0),
  mastery_improvement: z.number(),
  flashcards_reviewed: z.number().int().min(0),
  questions_answered: z.number().int().min(0),
  accuracy_percentage: z.number().min(0).max(100).nullable(),
  goal_progress_percentage: z.number().min(0).max(100).optional().default(0),
});

export const StrandProgressResponseSchema = z.object({
  strand: z.string(),
  strand_code: z.string().nullable(),
  mastery: z.number().min(0).max(100),
  outcomes_mastered: z.number().int().min(0),
  outcomes_in_progress: z.number().int().min(0),
  outcomes_total: z.number().int().min(0),
  trend: trendSchema,
});

export const SubjectProgressResponseSchema = z.object({
  subject_id: uuidSchema,
  subject_code: z.string(),
  subject_name: z.string(),
  subject_color: z.string().nullable(),
  mastery_level: z.number().min(0).max(100),
  strand_progress: z.array(StrandProgressResponseSchema),
  recent_activity: dateTimeSchema,
  sessions_this_week: z.number().int().min(0),
  time_spent_this_week_minutes: z.number().int().min(0),
  xp_earned_this_week: z.number().int().min(0),
  current_focus_outcomes: z.array(z.string()),
});

export const FoundationStrengthResponseSchema = z.object({
  overall_strength: z.number().min(0).max(100),
  prior_year_mastery: z.number().min(0).max(100),
  gaps_identified: z.number().int().min(0),
  critical_gaps: z.array(z.string()),
  strengths: z.array(z.string()),
});

export const StudentProgressResponseSchema = z.object({
  student_id: uuidSchema,
  student_name: z.string(),
  grade_level: z.number().int().min(0).max(13),
  school_stage: z.string(),
  framework_code: z.string().nullable(),
  overall_mastery: z.number().min(0).max(100),
  foundation_strength: FoundationStrengthResponseSchema,
  weekly_stats: WeeklyStatsResponseSchema,
  subject_progress: z.array(SubjectProgressResponseSchema),
  mastery_change_30_days: z.number(),
  current_focus_subjects: z.array(z.string()),
});

// =============================================================================
// Weekly Insights Schemas
// =============================================================================

export const InsightItemResponseSchema = z.object({
  title: z.string(),
  description: z.string(),
  subject_id: uuidSchema.nullable(),
  subject_name: z.string().nullable(),
  priority: prioritySchema,
  outcome_codes: z.array(z.string()),
});

export const RecommendationItemResponseSchema = z.object({
  title: z.string(),
  description: z.string(),
  action_type: z.string(),
  subject_id: uuidSchema.nullable(),
  estimated_time_minutes: z.number().int().min(0).nullable(),
  priority: prioritySchema,
});

export const PathwayReadinessResponseSchema = z.object({
  current_pathway: z.string(),
  recommended_pathway: z.string().nullable(),
  ready_for_higher: z.boolean(),
  blocking_gaps: z.array(z.string()),
  strengths: z.array(z.string()),
  recommendation: z.string(),
  confidence: z.number().min(0).max(1),
});

export const HSCProjectionResponseSchema = z.object({
  predicted_band: z.number().int().min(1).max(6),
  band_range: z.string(),
  current_average: z.number().nullable(),
  atar_contribution: z.number().nullable(),
  days_until_hsc: z.number().int().min(0),
  strengths: z.array(z.string()),
  focus_areas: z.array(z.string()),
  exam_readiness: z.number().min(0).max(1),
  trajectory: z.string(),
});

export const WeeklyInsightsDataResponseSchema = z.object({
  wins: z.array(InsightItemResponseSchema),
  areas_to_watch: z.array(InsightItemResponseSchema),
  recommendations: z.array(RecommendationItemResponseSchema),
  teacher_talking_points: z.array(z.string()),
  pathway_readiness: PathwayReadinessResponseSchema.nullable(),
  hsc_projection: HSCProjectionResponseSchema.nullable(),
  summary: z.string().nullable(),
});

export const WeeklyInsightsResponseSchema = z.object({
  student_id: uuidSchema,
  week_start: z.string(),
  insights: WeeklyInsightsDataResponseSchema,
  generated_at: z.string().datetime({ offset: true }),
});

// =============================================================================
// Goal Schemas
// =============================================================================

export const GoalProgressResponseSchema = z.object({
  current_mastery: z.number().min(0).max(100).nullable(),
  progress_percentage: z.number().min(0).max(100),
  outcomes_mastered: z.number().int().min(0),
  outcomes_total: z.number().int().min(0),
  days_remaining: z.number().int().nullable(),
  is_on_track: z.boolean(),
});

export const GoalResponseSchema = z.object({
  id: uuidSchema,
  student_id: uuidSchema,
  parent_id: uuidSchema,
  title: z.string(),
  description: z.string().nullable(),
  target_outcomes: z.array(z.string()).nullable(),
  target_mastery: z.number().min(0).max(100).nullable(),
  target_date: z.string().nullable(),
  reward: z.string().nullable(),
  is_active: z.boolean(),
  achieved_at: dateTimeSchema,
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

export const GoalWithProgressResponseSchema = GoalResponseSchema.extend({
  progress: GoalProgressResponseSchema,
});

export const GoalListResponseSchema = z.object({
  goals: z.array(GoalWithProgressResponseSchema),
  total: z.number().int().min(0),
  active_count: z.number().int().min(0).optional().default(0),
  achieved_count: z.number().int().min(0).optional().default(0),
});

// =============================================================================
// Notification Schemas
// =============================================================================

const notificationPrioritySchema = z.enum(['low', 'normal', 'high']);

export const NotificationResponseSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  type: z.string(),
  title: z.string(),
  message: z.string(),
  priority: notificationPrioritySchema,
  related_student_id: uuidSchema.nullable(),
  related_subject_id: uuidSchema.nullable(),
  related_goal_id: uuidSchema.nullable(),
  delivery_method: z.string(),
  data: z.record(z.unknown()).nullable(),
  created_at: z.string().datetime({ offset: true }),
  sent_at: dateTimeSchema,
  read_at: dateTimeSchema,
});

export const NotificationListResponseSchema = z.object({
  notifications: z.array(NotificationResponseSchema),
  total: z.number().int().min(0),
  unread_count: z.number().int().min(0),
});

// =============================================================================
// Notification Preferences Schemas
// =============================================================================

const emailFrequencySchema = z.enum(['daily', 'weekly', 'monthly', 'never']);

export const NotificationPreferencesResponseSchema = z.object({
  user_id: uuidSchema,
  weekly_reports: z.boolean(),
  achievement_alerts: z.boolean(),
  concern_alerts: z.boolean(),
  goal_reminders: z.boolean(),
  insight_notifications: z.boolean(),
  email_frequency: emailFrequencySchema,
  preferred_time: z.string(),
  preferred_day: z.string(),
  timezone: z.string(),
  quiet_hours_start: z.string().nullable(),
  quiet_hours_end: z.string().nullable(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

// =============================================================================
// Type Exports (inferred from schemas)
// =============================================================================

export type DashboardStudentSummaryResponse = z.infer<typeof DashboardStudentSummaryResponseSchema>;
export type DashboardOverviewResponse = z.infer<typeof DashboardOverviewResponseSchema>;
export type WeeklyStatsResponse = z.infer<typeof WeeklyStatsResponseSchema>;
export type StrandProgressResponse = z.infer<typeof StrandProgressResponseSchema>;
export type SubjectProgressResponse = z.infer<typeof SubjectProgressResponseSchema>;
export type FoundationStrengthResponse = z.infer<typeof FoundationStrengthResponseSchema>;
export type StudentProgressResponse = z.infer<typeof StudentProgressResponseSchema>;
export type InsightItemResponse = z.infer<typeof InsightItemResponseSchema>;
export type RecommendationItemResponse = z.infer<typeof RecommendationItemResponseSchema>;
export type PathwayReadinessResponse = z.infer<typeof PathwayReadinessResponseSchema>;
export type HSCProjectionResponse = z.infer<typeof HSCProjectionResponseSchema>;
export type WeeklyInsightsDataResponse = z.infer<typeof WeeklyInsightsDataResponseSchema>;
export type WeeklyInsightsResponse = z.infer<typeof WeeklyInsightsResponseSchema>;
export type GoalProgressResponse = z.infer<typeof GoalProgressResponseSchema>;
export type GoalResponse = z.infer<typeof GoalResponseSchema>;
export type GoalWithProgressResponse = z.infer<typeof GoalWithProgressResponseSchema>;
export type GoalListResponse = z.infer<typeof GoalListResponseSchema>;
export type NotificationResponse = z.infer<typeof NotificationResponseSchema>;
export type NotificationListResponse = z.infer<typeof NotificationListResponseSchema>;
export type NotificationPreferencesResponse = z.infer<typeof NotificationPreferencesResponseSchema>;
