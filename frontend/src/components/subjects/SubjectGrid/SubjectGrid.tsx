/**
 * SubjectGrid component
 *
 * Displays a grid of subject cards.
 */
import type { Subject } from '@/types/subject.types'
import { SubjectCard, type SubjectCardProps } from '../SubjectCard'
import { cn } from '@/lib/utils'

export interface SubjectGridProps {
  /** Subjects to display */
  subjects: Subject[]
  /** Currently selected subject IDs */
  selectedIds?: string[]
  /** Handler for subject click */
  onSubjectClick?: (subject: Subject) => void
  /** Whether subjects are disabled */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
  /** Card size variant */
  cardSize?: SubjectCardProps['size']
  /** Number of columns (responsive by default) */
  columns?: 2 | 3 | 4 | 'auto'
  /** Loading state */
  loading?: boolean
  /** Error state */
  error?: Error | null
  /** Retry handler for error state */
  onRetry?: () => void
  /** Empty state message */
  emptyMessage?: string
}

export function SubjectGrid({
  subjects,
  selectedIds = [],
  onSubjectClick,
  disabled = false,
  className,
  cardSize = 'md',
  columns = 'auto',
  loading = false,
  error = null,
  onRetry,
  emptyMessage = 'No subjects available',
}: SubjectGridProps) {
  const columnClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    auto: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
  }

  if (loading) {
    return (
      <div className={cn('grid gap-4', columnClasses[columns], className)}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-lg bg-gray-200 h-24"
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
        <p className="text-red-600 font-medium mb-2">Failed to load subjects</p>
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

  if (subjects.length === 0) {
    return (
      <div className={cn('text-center py-8 text-gray-500', className)}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div
      className={cn('grid gap-4', columnClasses[columns], className)}
      role="group"
      aria-label="Subject selection"
    >
      {subjects.map((subject) => (
        <SubjectCard
          key={subject.id}
          subject={subject}
          selected={selectedIds.includes(subject.id)}
          disabled={disabled}
          onClick={() => onSubjectClick?.(subject)}
          size={cardSize}
        />
      ))}
    </div>
  )
}

export default SubjectGrid
