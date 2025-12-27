/**
 * Main Socratic Tutor chat interface.
 * Combines all chat components into a complete tutoring experience.
 */
import { useEffect, useRef, useCallback } from 'react'
import { useTutorStore } from '@/stores/tutorStore'
import { useTutorChat } from '@/hooks/useTutor'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { TypingIndicator } from './TypingIndicator'
import { SubjectContext } from './SubjectContext'
import { EmptyChat } from './EmptyChat'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface TutorChatProps {
  /** Student ID for the chat session */
  studentId: string
  /** Subject code (e.g., 'MATH', 'ENG') */
  subjectCode?: string
  /** Subject display name */
  subjectName?: string
  /** Optional curriculum outcome code */
  outcomeCode?: string
  /** Callback when session ends */
  onSessionEnd?: () => void
  /** Custom class name */
  className?: string
}

/**
 * TutorChat is the main container for the Socratic tutor interface.
 * It manages the chat session, message list, and user input.
 */
export function TutorChat({
  studentId,
  subjectCode,
  subjectName,
  outcomeCode,
  onSessionEnd,
  className,
}: TutorChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Store state
  const {
    currentSession,
    messages,
    isLoading,
    isSending,
    error,
    clearError,
    setCurrentSubject,
  } = useTutorStore()

  // Hooks for session and chat
  const {
    startSession,
    send: sendMessage,
    end: endSession,
  } = useTutorChat(studentId)

  // Set current subject when props change
  useEffect(() => {
    if (subjectCode) {
      setCurrentSubject(subjectCode, outcomeCode || null)
    }
  }, [subjectCode, outcomeCode, setCurrentSubject])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isSending])

  // Start session if needed
  useEffect(() => {
    if (!currentSession && subjectCode && !isLoading) {
      startSession('tutor_chat')
    }
  }, [currentSession, subjectCode, isLoading, startSession])

  // Handle sending messages
  const handleSendMessage = useCallback(
    (content: string) => {
      if (!currentSession) return

      sendMessage(content, outcomeCode)
    },
    [currentSession, outcomeCode, sendMessage]
  )

  // Handle ending session
  const handleEndSession = useCallback(() => {
    if (currentSession) {
      endSession()
      onSessionEnd?.()
    }
  }, [currentSession, endSession, onSessionEnd])

  // Handle prompt clicks from empty state
  const handlePromptClick = useCallback(
    (prompt: string) => {
      handleSendMessage(prompt)
    },
    [handleSendMessage]
  )

  // Handle retry on error
  const handleRetry = useCallback(() => {
    clearError()
  }, [clearError])

  // Loading state while session initializes
  if (isLoading && !currentSession) {
    return (
      <div className={cn('flex flex-col h-full bg-white', className)}>
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
            <p className="text-gray-600">Starting your tutoring session...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full bg-white', className)}>
      {/* Subject context header */}
      <SubjectContext
        session={currentSession}
        subjectCode={subjectCode}
        subjectName={subjectName}
        outcomeCode={outcomeCode}
        onEnd={handleEndSession}
      />

      {/* Error banner */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRetry}
              className="text-red-700 hover:text-red-800"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <EmptyChat
            subjectName={subjectName}
            subjectCode={subjectCode}
            onPromptClick={handlePromptClick}
          />
        ) : (
          <div className="flex flex-col">
            {messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                isLastMessage={index === messages.length - 1 && !isSending}
              />
            ))}

            {/* Typing indicator when waiting for response */}
            {isSending && <TypingIndicator />}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Chat input */}
      <ChatInput
        onSend={handleSendMessage}
        disabled={!currentSession}
        isSending={isSending}
        placeholder={
          subjectName
            ? `Ask your ${subjectName} question...`
            : 'Type your question here...'
        }
      />
    </div>
  )
}

export default TutorChat
