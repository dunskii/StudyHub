/**
 * Parent Dashboard API client for dashboard operations.
 *
 * Uses Zod schemas for runtime validation of API responses to ensure
 * type safety and catch API contract changes early.
 */

import { api } from './client';
import {
  DashboardOverviewResponseSchema,
  StudentProgressResponseSchema,
  WeeklyInsightsResponseSchema,
  GoalListResponseSchema,
  GoalWithProgressResponseSchema,
  NotificationListResponseSchema,
  NotificationResponseSchema,
  NotificationPreferencesResponseSchema,
  type DashboardOverviewResponse as DashboardOverviewApiResponse,
  type StudentProgressResponse as StudentProgressApiResponse,
  type WeeklyInsightsResponse as WeeklyInsightsApiResponse,
  type GoalWithProgressResponse as GoalWithProgressApiResponse,
  type NotificationResponse as NotificationApiResponse,
  type NotificationPreferencesResponse as NotificationPreferencesApiResponse,
} from './schemas/parent-dashboard';

// =============================================================================
// Types
// =============================================================================

export interface DashboardStudentSummary {
  id: string;
  displayName: string;
  gradeLevel: number;
  schoolStage: string;
  frameworkId: string | null;
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveAt: string | null;
  sessionsThisWeek: number;
  studyTimeThisWeekMinutes: number;
}

export interface DashboardOverview {
  students: DashboardStudentSummary[];
  totalStudyTimeWeekMinutes: number;
  totalSessionsWeek: number;
  unreadNotifications: number;
  activeGoalsCount: number;
  achievementsThisWeek: number;
}

export interface WeeklyStats {
  studyTimeMinutes: number;
  studyGoalMinutes: number;
  sessionsCount: number;
  topicsCovered: number;
  masteryImprovement: number;
  flashcardsReviewed: number;
  questionsAnswered: number;
  accuracyPercentage: number | null;
  goalProgressPercentage: number;
}

export interface StrandProgress {
  strand: string;
  strandCode: string | null;
  mastery: number;
  outcomesMastered: number;
  outcomesInProgress: number;
  outcomesTotal: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface SubjectProgress {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  subjectColor: string | null;
  masteryLevel: number;
  strandProgress: StrandProgress[];
  recentActivity: string | null;
  sessionsThisWeek: number;
  timeSpentThisWeekMinutes: number;
  xpEarnedThisWeek: number;
  currentFocusOutcomes: string[];
}

export interface FoundationStrength {
  overallStrength: number;
  priorYearMastery: number;
  gapsIdentified: number;
  criticalGaps: string[];
  strengths: string[];
}

export interface StudentProgress {
  studentId: string;
  studentName: string;
  gradeLevel: number;
  schoolStage: string;
  frameworkCode: string | null;
  overallMastery: number;
  foundationStrength: FoundationStrength;
  weeklyStats: WeeklyStats;
  subjectProgress: SubjectProgress[];
  masteryChange30Days: number;
  currentFocusSubjects: string[];
}

export interface InsightItem {
  title: string;
  description: string;
  subjectId: string | null;
  subjectName: string | null;
  priority: 'low' | 'medium' | 'high';
  outcomeCodes: string[];
}

export interface RecommendationItem {
  title: string;
  description: string;
  actionType: string;
  subjectId: string | null;
  estimatedTimeMinutes: number | null;
  priority: 'low' | 'medium' | 'high';
}

export interface PathwayReadiness {
  currentPathway: string;
  recommendedPathway: string | null;
  readyForHigher: boolean;
  blockingGaps: string[];
  strengths: string[];
  recommendation: string;
  confidence: number;
}

export interface HSCProjection {
  predictedBand: number;
  bandRange: string;
  currentAverage: number | null;
  atarContribution: number | null;
  daysUntilHsc: number;
  strengths: string[];
  focusAreas: string[];
  examReadiness: number;
  trajectory: string;
}

export interface WeeklyInsightsData {
  wins: InsightItem[];
  areasToWatch: InsightItem[];
  recommendations: RecommendationItem[];
  teacherTalkingPoints: string[];
  pathwayReadiness: PathwayReadiness | null;
  hscProjection: HSCProjection | null;
  summary: string | null;
}

export interface WeeklyInsights {
  studentId: string;
  weekStart: string;
  insights: WeeklyInsightsData;
  generatedAt: string;
}

export interface Goal {
  id: string;
  studentId: string;
  parentId: string;
  title: string;
  description: string | null;
  targetOutcomes: string[] | null;
  targetMastery: number | null;
  targetDate: string | null;
  reward: string | null;
  isActive: boolean;
  achievedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GoalProgress {
  currentMastery: number | null;
  progressPercentage: number;
  outcomesMastered: number;
  outcomesTotal: number;
  daysRemaining: number | null;
  isOnTrack: boolean;
}

export interface GoalWithProgress extends Goal {
  progress: GoalProgress;
}

export interface GoalListResponse {
  goals: GoalWithProgress[];
  total: number;
  activeCount: number;
  achievedCount: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high';
  relatedStudentId: string | null;
  relatedSubjectId: string | null;
  relatedGoalId: string | null;
  deliveryMethod: string;
  data: Record<string, unknown> | null;
  createdAt: string;
  sentAt: string | null;
  readAt: string | null;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

export interface NotificationPreferences {
  userId: string;
  weeklyReports: boolean;
  achievementAlerts: boolean;
  concernAlerts: boolean;
  goalReminders: boolean;
  insightNotifications: boolean;
  emailFrequency: 'daily' | 'weekly' | 'monthly' | 'never';
  preferredTime: string;
  preferredDay: string;
  timezone: string;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalRequest {
  student_id: string;
  title: string;
  description?: string;
  target_outcomes?: string[];
  target_mastery?: number;
  target_date?: string;
  reward?: string;
}

export interface UpdateGoalRequest {
  title?: string;
  description?: string;
  target_outcomes?: string[];
  target_mastery?: number;
  target_date?: string;
  reward?: string;
  is_active?: boolean;
}

export interface UpdateNotificationPreferencesRequest {
  weekly_reports?: boolean;
  achievement_alerts?: boolean;
  concern_alerts?: boolean;
  goal_reminders?: boolean;
  insight_notifications?: boolean;
  email_frequency?: string;
  preferred_time?: string;
  preferred_day?: string;
  timezone?: string;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

// =============================================================================
// Response Transformers (with Zod validation)
// =============================================================================

function transformDashboardOverview(response: DashboardOverviewApiResponse): DashboardOverview {
  return {
    students: response.students.map((s) => ({
      id: s.id,
      displayName: s.display_name,
      gradeLevel: s.grade_level,
      schoolStage: s.school_stage,
      frameworkId: s.framework_id,
      totalXp: s.total_xp,
      level: s.level,
      currentStreak: s.current_streak,
      longestStreak: s.longest_streak,
      lastActiveAt: s.last_active_at,
      sessionsThisWeek: s.sessions_this_week,
      studyTimeThisWeekMinutes: s.study_time_this_week_minutes,
    })),
    totalStudyTimeWeekMinutes: response.total_study_time_week_minutes,
    totalSessionsWeek: response.total_sessions_week,
    unreadNotifications: response.unread_notifications,
    activeGoalsCount: response.active_goals_count,
    achievementsThisWeek: response.achievements_this_week,
  };
}

function transformStudentProgress(response: StudentProgressApiResponse): StudentProgress {
  return {
    studentId: response.student_id,
    studentName: response.student_name,
    gradeLevel: response.grade_level,
    schoolStage: response.school_stage,
    frameworkCode: response.framework_code,
    overallMastery: response.overall_mastery,
    foundationStrength: {
      overallStrength: response.foundation_strength.overall_strength,
      priorYearMastery: response.foundation_strength.prior_year_mastery,
      gapsIdentified: response.foundation_strength.gaps_identified,
      criticalGaps: response.foundation_strength.critical_gaps,
      strengths: response.foundation_strength.strengths,
    },
    weeklyStats: {
      studyTimeMinutes: response.weekly_stats.study_time_minutes,
      studyGoalMinutes: response.weekly_stats.study_goal_minutes,
      sessionsCount: response.weekly_stats.sessions_count,
      topicsCovered: response.weekly_stats.topics_covered,
      masteryImprovement: response.weekly_stats.mastery_improvement,
      flashcardsReviewed: response.weekly_stats.flashcards_reviewed,
      questionsAnswered: response.weekly_stats.questions_answered,
      accuracyPercentage: response.weekly_stats.accuracy_percentage,
      goalProgressPercentage: response.weekly_stats.goal_progress_percentage ?? 0,
    },
    subjectProgress: response.subject_progress.map((sp) => ({
      subjectId: sp.subject_id,
      subjectCode: sp.subject_code,
      subjectName: sp.subject_name,
      subjectColor: sp.subject_color,
      masteryLevel: sp.mastery_level,
      strandProgress: sp.strand_progress.map((strand) => ({
        strand: strand.strand,
        strandCode: strand.strand_code,
        mastery: strand.mastery,
        outcomesMastered: strand.outcomes_mastered,
        outcomesInProgress: strand.outcomes_in_progress,
        outcomesTotal: strand.outcomes_total,
        trend: strand.trend,
      })),
      recentActivity: sp.recent_activity,
      sessionsThisWeek: sp.sessions_this_week,
      timeSpentThisWeekMinutes: sp.time_spent_this_week_minutes,
      xpEarnedThisWeek: sp.xp_earned_this_week,
      currentFocusOutcomes: sp.current_focus_outcomes,
    })),
    masteryChange30Days: response.mastery_change_30_days,
    currentFocusSubjects: response.current_focus_subjects,
  };
}

function transformWeeklyInsights(response: WeeklyInsightsApiResponse): WeeklyInsights {
  return {
    studentId: response.student_id,
    weekStart: response.week_start,
    insights: {
      wins: response.insights.wins.map((item) => ({
        title: item.title,
        description: item.description,
        subjectId: item.subject_id,
        subjectName: item.subject_name,
        priority: item.priority,
        outcomeCodes: item.outcome_codes,
      })),
      areasToWatch: response.insights.areas_to_watch.map((item) => ({
        title: item.title,
        description: item.description,
        subjectId: item.subject_id,
        subjectName: item.subject_name,
        priority: item.priority,
        outcomeCodes: item.outcome_codes,
      })),
      recommendations: response.insights.recommendations.map((item) => ({
        title: item.title,
        description: item.description,
        actionType: item.action_type,
        subjectId: item.subject_id,
        estimatedTimeMinutes: item.estimated_time_minutes,
        priority: item.priority,
      })),
      teacherTalkingPoints: response.insights.teacher_talking_points,
      pathwayReadiness: response.insights.pathway_readiness
        ? {
            currentPathway: response.insights.pathway_readiness.current_pathway,
            recommendedPathway: response.insights.pathway_readiness.recommended_pathway,
            readyForHigher: response.insights.pathway_readiness.ready_for_higher,
            blockingGaps: response.insights.pathway_readiness.blocking_gaps,
            strengths: response.insights.pathway_readiness.strengths,
            recommendation: response.insights.pathway_readiness.recommendation,
            confidence: response.insights.pathway_readiness.confidence,
          }
        : null,
      hscProjection: response.insights.hsc_projection
        ? {
            predictedBand: response.insights.hsc_projection.predicted_band,
            bandRange: response.insights.hsc_projection.band_range,
            currentAverage: response.insights.hsc_projection.current_average,
            atarContribution: response.insights.hsc_projection.atar_contribution,
            daysUntilHsc: response.insights.hsc_projection.days_until_hsc,
            strengths: response.insights.hsc_projection.strengths,
            focusAreas: response.insights.hsc_projection.focus_areas,
            examReadiness: response.insights.hsc_projection.exam_readiness,
            trajectory: response.insights.hsc_projection.trajectory,
          }
        : null,
      summary: response.insights.summary,
    },
    generatedAt: response.generated_at,
  };
}

function transformGoalWithProgressValidated(response: GoalWithProgressApiResponse): GoalWithProgress {
  return {
    id: response.id,
    studentId: response.student_id,
    parentId: response.parent_id,
    title: response.title,
    description: response.description,
    targetOutcomes: response.target_outcomes,
    targetMastery: response.target_mastery,
    targetDate: response.target_date,
    reward: response.reward,
    isActive: response.is_active,
    achievedAt: response.achieved_at,
    createdAt: response.created_at,
    updatedAt: response.updated_at,
    progress: {
      currentMastery: response.progress.current_mastery,
      progressPercentage: response.progress.progress_percentage,
      outcomesMastered: response.progress.outcomes_mastered,
      outcomesTotal: response.progress.outcomes_total,
      daysRemaining: response.progress.days_remaining,
      isOnTrack: response.progress.is_on_track,
    },
  };
}

function transformNotificationValidated(response: NotificationApiResponse): Notification {
  return {
    id: response.id,
    userId: response.user_id,
    type: response.type,
    title: response.title,
    message: response.message,
    priority: response.priority,
    relatedStudentId: response.related_student_id,
    relatedSubjectId: response.related_subject_id,
    relatedGoalId: response.related_goal_id,
    deliveryMethod: response.delivery_method,
    data: response.data,
    createdAt: response.created_at,
    sentAt: response.sent_at,
    readAt: response.read_at,
  };
}

function transformNotificationPreferencesValidated(
  response: NotificationPreferencesApiResponse
): NotificationPreferences {
  return {
    userId: response.user_id,
    weeklyReports: response.weekly_reports,
    achievementAlerts: response.achievement_alerts,
    concernAlerts: response.concern_alerts,
    goalReminders: response.goal_reminders,
    insightNotifications: response.insight_notifications,
    emailFrequency: response.email_frequency,
    preferredTime: response.preferred_time,
    preferredDay: response.preferred_day,
    timezone: response.timezone,
    quietHoursStart: response.quiet_hours_start,
    quietHoursEnd: response.quiet_hours_end,
    createdAt: response.created_at,
    updatedAt: response.updated_at,
  };
}

// =============================================================================
// API Client
// =============================================================================

export const parentDashboardApi = {
  /**
   * Get dashboard overview with all children's summaries.
   * Validates response with Zod schema.
   */
  async getDashboard(): Promise<DashboardOverview> {
    const response = await api.get<unknown>('/api/v1/parent/dashboard');
    const validated = DashboardOverviewResponseSchema.parse(response);
    return transformDashboardOverview(validated);
  },

  /**
   * Get detailed progress for a specific student.
   * Validates response with Zod schema.
   */
  async getStudentProgress(studentId: string): Promise<StudentProgress> {
    const response = await api.get<unknown>(
      `/api/v1/parent/students/${studentId}/progress`
    );
    const validated = StudentProgressResponseSchema.parse(response);
    return transformStudentProgress(validated);
  },

  /**
   * Get weekly AI insights for a student.
   * Validates response with Zod schema.
   */
  async getWeeklyInsights(
    studentId: string,
    options?: { weekStart?: string; forceRegenerate?: boolean }
  ): Promise<WeeklyInsights> {
    const params = new URLSearchParams();
    if (options?.weekStart) params.set('week_start', options.weekStart);
    if (options?.forceRegenerate) params.set('force_regenerate', 'true');

    const url = `/api/v1/parent/students/${studentId}/insights${params.toString() ? `?${params}` : ''}`;
    const response = await api.get<unknown>(url);
    const validated = WeeklyInsightsResponseSchema.parse(response);
    return transformWeeklyInsights(validated);
  },

  /**
   * List goals (optionally filtered by student).
   * Validates response with Zod schema.
   */
  async getGoals(options?: {
    studentId?: string;
    activeOnly?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<GoalListResponse> {
    const params = new URLSearchParams();
    if (options?.studentId) params.set('student_id', options.studentId);
    if (options?.activeOnly) params.set('active_only', 'true');
    if (options?.page) params.set('page', options.page.toString());
    if (options?.pageSize) params.set('page_size', options.pageSize.toString());

    const url = `/api/v1/parent/goals${params.toString() ? `?${params}` : ''}`;
    const response = await api.get<unknown>(url);
    const validated = GoalListResponseSchema.parse(response);

    return {
      goals: validated.goals.map(transformGoalWithProgressValidated),
      total: validated.total,
      activeCount: validated.active_count ?? 0,
      achievedCount: validated.achieved_count ?? 0,
    };
  },

  /**
   * Create a new goal.
   * Validates response with Zod schema.
   */
  async createGoal(data: CreateGoalRequest): Promise<GoalWithProgress> {
    const response = await api.post<unknown>('/api/v1/parent/goals', data);
    const validated = GoalWithProgressResponseSchema.parse(response);
    return transformGoalWithProgressValidated(validated);
  },

  /**
   * Update a goal.
   * Validates response with Zod schema.
   */
  async updateGoal(goalId: string, data: UpdateGoalRequest): Promise<GoalWithProgress> {
    const response = await api.put<unknown>(`/api/v1/parent/goals/${goalId}`, data);
    const validated = GoalWithProgressResponseSchema.parse(response);
    return transformGoalWithProgressValidated(validated);
  },

  /**
   * Delete a goal.
   */
  async deleteGoal(goalId: string): Promise<void> {
    await api.delete(`/api/v1/parent/goals/${goalId}`);
  },

  /**
   * Check if a goal has been achieved.
   * Validates response with Zod schema.
   */
  async checkGoalAchievement(goalId: string): Promise<GoalWithProgress> {
    const response = await api.post<unknown>(
      `/api/v1/parent/goals/${goalId}/check-achievement`
    );
    const validated = GoalWithProgressResponseSchema.parse(response);
    return transformGoalWithProgressValidated(validated);
  },

  /**
   * Get notifications.
   * Validates response with Zod schema.
   */
  async getNotifications(options?: {
    unreadOnly?: boolean;
    type?: string;
    page?: number;
    pageSize?: number;
  }): Promise<NotificationListResponse> {
    const params = new URLSearchParams();
    if (options?.unreadOnly) params.set('unread_only', 'true');
    if (options?.type) params.set('notification_type', options.type);
    if (options?.page) params.set('page', options.page.toString());
    if (options?.pageSize) params.set('page_size', options.pageSize.toString());

    const url = `/api/v1/parent/notifications${params.toString() ? `?${params}` : ''}`;
    const response = await api.get<unknown>(url);
    const validated = NotificationListResponseSchema.parse(response);

    return {
      notifications: validated.notifications.map(transformNotificationValidated),
      total: validated.total,
      unreadCount: validated.unread_count,
    };
  },

  /**
   * Mark a notification as read.
   * Validates response with Zod schema.
   */
  async markNotificationRead(notificationId: string): Promise<Notification> {
    const response = await api.post<unknown>(
      `/api/v1/parent/notifications/${notificationId}/read`
    );
    const validated = NotificationResponseSchema.parse(response);
    return transformNotificationValidated(validated);
  },

  /**
   * Mark all notifications as read.
   */
  async markAllNotificationsRead(): Promise<{ markedRead: number }> {
    const response = await api.post<{ marked_read: number }>(
      '/api/v1/parent/notifications/read-all'
    );
    return { markedRead: response.marked_read };
  },

  /**
   * Get notification preferences.
   * Validates response with Zod schema.
   */
  async getNotificationPreferences(): Promise<NotificationPreferences> {
    const response = await api.get<unknown>(
      '/api/v1/parent/notification-preferences'
    );
    const validated = NotificationPreferencesResponseSchema.parse(response);
    return transformNotificationPreferencesValidated(validated);
  },

  /**
   * Update notification preferences.
   * Validates response with Zod schema.
   */
  async updateNotificationPreferences(
    data: UpdateNotificationPreferencesRequest
  ): Promise<NotificationPreferences> {
    const response = await api.put<unknown>(
      '/api/v1/parent/notification-preferences',
      data
    );
    const validated = NotificationPreferencesResponseSchema.parse(response);
    return transformNotificationPreferencesValidated(validated);
  },
};

