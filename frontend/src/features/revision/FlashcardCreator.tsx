/**
 * FlashcardCreator component - form for creating new flashcards.
 */
import { memo, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X, Eye, EyeOff, Tag } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import type { FlashcardCreate } from '@/lib/api/revision'

const flashcardSchema = z.object({
  front: z
    .string()
    .min(1, 'Question is required')
    .max(2000, 'Question must be less than 2000 characters'),
  back: z
    .string()
    .min(1, 'Answer is required')
    .max(2000, 'Answer must be less than 2000 characters'),
  difficulty_level: z.number().min(1).max(5).optional(),
  tags: z.array(z.string()).max(10).optional(),
})

type FlashcardFormData = z.infer<typeof flashcardSchema>

interface FlashcardCreatorProps {
  subjectId?: string
  outcomeId?: string
  noteId?: string
  onSubmit: (data: FlashcardCreate) => Promise<void>
  onCancel?: () => void
  isSubmitting?: boolean
}

function FlashcardCreatorComponent({
  subjectId,
  outcomeId,
  noteId,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: FlashcardCreatorProps) {
  const [showPreview, setShowPreview] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FlashcardFormData>({
    resolver: zodResolver(flashcardSchema),
    defaultValues: {
      front: '',
      back: '',
      difficulty_level: 3,
    },
  })

  const frontValue = watch('front')
  const backValue = watch('back')

  const handleAddTag = useCallback(() => {
    const trimmedTag = tagInput.trim()
    if (trimmedTag && tags.length < 10 && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag])
      setTagInput('')
    }
  }, [tagInput, tags])

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove))
  }, [])

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleAddTag()
      }
    },
    [handleAddTag]
  )

  const onFormSubmit = useCallback(
    async (data: FlashcardFormData) => {
      await onSubmit({
        front: data.front,
        back: data.back,
        difficulty_level: data.difficulty_level,
        tags: tags.length > 0 ? tags : undefined,
        subject_id: subjectId,
        curriculum_outcome_id: outcomeId,
        context_note_id: noteId,
      })
      reset()
      setTags([])
    },
    [onSubmit, tags, subjectId, outcomeId, noteId, reset]
  )

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Create Flashcard
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center gap-2"
        >
          {showPreview ? (
            <>
              <EyeOff className="w-4 h-4" />
              Hide Preview
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              Preview
            </>
          )}
        </Button>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        {/* Question/Front */}
        <div>
          <Label htmlFor="front">Question (Front)</Label>
          <textarea
            id="front"
            {...register('front')}
            className="mt-1 w-full min-h-[100px] rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Enter your question..."
            disabled={isSubmitting}
          />
          {errors.front && (
            <p className="mt-1 text-sm text-red-600">{errors.front.message}</p>
          )}
        </div>

        {/* Answer/Back */}
        <div>
          <Label htmlFor="back">Answer (Back)</Label>
          <textarea
            id="back"
            {...register('back')}
            className="mt-1 w-full min-h-[100px] rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Enter the answer..."
            disabled={isSubmitting}
          />
          {errors.back && (
            <p className="mt-1 text-sm text-red-600">{errors.back.message}</p>
          )}
        </div>

        {/* Difficulty */}
        <div>
          <Label htmlFor="difficulty">Difficulty Level</Label>
          <div className="flex gap-2 mt-2">
            {[1, 2, 3, 4, 5].map((level) => (
              <label
                key={level}
                className="flex items-center gap-1 cursor-pointer"
              >
                <input
                  type="radio"
                  value={level}
                  {...register('difficulty_level', { valueAsNumber: true })}
                  className="sr-only"
                  disabled={isSubmitting}
                />
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    watch('difficulty_level') === level
                      ? level <= 2
                        ? 'bg-green-500 text-white'
                        : level === 3
                          ? 'bg-yellow-500 text-white'
                          : 'bg-red-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {level}
                </span>
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            1 = Easy, 3 = Medium, 5 = Very Hard
          </p>
        </div>

        {/* Tags */}
        <div>
          <Label htmlFor="tags">Tags</Label>
          <div className="flex gap-2 mt-1">
            <div className="flex-1 relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add a tag..."
                className="pl-10"
                disabled={isSubmitting || tags.length >= 10}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={handleAddTag}
              disabled={!tagInput.trim() || tags.length >= 10 || isSubmitting}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-blue-900 dark:hover:text-blue-100"
                    disabled={isSubmitting}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <p className="mt-1 text-xs text-gray-500">
            {10 - tags.length} tags remaining
          </p>
        </div>

        {/* Preview */}
        {showPreview && (frontValue || backValue) && (
          <div className="border-t dark:border-gray-700 pt-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              Preview
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-2">Front (Question)</div>
                <p className="text-gray-900 dark:text-white">
                  {frontValue || 'No question yet'}
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                  Back (Answer)
                </div>
                <p className="text-gray-900 dark:text-white">
                  {backValue || 'No answer yet'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" variant="default" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Flashcard'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export const FlashcardCreator = memo(FlashcardCreatorComponent)
