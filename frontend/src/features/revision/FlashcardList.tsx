/**
 * FlashcardList component - displays a grid/list of flashcards.
 */
import { memo, useCallback, useState } from 'react'
import {
  LayoutGrid,
  List,
  Search,
  Filter,
  Trash2,
  Edit,
  Clock,
  MoreVertical,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { Flashcard } from '@/lib/api/revision'

interface FlashcardListProps {
  flashcards: Flashcard[]
  isLoading?: boolean
  onSearch?: (query: string) => void
  onEdit?: (flashcard: Flashcard) => void
  onDelete?: (flashcardId: string) => void
  onSelect?: (flashcard: Flashcard) => void
  emptyMessage?: string
}

function FlashcardListComponent({
  flashcards,
  isLoading = false,
  onSearch,
  onEdit,
  onDelete,
  onSelect,
  emptyMessage = 'No flashcards found',
}: FlashcardListProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setSearchQuery(value)
      onSearch?.(value)
    },
    [onSearch]
  )

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return 'Not reviewed'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
    })
  }

  const getMasteryColor = (percent: number): string => {
    if (percent >= 80) return 'bg-green-500'
    if (percent >= 60) return 'bg-emerald-500'
    if (percent >= 40) return 'bg-yellow-500'
    if (percent >= 20) return 'bg-orange-500'
    return 'bg-red-500'
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 h-10 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-md" />
          <div className="w-20 h-10 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-md" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-40 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and view toggle */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search flashcards..."
            className="pl-10"
          />
        </div>
        <div className="flex border rounded-md dark:border-gray-700">
          <button
            className={cn(
              'p-2 transition-colors',
              viewMode === 'grid'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                : 'text-gray-400 hover:text-gray-600'
            )}
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
          <button
            className={cn(
              'p-2 transition-colors',
              viewMode === 'list'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                : 'text-gray-400 hover:text-gray-600'
            )}
            onClick={() => setViewMode('list')}
            aria-label="List view"
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Empty state */}
      {flashcards.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <Filter className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
        </div>
      )}

      {/* Grid view */}
      {viewMode === 'grid' && flashcards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flashcards.map((flashcard) => (
            <div
              key={flashcard.id}
              className={cn(
                'bg-white dark:bg-gray-800 rounded-lg border p-4 cursor-pointer',
                'hover:shadow-md transition-shadow',
                flashcard.is_due
                  ? 'border-blue-300 dark:border-blue-700'
                  : 'border-gray-200 dark:border-gray-700'
              )}
              onClick={() => onSelect?.(flashcard)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {flashcard.is_due && (
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                      Due
                    </span>
                  )}
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full',
                      getMasteryColor(flashcard.mastery_percent)
                    )}
                    title={`${flashcard.mastery_percent}% mastery`}
                  />
                </div>
                <div className="relative">
                  <button
                    className="p-1 text-gray-400 hover:text-gray-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveMenu(activeMenu === flashcard.id ? null : flashcard.id)
                    }}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {activeMenu === flashcard.id && (
                    <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg border dark:border-gray-700 z-10">
                      {onEdit && (
                        <button
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveMenu(null)
                            onEdit(flashcard)
                          }}
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                      )}
                      {onDelete && (
                        <button
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveMenu(null)
                            onDelete(flashcard.id)
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Content */}
              <p className="text-gray-900 dark:text-white font-medium line-clamp-2 mb-2">
                {flashcard.front}
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mb-3">
                {flashcard.back}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(flashcard.sr_next_review)}
                </div>
                <div>
                  {flashcard.review_count} reviews
                </div>
              </div>

              {/* Tags */}
              {flashcard.tags && flashcard.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {flashcard.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                  {flashcard.tags.length > 3 && (
                    <span className="text-xs text-gray-400">
                      +{flashcard.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && flashcards.length > 0 && (
        <div className="space-y-2">
          {flashcards.map((flashcard) => (
            <div
              key={flashcard.id}
              className={cn(
                'bg-white dark:bg-gray-800 rounded-lg border p-4 cursor-pointer',
                'hover:shadow-md transition-shadow flex items-center gap-4',
                flashcard.is_due
                  ? 'border-blue-300 dark:border-blue-700'
                  : 'border-gray-200 dark:border-gray-700'
              )}
              onClick={() => onSelect?.(flashcard)}
            >
              {/* Mastery indicator */}
              <div
                className={cn(
                  'w-3 h-3 rounded-full flex-shrink-0',
                  getMasteryColor(flashcard.mastery_percent)
                )}
              />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 dark:text-white font-medium truncate">
                  {flashcard.front}
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-sm truncate">
                  {flashcard.back}
                </p>
              </div>

              {/* Status */}
              <div className="flex items-center gap-4 flex-shrink-0 text-sm">
                {flashcard.is_due && (
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                    Due
                  </span>
                )}
                <span className="text-gray-400">{flashcard.mastery_percent}%</span>
                <span className="text-gray-400">{flashcard.review_count} reviews</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {onEdit && (
                  <button
                    className="p-2 text-gray-400 hover:text-gray-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(flashcard)
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                )}
                {onDelete && (
                  <button
                    className="p-2 text-gray-400 hover:text-red-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(flashcard.id)
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export const FlashcardList = memo(FlashcardListComponent)
