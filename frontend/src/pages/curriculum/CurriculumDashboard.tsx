/**
 * CurriculumDashboard page
 *
 * Main page for browsing and exploring NSW curriculum content.
 * Allows users to:
 * - Browse subjects
 * - View curriculum outcomes by stage/strand
 * - Explore HSC courses
 */
import { useState } from 'react'
import type { Subject } from '@/types/subject.types'
import type { CurriculumOutcome } from '@/types/curriculum.types'
import { useSubjectList } from '@/hooks/useSubjects'
import { useOutcomeList } from '@/hooks/useCurriculum'
import { useSeniorCourseList } from '@/hooks/useSeniorCourses'
import { SubjectGrid, SubjectCard } from '@/components/subjects'
import { CurriculumBrowser } from '@/components/curriculum'
import { HSCCourseSelector } from '@/components/senior'
import { cn } from '@/lib/utils'

type DashboardTab = 'subjects' | 'outcomes' | 'hsc'

export function CurriculumDashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('subjects')
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [selectedOutcome, setSelectedOutcome] = useState<CurriculumOutcome | null>(null)

  // Fetch subjects
  const {
    data: subjects = [],
    isLoading: subjectsLoading,
    error: subjectsError,
  } = useSubjectList()

  // Fetch outcomes for selected subject
  const {
    data: outcomes = [],
    isLoading: outcomesLoading,
  } = useOutcomeList(
    selectedSubject
      ? {
          subject_id: selectedSubject.id,
          page_size: 200,
        }
      : undefined
  )

  // Fetch HSC courses
  const {
    data: hscCourses = [],
    isLoading: hscLoading,
  } = useSeniorCourseList()

  const handleSubjectClick = (subject: Subject) => {
    setSelectedSubject(subject)
    setActiveTab('outcomes')
  }

  const handleOutcomeClick = (outcome: CurriculumOutcome) => {
    setSelectedOutcome(outcome)
    // Could open a modal or navigate to outcome detail
  }

  const handleBackToSubjects = () => {
    setSelectedSubject(null)
    setActiveTab('subjects')
  }

  const tabs = [
    { id: 'subjects' as const, label: 'Subjects', count: subjects.length },
    { id: 'outcomes' as const, label: 'Browse Outcomes', disabled: !selectedSubject },
    { id: 'hsc' as const, label: 'HSC Courses', count: hscCourses.length },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                NSW Curriculum
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Explore subjects, learning outcomes, and HSC courses
              </p>
            </div>
            {selectedSubject && activeTab === 'outcomes' && (
              <button
                type="button"
                onClick={handleBackToSubjects}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back to subjects
              </button>
            )}
          </div>

          {/* Tabs */}
          <nav className="mt-6 flex gap-4" aria-label="Dashboard sections">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => !tab.disabled && setActiveTab(tab.id)}
                disabled={tab.disabled}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : tab.disabled
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-600 hover:bg-gray-100'
                )}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-2 text-xs text-gray-500">
                    ({tab.count})
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error state */}
        {subjectsError && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 mb-6">
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-red-700">
                Failed to load curriculum data. Please try again later.
              </p>
            </div>
          </div>
        )}

        {/* Subjects tab */}
        {activeTab === 'subjects' && (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Key Learning Areas
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Select a subject to explore its curriculum outcomes
              </p>
            </div>
            <SubjectGrid
              subjects={subjects}
              loading={subjectsLoading}
              onSubjectClick={handleSubjectClick}
            />
          </div>
        )}

        {/* Outcomes tab */}
        {activeTab === 'outcomes' && selectedSubject && (
          <div>
            {/* Selected subject card */}
            <div className="mb-6">
              <SubjectCard subject={selectedSubject} />
            </div>

            {/* Curriculum browser */}
            <CurriculumBrowser
              subject={selectedSubject}
              outcomes={outcomes}
              onOutcomeClick={handleOutcomeClick}
              loading={outcomesLoading}
            />
          </div>
        )}

        {/* HSC tab */}
        {activeTab === 'hsc' && (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                HSC Courses
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Browse Stage 6 (Years 11-12) courses for the Higher School
                Certificate
              </p>
            </div>
            <HSCCourseSelector
              courses={hscCourses}
              subjects={subjects}
              selectedCourses={[]}
              onSelectionChange={() => {}}
              loading={hscLoading}
            />
          </div>
        )}
      </main>

      {/* Outcome detail modal (placeholder) */}
      {selectedOutcome && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedOutcome(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <code className="text-lg font-mono font-medium text-gray-900">
                {selectedOutcome.outcomeCode}
              </code>
              <button
                type="button"
                onClick={() => setSelectedOutcome(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                {selectedOutcome.stage}
              </span>
              {selectedOutcome.pathway && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                  {selectedOutcome.pathway}
                </span>
              )}
            </div>

            <p className="text-gray-700 mb-4">{selectedOutcome.description}</p>

            {selectedOutcome.strand && (
              <div className="text-sm text-gray-500">
                <span className="font-medium">Strand:</span>{' '}
                {selectedOutcome.strand}
                {selectedOutcome.substrand && (
                  <>
                    {' > '}
                    {selectedOutcome.substrand}
                  </>
                )}
              </div>
            )}

            {selectedOutcome.prerequisites &&
              selectedOutcome.prerequisites.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Prerequisites
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedOutcome.prerequisites.map((prereq) => (
                      <code
                        key={prereq}
                        className="text-xs bg-gray-100 px-2 py-1 rounded"
                      >
                        {prereq}
                      </code>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  )
}

export default CurriculumDashboard
