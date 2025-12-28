/**
 * InsightsTab - AI-generated weekly insights for a student.
 *
 * Shows:
 * - This week's wins and achievements
 * - Areas needing attention
 * - Personalised recommendations
 * - Teacher talking points
 * - Pathway readiness (Stage 5) or HSC projections (Stage 6)
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Trophy,
  AlertTriangle,
  Lightbulb,
  MessageSquare,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Clock,
  ArrowRight,
  GraduationCap,
  Target,
} from 'lucide-react';
import { parentDashboardApi } from '@/lib/api';
import type { InsightItem, RecommendationItem, PathwayReadiness, HSCProjection } from '@/lib/api';
import { Card, Button, Spinner } from '@/components/ui';

interface InsightsTabProps {
  studentId: string;
}

export function InsightsTab({ studentId }: InsightsTabProps) {
  const [forceRegenerate, setForceRegenerate] = useState(false);

  const {
    data: insights,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['weekly-insights', studentId, forceRegenerate],
    queryFn: () =>
      parentDashboardApi.getWeeklyInsights(studentId, {
        forceRegenerate,
      }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleRegenerate = async () => {
    setForceRegenerate(true);
    await refetch();
    setForceRegenerate(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-500">Generating insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-red-600">Failed to load insights</p>
        <p className="mt-2 text-sm text-gray-500">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          Try Again
        </Button>
      </Card>
    );
  }

  if (!insights) {
    return null;
  }

  const { insights: data } = insights;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Weekly Insights</h2>
          <p className="text-sm text-gray-500">
            Week of {formatDate(insights.weekStart)} • Generated{' '}
            {formatRelativeTime(insights.generatedAt)}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRegenerate}
          disabled={isFetching}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Regenerate
        </Button>
      </div>

      {/* Summary */}
      {data.summary && (
        <Card className="border-l-4 border-l-blue-500 bg-blue-50 p-4">
          <p className="text-blue-800">{data.summary}</p>
        </Card>
      )}

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Wins */}
        <InsightSection
          title="This Week's Wins"
          icon={<Trophy className="h-5 w-5 text-yellow-500" />}
          items={data.wins}
          emptyMessage="Keep studying to earn achievements!"
          variant="success"
        />

        {/* Areas to Watch */}
        <InsightSection
          title="Areas to Watch"
          icon={<AlertTriangle className="h-5 w-5 text-orange-500" />}
          items={data.areasToWatch}
          emptyMessage="No concerns this week!"
          variant="warning"
        />
      </div>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <RecommendationsSection recommendations={data.recommendations} />
      )}

      {/* Teacher Talking Points */}
      {data.teacherTalkingPoints.length > 0 && (
        <TalkingPointsSection points={data.teacherTalkingPoints} />
      )}

      {/* Pathway Readiness (Stage 5) */}
      {data.pathwayReadiness && <PathwayReadinessSection readiness={data.pathwayReadiness} />}

      {/* HSC Projection (Stage 6) */}
      {data.hscProjection && <HSCProjectionSection projection={data.hscProjection} />}
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

interface InsightSectionProps {
  title: string;
  icon: React.ReactNode;
  items: InsightItem[];
  emptyMessage: string;
  variant: 'success' | 'warning';
}

function InsightSection({ title, icon, items, emptyMessage, variant }: InsightSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const sectionId = `insight-section-${variant}`;

  const bgClass = variant === 'success' ? 'bg-green-50' : 'bg-orange-50';
  const borderClass = variant === 'success' ? 'border-green-200' : 'border-orange-200';

  return (
    <Card className="overflow-hidden">
      <button
        aria-expanded={isExpanded}
        aria-controls={sectionId}
        aria-label={isExpanded ? `Collapse ${title}` : `Expand ${title}`}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold">{title}</h3>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {items.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div id={sectionId} className="border-t px-4 pb-4">
          {items.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {items.map((item, i) => (
                <li
                  key={i}
                  className={`rounded-lg border p-3 ${bgClass} ${borderClass}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                    </div>
                    {item.priority === 'high' && (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        Priority
                      </span>
                    )}
                  </div>
                  {item.subjectName && (
                    <p className="mt-2 text-xs text-gray-500">{item.subjectName}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-4 text-center text-gray-500">{emptyMessage}</p>
          )}
        </div>
      )}
    </Card>
  );
}

interface RecommendationsSectionProps {
  recommendations: RecommendationItem[];
}

function RecommendationsSection({ recommendations }: RecommendationsSectionProps) {
  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-purple-500" />
        <h3 className="font-semibold">Recommendations</h3>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {recommendations.map((rec, i) => (
          <div
            key={i}
            className="rounded-lg border border-purple-100 bg-purple-50 p-4"
          >
            <h4 className="font-medium text-purple-900">{rec.title}</h4>
            <p className="mt-1 text-sm text-purple-700">{rec.description}</p>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="rounded bg-purple-200 px-2 py-0.5 text-purple-800">
                {rec.actionType}
              </span>
              {rec.estimatedTimeMinutes && (
                <span className="flex items-center gap-1 text-purple-600">
                  <Clock className="h-3 w-3" />
                  {rec.estimatedTimeMinutes} min
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

interface TalkingPointsSectionProps {
  points: string[];
}

function TalkingPointsSection({ points }: TalkingPointsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const sectionId = 'talking-points-content';

  return (
    <Card className="p-6">
      <button
        aria-expanded={isExpanded}
        aria-controls={sectionId}
        aria-label={isExpanded ? 'Collapse Teacher Talking Points' : 'Expand Teacher Talking Points'}
        className="flex w-full items-center justify-between text-left"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-500" />
          <h3 className="font-semibold">Teacher Talking Points</h3>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div id={sectionId} className="mt-4">
          <p className="mb-3 text-sm text-gray-500">
            Curriculum-aligned discussion points for your next parent-teacher meeting:
          </p>
          <ul className="space-y-2">
            {points.map((point, i) => (
              <li key={i} className="flex items-start gap-2">
                <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span className="text-sm">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

interface PathwayReadinessSectionProps {
  readiness: PathwayReadiness;
}

function PathwayReadinessSection({ readiness }: PathwayReadinessSectionProps) {
  return (
    <Card className="border-l-4 border-l-indigo-500 p-6">
      <div className="mb-4 flex items-center gap-2">
        <Target className="h-5 w-5 text-indigo-500" />
        <h3 className="font-semibold">Stage 5 Pathway Readiness</h3>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-sm text-gray-500">Current Pathway</p>
          <p className="text-2xl font-bold text-indigo-600">{readiness.currentPathway}</p>
          {readiness.recommendedPathway &&
            readiness.recommendedPathway !== readiness.currentPathway && (
              <p className="mt-1 text-sm text-green-600">
                Recommended: {readiness.recommendedPathway}
              </p>
            )}
        </div>

        <div>
          <p className="text-sm text-gray-500">Ready for Higher Pathway?</p>
          <p className={`font-semibold ${readiness.readyForHigher ? 'text-green-600' : 'text-gray-600'}`}>
            {readiness.readyForHigher ? 'Yes!' : 'Not yet'}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Confidence: {(readiness.confidence * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-indigo-50 p-3">
        <p className="text-sm text-indigo-800">{readiness.recommendation}</p>
      </div>

      {readiness.blockingGaps.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-red-600">Gaps to address:</p>
          <ul className="mt-1 list-inside list-disc text-sm text-red-700">
            {readiness.blockingGaps.map((gap, i) => (
              <li key={i}>{gap}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

interface HSCProjectionSectionProps {
  projection: HSCProjection;
}

function HSCProjectionSection({ projection }: HSCProjectionSectionProps) {
  const bandColors: Record<number, string> = {
    6: 'text-green-600 bg-green-100',
    5: 'text-blue-600 bg-blue-100',
    4: 'text-indigo-600 bg-indigo-100',
    3: 'text-yellow-600 bg-yellow-100',
    2: 'text-orange-600 bg-orange-100',
    1: 'text-red-600 bg-red-100',
  };

  const trajectoryIcon =
    projection.trajectory === 'improving' ? (
      <span className="text-green-600">↗ Improving</span>
    ) : projection.trajectory === 'declining' ? (
      <span className="text-red-600">↘ Declining</span>
    ) : (
      <span className="text-gray-600">→ Stable</span>
    );

  return (
    <Card className="border-l-4 border-l-purple-500 p-6">
      <div className="mb-4 flex items-center gap-2">
        <GraduationCap className="h-5 w-5 text-purple-500" />
        <h3 className="font-semibold">HSC Projection</h3>
        <span className="text-sm text-gray-500">({projection.daysUntilHsc} days until HSC)</span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="text-center">
          <p className="text-sm text-gray-500">Predicted Band</p>
          <div
            className={`mx-auto mt-1 inline-block rounded-full px-4 py-2 ${bandColors[projection.predictedBand] || 'bg-gray-100'}`}
          >
            <span className="text-3xl font-bold">Band {projection.predictedBand}</span>
          </div>
          <p className="mt-1 text-sm text-gray-500">{projection.bandRange}</p>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-500">Exam Readiness</p>
          <div className="mx-auto mt-2 h-20 w-20">
            <div className="relative h-full w-full">
              <svg className="h-full w-full" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#8B5CF6"
                  strokeWidth="3"
                  strokeDasharray={`${projection.examReadiness * 100}, 100`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold">
                  {(projection.examReadiness * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-500">Trajectory</p>
          <p className="mt-2 text-lg font-medium">{trajectoryIcon}</p>
          {projection.currentAverage && (
            <p className="mt-2 text-sm text-gray-500">
              Current avg: {projection.currentAverage.toFixed(0)}%
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {projection.strengths.length > 0 && (
          <div className="rounded-lg bg-green-50 p-3">
            <p className="text-sm font-medium text-green-700">Strengths</p>
            <ul className="mt-1 list-inside list-disc text-sm text-green-600">
              {projection.strengths.slice(0, 3).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}
        {projection.focusAreas.length > 0 && (
          <div className="rounded-lg bg-orange-50 p-3">
            <p className="text-sm font-medium text-orange-700">Focus Areas</p>
            <ul className="mt-1 list-inside list-disc text-sm text-orange-600">
              {projection.focusAreas.slice(0, 3).map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}
