/**
 * StrandNavigator component
 *
 * Displays curriculum strands and substrands in a hierarchical navigation.
 * Allows drilling down into specific curriculum areas.
 */
import { useState } from 'react'
import { cn } from '@/lib/utils'

export interface Strand {
  name: string
  substrands?: string[]
  outcomeCount?: number
}

export interface StrandNavigatorProps {
  /** Available strands to display */
  strands: Strand[]
  /** Currently selected strand */
  selectedStrand: string | null
  /** Currently selected substrand */
  selectedSubstrand: string | null
  /** Handler for strand selection */
  onStrandSelect: (strand: string | null) => void
  /** Handler for substrand selection */
  onSubstrandSelect: (substrand: string | null) => void
  /** Whether to show outcome counts */
  showCounts?: boolean
  /** Whether to collapse strands by default */
  collapsed?: boolean
  /** Additional CSS classes */
  className?: string
  /** Loading state */
  loading?: boolean
}

export function StrandNavigator({
  strands,
  selectedStrand,
  selectedSubstrand,
  onStrandSelect,
  onSubstrandSelect,
  showCounts = true,
  collapsed = false,
  className,
  loading = false,
}: StrandNavigatorProps) {
  const [expandedStrands, setExpandedStrands] = useState<Set<string>>(
    collapsed ? new Set() : new Set(strands.map((s) => s.name))
  )

  const toggleStrand = (strandName: string) => {
    const newExpanded = new Set(expandedStrands)
    if (newExpanded.has(strandName)) {
      newExpanded.delete(strandName)
    } else {
      newExpanded.add(strandName)
    }
    setExpandedStrands(newExpanded)
  }

  const handleStrandClick = (strandName: string) => {
    if (selectedStrand === strandName) {
      onStrandSelect(null)
      onSubstrandSelect(null)
    } else {
      onStrandSelect(strandName)
      onSubstrandSelect(null)
    }
  }

  const handleSubstrandClick = (substrandName: string) => {
    if (selectedSubstrand === substrandName) {
      onSubstrandSelect(null)
    } else {
      onSubstrandSelect(substrandName)
    }
  }

  if (loading) {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-lg bg-gray-200 h-10"
            aria-hidden="true"
          />
        ))}
      </div>
    )
  }

  if (strands.length === 0) {
    return (
      <div className={cn('text-center py-4 text-gray-500', className)}>
        No strands available
      </div>
    )
  }

  return (
    <nav
      className={cn('space-y-1', className)}
      role="navigation"
      aria-label="Curriculum strands"
    >
      {strands.map((strand) => {
        const isExpanded = expandedStrands.has(strand.name)
        const isSelected = selectedStrand === strand.name
        const hasSubstrands = strand.substrands && strand.substrands.length > 0

        return (
          <div key={strand.name} className="rounded-lg overflow-hidden">
            {/* Strand header */}
            <div className="flex items-center">
              {hasSubstrands && (
                <button
                  type="button"
                  onClick={() => toggleStrand(strand.name)}
                  className="p-2 text-gray-500 hover:text-gray-700"
                  aria-expanded={isExpanded}
                  aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${strand.name}`}
                >
                  <svg
                    className={cn(
                      'w-4 h-4 transition-transform',
                      isExpanded && 'rotate-90'
                    )}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleStrandClick(strand.name)}
                className={cn(
                  'flex-1 flex items-center justify-between px-3 py-2 text-left rounded-lg transition-colors',
                  isSelected
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50',
                  !hasSubstrands && 'ml-8'
                )}
                aria-current={isSelected ? 'true' : undefined}
              >
                <span>{strand.name}</span>
                {showCounts && strand.outcomeCount !== undefined && (
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      isSelected
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-500'
                    )}
                  >
                    {strand.outcomeCount}
                  </span>
                )}
              </button>
            </div>

            {/* Substrands */}
            {hasSubstrands && isExpanded && (
              <div className="ml-8 mt-1 space-y-1">
                {strand.substrands!.map((substrand) => {
                  const isSubstrandSelected = selectedSubstrand === substrand

                  return (
                    <button
                      key={substrand}
                      type="button"
                      onClick={() => handleSubstrandClick(substrand)}
                      className={cn(
                        'w-full text-left px-3 py-1.5 text-sm rounded transition-colors',
                        isSubstrandSelected
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      )}
                      aria-current={isSubstrandSelected ? 'true' : undefined}
                    >
                      {substrand}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}

export default StrandNavigator
