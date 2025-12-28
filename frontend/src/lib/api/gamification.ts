/**
 * Gamification API client for XP, levels, achievements, and streaks.
 */

import { api } from './client';

// =============================================================================
// Types
// =============================================================================

export type AchievementCategory =
  | 'engagement'
  | 'curriculum'
  | 'milestone'
  | 'subject'
  | 'challenge';

export interface StreakInfo {
  current: number;
  longest: number;
  lastActiveDate: string | null;
  multiplier: number;
  nextMilestone: number | null;
  daysToMilestone: number | null;
}

export interface LevelInfo {
  level: number;
  title: string;
  currentXp: number;
  levelStartXp: number;
  nextLevelXp: number | null;
  progressPercent: number;
  isMaxLevel: boolean;
}

export interface SubjectLevelInfo {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  xpEarned: number;
  level: number;
  title: string;
  progressPercent: number;
}

export interface Achievement {
  code: string;
  name: string;
  description: string;
  category: AchievementCategory;
  subjectCode: string | null;
  icon: string;
  xpReward: number;
  unlockedAt: string;
}

export interface AchievementWithProgress {
  code: string;
  name: string;
  description: string;
  category: AchievementCategory;
  subjectCode: string | null;
  icon: string;
  xpReward: number;
  isUnlocked: boolean;
  unlockedAt: string | null;
  progressPercent: number;
  progressText: string | null;
}

export interface AchievementDefinition {
  code: string;
  name: string;
  description: string;
  category: AchievementCategory;
  subjectCode: string | null;
  xpReward: number;
  icon: string;
}

export interface GamificationStats {
  totalXp: number;
  level: number;
  levelTitle: string;
  levelProgressPercent: number;
  nextLevelXp: number | null;
  streak: StreakInfo;
  achievementsUnlocked: number;
  achievementsTotal: number;
  recentAchievements: Achievement[];
  subjectsWithProgress: number;
}

export interface GamificationStatsDetailed extends GamificationStats {
  achievements: AchievementWithProgress[];
  subjectStats: SubjectLevelInfo[];
  recentXpEvents: XpEvent[];
}

export interface XpEvent {
  amount: number;
  finalAmount: number;
  source: string;
  multiplier: number;
  timestamp: string;
  subjectId: string | null;
  sessionId: string | null;
}

export interface ParentGamificationSummary {
  studentId: string;
  studentName: string;
  totalXp: number;
  level: number;
  levelTitle: string;
  streakCurrent: number;
  streakLongest: number;
  achievementsUnlocked: number;
  achievementsTotal: number;
  recentAchievements: Achievement[];
  levelProgressPercent: number;
}

// =============================================================================
// API Response Types (snake_case from backend)
// =============================================================================

interface StreakInfoApi {
  current: number;
  longest: number;
  last_active_date: string | null;
  multiplier: number;
  next_milestone: number | null;
  days_to_milestone: number | null;
}

interface LevelInfoApi {
  level: number;
  title: string;
  current_xp: number;
  level_start_xp: number;
  next_level_xp: number | null;
  progress_percent: number;
  is_max_level: boolean;
}

interface SubjectLevelInfoApi {
  subject_id: string;
  subject_code: string;
  subject_name: string;
  xp_earned: number;
  level: number;
  title: string;
  progress_percent: number;
}

interface AchievementApi {
  code: string;
  name: string;
  description: string;
  category: AchievementCategory;
  subject_code: string | null;
  icon: string;
  xp_reward: number;
  unlocked_at: string;
}

interface AchievementWithProgressApi {
  code: string;
  name: string;
  description: string;
  category: AchievementCategory;
  subject_code: string | null;
  icon: string;
  xp_reward: number;
  is_unlocked: boolean;
  unlocked_at: string | null;
  progress_percent: number;
  progress_text: string | null;
}

interface AchievementDefinitionApi {
  code: string;
  name: string;
  description: string;
  category: AchievementCategory;
  subject_code: string | null;
  xp_reward: number;
  icon: string;
}

interface GamificationStatsApi {
  total_xp: number;
  level: number;
  level_title: string;
  level_progress_percent: number;
  next_level_xp: number | null;
  streak: StreakInfoApi;
  achievements_unlocked: number;
  achievements_total: number;
  recent_achievements: AchievementApi[];
  subjects_with_progress: number;
}

interface GamificationStatsDetailedApi extends GamificationStatsApi {
  achievements: AchievementWithProgressApi[];
  subject_stats: SubjectLevelInfoApi[];
  recent_xp_events: XpEventApi[];
}

interface XpEventApi {
  amount: number;
  final_amount: number;
  source: string;
  multiplier: number;
  timestamp: string;
  subject_id: string | null;
  session_id: string | null;
}

interface ParentGamificationSummaryApi {
  student_id: string;
  student_name: string;
  total_xp: number;
  level: number;
  level_title: string;
  streak_current: number;
  streak_longest: number;
  achievements_unlocked: number;
  achievements_total: number;
  recent_achievements: AchievementApi[];
  level_progress_percent: number;
}

// =============================================================================
// Transformers
// =============================================================================

function transformStreak(api: StreakInfoApi): StreakInfo {
  return {
    current: api.current,
    longest: api.longest,
    lastActiveDate: api.last_active_date,
    multiplier: api.multiplier,
    nextMilestone: api.next_milestone,
    daysToMilestone: api.days_to_milestone,
  };
}

function transformLevel(api: LevelInfoApi): LevelInfo {
  return {
    level: api.level,
    title: api.title,
    currentXp: api.current_xp,
    levelStartXp: api.level_start_xp,
    nextLevelXp: api.next_level_xp,
    progressPercent: api.progress_percent,
    isMaxLevel: api.is_max_level,
  };
}

function transformSubjectLevel(api: SubjectLevelInfoApi): SubjectLevelInfo {
  return {
    subjectId: api.subject_id,
    subjectCode: api.subject_code,
    subjectName: api.subject_name,
    xpEarned: api.xp_earned,
    level: api.level,
    title: api.title,
    progressPercent: api.progress_percent,
  };
}

function transformAchievement(api: AchievementApi): Achievement {
  return {
    code: api.code,
    name: api.name,
    description: api.description,
    category: api.category,
    subjectCode: api.subject_code,
    icon: api.icon,
    xpReward: api.xp_reward,
    unlockedAt: api.unlocked_at,
  };
}

function transformAchievementWithProgress(
  api: AchievementWithProgressApi
): AchievementWithProgress {
  return {
    code: api.code,
    name: api.name,
    description: api.description,
    category: api.category,
    subjectCode: api.subject_code,
    icon: api.icon,
    xpReward: api.xp_reward,
    isUnlocked: api.is_unlocked,
    unlockedAt: api.unlocked_at,
    progressPercent: api.progress_percent,
    progressText: api.progress_text,
  };
}

function transformAchievementDefinition(
  api: AchievementDefinitionApi
): AchievementDefinition {
  return {
    code: api.code,
    name: api.name,
    description: api.description,
    category: api.category,
    subjectCode: api.subject_code,
    xpReward: api.xp_reward,
    icon: api.icon,
  };
}

function transformXpEvent(api: XpEventApi): XpEvent {
  return {
    amount: api.amount,
    finalAmount: api.final_amount,
    source: api.source,
    multiplier: api.multiplier,
    timestamp: api.timestamp,
    subjectId: api.subject_id,
    sessionId: api.session_id,
  };
}

function transformStats(api: GamificationStatsApi): GamificationStats {
  return {
    totalXp: api.total_xp,
    level: api.level,
    levelTitle: api.level_title,
    levelProgressPercent: api.level_progress_percent,
    nextLevelXp: api.next_level_xp,
    streak: transformStreak(api.streak),
    achievementsUnlocked: api.achievements_unlocked,
    achievementsTotal: api.achievements_total,
    recentAchievements: api.recent_achievements.map(transformAchievement),
    subjectsWithProgress: api.subjects_with_progress,
  };
}

function transformStatsDetailed(
  api: GamificationStatsDetailedApi
): GamificationStatsDetailed {
  return {
    ...transformStats(api),
    achievements: api.achievements.map(transformAchievementWithProgress),
    subjectStats: api.subject_stats.map(transformSubjectLevel),
    recentXpEvents: api.recent_xp_events.map(transformXpEvent),
  };
}

function transformParentSummary(
  api: ParentGamificationSummaryApi
): ParentGamificationSummary {
  return {
    studentId: api.student_id,
    studentName: api.student_name,
    totalXp: api.total_xp,
    level: api.level,
    levelTitle: api.level_title,
    streakCurrent: api.streak_current,
    streakLongest: api.streak_longest,
    achievementsUnlocked: api.achievements_unlocked,
    achievementsTotal: api.achievements_total,
    recentAchievements: api.recent_achievements.map(transformAchievement),
    levelProgressPercent: api.level_progress_percent,
  };
}

// =============================================================================
// API Client
// =============================================================================

export const gamificationApi = {
  /**
   * Get gamification stats for a student.
   */
  async getStats(studentId: string): Promise<GamificationStats> {
    const response = await api.get<GamificationStatsApi>(
      `/api/v1/gamification/students/${studentId}/stats`
    );
    return transformStats(response);
  },

  /**
   * Get detailed gamification stats including all achievements and subjects.
   */
  async getDetailedStats(studentId: string): Promise<GamificationStatsDetailed> {
    const response = await api.get<GamificationStatsDetailedApi>(
      `/api/v1/gamification/students/${studentId}/stats/detailed`
    );
    return transformStatsDetailed(response);
  },

  /**
   * Get level information for a student.
   */
  async getLevel(studentId: string): Promise<LevelInfo> {
    const response = await api.get<LevelInfoApi>(
      `/api/v1/gamification/students/${studentId}/level`
    );
    return transformLevel(response);
  },

  /**
   * Get streak information for a student.
   */
  async getStreak(studentId: string): Promise<StreakInfo> {
    const response = await api.get<StreakInfoApi>(
      `/api/v1/gamification/students/${studentId}/streak`
    );
    return transformStreak(response);
  },

  /**
   * Get achievements with progress for a student.
   */
  async getAchievements(
    studentId: string,
    category?: AchievementCategory
  ): Promise<AchievementWithProgress[]> {
    let url = `/api/v1/gamification/students/${studentId}/achievements`;
    if (category) {
      url += `?category=${category}`;
    }
    const response = await api.get<AchievementWithProgressApi[]>(url);
    return response.map(transformAchievementWithProgress);
  },

  /**
   * Get only unlocked achievements for a student.
   */
  async getUnlockedAchievements(studentId: string): Promise<Achievement[]> {
    const response = await api.get<AchievementApi[]>(
      `/api/v1/gamification/students/${studentId}/achievements/unlocked`
    );
    return response.map(transformAchievement);
  },

  /**
   * Get all achievement definitions (available achievements).
   */
  async getAchievementDefinitions(
    category?: AchievementCategory,
    subjectCode?: string
  ): Promise<AchievementDefinition[]> {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (subjectCode) params.set('subject_code', subjectCode);

    const url = `/api/v1/gamification/achievements/definitions${params.toString() ? `?${params}` : ''}`;
    const response = await api.get<AchievementDefinitionApi[]>(url);
    return response.map(transformAchievementDefinition);
  },

  /**
   * Get subject progress for all enrolled subjects.
   */
  async getSubjectProgress(studentId: string): Promise<SubjectLevelInfo[]> {
    const response = await api.get<SubjectLevelInfoApi[]>(
      `/api/v1/gamification/students/${studentId}/subjects`
    );
    return response.map(transformSubjectLevel);
  },

  /**
   * Get subject progress for a specific subject.
   */
  async getSubjectProgressById(
    studentId: string,
    subjectId: string
  ): Promise<SubjectLevelInfo> {
    const response = await api.get<SubjectLevelInfoApi>(
      `/api/v1/gamification/students/${studentId}/subjects/${subjectId}`
    );
    return transformSubjectLevel(response);
  },

  // Parent endpoints
  /**
   * Get gamification summary for a child (parent view).
   */
  async getChildSummary(studentId: string): Promise<ParentGamificationSummary> {
    const response = await api.get<ParentGamificationSummaryApi>(
      `/api/v1/gamification/parent/students/${studentId}`
    );
    return transformParentSummary(response);
  },

  /**
   * Get unlocked achievements for a child (parent view).
   */
  async getChildAchievements(studentId: string): Promise<Achievement[]> {
    const response = await api.get<AchievementApi[]>(
      `/api/v1/gamification/parent/students/${studentId}/achievements`
    );
    return response.map(transformAchievement);
  },

  /**
   * Get subject progress for a child (parent view).
   */
  async getChildSubjectProgress(studentId: string): Promise<SubjectLevelInfo[]> {
    const response = await api.get<SubjectLevelInfoApi[]>(
      `/api/v1/gamification/parent/students/${studentId}/subjects`
    );
    return response.map(transformSubjectLevel);
  },
};
