import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';
import type { User, Student } from '@/types/student.types';

// Mock user data
const mockStudent: Student = {
  id: 'student-1',
  parentId: 'user-1',
  displayName: 'Test Student',
  gradeLevel: 5,
  schoolStage: 'S3',
  onboardingCompleted: true,
  preferences: {
    theme: 'auto',
    studyReminders: true,
    dailyGoalMinutes: 30,
    language: 'en-AU',
  },
  gamification: {
    totalXP: 100,
    level: 2,
    achievements: ['first-login'],
    streaks: { current: 5, longest: 10 },
  },
  createdAt: '2024-01-01T00:00:00Z',
};

const mockUser: User = {
  id: 'user-1',
  email: 'parent@example.com',
  displayName: 'Test Parent',
  subscriptionTier: 'free',
  preferences: {
    emailNotifications: true,
    weeklyReports: true,
    language: 'en-AU',
    timezone: 'Australia/Sydney',
  },
  students: [mockStudent],
};

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useAuthStore.setState({
      user: null,
      activeStudent: null,
      isLoading: true,
      isAuthenticated: false,
    });
  });

  describe('initial state', () => {
    it('starts with null user and not authenticated', () => {
      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.activeStudent).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(true);
    });
  });

  describe('setUser', () => {
    it('sets user and marks as authenticated', () => {
      const { setUser } = useAuthStore.getState();

      setUser(mockUser);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('sets active student to first student when user is set', () => {
      const { setUser } = useAuthStore.getState();

      setUser(mockUser);

      const state = useAuthStore.getState();
      expect(state.activeStudent).toEqual(mockStudent);
    });

    it('clears active student when user is set to null', () => {
      const { setUser } = useAuthStore.getState();

      // First set a user
      setUser(mockUser);
      expect(useAuthStore.getState().activeStudent).not.toBeNull();

      // Then clear it
      setUser(null);

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.activeStudent).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('handles user with no students', () => {
      const { setUser } = useAuthStore.getState();
      const userWithNoStudents: User = { ...mockUser, students: [] };

      setUser(userWithNoStudents);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(userWithNoStudents);
      expect(state.activeStudent).toBeNull();
      expect(state.isAuthenticated).toBe(true);
    });
  });

  describe('setActiveStudent', () => {
    it('sets the active student', () => {
      const { setUser, setActiveStudent } = useAuthStore.getState();
      setUser(mockUser);

      const newStudent: Student = { ...mockStudent, id: 'student-2', displayName: 'Second Student' };
      setActiveStudent(newStudent);

      expect(useAuthStore.getState().activeStudent).toEqual(newStudent);
    });

    it('can set active student to null', () => {
      const { setUser, setActiveStudent } = useAuthStore.getState();
      setUser(mockUser);

      setActiveStudent(null);

      expect(useAuthStore.getState().activeStudent).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('sets loading state to true', () => {
      const { setLoading } = useAuthStore.getState();

      setLoading(true);

      expect(useAuthStore.getState().isLoading).toBe(true);
    });

    it('sets loading state to false', () => {
      const { setLoading } = useAuthStore.getState();

      setLoading(false);

      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('logout', () => {
    it('clears user and active student', () => {
      const { setUser, logout } = useAuthStore.getState();

      // First login
      setUser(mockUser);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Then logout
      logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.activeStudent).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });
});
