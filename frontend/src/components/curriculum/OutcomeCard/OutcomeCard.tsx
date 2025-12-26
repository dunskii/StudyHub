/**
 * OutcomeCard component
 *
 * Displays a single curriculum outcome with code, description, and metadata.
 * Memoized to prevent unnecessary re-renders in lists.
 */
import { memo } from 'react'
import type { CurriculumOutcome } from '@/types/curriculum.types'
import { cn } from '@/lib/utils'

export interface OutcomeCardProps {
  /** The outcome to display */
  outcome: CurriculumOutcome
  /** Whether the card is compact */
  compact?: boolean
  /** Whether to show the stage badge */
  showStage?: boolean
  /** Whether to show the strand */
  showStrand?: boolean
  /** Click handler */
  onClick?: () => void
  /** Additional CSS classes */
  className?: string
}

function OutcomeCardComponent({
  outcome,
  compact = false,
  showStage = true,
  showStrand = true,
  onClick,
  className,
}: OutcomeCardProps) {
  const Component = onClick ? 'button' : 'div'

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'text-left rounded-lg border border-gray-200 bg-white transition-all',
        compact ? 'p-3' : 'p-4',
        onClick && 'hover:border-gray-300 hover:shadow-sm cursor-pointer',
        className
      )}
    >
      {/* Header with code and badges */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <code className="text-sm font-mono font-medium text-gray-900">
          {outcome.outcomeCode}
        </code>
        <div className="flex gap-1 flex-shrink-0">
          {showStage && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
              {outcome.stage}
            </span>
          )}
          {outcome.pathway && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
              {outcome.pathway}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <p
        className={cn(
          'text-gray-700',
          compact ? 'text-sm line-clamp-2' : 'text-base'
        )}
      >
        {outcome.description}
      </p>

      {/* Metadata */}
      {showStrand && outcome.strand && !compact && (
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
          <span className="font-medium">Strand:</span>
          <span>{outcome.strand}</span>
          {outcome.substrand && (
            <>
              <span className="text-gray-300">|</span>
              <span>{outcome.substrand}</span>
            </>
          )}
        </div>
      )}

      {/* Prerequisites (if any) */}
      {outcome.prerequisites && outcome.prerequisites.length > 0 && !compact && (
        <div className="mt-2 text-sm text-gray-500">
          <span className="font-medium">Prerequisites: </span>
          <span>{outcome.prerequisites.join(', ')}</span>
        </div>
      )}
    </Component>
  )
}

export const OutcomeCard = memo(OutcomeCardComponent)
OutcomeCard.displayName = 'OutcomeCard'

export default OutcomeCard
