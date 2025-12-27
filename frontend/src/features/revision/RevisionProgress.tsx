/**
 * RevisionProgress component - displays overall revision statistics.
 */
import { memo } from 'react'
import {
  Clock,
  Target,
  TrendingUp,
  Award,
  Calendar,
  Flame,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RevisionProgress as RevisionProgressData, SubjectProgress } from '@/lib/api/revision'

interface RevisionProgressProps {
  progress: RevisionProgressData | undefined
  subjectProgress: SubjectProgress[]
  isLoading?: boolean
  onStartRevision?: () => void
  onSubjectClick?: (subjectId: string) => void
}

function RevisionProgressComponent({
  progress,
  subjectProgress,
  isLoading = false,
  onStartRevision,
  onSubjectClick,
}: RevisionProgressProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg"
            />
          ))}
        </div>
        <div className="h-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
      </div>
    )
  }

  if (!progress) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">
          No revision data yet. Create some flashcards to get started!
        </p>
      </div>
    )
  }

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total cards */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Total Cards
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {progress.total_flashcards}
          </div>
        </div>

        {/* Cards due */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Due Now
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {progress.cards_due}
          </div>
          {progress.cards_due > 0 && onStartRevision && (
            <button
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1"
              onClick={onStartRevision}
            >
              Start review
            </button>
          )}
        </div>

        {/* Mastery */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Mastery
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {progress.overall_mastery_percent}%
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-2">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${progress.overall_mastery_percent}%` }}
            />
          </div>
        </div>

        {/* Streak */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <Flame className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Streak
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {progress.review_streak} days
          </div>
        </div>
      </div>

      {/* Additional stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center gap-4">
          <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
            <Award className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Cards Mastered
            </div>
            <div className="text-xl font-semibold text-gray-900 dark:text-white">
              {progress.cards_mastered}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center gap-4">
          <div className="p-3 rounded-full bg-indigo-100 dark:bg-indigo-900/30">
            <TrendingUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Total Reviews
            </div>
            <div className="text-xl font-semibold text-gray-900 dark:text-white">
              {progress.total_reviews}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center gap-4">
          <div className="p-3 rounded-full bg-teal-100 dark:bg-teal-900/30">
            <Calendar className="w-6 h-6 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Last Review
            </div>
            <div className="text-xl font-semibold text-gray-900 dark:text-white">
              {formatDate(progress.last_review_date)}
            </div>
          </div>
        </div>
      </div>

      {/* Subject progress */}
      {subjectProgress.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Progress by Subject
          </h3>
          <div className="space-y-4">
            {subjectProgress.map((subject) => (
              <div
                key={subject.subject_id}
                className={cn(
                  'p-4 rounded-lg border dark:border-gray-700 transition-colors',
                  onSubjectClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50'
                )}
                onClick={() => onSubjectClick?.(subject.subject_id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {subject.subject_name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                      {subject.subject_code}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      {subject.total_cards} cards
                    </span>
                    {subject.cards_due > 0 && (
                      <span className="text-orange-600 dark:text-orange-400">
                        {subject.cards_due} due
                      </span>
                    )}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {subject.mastery_percent}%
                    </span>
                  </div>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      subject.mastery_percent >= 80
                        ? 'bg-green-500'
                        : subject.mastery_percent >= 60
                          ? 'bg-emerald-500'
                          : subject.mastery_percent >= 40
                            ? 'bg-yellow-500'
                            : subject.mastery_percent >= 20
                              ? 'bg-orange-500'
                              : 'bg-red-500'
                    )}
                    style={{ width: `${subject.mastery_percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export const RevisionProgress = memo(RevisionProgressComponent)
