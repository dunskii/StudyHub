/**
 * Zustand store for managing tutor chat state.
 */
import { create } from 'zustand'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  flagged?: boolean
}

export interface TutorSession {
  id: string
  studentId: string
  subjectId?: string
  subjectCode?: string
  subjectName?: string
  sessionType: string
  startedAt: Date
  endedAt?: Date
}

export interface TutorState {
  // Current session
  currentSession: TutorSession | null

  // Messages in current session
  messages: ChatMessage[]

  // Loading states
  isLoading: boolean
  isSending: boolean

  // Error state
  error: string | null

  // Current context
  currentSubjectCode: string | null
  currentOutcomeCode: string | null

  // Actions
  setCurrentSession: (session: TutorSession | null) => void
  addMessage: (message: ChatMessage) => void
  setMessages: (messages: ChatMessage[]) => void
  clearMessages: () => void
  setLoading: (loading: boolean) => void
  setSending: (sending: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  setCurrentSubjectCode: (code: string | null) => void
  setCurrentOutcomeCode: (code: string | null) => void
  setCurrentSubject: (code: string | null, outcomeCode: string | null) => void
  reset: () => void
}

const initialState = {
  currentSession: null,
  messages: [],
  isLoading: false,
  isSending: false,
  error: null,
  currentSubjectCode: null,
  currentOutcomeCode: null,
}

export const useTutorStore = create<TutorState>()((set) => ({
  ...initialState,

  setCurrentSession: (session) => set({ currentSession: session }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setMessages: (messages) => set({ messages }),

  clearMessages: () => set({ messages: [] }),

  setLoading: (isLoading) => set({ isLoading }),

  setSending: (isSending) => set({ isSending }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  setCurrentSubjectCode: (code) => set({ currentSubjectCode: code }),

  setCurrentOutcomeCode: (code) => set({ currentOutcomeCode: code }),

  setCurrentSubject: (code, outcomeCode) =>
    set({ currentSubjectCode: code, currentOutcomeCode: outcomeCode }),

  reset: () => set(initialState),
}))
