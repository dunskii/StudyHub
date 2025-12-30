/**
 * React Query hooks for gamification data fetching.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  gamificationApi,
  type AchievementCategory,
} from '@/lib/api/gamification';
import { useGamificationStore } from '@/stores/gamificationStore';

// Query keys
export const gamificationKeys = {
  all: ['gamification'] as const,
  stats: (studentId: string) =>
    [...gamificationKeys.all, 'stats', studentId] as const,
  statsDetailed: (studentId: string) =>
    [...gamificationKeys.all, 'stats', 'detailed', studentId] as const,
  level: (studentId: string) =>
    [...gamificationKeys.all, 'level', studentId] as const,
  streak: (studentId: string) =>
    [...gamificationKeys.all, 'streak', studentId] as const,
  achievements: (studentId: string, category?: AchievementCategory) =>
    [...gamificationKeys.all, 'achievements', studentId, { category }] as const,
  achievementsUnlocked: (studentId: string) =>
    [...gamificationKeys.all, 'achievements', 'unlocked', studentId] as const,
  achievementDefinitions: (category?: AchievementCategory, subjectCode?: string) =>
    [...gamificationKeys.all, 'definitions', { category, subjectCode }] as const,
  subjectProgress: (studentId: string) =>
    [...gamificationKeys.all, 'subjects', studentId] as const,
  subjectProgressById: (studentId: string, subjectId: string) =>
    [...gamificationKeys.all, 'subjects', studentId, subjectId] as const,
  // Parent endpoints
  parentSummary: (studentId: string) =>
    [...gamificationKeys.all, 'parent', 'summary', studentId] as const,
  parentAchievements: (studentId: string) =>
    [...gamificationKeys.all, 'parent', 'achievements', studentId] as const,
  parentSubjects: (studentId: string) =>
    [...gamificationKeys.all, 'parent', 'subjects', studentId] as const,
};

// =============================================================================
// Student Hooks
// =============================================================================

/**
 * Fetch gamification stats for a student.
 */
export function useGamificationStats(studentId: string | undefined) {
  const setStats = useGamificationStore((state) => state.setStats);

  return useQuery({
    queryKey: gamificationKeys.stats(studentId!),
    queryFn: async () => {
      const stats = await gamificationApi.getStats(studentId!);
      setStats(stats, studentId!);
      return stats;
    },
    enabled: !!studentId,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Fetch detailed gamification stats including all achievements and subjects.
 */
export function useGamificationStatsDetailed(studentId: string | undefined) {
  return useQuery({
    queryKey: gamificationKeys.statsDetailed(studentId!),
    queryFn: () => gamificationApi.getDetailedStats(studentId!),
    enabled: !!studentId,
    staleTime: 30000,
  });
}

/**
 * Fetch level information for a student.
 */
export function useLevelInfo(studentId: string | undefined) {
  return useQuery({
    queryKey: gamificationKeys.level(studentId!),
    queryFn: () => gamificationApi.getLevel(studentId!),
    enabled: !!studentId,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Fetch streak information for a student.
 */
export function useStreakInfo(studentId: string | undefined) {
  return useQuery({
    queryKey: gamificationKeys.streak(studentId!),
    queryFn: () => gamificationApi.getStreak(studentId!),
    enabled: !!studentId,
    staleTime: 60000,
  });
}

/**
 * Fetch achievements with progress for a student.
 */
export function useAchievements(
  studentId: string | undefined,
  category?: AchievementCategory
) {
  return useQuery({
    queryKey: gamificationKeys.achievements(studentId!, category),
    queryFn: () => gamificationApi.getAchievements(studentId!, category),
    enabled: !!studentId,
    staleTime: 60000,
  });
}

/**
 * Fetch only unlocked achievements for a student.
 */
export function useUnlockedAchievements(studentId: string | undefined) {
  return useQuery({
    queryKey: gamificationKeys.achievementsUnlocked(studentId!),
    queryFn: () => gamificationApi.getUnlockedAchievements(studentId!),
    enabled: !!studentId,
    staleTime: 60000,
  });
}

/**
 * Fetch all achievement definitions.
 */
export function useAchievementDefinitions(
  category?: AchievementCategory,
  subjectCode?: string
) {
  return useQuery({
    queryKey: gamificationKeys.achievementDefinitions(category, subjectCode),
    queryFn: () => gamificationApi.getAchievementDefinitions(category, subjectCode),
    staleTime: 300000, // 5 minutes - definitions rarely change
  });
}

/**
 * Fetch subject progress for all enrolled subjects.
 */
export function useSubjectProgress(studentId: string | undefined) {
  return useQuery({
    queryKey: gamificationKeys.subjectProgress(studentId!),
    queryFn: () => gamificationApi.getSubjectProgress(studentId!),
    enabled: !!studentId,
    staleTime: 60000,
  });
}

/**
 * Fetch subject progress for a specific subject.
 */
export function useSubjectProgressById(
  studentId: string | undefined,
  subjectId: string | undefined
) {
  return useQuery({
    queryKey: gamificationKeys.subjectProgressById(studentId!, subjectId!),
    queryFn: () => gamificationApi.getSubjectProgressById(studentId!, subjectId!),
    enabled: !!studentId && !!subjectId,
    staleTime: 60000,
  });
}

// =============================================================================
// Parent Hooks
// =============================================================================

/**
 * Fetch gamification summary for a child (parent view).
 */
export function useChildGamificationSummary(studentId: string | undefined) {
  return useQuery({
    queryKey: gamificationKeys.parentSummary(studentId!),
    queryFn: () => gamificationApi.getChildSummary(studentId!),
    enabled: !!studentId,
    staleTime: 60000,
  });
}

/**
 * Fetch unlocked achievements for a child (parent view).
 */
export function useChildAchievements(studentId: string | undefined) {
  return useQuery({
    queryKey: gamificationKeys.parentAchievements(studentId!),
    queryFn: () => gamificationApi.getChildAchievements(studentId!),
    enabled: !!studentId,
    staleTime: 60000,
  });
}

/**
 * Fetch subject progress for a child (parent view).
 */
export function useChildSubjectProgress(studentId: string | undefined) {
  return useQuery({
    queryKey: gamificationKeys.parentSubjects(studentId!),
    queryFn: () => gamificationApi.getChildSubjectProgress(studentId!),
    enabled: !!studentId,
    staleTime: 60000,
  });
}

// =============================================================================
// Invalidation Helper
// =============================================================================

/**
 * Hook to invalidate gamification queries after actions.
 */
export function useInvalidateGamification() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () =>
      queryClient.invalidateQueries({ queryKey: gamificationKeys.all }),

    invalidateStudent: (studentId: string) => {
      queryClient.invalidateQueries({
        queryKey: gamificationKeys.stats(studentId),
      });
      queryClient.invalidateQueries({
        queryKey: gamificationKeys.statsDetailed(studentId),
      });
      queryClient.invalidateQueries({
        queryKey: gamificationKeys.level(studentId),
      });
      queryClient.invalidateQueries({
        queryKey: gamificationKeys.streak(studentId),
      });
      queryClient.invalidateQueries({
        queryKey: gamificationKeys.subjectProgress(studentId),
      });
    },
  };
}
