/**
 * Tests for EnrolmentManager component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EnrolmentManager } from '../EnrolmentManager';
import type { Student } from '@/types/student.types';
import type { Enrolment } from '@/lib/api';

// Mock student
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
    totalXP: 100,
    level: 1,
    achievements: [],
    streaks: { current: 0, longest: 0 },
  },
  createdAt: '2024-01-01T00:00:00Z',
};

// Mock enrolments
const mockEnrolments: Enrolment[] = [
  {
    id: 'enrol-1',
    studentId: 'student-1',
    subjectId: 'sub-1',
    enrolledAt: '2024-01-01T00:00:00Z',
    progress: {
      outcomesCompleted: ['outcome-1', 'outcome-2', 'outcome-3', 'outcome-4', 'outcome-5'],
      overallPercentage: 25,
      xpEarned: 500,
      lastStudiedAt: '2024-01-15T00:00:00Z',
    },
    subject: {
      id: 'sub-1',
      name: 'Mathematics',
      code: 'MATH',
      color: '#3B82F6',
    },
  },
  {
    id: 'enrol-2',
    studentId: 'student-1',
    subjectId: 'sub-2',
    enrolledAt: '2024-01-02T00:00:00Z',
    progress: {
      outcomesCompleted: ['outcome-1', 'outcome-2'],
      overallPercentage: 67,
      xpEarned: 300,
      lastStudiedAt: '2024-01-14T00:00:00Z',
    },
    subject: {
      id: 'sub-2',
      name: 'English',
      code: 'ENG',
      color: '#8B5CF6',
    },
  },
];

// Mock available subjects
const mockSubjects = [
  {
    id: 'sub-1',
    name: 'Mathematics',
    code: 'MATH',
    color: '#3B82F6',
    availableStages: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
  },
  {
    id: 'sub-2',
    name: 'English',
    code: 'ENG',
    color: '#8B5CF6',
    availableStages: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
  },
  {
    id: 'sub-3',
    name: 'Science',
    code: 'SCI',
    color: '#10B981',
    availableStages: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
  },
];

// Track mock state
const hookState = {
  enrolments: mockEnrolments as Enrolment[] | undefined,
  isLoading: false,
  error: null as Error | null,
};

// Mock hooks
const mockUnenrol = vi.fn().mockResolvedValue({});
const mockEnrol = vi.fn().mockResolvedValue({ id: 'new-enrol' });

vi.mock('@/hooks', () => ({
  useEnrolments: () => ({
    data: hookState.enrolments,
    isLoading: hookState.isLoading,
    error: hookState.error,
  }),
  useSubjectList: () => ({
    data: mockSubjects,
    isLoading: false,
  }),
  useUnenrol: () => ({
    mutateAsync: mockUnenrol,
    isPending: false,
  }),
  useEnrol: () => ({
    mutateAsync: mockEnrol,
    isPending: false,
  }),
}));

function renderEnrolmentManager() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <EnrolmentManager student={mockStudent} />
    </QueryClientProvider>
  );
}

describe('EnrolmentManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookState.enrolments = mockEnrolments;
    hookState.isLoading = false;
    hookState.error = null;
  });

  it('shows loading spinner while loading', () => {
    hookState.isLoading = true;

    renderEnrolmentManager();

    expect(screen.queryByText('Enrolled Subjects')).not.toBeInTheDocument();
  });

  it('shows error message on error', () => {
    hookState.error = new Error('Failed to load');

    renderEnrolmentManager();

    expect(screen.getByText(/failed to load enrolments/i)).toBeInTheDocument();
  });

  it('displays enrolled subjects count', () => {
    renderEnrolmentManager();

    expect(screen.getByText('Enrolled Subjects')).toBeInTheDocument();
    expect(screen.getByText('2 subjects enrolled')).toBeInTheDocument();
  });

  it('displays enrolled subject cards', () => {
    renderEnrolmentManager();

    expect(screen.getByText('Mathematics')).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
  });

  it('shows add subject button when more subjects available', () => {
    renderEnrolmentManager();

    expect(screen.getByRole('button', { name: /add subject/i })).toBeInTheDocument();
  });

  it('shows empty state when no enrolments', () => {
    hookState.enrolments = [];

    renderEnrolmentManager();

    expect(screen.getByText('No subjects enrolled yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add your first subject/i })).toBeInTheDocument();
  });

  it('has add subject button', () => {
    renderEnrolmentManager();

    // Add subject button should be present
    expect(screen.getByRole('button', { name: /add subject/i })).toBeInTheDocument();
  });

  it('has remove button for each enrolled subject', () => {
    renderEnrolmentManager();

    // Each EnrolmentCard should have a remove button with aria-label
    expect(screen.getByRole('button', { name: /remove mathematics/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove english/i })).toBeInTheDocument();
  });

  // Note: Modal tests are skipped as Radix UI portals don't render well in jsdom.
  // Modal interactions are covered in E2E tests.
});
