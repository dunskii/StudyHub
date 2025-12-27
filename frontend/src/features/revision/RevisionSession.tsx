/**
 * RevisionSession component - manages a complete revision session.
 */
import { memo, useCallback, useEffect, useState } from 'react'
import { X, Clock, CheckCircle2, XCircle, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { FlashcardView } from './FlashcardView'
import type { Flashcard } from '@/lib/api/revision'

interface RevisionSessionProps {
  cards: Flashcard[]
  currentIndex: number
  showAnswer: boolean
  correctCount: number
  answeredCount: number
  startTime: number
  onFlip: () => void
  onAnswer: (wasCorrect: boolean, difficulty: number) => void
  onNext: () => void
  onPrevious: () => void
  onEnd: () => void
  isSubmitting?: boolean
}

function RevisionSessionComponent({
  cards,
  currentIndex,
  showAnswer,
  correctCount,
  answeredCount,
  startTime,
  onFlip,
  onAnswer,
  onNext,
  onPrevious,
  onEnd,
  isSubmitting = false,
}: RevisionSessionProps) {
  const [elapsedTime, setElapsedTime] = useState(0)
  const [showSummary, setShowSummary] = useState(false)

  // Update elapsed time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime])

  const currentCard = cards[currentIndex]
  const totalCards = cards.length
  const progressPercent = totalCards > 0 ? Math.round((answeredCount / totalCards) * 100) : 0
  const accuracyPercent = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0
  const isComplete = answeredCount >= totalCards

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleAnswer = useCallback(
    (wasCorrect: boolean, difficulty: number) => {
      onAnswer(wasCorrect, difficulty)

      // Show summary if this was the last card
      if (answeredCount + 1 >= totalCards) {
        setTimeout(() => setShowSummary(true), 500)
      }
    },
    [onAnswer, answeredCount, totalCards]
  )

  // Session summary view
  if (showSummary || isComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 mb-4">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Session Complete!
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Great job on completing your revision session
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 w-full max-w-lg">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {totalCards}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Cards Reviewed</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow">
            <div className="text-2xl font-bold text-green-600">{correctCount}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Correct</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow">
            <div className="text-2xl font-bold text-red-600">
              {answeredCount - correctCount}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Incorrect</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow">
            <div className="text-2xl font-bold text-blue-600">{accuracyPercent}%</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Accuracy</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-8">
          <Clock className="w-4 h-4" />
          <span>Time spent: {formatTime(elapsedTime)}</span>
        </div>

        <Button variant="primary" size="lg" onClick={onEnd}>
          Finish Session
        </Button>
      </div>
    )
  }

  if (!currentCard) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-gray-500 dark:text-gray-400">No cards to review</p>
        <Button variant="secondary" onClick={onEnd} className="mt-4">
          Close
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEnd}
            className="text-gray-500"
          >
            <X className="w-5 h-5" />
          </Button>
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Card {currentIndex + 1} of {totalCards}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            {formatTime(elapsedTime)}
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="w-4 h-4" />
              {correctCount}
            </span>
            <span className="flex items-center gap-1 text-red-600">
              <XCircle className="w-4 h-4" />
              {answeredCount - correctCount}
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-gray-200 dark:bg-gray-700">
        <div
          className="h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center p-6">
        <FlashcardView
          flashcard={currentCard}
          showAnswer={showAnswer}
          onFlip={onFlip}
          onAnswer={handleAnswer}
          onPrevious={onPrevious}
          onNext={onNext}
          hasPrevious={currentIndex > 0}
          hasNext={currentIndex < totalCards - 1}
          showNavigation={true}
          isSubmitting={isSubmitting}
        />
      </div>

      {/* Card dots indicator */}
      <div className="flex justify-center gap-1 p-4 overflow-x-auto">
        {cards.slice(0, 20).map((card, index) => (
          <button
            key={card.id}
            className={cn(
              'w-2 h-2 rounded-full transition-all',
              index === currentIndex
                ? 'w-4 bg-blue-600'
                : index < answeredCount
                  ? 'bg-gray-400'
                  : 'bg-gray-200 dark:bg-gray-600'
            )}
            onClick={() => {
              // Could implement goToCard here if needed
            }}
            aria-label={`Go to card ${index + 1}`}
          />
        ))}
        {cards.length > 20 && (
          <span className="text-xs text-gray-400 ml-2">+{cards.length - 20} more</span>
        )}
      </div>
    </div>
  )
}

export const RevisionSession = memo(RevisionSessionComponent)
