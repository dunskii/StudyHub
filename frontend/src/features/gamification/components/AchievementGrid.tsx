/**
 * AchievementGrid component - grid of achievements with category filters.
 */

import { memo, useState, useMemo } from 'react';
import { AchievementCard } from './AchievementCard';
import type { AchievementWithProgress, AchievementCategory } from '@/lib/api/gamification';

interface AchievementGridProps {
  achievements: AchievementWithProgress[];
  onAchievementClick?: (achievement: AchievementWithProgress) => void;
  showFilters?: boolean;
  columns?: 2 | 3 | 4;
  className?: string;
}

const categoryLabels: Record<AchievementCategory, string> = {
  engagement: 'Engagement',
  curriculum: 'Curriculum',
  milestone: 'Milestones',
  subject: 'Subjects',
  challenge: 'Challenges',
};

const columnClasses = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
};

export const AchievementGrid = memo(function AchievementGrid({
  achievements,
  onAchievementClick,
  showFilters = true,
  columns = 3,
  className = '',
}: AchievementGridProps) {
  const [filter, setFilter] = useState<AchievementCategory | 'all' | 'unlocked'>(
    'all'
  );

  // Get unique categories from achievements
  const categories = useMemo(() => {
    const cats = new Set(achievements.map((a) => a.category));
    return Array.from(cats) as AchievementCategory[];
  }, [achievements]);

  // Filter achievements
  const filteredAchievements = useMemo(() => {
    if (filter === 'all') return achievements;
    if (filter === 'unlocked')
      return achievements.filter((a) => a.isUnlocked);
    return achievements.filter((a) => a.category === filter);
  }, [achievements, filter]);

  // Sort: unlocked first (by date desc), then locked (by progress desc)
  const sortedAchievements = useMemo(() => {
    return [...filteredAchievements].sort((a, b) => {
      // Unlocked before locked
      if (a.isUnlocked && !b.isUnlocked) return -1;
      if (!a.isUnlocked && b.isUnlocked) return 1;

      // Both unlocked: sort by unlock date (newest first)
      if (a.isUnlocked && b.isUnlocked) {
        const dateA = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
        const dateB = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
        return dateB - dateA;
      }

      // Both locked: sort by progress (highest first)
      return b.progressPercent - a.progressPercent;
    });
  }, [filteredAchievements]);

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;
  const totalCount = achievements.length;

  return (
    <div className={className}>
      {/* Header with count */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Achievements{' '}
          <span className="text-gray-500 font-normal">
            ({unlockedCount}/{totalCount})
          </span>
        </h2>
      </div>

      {/* Category filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Achievement filters">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
              filter === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            aria-pressed={filter === 'all'}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter('unlocked')}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
              filter === 'unlocked'
                ? 'bg-amber-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            aria-pressed={filter === 'unlocked'}
          >
            Unlocked ({unlockedCount})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                filter === cat
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              aria-pressed={filter === cat}
            >
              {categoryLabels[cat]}
            </button>
          ))}
        </div>
      )}

      {/* Achievement grid */}
      {sortedAchievements.length > 0 ? (
        <div className={`grid gap-4 ${columnClasses[columns]}`}>
          {sortedAchievements.map((achievement) => (
            <AchievementCard
              key={achievement.code}
              achievement={achievement}
              onClick={
                onAchievementClick
                  ? () => onAchievementClick(achievement)
                  : undefined
              }
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No achievements found in this category.
        </div>
      )}
    </div>
  );
});
