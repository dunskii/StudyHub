/**
 * GamificationPage - main gamification dashboard for students.
 *
 * Shows XP, level, streak, achievements, and subject progress.
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Award, BookOpen, Flame, TrendingUp, Zap } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import {
  useGamificationStatsDetailed,
  useAchievements,
} from '@/hooks/useGamification';
import { XPBar } from './components/XPBar';
import { LevelBadge } from './components/LevelBadge';
import { StreakCounter } from './components/StreakCounter';
import { AchievementGrid } from './components/AchievementGrid';
import { AchievementUnlockModal } from './components/AchievementUnlockModal';
import type { AchievementWithProgress } from '@/lib/api/gamification';

type Tab = 'overview' | 'achievements' | 'subjects';

export function GamificationPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedAchievement, setSelectedAchievement] =
    useState<AchievementWithProgress | null>(null);

  const {
    data: stats,
    isLoading,
    error,
  } = useGamificationStatsDetailed(studentId);

  const { data: achievements } = useAchievements(studentId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" aria-label="Loading gamification data..." />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">
          Failed to load gamification data. Please try again.
        </p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'achievements', label: 'Achievements', icon: <Award className="w-4 h-4" /> },
    { id: 'subjects', label: 'Subjects', icon: <BookOpen className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Your Progress</h1>
        <p className="text-gray-600 mt-1">
          Track your learning journey and achievements
        </p>
      </div>

      {/* Stats Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Level Card */}
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <LevelBadge level={stats.level} size="lg" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{stats.levelTitle}</h3>
              <XPBar
                currentXp={stats.totalXp}
                levelStartXp={0}
                nextLevelXp={stats.nextLevelXp}
                progressPercent={stats.levelProgressPercent}
                showLabel={false}
                size="sm"
              />
              <p className="text-sm text-gray-500 mt-1">
                {stats.totalXp.toLocaleString()} XP total
              </p>
            </div>
          </div>
        </Card>

        {/* Streak Card */}
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-full">
              <Flame className="w-8 h-8 text-orange-500" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Study Streak</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-orange-500">
                  {stats.streak.current}
                </span>
                <span className="text-gray-500">
                  day{stats.streak.current !== 1 ? 's' : ''}
                </span>
              </div>
              {stats.streak.multiplier > 1 && (
                <p className="text-sm text-orange-600">
                  {stats.streak.multiplier.toFixed(1)}x XP bonus!
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Achievements Card */}
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-full">
              <Award className="w-8 h-8 text-purple-500" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Achievements</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-purple-500">
                  {stats.achievementsUnlocked}
                </span>
                <span className="text-gray-500">
                  / {stats.achievementsTotal} unlocked
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4" aria-label="Gamification tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3
                border-b-2 font-medium text-sm
                transition-colors
                ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
              aria-selected={activeTab === tab.id}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* XP Progress */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Level Progress
            </h2>
            <div className="flex items-center gap-6">
              <LevelBadge level={stats.level} title={stats.levelTitle} size="xl" showTitle />
              <div className="flex-1">
                <XPBar
                  currentXp={stats.totalXp}
                  levelStartXp={0}
                  nextLevelXp={stats.nextLevelXp}
                  progressPercent={stats.levelProgressPercent}
                  size="lg"
                />
              </div>
            </div>
          </Card>

          {/* Streak Details */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Study Streak
            </h2>
            <div className="flex items-center justify-around">
              <StreakCounter
                current={stats.streak.current}
                longest={stats.streak.longest}
                multiplier={stats.streak.multiplier}
                size="lg"
                showMultiplier
                showLongest
              />
              {stats.streak.nextMilestone && (
                <div className="text-center">
                  <p className="text-gray-500 text-sm">Next milestone</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.streak.nextMilestone} days
                  </p>
                  <p className="text-sm text-gray-500">
                    {stats.streak.daysToMilestone} days to go
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Recent Achievements */}
          {stats.recentAchievements.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Recent Achievements
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.recentAchievements.slice(0, 4).map((a) => (
                  <div
                    key={a.code}
                    className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-lg"
                  >
                    <Award className="w-8 h-8 text-amber-500 mb-2" />
                    <span className="font-medium text-sm text-gray-900">
                      {a.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(a.unlockedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'achievements' && achievements && (
        <AchievementGrid
          achievements={achievements}
          onAchievementClick={setSelectedAchievement}
          showFilters
          columns={3}
        />
      )}

      {activeTab === 'subjects' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.subjectStats.length > 0 ? (
            stats.subjectStats.map((subject) => (
              <Card key={subject.subjectId} className="p-4">
                <div className="flex items-center gap-4">
                  <LevelBadge level={subject.level} size="md" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {subject.subjectName}
                    </h3>
                    <p className="text-sm text-gray-600">{subject.title}</p>
                    <div className="flex items-center gap-2 mt-2 text-sm text-amber-600">
                      <Zap className="w-4 h-4" aria-hidden="true" />
                      <span>{subject.xpEarned.toLocaleString()} XP</span>
                    </div>
                    <div className="mt-2">
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${subject.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="col-span-2 text-center py-8 text-gray-500">
              No subjects enrolled yet.
            </div>
          )}
        </div>
      )}

      {/* Achievement Detail Modal */}
      <AchievementUnlockModal
        achievement={
          selectedAchievement?.isUnlocked
            ? {
                ...selectedAchievement,
                unlockedAt: selectedAchievement.unlockedAt || new Date().toISOString(),
              }
            : null
        }
        isOpen={!!selectedAchievement?.isUnlocked}
        onClose={() => setSelectedAchievement(null)}
      />
    </div>
  );
}
