/**
 * Tests for GoalsTab component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoalsTab } from '../components/GoalsTab';

// Mock the API
vi.mock('@/lib/api', () => ({
  parentDashboardApi: {
    getGoals: vi.fn(),
    createGoal: vi.fn(),
    deleteGoal: vi.fn(),
    checkGoalAchievement: vi.fn(),
  },
}));

import { parentDashboardApi } from '@/lib/api';

const mockGoals = {
  goals: [
    {
      id: '1',
      studentId: 'student-1',
      parentId: 'parent-1',
      title: 'Master Multiplication',
      description: 'Learn multiplication tables',
      targetOutcomes: null,
      targetMastery: 80,
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      reward: 'Pizza night!',
      isActive: true,
      achievedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      progress: {
        currentMastery: 50,
        progressPercentage: 62.5,
        outcomesMastered: 0,
        outcomesTotal: 0,
        daysRemaining: 30,
        isOnTrack: true,
      },
    },
  ],
  total: 1,
  activeCount: 1,
  achievedCount: 0,
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('GoalsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (parentDashboardApi.getGoals as ReturnType<typeof vi.fn>).mockResolvedValue(mockGoals);
  });

  describe('rendering', () => {
    it('shows loading state initially', () => {
      renderWithProviders(<GoalsTab studentId="student-1" />);
      // Loading spinner should be shown
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('displays goals after loading', async () => {
      renderWithProviders(<GoalsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('Master Multiplication')).toBeInTheDocument();
      });
    });

    it('shows empty state when no goals', async () => {
      (parentDashboardApi.getGoals as ReturnType<typeof vi.fn>).mockResolvedValue({
        goals: [],
        total: 0,
        activeCount: 0,
        achievedCount: 0,
      });

      renderWithProviders(<GoalsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('No goals yet')).toBeInTheDocument();
      });
    });

    it('shows progress bar for goals', async () => {
      renderWithProviders(<GoalsTab studentId="student-1" />);

      await waitFor(() => {
        // Look for progress indicator - could be rendered as "62%" or "62.5%" or in a progress bar
        const progressElements = screen.queryAllByText(/62/);
        const progressBar = screen.queryByRole('progressbar');
        // Either find the percentage text or a progress bar
        expect(progressElements.length > 0 || progressBar).toBeTruthy();
      });
    });

    it('shows reward if set', async () => {
      renderWithProviders(<GoalsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('Pizza night!')).toBeInTheDocument();
      });
    });
  });

  describe('filtering', () => {
    it('shows filter buttons', async () => {
      renderWithProviders(<GoalsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('All')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('Achieved')).toBeInTheDocument();
      });
    });

    it('filters to active goals when clicked', async () => {
      renderWithProviders(<GoalsTab studentId="student-1" />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Active'));
      });

      expect(parentDashboardApi.getGoals).toHaveBeenCalledWith(
        expect.objectContaining({ activeOnly: true })
      );
    });
  });

  describe('creating goals', () => {
    it('shows create form when New Goal clicked', async () => {
      renderWithProviders(<GoalsTab studentId="student-1" />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('New Goal'));
      });

      expect(screen.getByText('Create New Goal')).toBeInTheDocument();
    });

    it('requires student selection to create goal', async () => {
      renderWithProviders(<GoalsTab studentId={null} />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('New Goal'));
      });

      expect(screen.getByText('Please select a student first to create a goal.')).toBeInTheDocument();
    });
  });

  describe('goal actions', () => {
    it('can delete a goal', async () => {
      (parentDashboardApi.deleteGoal as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      renderWithProviders(<GoalsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('Master Multiplication')).toBeInTheDocument();
      });

      // Find and click delete button
      const deleteButton = screen.getByTitle('Delete goal');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(parentDashboardApi.deleteGoal).toHaveBeenCalledWith('1');
      });
    });

    it('can check goal achievement', async () => {
      (parentDashboardApi.checkGoalAchievement as ReturnType<typeof vi.fn>).mockResolvedValue(mockGoals.goals[0]);

      renderWithProviders(<GoalsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('Master Multiplication')).toBeInTheDocument();
      });

      // Find and click check achievement button
      const checkButton = screen.getByTitle('Check if achieved');
      fireEvent.click(checkButton);

      await waitFor(() => {
        expect(parentDashboardApi.checkGoalAchievement).toHaveBeenCalledWith('1');
      });
    });
  });
});
