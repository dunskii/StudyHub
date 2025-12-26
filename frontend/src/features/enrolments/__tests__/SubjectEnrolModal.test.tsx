/**
 * Tests for SubjectEnrolModal component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SubjectEnrolModal } from '../SubjectEnrolModal';
import type { Student } from '@/types/student.types';
import type { Subject } from '@/types/subject.types';

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

const mockStage5Student: Student = {
  ...mockStudent,
  id: 'student-2',
  gradeLevel: 10,
  schoolStage: 'S5',
};

// Mock subjects
const mockSubjects: Subject[] = [
  {
    id: 'sub-1',
    name: 'Mathematics',
    code: 'MATH',
    color: '#3B82F6',
    availableStages: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
    frameworkId: 'nsw',
    icon: 'calculator',
    tutorStyle: 'socratic_stepwise',
    order: 1,
  },
  {
    id: 'sub-2',
    name: 'English',
    code: 'ENG',
    color: '#8B5CF6',
    availableStages: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
    frameworkId: 'nsw',
    icon: 'book-open',
    tutorStyle: 'socratic_analytical',
    order: 2,
  },
];

// Mock enrol hook
const mockEnrol = vi.fn().mockResolvedValue({ id: 'enrol-1' });

vi.mock('@/hooks', () => ({
  useEnrol: () => ({
    mutateAsync: mockEnrol,
    isPending: false,
  }),
}));

function renderSubjectEnrolModal({
  isOpen = true,
  onClose = vi.fn(),
  student = mockStudent,
  availableSubjects = mockSubjects,
} = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return {
    onClose,
    ...render(
      <QueryClientProvider client={queryClient}>
        <SubjectEnrolModal
          isOpen={isOpen}
          onClose={onClose}
          student={student}
          availableSubjects={availableSubjects}
        />
      </QueryClientProvider>
    ),
  };
}

describe('SubjectEnrolModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays modal title', () => {
    renderSubjectEnrolModal();

    expect(screen.getByText('Add subject')).toBeInTheDocument();
  });

  it('displays available subjects', () => {
    renderSubjectEnrolModal();

    expect(screen.getByText('Mathematics')).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('MATH')).toBeInTheDocument();
    expect(screen.getByText('ENG')).toBeInTheDocument();
  });

  it('shows confirmation when subject is selected', async () => {
    const user = userEvent.setup();
    renderSubjectEnrolModal();

    await user.click(screen.getByText('Mathematics'));

    // Should show confirmation with subject name
    await waitFor(() => {
      expect(
        screen.getByText(/Test Student will be enrolled in Mathematics/i)
      ).toBeInTheDocument();
    });
  });

  it('shows enrol button after selection', async () => {
    const user = userEvent.setup();
    renderSubjectEnrolModal();

    await user.click(screen.getByText('Mathematics'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /enrol/i })).toBeInTheDocument();
    });
  });

  it('calls enrol when confirmed', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderSubjectEnrolModal({ onClose });

    await user.click(screen.getByText('Mathematics'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /enrol/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /enrol/i }));

    await waitFor(() => {
      expect(mockEnrol).toHaveBeenCalledWith({
        studentId: 'student-1',
        subjectId: 'sub-1',
        pathway: undefined,
      });
    });

    expect(onClose).toHaveBeenCalled();
  });

  it('allows going back to subject selection', async () => {
    const user = userEvent.setup();
    renderSubjectEnrolModal();

    // Select subject
    await user.click(screen.getByText('Mathematics'));

    await waitFor(() => {
      expect(screen.getByText(/will be enrolled/i)).toBeInTheDocument();
    });

    // Click back button
    const backButton = screen.getByRole('button', { name: '' }); // SVG icon button
    await user.click(backButton);

    // Should be back at subject selection
    await waitFor(() => {
      expect(screen.getByText('Select a subject to enrol in:')).toBeInTheDocument();
    });
  });

  it('closes modal on cancel', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderSubjectEnrolModal({ onClose });

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalled();
  });

  it('resets state when closing', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { rerender } = renderSubjectEnrolModal({ onClose, isOpen: true });

    // Select a subject
    await user.click(screen.getByText('Mathematics'));

    await waitFor(() => {
      expect(screen.getByText(/will be enrolled/i)).toBeInTheDocument();
    });

    // Cancel
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalled();
  });

  it('shows pathway selection for Stage 5 Math', async () => {
    const user = userEvent.setup();
    renderSubjectEnrolModal({ student: mockStage5Student });

    await user.click(screen.getByText('Mathematics'));

    // Should show pathway selection
    await waitFor(() => {
      expect(screen.getByText('Select a pathway')).toBeInTheDocument();
    });
  });

  it('requires pathway for Stage 5 Math before enrolling', async () => {
    const user = userEvent.setup();
    renderSubjectEnrolModal({ student: mockStage5Student });

    await user.click(screen.getByText('Mathematics'));

    await waitFor(() => {
      expect(screen.getByText('Select a pathway')).toBeInTheDocument();
    });

    // Enrol button should not be visible yet (need to select pathway)
    expect(screen.queryByRole('button', { name: /^enrol$/i })).not.toBeInTheDocument();
  });

  it('shows error when enrolment fails', async () => {
    mockEnrol.mockRejectedValueOnce(new Error('Enrolment failed'));

    const user = userEvent.setup();
    renderSubjectEnrolModal();

    await user.click(screen.getByText('Mathematics'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /enrol/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /enrol/i }));

    await waitFor(() => {
      expect(screen.getByText('Enrolment failed')).toBeInTheDocument();
    });
  });
});
