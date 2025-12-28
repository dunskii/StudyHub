/**
 * HSCDashboard - HSC-specific dashboard for Years 11-12 students.
 *
 * Features:
 * - ATAR projection tracking
 * - Subject band predictions
 * - HSC exam readiness assessment
 * - Study recommendations for HSC
 * - Days until HSC countdown
 */

import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Award,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
} from 'lucide-react';
import { parentDashboardApi } from '@/lib/api';
import type { HSCProjection } from '@/lib/api';
import { Card, Spinner } from '@/components/ui';

interface HSCDashboardProps {
  studentId: string;
  studentName: string;
}

export function HSCDashboard({ studentId, studentName }: HSCDashboardProps) {
  const {
    data: insights,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['student-insights', studentId],
    queryFn: () => parentDashboardApi.getWeeklyInsights(studentId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-red-600">Failed to load HSC dashboard</p>
        <p className="mt-2 text-sm text-gray-500">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </Card>
    );
  }

  const hscProjection = insights?.insights.hscProjection;

  if (!hscProjection) {
    return (
      <Card className="p-6 text-center">
        <Award className="mx-auto h-12 w-12 text-gray-300" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">HSC Data Not Available</h3>
        <p className="mt-2 text-gray-500">
          HSC projections will appear once {studentName} has enough learning activity.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Countdown */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{studentName}'s HSC Dashboard</h2>
          <p className="text-sm text-gray-500">Year 12 HSC Preparation</p>
        </div>
        <CountdownCard daysRemaining={hscProjection.daysUntilHsc} />
      </div>

      {/* Top Row - Key Metrics */}
      <div className="grid gap-6 md:grid-cols-3">
        <ATARProjectionCard projection={hscProjection} />
        <ExamReadinessCard readiness={hscProjection.examReadiness} trajectory={hscProjection.trajectory} />
        <BandPredictionCard predictedBand={hscProjection.predictedBand} bandRange={hscProjection.bandRange} />
      </div>

      {/* Subject Band Chart */}
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Subject Performance</h3>
        <SubjectBandChart projection={hscProjection} />
      </Card>

      {/* Strengths & Focus Areas */}
      <div className="grid gap-6 md:grid-cols-2">
        <StrengthsCard strengths={hscProjection.strengths} />
        <FocusAreasCard focusAreas={hscProjection.focusAreas} />
      </div>

      {/* Study Recommendations */}
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold">HSC Study Recommendations</h3>
        <HSCRecommendations projection={hscProjection} />
      </Card>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

interface CountdownCardProps {
  daysRemaining: number;
}

function CountdownCard({ daysRemaining }: CountdownCardProps) {
  const weeks = Math.floor(daysRemaining / 7);
  const urgency =
    daysRemaining <= 30 ? 'text-red-600 bg-red-50' :
    daysRemaining <= 90 ? 'text-orange-600 bg-orange-50' :
    'text-blue-600 bg-blue-50';

  return (
    <div className={`rounded-lg px-4 py-2 ${urgency}`}>
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5" />
        <div>
          <p className="text-2xl font-bold">{daysRemaining}</p>
          <p className="text-xs">days to HSC ({weeks} weeks)</p>
        </div>
      </div>
    </div>
  );
}

interface ATARProjectionCardProps {
  projection: HSCProjection;
}

function ATARProjectionCard({ projection }: ATARProjectionCardProps) {
  const atarContribution = projection.atarContribution;

  return (
    <Card className="p-6">
      <h3 className="mb-2 text-sm font-medium text-gray-500">ATAR Projection</h3>
      <div className="flex items-end justify-between">
        <div>
          {atarContribution !== null ? (
            <>
              <p className="text-3xl font-bold text-gray-900">
                {atarContribution.toFixed(1)}
              </p>
              <p className="text-sm text-gray-500">Estimated ATAR</p>
            </>
          ) : (
            <>
              <p className="text-xl font-bold text-gray-400">Calculating...</p>
              <p className="text-sm text-gray-500">Need more data</p>
            </>
          )}
        </div>
        <div className="flex flex-col items-end">
          <TrajectoryIndicator trajectory={projection.trajectory} />
          {projection.currentAverage !== null && (
            <p className="mt-1 text-xs text-gray-400">
              Current avg: {projection.currentAverage.toFixed(1)}%
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

interface ExamReadinessCardProps {
  readiness: number;
  trajectory: string;
}

function ExamReadinessCard({ readiness, trajectory }: ExamReadinessCardProps) {
  const readinessColor = getReadinessColor(readiness);
  const readinessLabel = getReadinessLabel(readiness);

  return (
    <Card className="p-6">
      <h3 className="mb-2 text-sm font-medium text-gray-500">Exam Readiness</h3>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className={`text-3xl font-bold ${readinessColor}`}>{readiness}%</p>
            {trajectory && <TrajectoryIndicator trajectory={trajectory} />}
          </div>
          <p className="text-sm text-gray-500">{readinessLabel}</p>
        </div>
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-full ${
            readiness >= 70 ? 'bg-green-100' : readiness >= 50 ? 'bg-yellow-100' : 'bg-red-100'
          }`}
        >
          {readiness >= 70 ? (
            <CheckCircle className="h-8 w-8 text-green-600" />
          ) : readiness >= 50 ? (
            <Clock className="h-8 w-8 text-yellow-600" />
          ) : (
            <AlertTriangle className="h-8 w-8 text-red-600" />
          )}
        </div>
      </div>
      <div className="mt-3">
        <div
          className="h-2 overflow-hidden rounded-full bg-gray-200"
          role="progressbar"
          aria-valuenow={readiness}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Exam readiness: ${readiness}%, ${readinessLabel}`}
        >
          <div
            className={`h-full rounded-full transition-all ${
              readiness >= 70 ? 'bg-green-500' : readiness >= 50 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${readiness}%` }}
          />
        </div>
      </div>
    </Card>
  );
}

interface BandPredictionCardProps {
  predictedBand: number;
  bandRange: string;
}

function BandPredictionCard({ predictedBand, bandRange }: BandPredictionCardProps) {
  const bandColor = getBandColor(predictedBand);
  const bandDescription = getBandDescription(predictedBand);

  return (
    <Card className="p-6">
      <h3 className="mb-2 text-sm font-medium text-gray-500">Predicted Band</h3>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <p className={`text-3xl font-bold ${bandColor}`}>Band {predictedBand}</p>
            <span className="text-sm text-gray-400">({bandRange})</span>
          </div>
          <p className="text-sm text-gray-500">{bandDescription}</p>
        </div>
        <div className="flex flex-col gap-1">
          {[6, 5, 4, 3, 2, 1].map((band) => (
            <div
              key={band}
              className={`h-2 w-8 rounded ${
                band === predictedBand ? getBandBgColor(band) : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

interface SubjectBandChartProps {
  projection: HSCProjection;
}

function SubjectBandChart({ projection }: SubjectBandChartProps) {
  // Mock subject data - in real app, this would come from the API
  const subjectData = [
    { subject: 'English', band: projection.predictedBand, target: 5 },
    { subject: 'Maths', band: Math.min(projection.predictedBand + 1, 6), target: 5 },
    { subject: 'Physics', band: projection.predictedBand, target: 5 },
    { subject: 'Chemistry', band: Math.max(projection.predictedBand - 1, 1), target: 5 },
  ];

  // Create accessible description of the chart data
  const chartDescription = subjectData
    .map((s) => `${s.subject}: Band ${s.band}`)
    .join(', ');

  return (
    <div
      className="h-64"
      role="img"
      aria-label={`Subject band predictions chart. ${chartDescription}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={subjectData} layout="vertical" margin={{ left: 0, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" domain={[0, 6]} ticks={[1, 2, 3, 4, 5, 6]} />
          <YAxis type="category" dataKey="subject" width={80} />
          <Tooltip
            formatter={(value) => [`Band ${value}`, 'Predicted']}
            contentStyle={{ borderRadius: '8px' }}
          />
          <Bar dataKey="band" radius={[0, 4, 4, 0]}>
            {subjectData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBandHexColor(entry.band)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface StrengthsCardProps {
  strengths: string[];
}

function StrengthsCard({ strengths }: StrengthsCardProps) {
  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <CheckCircle className="h-5 w-5 text-green-500" />
        <h3 className="text-lg font-semibold">Strengths</h3>
      </div>
      {strengths.length > 0 ? (
        <ul className="space-y-2">
          {strengths.map((strength, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Zap className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
              <span className="text-gray-700">{strength}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">Keep studying to identify your strengths!</p>
      )}
    </Card>
  );
}

interface FocusAreasCardProps {
  focusAreas: string[];
}

function FocusAreasCard({ focusAreas }: FocusAreasCardProps) {
  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <Target className="h-5 w-5 text-orange-500" />
        <h3 className="text-lg font-semibold">Focus Areas</h3>
      </div>
      {focusAreas.length > 0 ? (
        <ul className="space-y-2">
          {focusAreas.map((area, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
              <span className="text-gray-700">{area}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">No critical focus areas identified.</p>
      )}
    </Card>
  );
}

interface HSCRecommendationsProps {
  projection: HSCProjection;
}

function HSCRecommendations({ projection }: HSCRecommendationsProps) {
  const recommendations = generateHSCRecommendations(projection);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {recommendations.map((rec, i) => (
        <div
          key={i}
          className={`rounded-lg p-4 ${
            rec.priority === 'high'
              ? 'border-l-4 border-l-red-500 bg-red-50'
              : rec.priority === 'medium'
                ? 'border-l-4 border-l-yellow-500 bg-yellow-50'
                : 'border-l-4 border-l-blue-500 bg-blue-50'
          }`}
        >
          <div className="flex items-start gap-3">
            <BookOpen className={`h-5 w-5 shrink-0 ${
              rec.priority === 'high'
                ? 'text-red-600'
                : rec.priority === 'medium'
                  ? 'text-yellow-600'
                  : 'text-blue-600'
            }`} />
            <div>
              <h4 className="font-medium text-gray-900">{rec.title}</h4>
              <p className="mt-1 text-sm text-gray-600">{rec.description}</p>
              {rec.timeEstimate && (
                <p className="mt-2 text-xs text-gray-500">
                  <Clock className="mr-1 inline h-3 w-3" />
                  {rec.timeEstimate}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface TrajectoryIndicatorProps {
  trajectory: string;
}

function TrajectoryIndicator({ trajectory }: TrajectoryIndicatorProps) {
  const isImproving = trajectory.toLowerCase().includes('improv');
  const isDeclining = trajectory.toLowerCase().includes('declin');

  if (isImproving) {
    return (
      <div className="flex items-center gap-1 text-green-600">
        <TrendingUp className="h-4 w-4" />
        <span className="text-sm">Improving</span>
      </div>
    );
  }

  if (isDeclining) {
    return (
      <div className="flex items-center gap-1 text-red-600">
        <TrendingDown className="h-4 w-4" />
        <span className="text-sm">Needs attention</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-gray-500">
      <Minus className="h-4 w-4" />
      <span className="text-sm">Stable</span>
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function getReadinessColor(readiness: number): string {
  if (readiness >= 80) return 'text-green-600';
  if (readiness >= 60) return 'text-blue-600';
  if (readiness >= 40) return 'text-yellow-600';
  return 'text-red-600';
}

function getReadinessLabel(readiness: number): string {
  if (readiness >= 80) return 'Well prepared';
  if (readiness >= 60) return 'On track';
  if (readiness >= 40) return 'Needs work';
  return 'Behind schedule';
}

function getBandColor(band: number): string {
  if (band >= 5) return 'text-green-600';
  if (band >= 4) return 'text-blue-600';
  if (band >= 3) return 'text-yellow-600';
  return 'text-red-600';
}

function getBandBgColor(band: number): string {
  if (band >= 5) return 'bg-green-500';
  if (band >= 4) return 'bg-blue-500';
  if (band >= 3) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getBandHexColor(band: number): string {
  if (band >= 5) return '#22C55E';
  if (band >= 4) return '#3B82F6';
  if (band >= 3) return '#F59E0B';
  return '#EF4444';
}

function getBandDescription(band: number): string {
  const descriptions: Record<number, string> = {
    6: 'Outstanding achievement',
    5: 'High achievement',
    4: 'Sound achievement',
    3: 'Satisfactory achievement',
    2: 'Basic achievement',
    1: 'Elementary achievement',
  };
  return descriptions[band] ?? '';
}

interface Recommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  timeEstimate?: string;
}

function generateHSCRecommendations(projection: HSCProjection): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Based on exam readiness
  if (projection.examReadiness < 50) {
    recommendations.push({
      title: 'Increase Study Sessions',
      description: 'Your exam readiness is below target. Consider adding 2-3 extra study sessions per week.',
      priority: 'high',
      timeEstimate: '2-3 hours/week extra',
    });
  }

  // Based on days remaining
  if (projection.daysUntilHsc <= 60) {
    recommendations.push({
      title: 'Focus on Past Papers',
      description: 'With HSC approaching, prioritise past paper practice to build exam technique.',
      priority: 'high',
      timeEstimate: '1 paper per subject weekly',
    });
  }

  // Based on focus areas
  if (projection.focusAreas.length > 0) {
    recommendations.push({
      title: 'Address Weak Areas',
      description: `Focus on: ${projection.focusAreas.slice(0, 2).join(', ')}. These areas need improvement before the exam.`,
      priority: 'medium',
      timeEstimate: '30 min daily focused practice',
    });
  }

  // General recommendations
  recommendations.push({
    title: 'Regular Revision Schedule',
    description: 'Maintain a consistent revision timetable across all subjects to build long-term retention.',
    priority: 'low',
    timeEstimate: 'Daily 2-hour blocks',
  });

  return recommendations.slice(0, 4);
}
