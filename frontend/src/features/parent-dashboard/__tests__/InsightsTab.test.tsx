/**
 * Tests for InsightsTab component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InsightsTab } from '../components/InsightsTab';

// Mock the API
vi.mock('@/lib/api', () => ({
  parentDashboardApi: {
    getWeeklyInsights: vi.fn(),
  },
}));

import { parentDashboardApi } from '@/lib/api';

const mockInsights = {
  weekStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  generatedAt: new Date().toISOString(),
  insights: {
    summary: 'Emma had a productive week with strong progress in Mathematics.',
    wins: [
      {
        title: 'Mastered Multiplication',
        description: 'Completed all multiplication outcomes with 90% accuracy',
        priority: 'high',
        subjectName: 'Mathematics',
      },
      {
        title: 'Consistent Study Habit',
        description: 'Studied every day this week',
        priority: 'medium',
        subjectName: null,
      },
    ],
    areasToWatch: [
      {
        title: 'Fractions Need Attention',
        description: 'Accuracy dropped below 60% on fraction problems',
        priority: 'high',
        subjectName: 'Mathematics',
      },
    ],
    recommendations: [
      {
        title: 'Practice Fractions',
        description: 'Spend 15 minutes daily on fraction exercises',
        actionType: 'practice',
        estimatedTimeMinutes: 15,
      },
      {
        title: 'Review Division',
        description: 'Consolidate division skills before moving on',
        actionType: 'review',
        estimatedTimeMinutes: 20,
      },
    ],
    teacherTalkingPoints: [
      'Emma shows strong aptitude for mental math',
      'Consider extending multiplication to multi-digit numbers',
      'May benefit from visual aids for fraction concepts',
    ],
    pathwayReadiness: null,
    hscProjection: null,
  },
};

const mockInsightsWithPathway = {
  ...mockInsights,
  insights: {
    ...mockInsights.insights,
    pathwayReadiness: {
      currentPathway: '5.2',
      recommendedPathway: '5.3',
      readyForHigher: true,
      confidence: 0.85,
      recommendation: 'Emma is ready to progress to 5.3 pathway based on consistent performance.',
      blockingGaps: [],
    },
  },
};

const mockInsightsWithHSC = {
  ...mockInsights,
  insights: {
    ...mockInsights.insights,
    hscProjection: {
      predictedBand: 5,
      bandRange: 'Band 5 (80-89)',
      examReadiness: 0.72,
      trajectory: 'improving',
      daysUntilHsc: 180,
      currentAverage: 82,
      strengths: ['Algebra', 'Problem Solving'],
      focusAreas: ['Calculus', 'Statistics'],
    },
  },
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

describe('InsightsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (parentDashboardApi.getWeeklyInsights as ReturnType<typeof vi.fn>).mockResolvedValue(mockInsights);
  });

  describe('rendering', () => {
    it('shows loading state with message', () => {
      renderWithProviders(<InsightsTab studentId="student-1" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Generating insights...')).toBeInTheDocument();
    });

    it('displays weekly insights header after loading', async () => {
      renderWithProviders(<InsightsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('Weekly Insights')).toBeInTheDocument();
      });
    });

    it('displays week start date', async () => {
      renderWithProviders(<InsightsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText(/Week of/)).toBeInTheDocument();
      });
    });

    it('displays summary when available', async () => {
      renderWithProviders(<InsightsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('Emma had a productive week with strong progress in Mathematics.')).toBeInTheDocument();
      });
    });

    it('displays regenerate button', async () => {
      renderWithProviders(<InsightsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('Regenerate')).toBeInTheDocument();
      });
    });
  });

  describe('wins section', () => {
    it('displays wins section with correct title', async () => {
      renderWithProviders(<InsightsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText("This Week's Wins")).toBeInTheDocument();
      });
    });

    it('displays win items', async () => {
      renderWithProviders(<InsightsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('Mastered Multiplication')).toBeInTheDocument();
        expect(screen.getByText('Consistent Study Habit')).toBeInTheDocument();
      });
    });

    it('displays win count badge', async () => {
      renderWithProviders(<InsightsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    it('displays subject name for wins when available', async () => {
      renderWithProviders(<InsightsTab studentId="student-1" />);

      await waitFor(() => {
        // Use getAllByText since subject name appears in multiple items
        const mathElements = screen.getAllByText('Mathematics');
        expect(mathElements.length).toBeGreaterThan(0);
      });
    });

    it('has aria-expanded attribute on expand button', async () => {
      renderWithProviders(<InsightsTab studentId="student-1" />);

      await waitFor(() => {
        const button = screen.getByLabelText(/Collapse This Week's Wins/);
        expect(button).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('toggles expansion when clicked', async () => {
      renderWithProviders(<InsightsTab studentId="student-1" />);

      await waitFor(() => {
        const button = screen.getByLabelText(/Collapse This Week's Wins/);
        fireEvent.click(button);
      });

      await waitFor(() => {
        const button = screen.getByLabelText(/Expand This Week's Wins/);
        expect(button).toHaveAttribute('aria-expanded', 'false');
      });
    });
  });

  describe('areas to watch section', () => {
    it('displays areas to watch section', async () => {
      renderWithProviders(<InsightsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('Areas to Watch')).toBeInTheDocument();
      });
    });

    it('displays area items with description', async () => {
      renderWithProviders(<InsightsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('Fractions Need Attention')).toBeInTheDocument();
        expect(screen.getByText('Accuracy dropped below 60% on fraction problems')).toBeInTheDocument();
      });
    });

    it('shows empty message when no areas to watch', async () => {
      (parentDashboardApi.getWeeklyInsights as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockInsights,
        insights: { ...mockInsights.insights, areasToWatch: [] },
      });

      renderWithProviders(<InsightsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('No concerns this week!')).toBeInTheDocument();
      });
    });
  });

  describe('recommendations section', () => {
    it('displays recommendations section', async () => {
      renderWithProviders(<InsightsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('Recommendations')).toBeInTheDocument();
      });
    });

    it('displays recommendation cards', async () => {
      renderWithProviders(<InsightsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('Practice Fractions')).toBeInTheDocument();
        expect(screen.getByText('Review Division')).toBeInTheDocument();
      });
    });

    it('displays action type badges', async () => {
      renderWithProviders(<InsightsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('practice')).toBeInTheDocument();
        expect(screen.getByText('review')).toBeInTheDocument();
      });
    });

    it('displays estimated time', async () => {
      renderWithProviders(<InsightsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('15 min')).toBeInTheDocument();
        expect(screen.getByText('20 min')).toBeInTheDocument();
      });
    });
  });

  describe('teacher talking points section', () => {
    it('displays talking points section collapsed by default', async () => {
      renderWithProviders(<InsightsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('Teacher Talking Points')).toBeInTheDocument();
      });

      // Content should be hidden initially
      expect(screen.queryByText('Emma shows strong aptitude for mental math')).not.toBeInTheDocument();
    });

    it('has aria-expanded attribute on talking points button', async () => {
      renderWithProviders(<InsightsTab studentId="student-1" />);

      await waitFor(() => {
        const button = screen.getByLabelText('Expand Teacher Talking Points');
        expect(button).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('expands to show talking points when clicked', async () => {
      renderWithProviders(<InsightsTab studentId="student-1" />);

      await waitFor(() => {
        const button = screen.getByLabelText('Expand Teacher Talking Points');
        fireEvent.click(button);
      });

      await waitFor(() => {
        expect(screen.getByText('Emma shows strong aptitude for mental math')).toBeInTheDocument();
        expect(screen.getByText('Consider extending multiplication to multi-digit numbers')).toBeInTheDocument();
      });
    });
  });

  describe('pathway readiness section (Stage 5)', () => {
    it('displays pathway readiness when available', async () => {
      (parentDashboardApi.getWeeklyInsights as ReturnType<typeof vi.fn>).mockResolvedValue(mockInsightsWithPathway);

      renderWithProviders(<InsightsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('Stage 5 Pathway Readiness')).toBeInTheDocument();
      });
    });

    it('displays current and recommended pathways', async () => {
      (parentDashboardApi.getWeeklyInsights as ReturnType<typeof vi.fn>).mockResolvedValue(mockInsightsWithPathway);

      renderWithProviders(<InsightsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('5.2')).toBeInTheDocument();
        expect(screen.getByText('Recommended: 5.3')).toBeInTheDocument();
      });
    });

    it('displays readiness status', async () => {
      (parentDashboardApi.getWeeklyInsights as ReturnType<typeof vi.fn>).mockResolvedValue(mockInsightsWithPathway);

      renderWithProviders(<InsightsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('Yes!')).toBeInTheDocument();
        expect(screen.getByText('Confidence: 85%')).toBeInTheDocument();
      });
    });

    it('does not display pathway readiness when not available', async () => {
      renderWithProviders(<InsightsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText("This Week's Wins")).toBeInTheDocument();
      });

      expect(screen.queryByText('Stage 5 Pathway Readiness')).not.toBeInTheDocument();
    });
  });

  describe('HSC projection section (Stage 6)', () => {
    it('displays HSC projection when available', async () => {
      (parentDashboardApi.getWeeklyInsights as ReturnType<typeof vi.fn>).mockResolvedValue(mockInsightsWithHSC);

      renderWithProviders(<InsightsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('HSC Projection')).toBeInTheDocument();
      });
    });

    it('displays predicted band', async () => {
      (parentDashboardApi.getWeeklyInsights as ReturnType<typeof vi.fn>).mockResolvedValue(mockInsightsWithHSC);

      renderWithProviders(<InsightsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('Band 5')).toBeInTheDocument();
      });
    });

    it('displays days until HSC', async () => {
      (parentDashboardApi.getWeeklyInsights as ReturnType<typeof vi.fn>).mockResolvedValue(mockInsightsWithHSC);

      renderWithProviders(<InsightsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('(180 days until HSC)')).toBeInTheDocument();
      });
    });

    it('displays exam readiness percentage', async () => {
      (parentDashboardApi.getWeeklyInsights as ReturnType<typeof vi.fn>).mockResolvedValue(mockInsightsWithHSC);

      renderWithProviders(<InsightsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('72%')).toBeInTheDocument();
      });
    });

    it('displays trajectory', async () => {
      (parentDashboardApi.getWeeklyInsights as ReturnType<typeof vi.fn>).mockResolvedValue(mockInsightsWithHSC);

      renderWithProviders(<InsightsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText(/Improving/)).toBeInTheDocument();
      });
    });

    it('displays strengths and focus areas', async () => {
      (parentDashboardApi.getWeeklyInsights as ReturnType<typeof vi.fn>).mockResolvedValue(mockInsightsWithHSC);

      renderWithProviders(<InsightsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('Strengths')).toBeInTheDocument();
        expect(screen.getByText('Algebra')).toBeInTheDocument();
        expect(screen.getByText('Focus Areas')).toBeInTheDocument();
        expect(screen.getByText('Calculus')).toBeInTheDocument();
      });
    });
  });

  describe('regenerate functionality', () => {
    it('calls API with forceRegenerate when regenerate clicked', async () => {
      renderWithProviders(<InsightsTab studentId="student-1" />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Regenerate'));
      });

      await waitFor(() => {
        expect(parentDashboardApi.getWeeklyInsights).toHaveBeenCalledWith(
          'student-1',
          expect.objectContaining({ forceRegenerate: true })
        );
      });
    });
  });

  describe('error handling', () => {
    it('displays error message on API failure', async () => {
      (parentDashboardApi.getWeeklyInsights as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Failed to generate insights')
      );

      renderWithProviders(<InsightsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load insights')).toBeInTheDocument();
        expect(screen.getByText('Failed to generate insights')).toBeInTheDocument();
      });
    });

    it('shows retry button on error', async () => {
      (parentDashboardApi.getWeeklyInsights as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Failed to generate insights')
      );

      renderWithProviders(<InsightsTab studentId="student-1" />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });
  });
});
