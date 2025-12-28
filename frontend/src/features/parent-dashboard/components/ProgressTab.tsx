/**
 * ProgressTab - Detailed progress view for a student.
 *
 * Shows:
 * - Overall mastery with radial progress
 * - Weekly study stats
 * - Subject-by-subject breakdown with bar charts
 * - Foundation strength assessment
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
  RadialBarChart,
  RadialBar,
} from 'recharts';
import {
  Clock,
  Target,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Zap,
} from 'lucide-react';
import { parentDashboardApi } from '@/lib/api';
import type { SubjectProgress, WeeklyStats } from '@/lib/api';
import { Card, Spinner } from '@/components/ui';

interface ProgressTabProps {
  studentId: string;
}

export function ProgressTab({ studentId }: ProgressTabProps) {
  const {
    data: progress,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['student-progress', studentId],
    queryFn: () => parentDashboardApi.getStudentProgress(studentId),
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
        <p className="text-red-600">Failed to load progress data</p>
        <p className="mt-2 text-sm text-gray-500">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </Card>
    );
  }

  if (!progress) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{progress.studentName}'s Progress</h2>
          <p className="text-sm text-gray-500">
            {getGradeLabel(progress.gradeLevel)} • {getStageLabel(progress.schoolStage)}
          </p>
        </div>
        {progress.currentFocusSubjects.length > 0 && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Currently focusing on</p>
            <p className="text-sm font-medium">{progress.currentFocusSubjects.join(', ')}</p>
          </div>
        )}
      </div>

      {/* Top Row - Mastery & Weekly Stats */}
      <div className="grid gap-6 lg:grid-cols-3">
        <OverallMasteryCard mastery={progress.overallMastery} change={progress.masteryChange30Days} />
        <WeeklyStatsCard stats={progress.weeklyStats} />
        <FoundationStrengthCard foundation={progress.foundationStrength} />
      </div>

      {/* Subject Progress */}
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Subject Progress</h3>
        {progress.subjectProgress.length > 0 ? (
          <SubjectProgressChart subjects={progress.subjectProgress} />
        ) : (
          <p className="py-8 text-center text-gray-500">No subject enrolments yet</p>
        )}
      </Card>

      {/* Subject Details */}
      {progress.subjectProgress.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {progress.subjectProgress.map((subject) => (
            <SubjectDetailCard key={subject.subjectId} subject={subject} />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

interface OverallMasteryCardProps {
  mastery: number;
  change: number;
}

function OverallMasteryCard({ mastery, change }: OverallMasteryCardProps) {
  const data = [
    {
      name: 'Mastery',
      value: mastery,
      fill: getMasteryColor(mastery),
    },
  ];

  const changeDescription = change > 0
    ? `increased by ${change.toFixed(1)}%`
    : change < 0
      ? `decreased by ${Math.abs(change).toFixed(1)}%`
      : 'unchanged';

  return (
    <Card className="p-6">
      <h3 className="mb-2 text-sm font-medium text-gray-500">Overall Mastery</h3>
      <div className="flex items-center justify-between">
        <div
          className="h-32 w-32"
          role="img"
          aria-label={`Overall mastery gauge showing ${mastery.toFixed(0)}%, ${changeDescription} from last 30 days`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="100%"
              barSize={10}
              data={data}
              startAngle={180}
              endAngle={0}
            >
              <RadialBar
                background
                dataKey="value"
                cornerRadius={5}
              />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold">{mastery.toFixed(0)}%</p>
          <div className="mt-1 flex items-center justify-end gap-1">
            {change > 0 ? (
              <>
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-600">+{change.toFixed(1)}%</span>
              </>
            ) : change < 0 ? (
              <>
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-600">{change.toFixed(1)}%</span>
              </>
            ) : (
              <>
                <Minus className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500">No change</span>
              </>
            )}
          </div>
          <p className="text-xs text-gray-400">vs last 30 days</p>
        </div>
      </div>
    </Card>
  );
}

interface WeeklyStatsCardProps {
  stats: WeeklyStats;
}

function WeeklyStatsCard({ stats }: WeeklyStatsCardProps) {
  const goalProgress = (stats.studyTimeMinutes / stats.studyGoalMinutes) * 100;

  return (
    <Card className="p-6">
      <h3 className="mb-4 text-sm font-medium text-gray-500">This Week</h3>
      <div className="space-y-4">
        {/* Study Time Progress */}
        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-gray-400" />
              Study Time
            </span>
            <span className="font-medium">
              {formatMinutes(stats.studyTimeMinutes)} / {formatMinutes(stats.studyGoalMinutes)}
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-gray-200"
            role="progressbar"
            aria-valuenow={Math.min(goalProgress, 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Study time progress: ${formatMinutes(stats.studyTimeMinutes)} of ${formatMinutes(stats.studyGoalMinutes)} goal`}
          >
            <div
              className={`h-full rounded-full transition-all ${
                goalProgress >= 100 ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(goalProgress, 100)}%` }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <StatBox
            icon={<BookOpen className="h-4 w-4" />}
            label="Sessions"
            value={stats.sessionsCount.toString()}
          />
          <StatBox
            icon={<Target className="h-4 w-4" />}
            label="Topics"
            value={stats.topicsCovered.toString()}
          />
          <StatBox
            icon={<Zap className="h-4 w-4" />}
            label="Flashcards"
            value={stats.flashcardsReviewed.toString()}
          />
          <StatBox
            icon={<CheckCircle className="h-4 w-4" />}
            label="Accuracy"
            value={stats.accuracyPercentage != null ? `${stats.accuracyPercentage}%` : '-'}
          />
        </div>
      </div>
    </Card>
  );
}

interface StatBoxProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function StatBox({ icon, label, value }: StatBoxProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-2">
      <span className="text-gray-400">{icon}</span>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );
}

interface FoundationStrengthCardProps {
  foundation: {
    overallStrength: number;
    priorYearMastery: number;
    gapsIdentified: number;
    criticalGaps: string[];
    strengths: string[];
  };
}

function FoundationStrengthCard({ foundation }: FoundationStrengthCardProps) {
  const isStrong = foundation.overallStrength >= 70;
  const isWeak = foundation.overallStrength < 50;

  return (
    <Card className="p-6">
      <h3 className="mb-4 text-sm font-medium text-gray-500">Foundation Strength</h3>
      <div className="flex items-center gap-4">
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-full ${
            isStrong
              ? 'bg-green-100 text-green-600'
              : isWeak
                ? 'bg-red-100 text-red-600'
                : 'bg-yellow-100 text-yellow-600'
          }`}
        >
          {isStrong ? (
            <CheckCircle className="h-8 w-8" />
          ) : isWeak ? (
            <AlertTriangle className="h-8 w-8" />
          ) : (
            <Target className="h-8 w-8" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-2xl font-bold">{foundation.overallStrength.toFixed(0)}%</p>
          <p className="text-sm text-gray-500">
            {isStrong ? 'Strong foundation' : isWeak ? 'Needs attention' : 'Building strength'}
          </p>
          {foundation.gapsIdentified > 0 && (
            <p className="mt-1 text-xs text-orange-600">
              {foundation.gapsIdentified} gap{foundation.gapsIdentified > 1 ? 's' : ''} identified
            </p>
          )}
        </div>
      </div>
      {foundation.criticalGaps.length > 0 && (
        <div className="mt-4 rounded-lg bg-red-50 p-3">
          <p className="text-xs font-medium text-red-700">Critical gaps:</p>
          <ul className="mt-1 list-inside list-disc text-xs text-red-600">
            {foundation.criticalGaps.slice(0, 2).map((gap, i) => (
              <li key={i}>{gap}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

interface SubjectProgressChartProps {
  subjects: SubjectProgress[];
}

function SubjectProgressChart({ subjects }: SubjectProgressChartProps) {
  const data = subjects.map((s) => ({
    name: s.subjectCode,
    mastery: s.masteryLevel,
    color: s.subjectColor ?? '#6366F1',
  }));

  // Create accessible description of the chart data
  const chartDescription = subjects
    .map((s) => `${s.subjectName}: ${s.masteryLevel.toFixed(0)}%`)
    .join(', ');

  return (
    <div
      className="h-64"
      role="img"
      aria-label={`Subject mastery chart. ${chartDescription}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
          <YAxis type="category" dataKey="name" width={60} />
          <Tooltip
            formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Mastery']}
            contentStyle={{ borderRadius: '8px' }}
          />
          <Bar dataKey="mastery" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface SubjectDetailCardProps {
  subject: SubjectProgress;
}

function SubjectDetailCard({ subject }: SubjectDetailCardProps) {
  const trendIcon =
    subject.strandProgress[0]?.trend === 'improving' ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : subject.strandProgress[0]?.trend === 'declining' ? (
      <TrendingDown className="h-4 w-4 text-red-500" />
    ) : (
      <Minus className="h-4 w-4 text-gray-400" />
    );

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: subject.subjectColor ?? '#6366F1' }}
          />
          <h4 className="font-semibold">{subject.subjectName}</h4>
        </div>
        <div className="flex items-center gap-2">
          {trendIcon}
          <span className="text-lg font-bold">{subject.masteryLevel.toFixed(0)}%</span>
        </div>
      </div>

      {/* Strand Progress */}
      {subject.strandProgress.length > 0 && (
        <div className="space-y-2">
          {subject.strandProgress.slice(0, 3).map((strand, i) => (
            <div key={i}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-gray-600">{strand.strand}</span>
                <span className="font-medium">{strand.mastery.toFixed(0)}%</span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-gray-200"
                role="progressbar"
                aria-valuenow={strand.mastery}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${strand.strand} mastery: ${strand.mastery.toFixed(0)}%`}
              >
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{ width: `${strand.mastery}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Week Stats */}
      <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs text-gray-500">
        <span>{subject.sessionsThisWeek} sessions this week</span>
        <span>{formatMinutes(subject.timeSpentThisWeekMinutes)}</span>
      </div>
    </Card>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function getMasteryColor(mastery: number): string {
  if (mastery >= 80) return '#22C55E'; // green
  if (mastery >= 60) return '#3B82F6'; // blue
  if (mastery >= 40) return '#F59E0B'; // yellow
  return '#EF4444'; // red
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function getStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    ES1: 'Early Stage 1',
    S1: 'Stage 1',
    S2: 'Stage 2',
    S3: 'Stage 3',
    S4: 'Stage 4',
    S5: 'Stage 5',
    S6: 'Stage 6',
  };
  return labels[stage] ?? stage;
}

function getGradeLabel(grade: number): string {
  if (grade === 0) return 'Kindergarten';
  return `Year ${grade}`;
}
