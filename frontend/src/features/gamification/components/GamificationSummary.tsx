/**
 * GamificationSummary component - compact gamification overview for parent dashboard.
 */

import { memo } from 'react';
import { Award, Flame, TrendingUp, Zap } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useGamificationStatsDetailed } from '@/hooks/useGamification';
import { LevelBadge } from './LevelBadge';
import { XPBar } from './XPBar';

interface GamificationSummaryProps {
  studentId: string;
  studentName?: string;
  compact?: boolean;
  className?: string;
}

export const GamificationSummary = memo(function GamificationSummary({
  studentId,
  studentName,
  compact = false,
  className = '',
}: GamificationSummaryProps) {
  const { data: stats, isLoading, error } = useGamificationStatsDetailed(studentId);

  if (isLoading) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center justify-center py-4">
          <Spinner size="sm" label="Loading progress..." />
        </div>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card className={`p-4 ${className}`}>
        <p className="text-sm text-gray-500 text-center">
          Unable to load progress data
        </p>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center gap-4">
          <LevelBadge level={stats.level} size="md" />
          <div className="flex-1 min-w-0">
            {studentName && (
              <h4 className="font-medium text-gray-900 truncate">{studentName}</h4>
            )}
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Zap className="w-4 h-4 text-amber-500" aria-hidden="true" />
                {stats.totalXp.toLocaleString()} XP
              </span>
              <span className="flex items-center gap-1">
                <Flame className="w-4 h-4 text-orange-500" aria-hidden="true" />
                {stats.streak.current} day streak
              </span>
              <span className="flex items-center gap-1">
                <Award className="w-4 h-4 text-purple-500" aria-hidden="true" />
                {stats.achievementsUnlocked} badges
              </span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-500" aria-hidden="true" />
          <h3 className="font-semibold text-gray-900">
            {studentName ? `${studentName}'s Progress` : 'Learning Progress'}
          </h3>
        </div>
      </div>

      {/* Level and XP */}
      <div className="flex items-center gap-4 mb-6">
        <LevelBadge level={stats.level} title={stats.levelTitle} size="lg" showTitle />
        <div className="flex-1">
          <XPBar
            currentXp={stats.totalXp}
            levelStartXp={0}
            nextLevelXp={stats.nextLevelXp}
            progressPercent={stats.levelProgressPercent}
            size="md"
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Total XP */}
        <div className="text-center p-3 bg-amber-50 rounded-lg">
          <Zap className="w-6 h-6 text-amber-500 mx-auto mb-1" aria-hidden="true" />
          <div className="text-lg font-bold text-gray-900">
            {stats.totalXp.toLocaleString()}
          </div>
          <div className="text-xs text-gray-600">Total XP</div>
        </div>

        {/* Streak */}
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <Flame className="w-6 h-6 text-orange-500 mx-auto mb-1" aria-hidden="true" />
          <div className="text-lg font-bold text-gray-900">
            {stats.streak.current}
          </div>
          <div className="text-xs text-gray-600">
            Day Streak
            {stats.streak.multiplier > 1 && (
              <span className="block text-orange-600">
                {stats.streak.multiplier.toFixed(1)}x bonus
              </span>
            )}
          </div>
        </div>

        {/* Achievements */}
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <Award className="w-6 h-6 text-purple-500 mx-auto mb-1" aria-hidden="true" />
          <div className="text-lg font-bold text-gray-900">
            {stats.achievementsUnlocked}
          </div>
          <div className="text-xs text-gray-600">
            of {stats.achievementsTotal} Badges
          </div>
        </div>
      </div>

      {/* Recent Achievements */}
      {stats.recentAchievements.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Recent Achievements
          </h4>
          <div className="flex flex-wrap gap-2">
            {stats.recentAchievements.slice(0, 3).map((achievement) => (
              <span
                key={achievement.code}
                className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium"
              >
                <Award className="w-3 h-3" aria-hidden="true" />
                {achievement.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Subject Progress Summary */}
      {stats.subjectStats.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Subject Progress
          </h4>
          <div className="space-y-2">
            {stats.subjectStats.slice(0, 3).map((subject) => (
              <div key={subject.subjectId} className="flex items-center gap-2">
                <LevelBadge level={subject.level} size="xs" />
                <span className="text-sm text-gray-700 flex-1 truncate">
                  {subject.subjectName}
                </span>
                <span className="text-xs text-gray-500">
                  {subject.xpEarned.toLocaleString()} XP
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
});
