/**
 * SubjectSelector component
 *
 * Multi-select component for choosing subjects.
 * Used during student onboarding and settings.
 */
import { useState, useCallback } from 'react'
import type { Subject } from '@/types/subject.types'
import { SubjectGrid } from '../SubjectGrid'
import { cn } from '@/lib/utils'

export interface SubjectSelectorProps {
  /** Available subjects to select from */
  subjects: Subject[]
  /** Initially selected subject IDs */
  defaultSelectedIds?: string[]
  /** Controlled selected subject IDs */
  selectedIds?: string[]
  /** Handler for selection changes */
  onSelectionChange?: (selectedIds: string[]) => void
  /** Minimum number of subjects that must be selected */
  minSelection?: number
  /** Maximum number of subjects that can be selected */
  maxSelection?: number
  /** Whether the selector is disabled */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
  /** Loading state */
  loading?: boolean
}

export function SubjectSelector({
  subjects,
  defaultSelectedIds = [],
  selectedIds: controlledSelectedIds,
  onSelectionChange,
  minSelection = 1,
  maxSelection,
  disabled = false,
  className,
  loading = false,
}: SubjectSelectorProps) {
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>(defaultSelectedIds)

  // Use controlled or uncontrolled value
  const selectedIds = controlledSelectedIds ?? internalSelectedIds
  const isControlled = controlledSelectedIds !== undefined

  const handleSubjectClick = useCallback(
    (subject: Subject) => {
      const isSelected = selectedIds.includes(subject.id)
      let newSelectedIds: string[]

      if (isSelected) {
        // Deselect - check if we can deselect (min selection)
        if (selectedIds.length <= minSelection) {
          return // Can't deselect below minimum
        }
        newSelectedIds = selectedIds.filter((id) => id !== subject.id)
      } else {
        // Select - check if we can select more (max selection)
        if (maxSelection && selectedIds.length >= maxSelection) {
          return // Can't select more than maximum
        }
        newSelectedIds = [...selectedIds, subject.id]
      }

      if (!isControlled) {
        setInternalSelectedIds(newSelectedIds)
      }
      onSelectionChange?.(newSelectedIds)
    },
    [selectedIds, minSelection, maxSelection, isControlled, onSelectionChange]
  )

  const selectionCount = selectedIds.length
  const canSelectMore = !maxSelection || selectionCount < maxSelection

  return (
    <div className={cn('space-y-4', className)}>
      {/* Selection info */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          {selectionCount} subject{selectionCount !== 1 ? 's' : ''} selected
        </span>
        {maxSelection && (
          <span className={cn(!canSelectMore && 'text-amber-600')}>
            Max: {maxSelection}
          </span>
        )}
      </div>

      {/* Subject grid */}
      <SubjectGrid
        subjects={subjects}
        selectedIds={selectedIds}
        onSubjectClick={handleSubjectClick}
        disabled={disabled}
        loading={loading}
        columns={4}
      />

      {/* Selection guidance */}
      {minSelection > 0 && selectionCount < minSelection && (
        <p className="text-sm text-amber-600">
          Please select at least {minSelection} subject{minSelection !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

export default SubjectSelector
