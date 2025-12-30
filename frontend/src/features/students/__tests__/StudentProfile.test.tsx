/**
 * Tests for StudentProfile component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StudentProfile } from '../StudentProfile';
import type { Student } from '@/types/student.types';

// Mock the hooks
vi.mock('@/hooks', () => ({
  useUpdateStudent: () => ({
    mutateAsync: vi.fn().mockResolvedValue(mockStudent),
    isPending: false,
  }),
}));

vi.mock('@/hooks/useGamification', () => ({
  useGamificationStats: () => ({
    data: null,
    isLoading: false,
  }),
}));

const mockStudent: Student = {
  id: 'student-1',
  parentId: 'parent-1',
  displayName: 'Test Student',
  gradeLevel: 5,
  schoolStage: 'S3',
  frameworkId: 'nsw',
  onboardingCompleted: true,
  preferences: {
    theme: 'auto',
    studyReminders: true,
    dailyGoalMinutes: 30,
    language: 'en-AU',
  },
  gamification: {
    totalXP: 150,
    level: 2,
    achievements: ['first-lesson'],
    streaks: {
      current: 5,
      longest: 10,
    },
  },
  createdAt: '2024-01-01T00:00:00Z',
};

function renderStudentProfile() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <StudentProfile student={mockStudent} />
    </QueryClientProvider>
  );
}

describe('StudentProfile', () => {
  it('renders student information', () => {
    renderStudentProfile();

    expect(screen.getByText('Test Student')).toBeInTheDocument();
    expect(screen.getByText('Year 5')).toBeInTheDocument();
    expect(screen.getByText('Stage 3')).toBeInTheDocument();
    expect(screen.getByText('30 minutes')).toBeInTheDocument();
    expect(screen.getByText('Enabled')).toBeInTheDocument();
  });

  it('displays gamification stats', () => {
    renderStudentProfile();

    // LevelBadge uses aria-label for accessibility
    expect(screen.getByRole('img', { name: /level 2/i })).toBeInTheDocument();
    // When no gamificationStats, fallback shows XP as text
    expect(screen.getByText(/150 xp/i)).toBeInTheDocument();
    // StreakCounter shows current streak (5 days, Best: 10 days)
    expect(screen.getByText('5')).toBeInTheDocument();
    // Check for streak section by finding "days" text
    const daysElements = screen.getAllByText(/days?/i);
    expect(daysElements.length).toBeGreaterThan(0);
  });

  it('shows edit button', () => {
    renderStudentProfile();

    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  it('switches to edit mode when edit is clicked', async () => {
    const user = userEvent.setup();
    renderStudentProfile();

    await user.click(screen.getByRole('button', { name: /edit/i }));

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/daily study goal/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('cancels edit mode', async () => {
    const user = userEvent.setup();
    renderStudentProfile();

    await user.click(screen.getByRole('button', { name: /edit/i }));
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    // Should be back to view mode
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument();
  });
});
