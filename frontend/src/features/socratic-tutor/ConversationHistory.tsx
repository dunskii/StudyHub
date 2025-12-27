/**
 * Conversation history component for viewing past tutoring sessions.
 * Shows a list of sessions with the ability to view chat history.
 */
import { useState, memo } from 'react'
import { useStudentSessions, useChatHistory } from '@/hooks/useTutor'
import { ChatMessage } from './ChatMessage'
import { Calendar, Clock, BookOpen, MessageSquare, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { ChatMessage as ChatMessageType } from '@/stores/tutorStore'

interface ConversationHistoryProps {
  /** Student ID to show history for */
  studentId: string
  /** Optional filter by subject code */
  subjectCode?: string
  /** Callback when viewing a session */
  onViewSession?: (sessionId: string) => void
  /** Custom class name */
  className?: string
}

interface SessionSummary {
  id: string
  subjectCode: string
  subjectName: string
  startedAt: Date
  endedAt?: Date | null
  messageCount: number
  outcomesCovered: string[]
}

/**
 * Format a date for display.
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Format a duration between two dates.
 */
function formatDuration(start: Date, end?: Date | null): string {
  const endTime = end || new Date()
  const diffMs = endTime.getTime() - start.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return '< 1 min'
  if (diffMins < 60) return `${diffMins} min`

  const hours = Math.floor(diffMins / 60)
  const mins = diffMins % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

/**
 * Get subject color for styling.
 */
function getSubjectColor(subjectCode?: string): string {
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

/**
 * Session card component.
 */
const SessionCard = memo(function SessionCard({
  session,
  onClick,
  isSelected,
}: {
  session: SessionSummary
  onClick: () => void
  isSelected: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 rounded-lg border transition-all',
        isSelected
          ? 'border-emerald-500 bg-emerald-50'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Subject badge */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                getSubjectColor(session.subjectCode)
              )}
            >
              <BookOpen className="w-3 h-3" />
              {session.subjectName}
            </span>
            {!session.endedAt && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                Active
              </span>
            )}
          </div>

          {/* Date and time info */}
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(session.startedAt)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDuration(session.startedAt, session.endedAt)}
            </span>
          </div>

          {/* Message count and outcomes */}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" />
              {session.messageCount} messages
            </span>
            {session.outcomesCovered.length > 0 && (
              <span className="text-xs text-gray-400">
                {session.outcomesCovered.length} outcome
                {session.outcomesCovered.length !== 1 ? 's' : ''} covered
              </span>
            )}
          </div>
        </div>

        <ChevronRight
          className={cn(
            'w-5 h-5 text-gray-400 transition-transform',
            isSelected && 'rotate-90'
          )}
        />
      </div>
    </button>
  )
})

/**
 * Chat history viewer panel.
 */
function ChatHistoryPanel({
  sessionId,
  subjectName,
  onClose,
}: {
  sessionId: string
  subjectName: string
  onClose: () => void
}) {
  const { data: history, isLoading } = useChatHistory(sessionId)

  // Convert API response to ChatMessage format
  const messages: ChatMessageType[] = (history?.messages || []).map((msg, idx) => ({
    id: `msg-${idx}`,
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
    timestamp: new Date(msg.timestamp),
    flagged: msg.flagged,
  }))

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="font-medium text-gray-900">{subjectName} Session</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Loading conversation...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">No messages in this session</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                isLastMessage={index === messages.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * ConversationHistory displays a list of past tutoring sessions.
 */
export function ConversationHistory({
  studentId,
  subjectCode,
  onViewSession,
  className,
}: ConversationHistoryProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [selectedSubjectName, setSelectedSubjectName] = useState<string>('')

  const { data: sessions, isLoading, error } = useStudentSessions(studentId)

  // Filter sessions by subject if specified
  const filteredSessions = sessions?.sessions.filter((session) =>
    subjectCode ? session.subject_code === subjectCode : true
  )

  // Map to SessionSummary format
  const sessionSummaries: SessionSummary[] = (filteredSessions || []).map((session) => ({
    id: session.id,
    subjectCode: session.subject_code || '',
    subjectName: session.subject_name || 'General',
    startedAt: new Date(session.started_at),
    endedAt: session.ended_at ? new Date(session.ended_at) : null,
    messageCount: session.data?.questionsAttempted || 0,
    outcomesCovered: session.data?.outcomesWorkedOn || [],
  }))

  // Handle session selection
  const handleSessionClick = (session: SessionSummary) => {
    if (selectedSessionId === session.id) {
      setSelectedSessionId(null)
      setSelectedSubjectName('')
    } else {
      setSelectedSessionId(session.id)
      setSelectedSubjectName(session.subjectName)
      onViewSession?.(session.id)
    }
  }

  if (error) {
    return (
      <div className={cn('p-8 text-center', className)}>
        <p className="text-red-600">Failed to load conversation history</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={cn('p-8 text-center', className)}>
        <p className="text-gray-500">Loading your session history...</p>
      </div>
    )
  }

  if (sessionSummaries.length === 0) {
    return (
      <div className={cn('p-8 text-center', className)}>
        <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions yet</h3>
        <p className="text-gray-500">
          Start a tutoring session to see your conversation history here.
        </p>
      </div>
    )
  }

  return (
    <div className={cn('flex gap-4', className)}>
      {/* Session list */}
      <div className={cn('space-y-3', selectedSessionId ? 'w-1/2' : 'w-full')}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Your Tutoring Sessions
        </h2>
        {sessionSummaries.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            onClick={() => handleSessionClick(session)}
            isSelected={selectedSessionId === session.id}
          />
        ))}
      </div>

      {/* Chat history panel */}
      {selectedSessionId && (
        <div className="w-1/2 h-[600px]">
          <ChatHistoryPanel
            sessionId={selectedSessionId}
            subjectName={selectedSubjectName}
            onClose={() => setSelectedSessionId(null)}
          />
        </div>
      )}
    </div>
  )
}

export default ConversationHistory
