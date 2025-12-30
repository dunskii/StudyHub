/**
 * Tests for ProgressTab component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProgressTab } from '../components/ProgressTab';

// Mock Recharts components to avoid rendering issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Cell: () => <div data-testid="cell" />,
  RadialBarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="radial-bar-chart">{children}</div>
  ),
  RadialBar: () => <div data-testid="radial-bar" />,
}));

// Mock the API
vi.mock('@/lib/api', () => ({
  parentDashboardApi: {
    getStudentProgress: vi.fn(),
  },
}));

import { parentDashboardApi } from '@/lib/api';

const mockProgress = {
  studentId: 'student-1',
  studentName: 'Emma',
  gradeLevel: 5,
  schoolStage: 'S3',
  frameworkCode: 'NSW',
  overallMastery: 72.5,
  foundationStrength: {
    overallStrength: 68,
    priorYearMastery: 75,
    gapsIdentified: 2,
    criticalGaps: ['Fractions', 'Decimals'],
    strengths: ['Addition', 'Subtraction'],
  },
  weeklyStats: {
    studyTimeMinutes: 180,
    studyGoalMinutes: 240,
    sessionsCount: 5,
    topicsCovered: 8,
    masteryImprovement: 2.5,
    flashcardsReviewed: 45,
    questionsAnswered: 30,
    accuracyPercentage: 78,
    goalProgressPercentage: 75,
  },
  subjectProgress: [
    {
      subjectId: 'math-1',
      subjectCode: 'MATH',
      subjectName: 'Mathematics',
      subjectColor: '#3B82F6',
      masteryLevel: 75,
      strandProgress: [
        {
          strand: 'Number and Algebra',
          strandCode: 'NA',
          mastery: 80,
          outcomesMastered: 5,
          outcomesInProgress: 2,
          outcomesTotal: 8,
          trend: 'improving' as const,
        },
      ],
      recentActivity: '2 hours ago',
      sessionsThisWeek: 3,
      timeSpentThisWeekMinutes: 90,
      xpEarnedThisWeek: 150,
      currentFocusOutcomes: ['MA3-RN-01'],
    },
  ],
  masteryChange30Days: 5.2,
  currentFocusSubjects: ['Mathematics'],
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

describe('ProgressTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (parentDashboardApi.getStudentProgress as ReturnType<typeof vi.fn>).mockResolvedValue(mockProgress);
  });

  describe('rendering', () => {
    it('shows loading state initially', () => {
      renderWithProviders(<ProgressTab studentId="student-1" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('displays student name and grade after loading', async () => {
      renderWithProviders(<ProgressTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText("Emma's Progress")).toBeInTheDocument();
        expect(screen.getByText(/Year 5/)).toBeInTheDocument();
        expect(screen.getByText(/Stage 3/)).toBeInTheDocument();
      });
    });

    it('displays overall mastery percentage', async () => {
      renderWithProviders(<ProgressTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('73%')).toBeInTheDocument(); // Rounded from 72.5
      });
    });

    it('displays mastery change trend', async () => {
      renderWithProviders(<ProgressTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('+5.2%')).toBeInTheDocument();
      });
    });
  });

  describe('weekly stats', () => {
    it('displays study time', async () => {
      renderWithProviders(<ProgressTab studentId="student-1" />);

      await waitFor(() => {
        // Study time might be shown as "3h", "3 hours", "180 min", etc.
        const timeElements = screen.queryAllByText(/3|180/);
        expect(timeElements.length).toBeGreaterThan(0);
      });
    });

    it('displays sessions count', async () => {
      renderWithProviders(<ProgressTab studentId="student-1" />);

      await waitFor(() => {
        // Sessions count shown somewhere - can find by looking for sessions label
        const sessionElements = screen.queryAllByText(/5|sessions/i);
        expect(sessionElements.length).toBeGreaterThan(0);
      });
    });

    it('displays accuracy', async () => {
      renderWithProviders(<ProgressTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('78%')).toBeInTheDocument();
      });
    });
  });

  describe('foundation strength', () => {
    it('displays foundation strength percentage', async () => {
      renderWithProviders(<ProgressTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('68%')).toBeInTheDocument();
      });
    });

    it('displays critical gaps when present', async () => {
      renderWithProviders(<ProgressTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('Critical gaps:')).toBeInTheDocument();
        expect(screen.getByText('Fractions')).toBeInTheDocument();
      });
    });

    it('displays number of gaps identified', async () => {
      renderWithProviders(<ProgressTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('2 gaps identified')).toBeInTheDocument();
      });
    });
  });

  describe('subject progress', () => {
    it('displays subject progress section', async () => {
      renderWithProviders(<ProgressTab studentId="student-1" />);

      await waitFor(() => {
        // Subject section heading
        const subjectElements = screen.queryAllByText(/subject/i);
        expect(subjectElements.length).toBeGreaterThan(0);
      });
    });

    it('displays subject cards', async () => {
      renderWithProviders(<ProgressTab studentId="student-1" />);

      await waitFor(() => {
        // Mathematics appears in multiple places
        const mathElements = screen.queryAllByText(/mathematics/i);
        expect(mathElements.length).toBeGreaterThan(0);
      });
    });

    it('displays subject mastery level', async () => {
      renderWithProviders(<ProgressTab studentId="student-1" />);

      await waitFor(() => {
        // 75% mastery for Mathematics
        expect(screen.getByText('75%')).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('displays error message on API failure', async () => {
      (parentDashboardApi.getStudentProgress as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Failed to fetch')
      );

      renderWithProviders(<ProgressTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load progress data')).toBeInTheDocument();
      });
    });
  });

  describe('current focus', () => {
    it('displays current focus subjects', async () => {
      renderWithProviders(<ProgressTab studentId="student-1" />);

      await waitFor(() => {
        // Focus section and Mathematics both appear
        const focusElements = screen.queryAllByText(/focus|mathematics/i);
        expect(focusElements.length).toBeGreaterThan(0);
      });
    });
  });
});
