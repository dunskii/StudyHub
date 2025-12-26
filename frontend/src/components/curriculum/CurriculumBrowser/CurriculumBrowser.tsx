/**
 * CurriculumBrowser component
 *
 * Main component for browsing curriculum outcomes.
 * Combines stage selection, strand navigation, and outcome display.
 */
import { useState, useMemo } from 'react'
import type { Subject } from '@/types/subject.types'
import type { CurriculumOutcome } from '@/types/curriculum.types'
import { StageSelector, type StageValue } from '../StageSelector'
import { StrandNavigator, type Strand } from '../StrandNavigator'
import { OutcomeList } from '../OutcomeList'
import { cn } from '@/lib/utils'

export interface CurriculumBrowserProps {
  /** The subject being browsed */
  subject: Subject
  /** All outcomes for this subject */
  outcomes: CurriculumOutcome[]
  /** Handler for outcome click */
  onOutcomeClick?: (outcome: CurriculumOutcome) => void
  /** Whether data is loading */
  loading?: boolean
  /** Additional CSS classes */
  className?: string
}

export function CurriculumBrowser({
  subject,
  outcomes,
  onOutcomeClick,
  loading = false,
  className,
}: CurriculumBrowserProps) {
  const [selectedStage, setSelectedStage] = useState<StageValue | null>(null)
  const [selectedStrand, setSelectedStrand] = useState<string | null>(null)
  const [selectedSubstrand, setSelectedSubstrand] = useState<string | null>(null)

  // Extract unique strands with substrands from outcomes
  const strands = useMemo((): Strand[] => {
    const strandMap = new Map<string, Set<string>>()
    const strandCounts = new Map<string, number>()

    // Filter outcomes by selected stage if any
    const stageFilteredOutcomes = selectedStage
      ? outcomes.filter((o) => o.stage === selectedStage)
      : outcomes

    stageFilteredOutcomes.forEach((outcome) => {
      if (outcome.strand) {
        if (!strandMap.has(outcome.strand)) {
          strandMap.set(outcome.strand, new Set())
          strandCounts.set(outcome.strand, 0)
        }
        strandCounts.set(
          outcome.strand,
          (strandCounts.get(outcome.strand) || 0) + 1
        )
        if (outcome.substrand) {
          strandMap.get(outcome.strand)!.add(outcome.substrand)
        }
      }
    })

    return Array.from(strandMap.entries()).map(([name, substrands]) => ({
      name,
      substrands: Array.from(substrands).sort(),
      outcomeCount: strandCounts.get(name),
    }))
  }, [outcomes, selectedStage])

  // Filter outcomes based on selections
  const filteredOutcomes = useMemo(() => {
    return outcomes.filter((outcome) => {
      if (selectedStage && outcome.stage !== selectedStage) {
        return false
      }
      if (selectedStrand && outcome.strand !== selectedStrand) {
        return false
      }
      if (selectedSubstrand && outcome.substrand !== selectedSubstrand) {
        return false
      }
      return true
    })
  }, [outcomes, selectedStage, selectedStrand, selectedSubstrand])

  // Get unique stages present in outcomes
  const availableStages = useMemo(() => {
    const stages = new Set<StageValue>()
    outcomes.forEach((outcome) => {
      if (outcome.stage) {
        stages.add(outcome.stage as StageValue)
      }
    })
    return stages
  }, [outcomes])

  const clearFilters = () => {
    setSelectedStage(null)
    setSelectedStrand(null)
    setSelectedSubstrand(null)
  }

  const hasActiveFilters = selectedStage || selectedStrand || selectedSubstrand

  if (loading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="animate-pulse h-8 bg-gray-200 rounded w-48" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse h-12 w-24 bg-gray-200 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-6">
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse h-10 bg-gray-200 rounded" />
            ))}
          </div>
          <div className="col-span-3 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse h-20 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          {subject.name} Curriculum
        </h2>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Stage selector */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          Filter by Stage
        </h3>
        <StageSelector
          value={selectedStage}
          onChange={(value) => {
            setSelectedStage(value as StageValue | null)
            // Reset strand selection when stage changes
            setSelectedStrand(null)
            setSelectedSubstrand(null)
          }}
        />
        {selectedStage && !availableStages.has(selectedStage) && (
          <p className="mt-2 text-sm text-amber-600">
            No outcomes available for this stage
          </p>
        )}
      </div>

      {/* Main content: Strands + Outcomes */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Strand navigator */}
        <div className="md:col-span-1">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Strands</h3>
          {strands.length > 0 ? (
            <StrandNavigator
              strands={strands}
              selectedStrand={selectedStrand}
              selectedSubstrand={selectedSubstrand}
              onStrandSelect={setSelectedStrand}
              onSubstrandSelect={setSelectedSubstrand}
            />
          ) : (
            <p className="text-sm text-gray-500">
              {selectedStage
                ? 'No strands for selected stage'
                : 'No strands available'}
            </p>
          )}
        </div>

        {/* Outcomes list */}
        <div className="md:col-span-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">
              Outcomes
              {filteredOutcomes.length > 0 && (
                <span className="ml-2 text-gray-500 font-normal">
                  ({filteredOutcomes.length})
                </span>
              )}
            </h3>
          </div>
          <OutcomeList
            outcomes={filteredOutcomes}
            onOutcomeClick={onOutcomeClick}
            showStage={!selectedStage}
            showStrand={!selectedStrand}
            emptyMessage={
              hasActiveFilters
                ? 'No outcomes match the selected filters'
                : 'No outcomes available'
            }
          />
        </div>
      </div>
    </div>
  )
}

export default CurriculumBrowser
