/**
 * PathwaySelector component
 *
 * Allows selection of curriculum pathways (e.g., 5.1, 5.2, 5.3 for Stage 5 Maths).
 * Used primarily for subjects with differentiated pathways.
 */
import { cn } from '@/lib/utils'

/** NSW Mathematics Stage 5 pathways */
export const MATHS_PATHWAYS = [
  {
    value: '5.1',
    label: 'Pathway 5.1',
    description: 'Foundation level',
  },
  {
    value: '5.2',
    label: 'Pathway 5.2',
    description: 'Standard level',
  },
  {
    value: '5.3',
    label: 'Pathway 5.3',
    description: 'Advanced level',
  },
] as const

export type PathwayValue = (typeof MATHS_PATHWAYS)[number]['value']

export interface PathwaySelectorProps {
  /** Currently selected pathway */
  value: PathwayValue | null
  /** Handler for pathway selection change */
  onChange: (value: PathwayValue | null) => void
  /** Available pathways (defaults to Maths pathways) */
  pathways?: ReadonlyArray<{
    readonly value: string
    readonly label: string
    readonly description?: string
  }>
  /** Whether the selector is disabled */
  disabled?: boolean
  /** Layout orientation */
  orientation?: 'horizontal' | 'vertical'
  /** Additional CSS classes */
  className?: string
  /** Loading state */
  loading?: boolean
}

export function PathwaySelector({
  value,
  onChange,
  pathways = MATHS_PATHWAYS,
  disabled = false,
  orientation = 'horizontal',
  className,
  loading = false,
}: PathwaySelectorProps) {
  const handlePathwayClick = (pathwayValue: string) => {
    if (disabled || loading) return
    onChange(value === pathwayValue ? null : (pathwayValue as PathwayValue))
  }

  if (loading) {
    return (
      <div
        className={cn(
          'flex gap-3',
          orientation === 'vertical' ? 'flex-col' : 'flex-wrap',
          className
        )}
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-lg bg-gray-200 h-16 w-32"
            aria-hidden="true"
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex gap-3',
        orientation === 'vertical' ? 'flex-col' : 'flex-wrap',
        className
      )}
      role="radiogroup"
      aria-label="Pathway selection"
    >
      {pathways.map((pathway) => {
        const isSelected = value === pathway.value

        return (
          <button
            key={pathway.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => handlePathwayClick(pathway.value)}
            disabled={disabled}
            className={cn(
              'flex flex-col items-start rounded-lg border-2 px-4 py-3 transition-all text-left',
              'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2',
              isSelected
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span
              className={cn(
                'font-semibold text-sm',
                isSelected ? 'text-purple-700' : 'text-gray-900'
              )}
            >
              {pathway.label}
            </span>
            {pathway.description && (
              <span
                className={cn(
                  'text-xs mt-0.5',
                  isSelected ? 'text-purple-600' : 'text-gray-500'
                )}
              >
                {pathway.description}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default PathwaySelector
