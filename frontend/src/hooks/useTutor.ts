/**
 * React Query hooks for AI tutor interactions.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  tutorApi,
  type ChatRequest,
  type FlashcardRequest,
  type FlashcardResponse,
  type SummariseRequest,
  type SummariseResponse,
  type SessionCreateRequest,
  type SessionResponse,
  type ChatHistoryResponse,
} from '@/lib/api'
import { useTutorStore, type ChatMessage } from '@/stores/tutorStore'
import { useCallback } from 'react'

// =============================================================================
// Query Keys
// =============================================================================

export const tutorKeys = {
  all: ['tutor'] as const,
  sessions: () => [...tutorKeys.all, 'sessions'] as const,
  session: (id: string) => [...tutorKeys.sessions(), id] as const,
  studentSessions: (studentId: string) => [...tutorKeys.sessions(), 'student', studentId] as const,
  activeSession: (studentId: string, subjectId?: string) =>
    [...tutorKeys.sessions(), 'active', studentId, subjectId] as const,
  chatHistory: (sessionId: string) => [...tutorKeys.all, 'history', sessionId] as const,
}

// =============================================================================
// Session Hooks
// =============================================================================

/**
 * Hook to create a new tutoring session.
 */
export function useCreateSession() {
  const queryClient = useQueryClient()
  const { setCurrentSession, clearMessages } = useTutorStore()

  return useMutation({
    mutationFn: (request: SessionCreateRequest) => tutorApi.createSession(request),
    onSuccess: (data) => {
      // Update store with new session
      setCurrentSession({
        id: data.id,
        studentId: data.student_id,
        subjectId: data.subject_id,
        subjectCode: data.subject_code,
        subjectName: data.subject_name,
        sessionType: data.session_type,
        startedAt: new Date(data.started_at),
      })
      clearMessages()

      // Invalidate session queries
      queryClient.invalidateQueries({ queryKey: tutorKeys.sessions() })
    },
  })
}

/**
 * Hook to end a tutoring session.
 */
export function useEndSession() {
  const queryClient = useQueryClient()
  const { setCurrentSession } = useTutorStore()

  return useMutation({
    mutationFn: ({ sessionId, xpEarned = 0 }: { sessionId: string; xpEarned?: number }) =>
      tutorApi.endSession(sessionId, xpEarned),
    onSuccess: () => {
      setCurrentSession(null)
      queryClient.invalidateQueries({ queryKey: tutorKeys.sessions() })
    },
  })
}

/**
 * Hook to get a session by ID.
 */
export function useSession(sessionId: string | null) {
  return useQuery<SessionResponse>({
    queryKey: tutorKeys.session(sessionId ?? ''),
    queryFn: () => tutorApi.getSession(sessionId!),
    enabled: Boolean(sessionId),
  })
}

/**
 * Hook to get the active session for a student.
 */
export function useActiveSession(studentId: string | null, subjectId?: string) {
  return useQuery<SessionResponse | null>({
    queryKey: tutorKeys.activeSession(studentId ?? '', subjectId),
    queryFn: () => tutorApi.getActiveSession(studentId!, subjectId),
    enabled: Boolean(studentId),
  })
}

/**
 * Hook to get sessions for a student.
 */
export function useStudentSessions(
  studentId: string | null,
  params?: {
    subject_id?: string
    session_type?: string
    limit?: number
    offset?: number
  }
) {
  return useQuery({
    queryKey: [...tutorKeys.studentSessions(studentId ?? ''), params],
    queryFn: () => tutorApi.getStudentSessions(studentId!, params),
    enabled: Boolean(studentId),
  })
}

// =============================================================================
// Chat Hooks
// =============================================================================

/**
 * Hook to send a chat message to the tutor.
 */
export function useSendMessage() {
  const { addMessage, setSending, setError } = useTutorStore()

  return useMutation({
    mutationFn: (request: ChatRequest) => tutorApi.sendChatMessage(request),
    onMutate: async (request) => {
      setSending(true)
      setError(null)

      // Optimistically add user message
      const userMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: request.message,
        timestamp: new Date(),
      }
      addMessage(userMessage)
    },
    onSuccess: (data) => {
      // Add AI response
      const aiMessage: ChatMessage = {
        id: data.interaction_id,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        flagged: data.flagged,
      }
      addMessage(aiMessage)
    },
    onError: (error: Error) => {
      setError(error.message || 'Failed to send message')
    },
    onSettled: () => {
      setSending(false)
    },
  })
}

/**
 * Hook to get chat history for a session.
 */
export function useChatHistory(sessionId: string | null) {
  const { setMessages, setLoading } = useTutorStore()

  return useQuery<ChatHistoryResponse>({
    queryKey: tutorKeys.chatHistory(sessionId ?? ''),
    queryFn: async () => {
      setLoading(true)
      const history = await tutorApi.getChatHistory(sessionId!)

      // Convert to store format
      const messages: ChatMessage[] = history.messages.map((msg, idx) => ({
        id: `history-${idx}`,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        flagged: msg.flagged,
      }))

      setMessages(messages)
      setLoading(false)

      return history
    },
    enabled: Boolean(sessionId),
  })
}

// =============================================================================
// Utility Hooks
// =============================================================================

/**
 * Hook to generate flashcards from text.
 */
export function useGenerateFlashcards() {
  return useMutation<FlashcardResponse, Error, FlashcardRequest>({
    mutationFn: (request) => tutorApi.generateFlashcards(request),
  })
}

/**
 * Hook to summarise text.
 */
export function useSummariseText() {
  return useMutation<SummariseResponse, Error, SummariseRequest>({
    mutationFn: (request) => tutorApi.summariseText(request),
  })
}

// =============================================================================
// Combined Hook for Full Tutor Functionality
// =============================================================================

/**
 * Combined hook for tutor chat functionality.
 * Provides session management and messaging in one hook.
 */
export function useTutorChat(studentId: string | null, subjectId?: string) {
  const store = useTutorStore()
  const createSession = useCreateSession()
  const endSession = useEndSession()
  const sendMessage = useSendMessage()
  const activeSessionQuery = useActiveSession(studentId, subjectId)

  // Start or resume a session
  const startSession = useCallback(
    async (sessionType = 'tutor_chat') => {
      if (!studentId) {
        throw new Error('No student selected')
      }

      // Check for existing active session
      if (activeSessionQuery.data) {
        store.setCurrentSession({
          id: activeSessionQuery.data.id,
          studentId: activeSessionQuery.data.student_id,
          subjectId: activeSessionQuery.data.subject_id,
          subjectCode: activeSessionQuery.data.subject_code,
          subjectName: activeSessionQuery.data.subject_name,
          sessionType: activeSessionQuery.data.session_type,
          startedAt: new Date(activeSessionQuery.data.started_at),
        })
        return activeSessionQuery.data
      }

      // Create new session
      return createSession.mutateAsync({
        student_id: studentId,
        subject_id: subjectId,
        session_type: sessionType,
      })
    },
    [studentId, subjectId, activeSessionQuery.data, createSession, store]
  )

  // Send a message
  const send = useCallback(
    async (message: string, outcomeCode?: string) => {
      if (!store.currentSession) {
        throw new Error('No active session')
      }

      return sendMessage.mutateAsync({
        session_id: store.currentSession.id,
        message,
        subject_code: store.currentSubjectCode ?? undefined,
        outcome_code: outcomeCode ?? store.currentOutcomeCode ?? undefined,
      })
    },
    [store.currentSession, store.currentSubjectCode, store.currentOutcomeCode, sendMessage]
  )

  // End the current session
  const end = useCallback(
    async (xpEarned = 0) => {
      if (!store.currentSession) return

      return endSession.mutateAsync({
        sessionId: store.currentSession.id,
        xpEarned,
      })
    },
    [store.currentSession, endSession]
  )

  return {
    // State
    session: store.currentSession,
    messages: store.messages,
    isLoading: store.isLoading || activeSessionQuery.isLoading,
    isSending: store.isSending,
    error: store.error,

    // Actions
    startSession,
    send,
    end,

    // Store actions
    setSubjectCode: store.setCurrentSubjectCode,
    setOutcomeCode: store.setCurrentOutcomeCode,
    reset: store.reset,

    // Query states
    createSessionMutation: createSession,
    sendMessageMutation: sendMessage,
    endSessionMutation: endSession,
  }
}
