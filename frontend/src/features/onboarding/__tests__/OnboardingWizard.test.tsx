/**
 * Tests for OnboardingWizard component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OnboardingWizard } from '../OnboardingWizard';
import type { Student } from '@/types/student.types';

// Mock student
const mockCreatedStudent: Student = {
  id: 'student-1',
  parentId: 'parent-1',
  displayName: 'Test Student',
  gradeLevel: 5,
  schoolStage: 'S3',
  frameworkId: 'nsw',
  onboardingCompleted: false,
  preferences: {
    theme: 'auto',
    studyReminders: true,
    dailyGoalMinutes: 30,
    language: 'en-AU',
  },
  gamification: {
    totalXP: 0,
    level: 1,
    achievements: [],
    streaks: { current: 0, longest: 0 },
  },
  createdAt: '2024-01-01T00:00:00Z',
};

// Mock navigate
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
    user: { id: 'user-1', email: 'test@example.com' },
    setActiveStudent: mockSetActiveStudent,
  }),
}));

// Mock hooks
const mockCreateStudent = vi.fn().mockResolvedValue(mockCreatedStudent);
const mockCompleteOnboarding = vi
  .fn()
  .mockResolvedValue({ ...mockCreatedStudent, onboardingCompleted: true });
const mockBulkEnrol = vi.fn().mockResolvedValue({ successful: [], failed: [] });

vi.mock('@/hooks', () => ({
  useCreateStudent: () => ({
    mutateAsync: mockCreateStudent,
    isPending: false,
  }),
  useCompleteOnboarding: () => ({
    mutateAsync: mockCompleteOnboarding,
    isPending: false,
  }),
  useBulkEnrol: () => ({
    mutateAsync: mockBulkEnrol,
    isPending: false,
  }),
  useSubjectList: () => ({
    data: [
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
    ],
    isLoading: false,
  }),
}));

function renderOnboardingWizard(props = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <OnboardingWizard {...props} />
      </QueryClientProvider>
    </BrowserRouter>
  );
}

describe('OnboardingWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders first step (details)', () => {
    renderOnboardingWizard();

    expect(screen.getByText('Details')).toBeInTheDocument();
    expect(screen.getByLabelText(/student.*name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/grade level/i)).toBeInTheDocument();
  });

  it('shows progress indicator', () => {
    renderOnboardingWizard();

    expect(screen.getByText('Details')).toBeInTheDocument();
    expect(screen.getByText('Subjects')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });

  it('validates required fields before proceeding', async () => {
    const user = userEvent.setup();
    renderOnboardingWizard();

    // Try to submit without filling fields
    const nextButton = screen.getByRole('button', { name: /next|continue/i });
    await user.click(nextButton);

    // Should show validation errors (Zod schema requires min 2 chars)
    await waitFor(() => {
      expect(screen.getByText(/at least 2 characters/i)).toBeInTheDocument();
    });
  });

  it('creates student and advances to subjects step', async () => {
    const user = userEvent.setup();
    renderOnboardingWizard();

    // Fill in student details
    await user.type(screen.getByLabelText(/student.*name/i), 'Test Student');

    // Select a grade level using the select element
    await user.selectOptions(screen.getByLabelText(/grade level/i), '5');

    // Submit
    await user.click(screen.getByRole('button', { name: /next|continue/i }));

    // Should call createStudent and move to subjects step
    await waitFor(() => {
      expect(mockCreateStudent).toHaveBeenCalled();
    });
  });

  it('shows error message on failure', async () => {
    mockCreateStudent.mockRejectedValueOnce(new Error('Network error'));

    const user = userEvent.setup();
    renderOnboardingWizard();

    // Fill in details
    await user.type(screen.getByLabelText(/student.*name/i), 'Test Student');
    await user.selectOptions(screen.getByLabelText(/grade level/i), '5');
    await user.click(screen.getByRole('button', { name: /next|continue/i }));

    // Should show error
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Network error');
    });
  });

  it('calls onComplete callback when provided', async () => {
    const onComplete = vi.fn();
    const user = userEvent.setup();
    renderOnboardingWizard({ onComplete });

    // Complete the details step
    await user.type(screen.getByLabelText(/student.*name/i), 'Test Student');
    await user.selectOptions(screen.getByLabelText(/grade level/i), '5');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(mockCreateStudent).toHaveBeenCalled();
    });

    // On subjects step, select a subject
    await waitFor(() => {
      expect(screen.getByText('Mathematics')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Mathematics'));
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // On confirmation step, confirm with "Complete setup" button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /complete setup/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /complete setup/i }));

    await waitFor(() => {
      expect(mockBulkEnrol).toHaveBeenCalled();
      expect(mockCompleteOnboarding).toHaveBeenCalled();
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it('navigates to dashboard when no onComplete provided', async () => {
    const user = userEvent.setup();
    renderOnboardingWizard();

    // Complete the details step
    await user.type(screen.getByLabelText(/student.*name/i), 'Test Student');
    await user.selectOptions(screen.getByLabelText(/grade level/i), '5');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(mockCreateStudent).toHaveBeenCalled();
    });

    // On subjects step, select a subject
    await waitFor(() => {
      expect(screen.getByText('Mathematics')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Mathematics'));
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // On confirmation step, confirm with "Complete setup" button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /complete setup/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /complete setup/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });
});
