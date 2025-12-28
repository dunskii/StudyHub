/**
 * Gamification store for XP, levels, achievements, and streaks.
 *
 * Manages gamification state and UI notifications (toasts, modals).
 */

import { create } from 'zustand';
import type { Achievement, GamificationStats, XpEvent } from '@/lib/api/gamification';

interface GamificationState {
  // Current student's stats (cached)
  stats: GamificationStats | null;
  studentId: string | null;

  // XP events for toast notifications
  recentXpEvents: XpEvent[];

  // New achievements queue for modals
  newAchievements: Achievement[];

  // Level up modal state
  showLevelUp: boolean;
  newLevel: number | null;
  newLevelTitle: string | null;

  // Loading states
  isLoading: boolean;
  error: string | null;
}

interface GamificationActions {
  // State management
  setStats: (stats: GamificationStats, studentId: string) => void;
  clearStats: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // XP events
  addXpEvent: (event: XpEvent) => void;
  clearXpEvents: () => void;

  // Achievements
  addNewAchievement: (achievement: Achievement) => void;
  dismissAchievement: (code: string) => void;
  clearNewAchievements: () => void;

  // Level up
  showLevelUpModal: (level: number, title: string) => void;
  hideLevelUpModal: () => void;

  // Session complete handler
  handleSessionComplete: (result: {
    xpEarned: number;
    levelUp: boolean;
    newLevel?: number;
    newLevelTitle?: string;
    newAchievements: Achievement[];
  }) => void;
}

type GamificationStore = GamificationState & GamificationActions;

const initialState: GamificationState = {
  stats: null,
  studentId: null,
  recentXpEvents: [],
  newAchievements: [],
  showLevelUp: false,
  newLevel: null,
  newLevelTitle: null,
  isLoading: false,
  error: null,
};

export const useGamificationStore = create<GamificationStore>((set, get) => ({
  ...initialState,

  setStats: (stats, studentId) =>
    set({
      stats,
      studentId,
      error: null,
    }),

  clearStats: () =>
    set({
      stats: null,
      studentId: null,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  addXpEvent: (event) =>
    set((state) => ({
      recentXpEvents: [...state.recentXpEvents.slice(-4), event], // Keep last 5
    })),

  clearXpEvents: () => set({ recentXpEvents: [] }),

  addNewAchievement: (achievement) =>
    set((state) => ({
      newAchievements: [...state.newAchievements, achievement],
    })),

  dismissAchievement: (code) =>
    set((state) => ({
      newAchievements: state.newAchievements.filter((a) => a.code !== code),
    })),

  clearNewAchievements: () => set({ newAchievements: [] }),

  showLevelUpModal: (level, title) =>
    set({
      showLevelUp: true,
      newLevel: level,
      newLevelTitle: title,
    }),

  hideLevelUpModal: () =>
    set({
      showLevelUp: false,
      newLevel: null,
      newLevelTitle: null,
    }),

  handleSessionComplete: (result) => {
    const { addXpEvent, showLevelUpModal, addNewAchievement } = get();

    // Add XP event for toast
    if (result.xpEarned > 0) {
      addXpEvent({
        amount: result.xpEarned,
        finalAmount: result.xpEarned,
        source: 'session_complete',
        multiplier: 1,
        timestamp: new Date().toISOString(),
        subjectId: null,
        sessionId: null,
      });
    }

    // Show level up modal if applicable
    if (result.levelUp && result.newLevel && result.newLevelTitle) {
      showLevelUpModal(result.newLevel, result.newLevelTitle);
    }

    // Queue new achievements for modals
    for (const achievement of result.newAchievements) {
      addNewAchievement(achievement);
    }
  },
}));

// Selector hooks for specific pieces of state
export const useGamificationStats = () =>
  useGamificationStore((state) => state.stats);

export const useCurrentStreak = () =>
  useGamificationStore((state) => state.stats?.streak.current ?? 0);

export const useCurrentLevel = () =>
  useGamificationStore((state) => ({
    level: state.stats?.level ?? 1,
    title: state.stats?.levelTitle ?? 'Beginner',
    progressPercent: state.stats?.levelProgressPercent ?? 0,
  }));

export const useNewAchievements = () =>
  useGamificationStore((state) => state.newAchievements);

export const useLevelUpModal = () =>
  useGamificationStore((state) => ({
    show: state.showLevelUp,
    level: state.newLevel,
    title: state.newLevelTitle,
    hide: state.hideLevelUpModal,
  }));
