/**
 * Tests for StudentSwitcher component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StudentSwitcher } from '../StudentSwitcher';
import type { Student } from '@/types/student.types';

// Mock data
const mockStudents: Student[] = [
  {
    id: 'student-1',
    parentId: 'parent-1',
    displayName: 'Alice Smith',
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
      streaks: { current: 5, longest: 10 },
    },
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'student-2',
    parentId: 'parent-1',
    displayName: 'Bob Smith',
    gradeLevel: 8,
    schoolStage: 'S4',
    frameworkId: 'nsw',
    onboardingCompleted: false,
    preferences: {
      theme: 'light',
      studyReminders: false,
      dailyGoalMinutes: 45,
      language: 'en-AU',
    },
    gamification: {
      totalXP: 50,
      level: 1,
      achievements: [],
      streaks: { current: 0, longest: 3 },
    },
    createdAt: '2024-01-02T00:00:00Z',
  },
];

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock auth store
const mockSetActiveStudent = vi.fn();
vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    activeStudent: mockStudents[0],
    setActiveStudent: mockSetActiveStudent,
  }),
}));

// Mock hooks
vi.mock('@/hooks', () => ({
  useStudents: () => ({
    data: mockStudents,
    isLoading: false,
  }),
}));

function renderStudentSwitcher(props = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <StudentSwitcher {...props} />
      </QueryClientProvider>
    </BrowserRouter>
  );
}

describe('StudentSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays current student name', () => {
    renderStudentSwitcher();

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });

  it('opens dropdown when clicked', async () => {
    const user = userEvent.setup();
    renderStudentSwitcher();

    await user.click(screen.getByRole('button', { expanded: false }));

    // Should show all students
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('shows student details in dropdown', async () => {
    const user = userEvent.setup();
    renderStudentSwitcher();

    await user.click(screen.getByRole('button', { expanded: false }));

    // Text is broken up with " · Level X", so use regex to match
    expect(screen.getByText(/Year 5.*Level 2/)).toBeInTheDocument();
    expect(screen.getByText(/Year 8.*Level 1/)).toBeInTheDocument();
  });

  it('shows setup badge for incomplete onboarding', async () => {
    const user = userEvent.setup();
    renderStudentSwitcher();

    await user.click(screen.getByRole('button', { expanded: false }));

    expect(screen.getByText('Setup')).toBeInTheDocument();
  });

  it('shows add another student option', async () => {
    const user = userEvent.setup();
    renderStudentSwitcher();

    await user.click(screen.getByRole('button', { expanded: false }));

    expect(screen.getByText('Add another student')).toBeInTheDocument();
  });

  it('selects a different student', async () => {
    const user = userEvent.setup();
    renderStudentSwitcher();

    await user.click(screen.getByRole('button', { expanded: false }));
    await user.click(screen.getByText('Bob Smith'));

    expect(mockSetActiveStudent).toHaveBeenCalledWith(mockStudents[1]);
  });

  it('redirects to onboarding for incomplete student', async () => {
    const user = userEvent.setup();
    renderStudentSwitcher();

    await user.click(screen.getByRole('button', { expanded: false }));
    await user.click(screen.getByText('Bob Smith'));

    // Bob has onboardingCompleted = false
    expect(mockNavigate).toHaveBeenCalledWith('/onboarding');
  });

  it('navigates to add-student when add is clicked', async () => {
    const user = userEvent.setup();
    renderStudentSwitcher();

    await user.click(screen.getByRole('button', { expanded: false }));
    await user.click(screen.getByText('Add another student'));

    expect(mockNavigate).toHaveBeenCalledWith('/add-student');
  });

  it('calls onAddStudent callback if provided', async () => {
    const onAddStudent = vi.fn();
    const user = userEvent.setup();
    renderStudentSwitcher({ onAddStudent });

    await user.click(screen.getByRole('button', { expanded: false }));
    await user.click(screen.getByText('Add another student'));

    expect(onAddStudent).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('closes dropdown when escape is pressed', async () => {
    const user = userEvent.setup();
    renderStudentSwitcher();

    await user.click(screen.getByRole('button', { expanded: false }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });
});
