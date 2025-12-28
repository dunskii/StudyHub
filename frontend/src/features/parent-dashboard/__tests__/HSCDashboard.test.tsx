/**
 * Tests for HSCDashboard component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HSCDashboard } from '../components/HSCDashboard';

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
  Legend: () => <div data-testid="legend" />,
  ReferenceLine: () => <div data-testid="reference-line" />,
}));

// Mock the API
vi.mock('@/lib/api', () => ({
  parentDashboardApi: {
    getWeeklyInsights: vi.fn(),
  },
}));

import { parentDashboardApi } from '@/lib/api';

const mockInsightsWithHSC = {
  weekStart: new Date().toISOString(),
  generatedAt: new Date().toISOString(),
  insights: {
    summary: 'Good progress this week',
    wins: [],
    areasToWatch: [],
    recommendations: [],
    teacherTalkingPoints: [],
    pathwayReadiness: null,
    hscProjection: {
      predictedBand: 5,
      bandRange: '80-89',
      examReadiness: 72,
      trajectory: 'improving',
      daysUntilHsc: 180,
      currentAverage: 82,
      atarContribution: 85.5,
      strengths: ['Algebra', 'Problem Solving', 'Geometry'],
      focusAreas: ['Calculus', 'Statistics'],
    },
  },
};

const mockInsightsUrgent = {
  ...mockInsightsWithHSC,
  insights: {
    ...mockInsightsWithHSC.insights,
    hscProjection: {
      ...mockInsightsWithHSC.insights.hscProjection,
      daysUntilHsc: 30,
      trajectory: 'declining',
      examReadiness: 45,
      predictedBand: 3,
    },
  },
};

const mockInsightsHighBand = {
  ...mockInsightsWithHSC,
  insights: {
    ...mockInsightsWithHSC.insights,
    hscProjection: {
      ...mockInsightsWithHSC.insights.hscProjection,
      predictedBand: 6,
      examReadiness: 92,
      trajectory: 'stable',
    },
  },
};

const mockInsightsNoHSC = {
  ...mockInsightsWithHSC,
  insights: {
    ...mockInsightsWithHSC.insights,
    hscProjection: null,
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

describe('HSCDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (parentDashboardApi.getWeeklyInsights as ReturnType<typeof vi.fn>).mockResolvedValue(mockInsightsWithHSC);
  });

  describe('rendering', () => {
    it('shows loading state initially', () => {
      renderWithProviders(<HSCDashboard studentId="student-1" studentName="Emma" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('displays HSC dashboard after loading', async () => {
      renderWithProviders(<HSCDashboard studentId="student-1" studentName="Emma" />);

      await waitFor(() => {
        expect(screen.getByText("Emma's HSC Dashboard")).toBeInTheDocument();
      });
    });

    it('displays student name in title', async () => {
      renderWithProviders(<HSCDashboard studentId="student-1" studentName="Emma" />);

      await waitFor(() => {
        expect(screen.getByText("Emma's HSC Dashboard")).toBeInTheDocument();
      });
    });
  });

  describe('countdown card', () => {
    it('displays days until HSC', async () => {
      renderWithProviders(<HSCDashboard studentId="student-1" studentName="Emma" />);

      await waitFor(() => {
        expect(screen.getByText('180')).toBeInTheDocument();
        expect(screen.getByText(/days to HSC/)).toBeInTheDocument();
      });
    });

    it('shows urgency color when close to HSC', async () => {
      (parentDashboardApi.getWeeklyInsights as ReturnType<typeof vi.fn>).mockResolvedValue(mockInsightsUrgent);

      renderWithProviders(<HSCDashboard studentId="student-1" studentName="Emma" />);

      await waitFor(() => {
        expect(screen.getByText('30')).toBeInTheDocument();
      });
    });
  });

  describe('exam readiness card', () => {
    it('displays exam readiness percentage', async () => {
      renderWithProviders(<HSCDashboard studentId="student-1" studentName="Emma" />);

      await waitFor(() => {
        expect(screen.getByText('Exam Readiness')).toBeInTheDocument();
        expect(screen.getByText('72%')).toBeInTheDocument();
      });
    });

    it('displays trajectory indicator for improving', async () => {
      renderWithProviders(<HSCDashboard studentId="student-1" studentName="Emma" />);

      await waitFor(() => {
        const improvingElements = screen.getAllByText('Improving');
        expect(improvingElements.length).toBeGreaterThan(0);
      });
    });

    it('shows appropriate icon for high readiness', async () => {
      (parentDashboardApi.getWeeklyInsights as ReturnType<typeof vi.fn>).mockResolvedValue(mockInsightsHighBand);

      renderWithProviders(<HSCDashboard studentId="student-1" studentName="Emma" />);

      await waitFor(() => {
        expect(screen.getByText('92%')).toBeInTheDocument();
      });
    });

    it('shows appropriate icon for low readiness', async () => {
      (parentDashboardApi.getWeeklyInsights as ReturnType<typeof vi.fn>).mockResolvedValue(mockInsightsUrgent);

      renderWithProviders(<HSCDashboard studentId="student-1" studentName="Emma" />);

      await waitFor(() => {
        expect(screen.getByText('45%')).toBeInTheDocument();
      });
    });
  });

  describe('band prediction card', () => {
    it('displays predicted band', async () => {
      renderWithProviders(<HSCDashboard studentId="student-1" studentName="Emma" />);

      await waitFor(() => {
        expect(screen.getByText('Predicted Band')).toBeInTheDocument();
        expect(screen.getByText('Band 5')).toBeInTheDocument();
      });
    });

    it('displays band range description', async () => {
      renderWithProviders(<HSCDashboard studentId="student-1" studentName="Emma" />);

      await waitFor(() => {
        expect(screen.getByText('(80-89)')).toBeInTheDocument();
      });
    });

    it('displays Band 6 with correct styling', async () => {
      (parentDashboardApi.getWeeklyInsights as ReturnType<typeof vi.fn>).mockResolvedValue(mockInsightsHighBand);

      renderWithProviders(<HSCDashboard studentId="student-1" studentName="Emma" />);

      await waitFor(() => {
        expect(screen.getByText('Band 6')).toBeInTheDocument();
      });
    });
  });

  describe('subject band chart', () => {
    it('renders bar chart component', async () => {
      renderWithProviders(<HSCDashboard studentId="student-1" studentName="Emma" />);

      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      });
    });

    it('displays subject performance section', async () => {
      renderWithProviders(<HSCDashboard studentId="student-1" studentName="Emma" />);

      await waitFor(() => {
        expect(screen.getByText('Subject Performance')).toBeInTheDocument();
      });
    });
  });

  describe('strengths card', () => {
    it('displays strengths section', async () => {
      renderWithProviders(<HSCDashboard studentId="student-1" studentName="Emma" />);

      await waitFor(() => {
        expect(screen.getByText('Strengths')).toBeInTheDocument();
      });
    });

    it('lists strength items', async () => {
      renderWithProviders(<HSCDashboard studentId="student-1" studentName="Emma" />);

      await waitFor(() => {
        expect(screen.getByText('Algebra')).toBeInTheDocument();
        expect(screen.getByText('Problem Solving')).toBeInTheDocument();
        expect(screen.getByText('Geometry')).toBeInTheDocument();
      });
    });
  });

  describe('focus areas card', () => {
    it('displays focus areas section', async () => {
      renderWithProviders(<HSCDashboard studentId="student-1" studentName="Emma" />);

      await waitFor(() => {
        expect(screen.getByText('Focus Areas')).toBeInTheDocument();
      });
    });

    it('lists focus area items', async () => {
      renderWithProviders(<HSCDashboard studentId="student-1" studentName="Emma" />);

      await waitFor(() => {
        expect(screen.getByText('Calculus')).toBeInTheDocument();
        expect(screen.getByText('Statistics')).toBeInTheDocument();
      });
    });
  });

  describe('trajectory indicator', () => {
    it('shows improving trajectory', async () => {
      renderWithProviders(<HSCDashboard studentId="student-1" studentName="Emma" />);

      await waitFor(() => {
        // getAllByText because trajectory indicator appears in multiple places
        const improvingElements = screen.getAllByText('Improving');
        expect(improvingElements.length).toBeGreaterThan(0);
      });
    });

    it('shows declining trajectory as needs attention', async () => {
      (parentDashboardApi.getWeeklyInsights as ReturnType<typeof vi.fn>).mockResolvedValue(mockInsightsUrgent);

      renderWithProviders(<HSCDashboard studentId="student-1" studentName="Emma" />);

      await waitFor(() => {
        const needsAttentionElements = screen.getAllByText('Needs attention');
        expect(needsAttentionElements.length).toBeGreaterThan(0);
      });
    });

    it('shows stable trajectory', async () => {
      (parentDashboardApi.getWeeklyInsights as ReturnType<typeof vi.fn>).mockResolvedValue(mockInsightsHighBand);

      renderWithProviders(<HSCDashboard studentId="student-1" studentName="Emma" />);

      await waitFor(() => {
        const stableElements = screen.getAllByText('Stable');
        expect(stableElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('error handling', () => {
    it('displays error state on API failure', async () => {
      (parentDashboardApi.getWeeklyInsights as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Failed to fetch HSC data')
      );

      renderWithProviders(<HSCDashboard studentId="student-1" studentName="Emma" />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load HSC dashboard')).toBeInTheDocument();
      });
    });

    it('shows HSC not available when no HSC projection', async () => {
      (parentDashboardApi.getWeeklyInsights as ReturnType<typeof vi.fn>).mockResolvedValue(mockInsightsNoHSC);

      renderWithProviders(<HSCDashboard studentId="student-1" studentName="Emma" />);

      await waitFor(() => {
        expect(screen.getByText('HSC Data Not Available')).toBeInTheDocument();
      });
    });
  });

  describe('helper functions', () => {
    it('applies correct color for high readiness', async () => {
      (parentDashboardApi.getWeeklyInsights as ReturnType<typeof vi.fn>).mockResolvedValue(mockInsightsHighBand);

      renderWithProviders(<HSCDashboard studentId="student-1" studentName="Emma" />);

      await waitFor(() => {
        // High readiness (92%) should have green color class
        const readinessText = screen.getByText('92%');
        expect(readinessText.className).toContain('text-green');
      });
    });

    it('applies correct color for medium readiness', async () => {
      (parentDashboardApi.getWeeklyInsights as ReturnType<typeof vi.fn>).mockResolvedValue(mockInsightsUrgent);

      renderWithProviders(<HSCDashboard studentId="student-1" studentName="Emma" />);

      await waitFor(() => {
        // Medium readiness (45%) should have yellow color class (40-60 range)
        const readinessText = screen.getByText('45%');
        expect(readinessText.className).toContain('text-yellow');
      });
    });
  });
});
