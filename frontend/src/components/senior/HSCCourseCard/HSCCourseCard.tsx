/**
 * HSCCourseCard component
 *
 * Displays a single HSC/senior course with units, ATAR category, and prerequisites.
 */
import type { SeniorCourse } from '@/types/curriculum.types'
import { cn } from '@/lib/utils'

export interface HSCCourseCardProps {
  /** The course to display */
  course: SeniorCourse
  /** Whether the card is compact */
  compact?: boolean
  /** Whether to show prerequisites */
  showPrerequisites?: boolean
  /** Click handler */
  onClick?: () => void
  /** Additional CSS classes */
  className?: string
}

const ATAR_CATEGORY_STYLES = {
  A: 'bg-green-100 text-green-800',
  B: 'bg-blue-100 text-blue-800',
  NONE: 'bg-gray-100 text-gray-600',
}

export function HSCCourseCard({
  course,
  compact = false,
  showPrerequisites = true,
  onClick,
  className,
}: HSCCourseCardProps) {
  const Component = onClick ? 'button' : 'div'
  const atarCategory = course.atarCategory || 'NONE'

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'text-left rounded-lg border border-gray-200 bg-white transition-all w-full',
        compact ? 'p-3' : 'p-4',
        onClick && 'hover:border-gray-300 hover:shadow-sm cursor-pointer',
        className
      )}
    >
      {/* Header with name and badges */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{course.name}</h3>
          {course.code && (
            <code className="text-xs font-mono text-gray-500">{course.code}</code>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {/* Units badge */}
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
            {course.units} unit{course.units !== 1 ? 's' : ''}
          </span>
          {/* ATAR category badge */}
          {course.atarCategory && (
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                ATAR_CATEGORY_STYLES[atarCategory as keyof typeof ATAR_CATEGORY_STYLES]
              )}
            >
              ATAR {atarCategory}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {course.description && !compact && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {course.description}
        </p>
      )}

      {/* Course type badge */}
      {course.courseType && (
        <div className="mb-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
            {course.courseType}
          </span>
        </div>
      )}

      {/* Prerequisites */}
      {showPrerequisites &&
        course.prerequisites &&
        course.prerequisites.length > 0 &&
        !compact && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-500">
              <span className="font-medium">Prerequisites: </span>
              <span>{course.prerequisites.join(', ')}</span>
            </div>
          </div>
        )}

      {/* Metadata footer */}
      {!compact && (
        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
          {course.isExtension && (
            <span className="flex items-center gap-1">
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                role="img"
                aria-labelledby="extension-icon-title"
              >
                <title id="extension-icon-title">Extension course</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
              Extension
            </span>
          )}
          {course.isVET && (
            <span className="flex items-center gap-1">
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                role="img"
                aria-labelledby="vet-icon-title"
              >
                <title id="vet-icon-title">Vocational Education and Training</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              VET
            </span>
          )}
        </div>
      )}
    </Component>
  )
}

export default HSCCourseCard
