/**
 * HSCCourseSelector component
 *
 * Allows selection of HSC courses with filtering by subject, units, and ATAR category.
 */
import { useState, useMemo } from 'react'
import type { Subject } from '@/types/subject.types'
import type { SeniorCourse } from '@/types/curriculum.types'
import { HSCCourseCard } from '../HSCCourseCard'
import { cn } from '@/lib/utils'

export interface HSCCourseSelectorProps {
  /** Available courses */
  courses: SeniorCourse[]
  /** Available subjects for filtering */
  subjects?: Subject[]
  /** Currently selected courses */
  selectedCourses: string[]
  /** Handler for course selection change */
  onSelectionChange: (courseIds: string[]) => void
  /** Maximum number of units allowed */
  maxUnits?: number
  /** Whether to allow multi-select */
  multiSelect?: boolean
  /** Whether to only show ATAR courses */
  atarOnly?: boolean
  /** Additional CSS classes */
  className?: string
  /** Loading state */
  loading?: boolean
}

type ATARFilter = 'all' | 'A' | 'B' | 'NONE'
type UnitFilter = 'all' | 1 | 2

export function HSCCourseSelector({
  courses,
  subjects,
  selectedCourses,
  onSelectionChange,
  maxUnits,
  multiSelect = true,
  atarOnly = false,
  className,
  loading = false,
}: HSCCourseSelectorProps) {
  const [subjectFilter, setSubjectFilter] = useState<string | 'all'>('all')
  const [atarFilter, setAtarFilter] = useState<ATARFilter>('all')
  const [unitFilter, setUnitFilter] = useState<UnitFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Calculate current total units
  const currentTotalUnits = useMemo(() => {
    return courses
      .filter((c) => selectedCourses.includes(c.id))
      .reduce((sum, c) => sum + c.units, 0)
  }, [courses, selectedCourses])

  // Filter courses
  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      // ATAR only filter
      if (atarOnly && !course.atarCategory) {
        return false
      }

      // Subject filter
      if (subjectFilter !== 'all' && course.subjectId !== subjectFilter) {
        return false
      }

      // ATAR category filter
      if (atarFilter !== 'all') {
        if (atarFilter === 'NONE' && course.atarCategory) {
          return false
        }
        if (atarFilter !== 'NONE' && course.atarCategory !== atarFilter) {
          return false
        }
      }

      // Unit filter
      if (unitFilter !== 'all' && course.units !== unitFilter) {
        return false
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesName = course.name.toLowerCase().includes(query)
        const matchesCode = course.code?.toLowerCase().includes(query)
        if (!matchesName && !matchesCode) {
          return false
        }
      }

      return true
    })
  }, [courses, subjectFilter, atarFilter, unitFilter, searchQuery, atarOnly])

  const handleCourseClick = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId)
    if (!course) return

    const isSelected = selectedCourses.includes(courseId)

    if (isSelected) {
      // Deselect
      onSelectionChange(selectedCourses.filter((id) => id !== courseId))
    } else {
      // Check unit limit
      if (maxUnits && currentTotalUnits + course.units > maxUnits) {
        return // Would exceed limit
      }

      if (multiSelect) {
        onSelectionChange([...selectedCourses, courseId])
      } else {
        onSelectionChange([courseId])
      }
    }
  }

  const isSelected = (courseId: string): boolean => {
    return selectedCourses.includes(courseId)
  }

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse h-10 w-24 bg-gray-200 rounded" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse h-32 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end" role="group" aria-label="Course filters">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <label htmlFor="course-search" className="sr-only">
            Search courses
          </label>
          <input
            id="course-search"
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Subject filter */}
        {subjects && subjects.length > 0 && (
          <div className="flex flex-col gap-1">
            <label htmlFor="subject-filter" className="sr-only">
              Filter by subject
            </label>
            <select
              id="subject-filter"
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Subjects</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* ATAR filter */}
        <div className="flex flex-col gap-1">
          <label htmlFor="atar-filter" className="sr-only">
            Filter by ATAR category
          </label>
          <select
            id="atar-filter"
            value={atarFilter}
            onChange={(e) => setAtarFilter(e.target.value as ATARFilter)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="A">ATAR Category A</option>
            <option value="B">ATAR Category B</option>
            <option value="NONE">Non-ATAR</option>
          </select>
        </div>

        {/* Unit filter */}
        <div className="flex flex-col gap-1">
          <label htmlFor="unit-filter" className="sr-only">
            Filter by unit count
          </label>
          <select
            id="unit-filter"
            value={unitFilter}
            onChange={(e) =>
              setUnitFilter(
                e.target.value === 'all' ? 'all' : (parseInt(e.target.value) as 1 | 2)
              )
            }
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Units</option>
            <option value="1">1 Unit</option>
            <option value="2">2 Units</option>
          </select>
        </div>
      </div>

      {/* Unit count indicator */}
      {maxUnits && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">Selected units:</span>
          <span
            className={cn(
              'font-medium',
              currentTotalUnits > maxUnits
                ? 'text-red-600'
                : currentTotalUnits === maxUnits
                  ? 'text-green-600'
                  : 'text-gray-900'
            )}
          >
            {currentTotalUnits} / {maxUnits}
          </span>
        </div>
      )}

      {/* Course list */}
      {filteredCourses.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No courses match your filters
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className={cn(
                'rounded-lg transition-all',
                isSelected(course.id) && 'ring-2 ring-blue-500 ring-offset-2'
              )}
            >
              <HSCCourseCard
                course={course}
                onClick={() => handleCourseClick(course.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default HSCCourseSelector
