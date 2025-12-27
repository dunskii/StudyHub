/**
 * Subject context header for the tutor chat.
 * Shows current subject, outcome, and session info.
 */
import { memo } from 'react'
import { Clock, BookOpen, Target } from 'lucide-react'
import type { TutorSession } from '@/stores/tutorStore'
import { cn } from '@/lib/utils'

interface SubjectContextProps {
  session: TutorSession | null
  subjectCode?: string | null
  subjectName?: string | null
  outcomeCode?: string | null
  onEnd?: () => void
}

/**
 * Format session duration as a human-readable string.
 */
function formatDuration(startedAt: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - startedAt.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just started'
  if (diffMins < 60) return `${diffMins} min`
  const hours = Math.floor(diffMins / 60)
  const mins = diffMins % 60
  return `${hours}h ${mins}m`
}

/**
 * SubjectContext displays the current tutoring context.
 */
export const SubjectContext = memo(function SubjectContext({
  session,
  subjectCode,
  subjectName,
  outcomeCode,
  onEnd,
}: SubjectContextProps) {
  const displaySubjectName = subjectName || session?.subjectName || 'General'
  const displaySubjectCode = subjectCode || session?.subjectCode

  return (
    <div className="border-b border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Subject info */}
        <div className="flex items-center gap-4">
          {/* Subject badge */}
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium',
              getSubjectColors(displaySubjectCode)
            )}
          >
            <BookOpen className="w-4 h-4" />
            <span>{displaySubjectName}</span>
          </div>

          {/* Outcome code if present */}
          {outcomeCode && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Target className="w-4 h-4" />
              <span className="font-mono">{outcomeCode}</span>
            </div>
          )}
        </div>

        {/* Session info */}
        <div className="flex items-center gap-4">
          {session && (
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(session.startedAt)}</span>
            </div>
          )}

          {onEnd && session && (
            <button
              onClick={onEnd}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              End session
            </button>
          )}
        </div>
      </div>
    </div>
  )
})

/**
 * Get Tailwind color classes for a subject.
 */
function getSubjectColors(subjectCode?: string | null): string {
  switch (subjectCode?.toUpperCase()) {
    case 'MATH':
      return 'bg-blue-100 text-blue-700'
    case 'ENG':
      return 'bg-purple-100 text-purple-700'
    case 'SCI':
      return 'bg-green-100 text-green-700'
    case 'HSIE':
      return 'bg-amber-100 text-amber-700'
    case 'PDHPE':
      return 'bg-red-100 text-red-700'
    case 'TAS':
      return 'bg-indigo-100 text-indigo-700'
    case 'CA':
      return 'bg-pink-100 text-pink-700'
    case 'LANG':
      return 'bg-teal-100 text-teal-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

export default SubjectContext
