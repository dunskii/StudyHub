/**
 * GenerateFromNote component - AI-powered flashcard generation.
 */
import { memo, useState, useCallback } from 'react'
import { Sparkles, Check, X, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import type { FlashcardDraft, FlashcardCreate } from '@/lib/api/revision'

interface GenerateFromNoteProps {
  noteId?: string
  outcomeId?: string
  onGenerate: (count: number) => Promise<FlashcardDraft[]>
  onApprove: (flashcards: FlashcardCreate[]) => Promise<void>
  onCancel?: () => void
  isGenerating?: boolean
  isApproving?: boolean
  subjectId?: string
}

function GenerateFromNoteComponent({
  noteId,
  outcomeId,
  onGenerate,
  onApprove,
  onCancel,
  isGenerating = false,
  isApproving = false,
  subjectId,
}: GenerateFromNoteProps) {
  const [count, setCount] = useState(5)
  const [drafts, setDrafts] = useState<FlashcardDraft[]>([])
  const [selectedDrafts, setSelectedDrafts] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [hasGenerated, setHasGenerated] = useState(false)

  const handleGenerate = useCallback(async () => {
    try {
      setError(null)
      const generatedDrafts = await onGenerate(count)
      setDrafts(generatedDrafts)
      setSelectedDrafts(new Set(generatedDrafts.map((_, i) => i)))
      setHasGenerated(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate flashcards')
    }
  }, [onGenerate, count])

  const toggleDraft = useCallback((index: number) => {
    setSelectedDrafts((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedDrafts(new Set(drafts.map((_, i) => i)))
  }, [drafts])

  const deselectAll = useCallback(() => {
    setSelectedDrafts(new Set())
  }, [])

  const handleApprove = useCallback(async () => {
    const selected = drafts
      .filter((_, i) => selectedDrafts.has(i))
      .map((draft) => ({
        front: draft.front,
        back: draft.back,
        difficulty_level: draft.difficulty_level,
        tags: draft.tags,
        subject_id: subjectId,
        context_note_id: noteId,
        curriculum_outcome_id: outcomeId,
      }))

    if (selected.length === 0) {
      setError('Please select at least one flashcard')
      return
    }

    try {
      setError(null)
      await onApprove(selected)
      setDrafts([])
      setSelectedDrafts(new Set())
      setHasGenerated(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create flashcards')
    }
  }, [drafts, selectedDrafts, onApprove, subjectId, noteId, outcomeId])

  // Initial generation form
  if (!hasGenerated) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Generate Flashcards with AI
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {noteId
                ? 'Create flashcards from your note content'
                : 'Create flashcards for a curriculum outcome'}
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Number of flashcards to generate
          </label>
          <div className="flex gap-2">
            {[3, 5, 10, 15, 20].map((n) => (
              <button
                key={n}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  count === n
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                )}
                onClick={() => setCount(n)}
                disabled={isGenerating}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          {onCancel && (
            <Button variant="ghost" onClick={onCancel} disabled={isGenerating}>
              Cancel
            </Button>
          )}
          <Button
            variant="primary"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate {count} Flashcards
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  // Draft review and approval
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Review Generated Flashcards
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {selectedDrafts.size} of {drafts.length} selected
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={selectAll}>
            Select All
          </Button>
          <Button variant="ghost" size="sm" onClick={deselectAll}>
            Deselect All
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Draft cards */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto mb-6">
        {drafts.map((draft, index) => (
          <div
            key={index}
            className={cn(
              'border rounded-lg p-4 cursor-pointer transition-all',
              selectedDrafts.has(index)
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            )}
            onClick={() => toggleDraft(index)}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                  selectedDrafts.has(index)
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300 dark:border-gray-600'
                )}
              >
                {selectedDrafts.has(index) && <Check className="w-3 h-3 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white mb-1">
                  {draft.front}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {draft.back}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={cn(
                      'px-2 py-0.5 text-xs font-medium rounded-full',
                      draft.difficulty_level <= 2
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : draft.difficulty_level === 3
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    )}
                  >
                    Difficulty: {draft.difficulty_level}
                  </span>
                  {draft.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t dark:border-gray-700">
        <Button
          variant="ghost"
          onClick={() => {
            setDrafts([])
            setSelectedDrafts(new Set())
            setHasGenerated(false)
          }}
          disabled={isApproving}
        >
          <X className="w-4 h-4 mr-2" />
          Start Over
        </Button>
        <div className="flex gap-3">
          {onCancel && (
            <Button variant="ghost" onClick={onCancel} disabled={isApproving}>
              Cancel
            </Button>
          )}
          <Button
            variant="primary"
            onClick={handleApprove}
            disabled={selectedDrafts.size === 0 || isApproving}
          >
            {isApproving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Create {selectedDrafts.size} Flashcards
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export const GenerateFromNote = memo(GenerateFromNoteComponent)
