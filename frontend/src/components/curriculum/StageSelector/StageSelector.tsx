/**
 * StageSelector component
 *
 * Allows selection of curriculum stages (Early Stage 1 through Stage 6).
 * Supports single or multiple stage selection.
 */
import { cn } from '@/lib/utils'

/** NSW Curriculum Stage definitions */
export const NSW_STAGES = [
  { value: 'ES1', label: 'Early Stage 1', years: 'Kindergarten' },
  { value: 'S1', label: 'Stage 1', years: 'Years 1-2' },
  { value: 'S2', label: 'Stage 2', years: 'Years 3-4' },
  { value: 'S3', label: 'Stage 3', years: 'Years 5-6' },
  { value: 'S4', label: 'Stage 4', years: 'Years 7-8' },
  { value: 'S5', label: 'Stage 5', years: 'Years 9-10' },
  { value: 'S6', label: 'Stage 6', years: 'Years 11-12' },
] as const

export type StageValue = (typeof NSW_STAGES)[number]['value']

export interface StageSelectorProps {
  /** Currently selected stage(s) */
  value: StageValue | StageValue[] | null
  /** Handler for stage selection change */
  onChange: (value: StageValue | StageValue[] | null) => void
  /** Whether to allow multiple stage selection */
  multiple?: boolean
  /** Whether the selector is disabled */
  disabled?: boolean
  /** Whether to show year labels */
  showYears?: boolean
  /** Layout orientation */
  orientation?: 'horizontal' | 'vertical'
  /** Additional CSS classes */
  className?: string
  /** Loading state */
  loading?: boolean
}

export function StageSelector({
  value,
  onChange,
  multiple = false,
  disabled = false,
  showYears = true,
  orientation = 'horizontal',
  className,
  loading = false,
}: StageSelectorProps) {
  const handleStageClick = (stageValue: StageValue) => {
    if (disabled || loading) return

    if (multiple) {
      const currentValues = Array.isArray(value) ? value : value ? [value] : []
      const isSelected = currentValues.includes(stageValue)

      if (isSelected) {
        const newValues = currentValues.filter((v) => v !== stageValue)
        onChange(newValues.length > 0 ? newValues : null)
      } else {
        onChange([...currentValues, stageValue])
      }
    } else {
      onChange(value === stageValue ? null : stageValue)
    }
  }

  const isSelected = (stageValue: StageValue): boolean => {
    if (Array.isArray(value)) {
      return value.includes(stageValue)
    }
    return value === stageValue
  }

  if (loading) {
    return (
      <div
        className={cn(
          'flex gap-2',
          orientation === 'vertical' ? 'flex-col' : 'flex-wrap',
          className
        )}
      >
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-lg bg-gray-200 h-12 w-24"
            aria-hidden="true"
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex gap-2',
        orientation === 'vertical' ? 'flex-col' : 'flex-wrap',
        className
      )}
      role="group"
      aria-label="Stage selection"
    >
      {NSW_STAGES.map((stage) => (
        <button
          key={stage.value}
          type="button"
          onClick={() => handleStageClick(stage.value)}
          disabled={disabled}
          className={cn(
            'flex flex-col items-center justify-center rounded-lg border-2 px-4 py-2 transition-all',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            isSelected(stage.value)
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          aria-pressed={isSelected(stage.value)}
        >
          <span className="font-medium text-sm">{stage.label}</span>
          {showYears && (
            <span className="text-xs text-gray-500 mt-0.5">{stage.years}</span>
          )}
        </button>
      ))}
    </div>
  )
}

export default StageSelector
