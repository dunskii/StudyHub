/**
 * FlashcardView component - displays a flashcard with flip animation.
 */
import { memo, useState, useCallback } from 'react'
import { RotateCcw, ThumbsUp, ThumbsDown, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import type { Flashcard } from '@/lib/api/revision'

interface FlashcardViewProps {
  flashcard: Flashcard
  showAnswer: boolean
  onFlip: () => void
  onAnswer?: (wasCorrect: boolean, difficulty: number) => void
  onPrevious?: () => void
  onNext?: () => void
  hasPrevious?: boolean
  hasNext?: boolean
  showNavigation?: boolean
  isSubmitting?: boolean
}

const difficultyLabels = [
  { value: 1, label: 'Easy', color: 'bg-green-500' },
  { value: 2, label: 'Good', color: 'bg-emerald-500' },
  { value: 3, label: 'Medium', color: 'bg-yellow-500' },
  { value: 4, label: 'Hard', color: 'bg-orange-500' },
  { value: 5, label: 'Very Hard', color: 'bg-red-500' },
]

function FlashcardViewComponent({
  flashcard,
  showAnswer,
  onFlip,
  onAnswer,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  showNavigation = true,
  isSubmitting = false,
}: FlashcardViewProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(null)

  const handleAnswer = useCallback(
    (wasCorrect: boolean) => {
      if (onAnswer && selectedDifficulty !== null) {
        onAnswer(wasCorrect, selectedDifficulty)
        setSelectedDifficulty(null)
      }
    },
    [onAnswer, selectedDifficulty]
  )

  const handleQuickAnswer = useCallback(
    (wasCorrect: boolean, defaultDifficulty: number) => {
      if (onAnswer) {
        onAnswer(wasCorrect, defaultDifficulty)
      }
    },
    [onAnswer]
  )

  // Format next review date
  const formatNextReview = (dateStr: string | null): string => {
    if (!dateStr) return 'Due now'
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) return 'Due now'
    if (diffDays === 1) return 'Due tomorrow'
    if (diffDays < 7) return `Due in ${diffDays} days`
    if (diffDays < 30) return `Due in ${Math.ceil(diffDays / 7)} weeks`
    return `Due in ${Math.ceil(diffDays / 30)} months`
  }

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto">
      {/* Card container with flip animation */}
      <div
        className="relative w-full aspect-[4/3] cursor-pointer perspective-1000"
        onClick={onFlip}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onFlip()}
        aria-label={showAnswer ? 'Hide answer' : 'Show answer'}
      >
        <div
          className={cn(
            'absolute inset-0 transition-transform duration-500 transform-style-3d',
            showAnswer && 'rotate-y-180'
          )}
        >
          {/* Front of card (question) */}
          <div
            className={cn(
              'absolute inset-0 backface-hidden rounded-xl border-2 p-6',
              'bg-white dark:bg-gray-800 shadow-lg',
              'flex flex-col justify-center items-center text-center',
              flashcard.is_due
                ? 'border-blue-400 dark:border-blue-600'
                : 'border-gray-200 dark:border-gray-700'
            )}
          >
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Question
            </div>
            <p className="text-xl md:text-2xl font-medium text-gray-900 dark:text-white">
              {flashcard.front}
            </p>
            <div className="mt-6 text-sm text-gray-400">
              Click or press Enter to reveal answer
            </div>
          </div>

          {/* Back of card (answer) */}
          <div
            className={cn(
              'absolute inset-0 backface-hidden rotate-y-180 rounded-xl border-2 p-6',
              'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900',
              'border-blue-400 dark:border-blue-600 shadow-lg',
              'flex flex-col justify-center items-center text-center'
            )}
          >
            <div className="text-sm text-blue-600 dark:text-blue-400 mb-4">
              Answer
            </div>
            <p className="text-xl md:text-2xl font-medium text-gray-900 dark:text-white">
              {flashcard.back}
            </p>
          </div>
        </div>
      </div>

      {/* Card info */}
      <div className="flex items-center gap-4 mt-4 text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>{formatNextReview(flashcard.sr_next_review)}</span>
        </div>
        <div>
          {flashcard.review_count} reviews ({flashcard.mastery_percent}% mastery)
        </div>
        {flashcard.tags && flashcard.tags.length > 0 && (
          <div className="flex gap-1">
            {flashcard.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Answer buttons (shown when answer is visible) */}
      {showAnswer && onAnswer && (
        <div className="mt-6 w-full space-y-4">
          {/* Quick answer buttons */}
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              size="lg"
              className="flex-1 max-w-40 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={() => handleQuickAnswer(false, 4)}
              disabled={isSubmitting}
            >
              <ThumbsDown className="w-5 h-5 mr-2 text-red-500" />
              Wrong
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="flex-1 max-w-40 border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20"
              onClick={() => handleQuickAnswer(true, 3)}
              disabled={isSubmitting}
            >
              <ThumbsUp className="w-5 h-5 mr-2 text-green-500" />
              Correct
            </Button>
          </div>

          {/* Difficulty rating */}
          <div className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Rate difficulty (optional):
            </div>
            <div className="flex justify-center gap-2">
              {difficultyLabels.map((d) => (
                <button
                  key={d.value}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-full transition-all',
                    selectedDifficulty === d.value
                      ? `${d.color} text-white`
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  )}
                  onClick={() => setSelectedDifficulty(d.value)}
                  disabled={isSubmitting}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit with custom difficulty */}
          {selectedDifficulty !== null && (
            <div className="flex justify-center gap-4">
              <Button
                variant="secondary"
                onClick={() => handleAnswer(false)}
                disabled={isSubmitting}
              >
                Submit as Wrong
              </Button>
              <Button
                variant="default"
                onClick={() => handleAnswer(true)}
                disabled={isSubmitting}
              >
                Submit as Correct
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      {showNavigation && (
        <div className="flex justify-between w-full mt-6">
          <Button
            variant="ghost"
            onClick={onPrevious}
            disabled={!hasPrevious}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <Button
            variant="ghost"
            onClick={onFlip}
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Flip
          </Button>
          <Button
            variant="ghost"
            onClick={onNext}
            disabled={!hasNext}
            className="flex items-center gap-2"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

export const FlashcardView = memo(FlashcardViewComponent)
