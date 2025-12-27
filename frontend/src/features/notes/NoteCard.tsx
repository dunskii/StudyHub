/**
 * Note card component for displaying a note in a grid or list.
 */
import { memo } from 'react'
import { FileImage, FileText, Clock, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NoteResponse } from '@/lib/api/notes'
import { OCRStatus } from './OCRStatus'

interface NoteCardProps {
  /** Note data */
  note: NoteResponse
  /** Click handler */
  onClick?: () => void
  /** Whether the card is selected */
  isSelected?: boolean
  /** Custom class name */
  className?: string
}

/**
 * Format a date for display.
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Get icon based on content type.
 */
function getContentIcon(contentType: string) {
  if (contentType.startsWith('image/')) {
    return FileImage
  }
  return FileText
}

/**
 * NoteCard displays a summary of a note.
 */
export const NoteCard = memo(function NoteCard({
  note,
  onClick,
  isSelected = false,
  className,
}: NoteCardProps) {
  const ContentIcon = getContentIcon(note.content_type)

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg border bg-white transition-all hover:shadow-md',
        isSelected
          ? 'border-emerald-500 ring-2 ring-emerald-500/20'
          : 'border-gray-200 hover:border-gray-300',
        className
      )}
    >
      {/* Thumbnail area */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {note.thumbnail_url ? (
          <img
            src={note.thumbnail_url}
            alt={note.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ContentIcon className="h-12 w-12 text-gray-300" />
          </div>
        )}

        {/* OCR status badge */}
        <div className="absolute right-2 top-2">
          <OCRStatus status={note.ocr_status} size="sm" />
        </div>
      </div>

      {/* Content area */}
      <div className="flex flex-1 flex-col p-3">
        {/* Title */}
        <h3 className="line-clamp-2 text-sm font-medium text-gray-900">
          {note.title}
        </h3>

        {/* Date */}
        <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
          <Clock className="h-3 w-3" />
          <span>{formatDate(note.created_at)}</span>
        </div>

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {note.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
              >
                <Tag className="h-2.5 w-2.5" />
                {tag}
              </span>
            ))}
            {note.tags.length > 3 && (
              <span className="text-xs text-gray-400">
                +{note.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  )
})

export default NoteCard
