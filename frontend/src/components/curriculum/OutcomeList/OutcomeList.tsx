/**
 * OutcomeList component
 *
 * Displays a list of curriculum outcomes with optional filtering.
 */
import type { CurriculumOutcome } from '@/types/curriculum.types'
import { OutcomeCard } from '../OutcomeCard'
import { cn } from '@/lib/utils'

export interface OutcomeListProps {
  /** Outcomes to display */
  outcomes: CurriculumOutcome[]
  /** Whether to show outcomes in compact mode */
  compact?: boolean
  /** Whether to show stage badges */
  showStage?: boolean
  /** Whether to show strands */
  showStrand?: boolean
  /** Handler for outcome click */
  onOutcomeClick?: (outcome: CurriculumOutcome) => void
  /** Additional CSS classes */
  className?: string
  /** Loading state */
  loading?: boolean
  /** Error state */
  error?: Error | null
  /** Retry handler for error state */
  onRetry?: () => void
  /** Empty state message */
  emptyMessage?: string
}

export function OutcomeList({
  outcomes,
  compact = false,
  showStage = true,
  showStrand = true,
  onOutcomeClick,
  className,
  loading = false,
  error = null,
  onRetry,
  emptyMessage = 'No outcomes found',
}: OutcomeListProps) {
  if (loading) {
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-lg bg-gray-200 h-20"
            aria-hidden="true"
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={cn('text-center py-8 rounded-lg border border-red-200 bg-red-50', className)}
        role="alert"
      >
        <p className="text-red-600 font-medium mb-2">Failed to load outcomes</p>
        <p className="text-red-500 text-sm mb-4">{error.message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Try again
          </button>
        )}
      </div>
    )
  }

  if (outcomes.length === 0) {
    return (
      <div className={cn('text-center py-8 text-gray-500', className)}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div
      className={cn('space-y-3', className)}
      role="list"
      aria-label="Curriculum outcomes"
    >
      {outcomes.map((outcome) => (
        <div key={outcome.id} role="listitem">
          <OutcomeCard
            outcome={outcome}
            compact={compact}
            showStage={showStage}
            showStrand={showStrand}
            onClick={onOutcomeClick ? () => onOutcomeClick(outcome) : undefined}
          />
        </div>
      ))}
    </div>
  )
}

export default OutcomeList
