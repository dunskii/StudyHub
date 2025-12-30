/**
 * Note list component displaying a grid of notes.
 */
import { memo } from 'react'
import { FileText, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { NoteCard } from './NoteCard'
import type { NoteResponse } from '@/lib/api/notes'

interface NoteListProps {
  /** List of notes */
  notes: NoteResponse[]
  /** Whether data is loading */
  isLoading?: boolean
  /** Error message */
  error?: string | null
  /** Selected note ID */
  selectedNoteId?: string | null
  /** Callback when a note is clicked */
  onNoteClick?: (note: NoteResponse) => void
  /** Callback to retry on error */
  onRetry?: () => void
  /** Custom class name */
  className?: string
}

/**
 * Loading skeleton for note cards.
 */
function NoteCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="aspect-[4/3] bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-4 w-3/4 rounded bg-gray-200" />
        <div className="h-3 w-1/2 rounded bg-gray-200" />
      </div>
    </div>
  )
}

/**
 * Empty state when no notes exist.
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <FileText className="mb-4 h-12 w-12 text-gray-300" />
      <h3 className="mb-2 text-lg font-medium text-gray-900">No notes yet</h3>
      <p className="max-w-sm text-sm text-gray-500">
        Upload your first note to get started. Take photos of handwritten notes,
        textbook pages, or any study materials.
      </p>
    </div>
  )
}

/**
 * Error state with retry button.
 */
function ErrorState({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 rounded-full bg-red-100 p-3">
        <FileText className="h-8 w-8 text-red-600" />
      </div>
      <h3 className="mb-2 text-lg font-medium text-gray-900">
        Failed to load notes
      </h3>
      <p className="mb-4 max-w-sm text-sm text-gray-500">{error}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      )}
    </div>
  )
}

/**
 * NoteList displays a grid of note cards with loading and empty states.
 */
export const NoteList = memo(function NoteList({
  notes,
  isLoading = false,
  error,
  selectedNoteId,
  onNoteClick,
  onRetry,
  className,
}: NoteListProps) {
  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          'grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
          className
        )}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <NoteCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  // Error state
  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />
  }

  // Empty state
  if (notes.length === 0) {
    return <EmptyState />
  }

  return (
    <div
      className={cn(
        'grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
        className
      )}
    >
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          isSelected={note.id === selectedNoteId}
          onClick={() => onNoteClick?.(note)}
        />
      ))}
    </div>
  )
})

export default NoteList
