/**
 * Zustand store for revision session state management.
 */
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Flashcard } from '@/lib/api/revision'

export interface RevisionAnswer {
  flashcardId: string
  wasCorrect: boolean
  difficultyRating: number
  responseTimeSeconds: number
}

interface RevisionSessionState {
  // Session state
  isInSession: boolean
  sessionId: string | null
  sessionCards: Flashcard[]
  currentCardIndex: number
  showAnswer: boolean

  // Session results
  sessionAnswers: RevisionAnswer[]
  correctCount: number
  startTime: number | null

  // UI state
  isLoading: boolean
  error: string | null

  // Filter state
  selectedSubjectId: string | null
  searchQuery: string
}

interface RevisionSessionActions {
  // Session actions
  startSession: (cards: Flashcard[], sessionId?: string) => void
  endSession: () => void
  reset: () => void

  // Card navigation
  flipCard: () => void
  nextCard: () => void
  previousCard: () => void
  goToCard: (index: number) => void

  // Answer recording
  recordAnswer: (answer: RevisionAnswer) => void

  // UI actions
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // Filter actions
  setSelectedSubjectId: (subjectId: string | null) => void
  setSearchQuery: (query: string) => void
  clearFilters: () => void
}

type RevisionStore = RevisionSessionState & RevisionSessionActions

const initialState: RevisionSessionState = {
  isInSession: false,
  sessionId: null,
  sessionCards: [],
  currentCardIndex: 0,
  showAnswer: false,
  sessionAnswers: [],
  correctCount: 0,
  startTime: null,
  isLoading: false,
  error: null,
  selectedSubjectId: null,
  searchQuery: '',
}

export const useRevisionStore = create<RevisionStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Session actions
      startSession: (cards, sessionId) => {
        set({
          isInSession: true,
          sessionId: sessionId ?? null,
          sessionCards: cards,
          currentCardIndex: 0,
          showAnswer: false,
          sessionAnswers: [],
          correctCount: 0,
          startTime: Date.now(),
          error: null,
        })
      },

      endSession: () => {
        set({
          isInSession: false,
          showAnswer: false,
        })
      },

      reset: () => {
        set(initialState)
      },

      // Card navigation
      flipCard: () => {
        set((state) => ({ showAnswer: !state.showAnswer }))
      },

      nextCard: () => {
        const { currentCardIndex, sessionCards } = get()
        if (currentCardIndex < sessionCards.length - 1) {
          set({
            currentCardIndex: currentCardIndex + 1,
            showAnswer: false,
          })
        }
      },

      previousCard: () => {
        const { currentCardIndex } = get()
        if (currentCardIndex > 0) {
          set({
            currentCardIndex: currentCardIndex - 1,
            showAnswer: false,
          })
        }
      },

      goToCard: (index) => {
        const { sessionCards } = get()
        if (index >= 0 && index < sessionCards.length) {
          set({
            currentCardIndex: index,
            showAnswer: false,
          })
        }
      },

      // Answer recording
      recordAnswer: (answer) => {
        set((state) => ({
          sessionAnswers: [...state.sessionAnswers, answer],
          correctCount: state.correctCount + (answer.wasCorrect ? 1 : 0),
        }))
      },

      // UI actions
      setLoading: (loading) => {
        set({ isLoading: loading })
      },

      setError: (error) => {
        set({ error })
      },

      // Filter actions
      setSelectedSubjectId: (subjectId) => {
        set({ selectedSubjectId: subjectId })
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query })
      },

      clearFilters: () => {
        set({
          selectedSubjectId: null,
          searchQuery: '',
        })
      },
    }),
    { name: 'revision-store' }
  )
)

// Selectors
export const selectCurrentCard = (state: RevisionStore): Flashcard | null => {
  if (!state.isInSession || state.sessionCards.length === 0) {
    return null
  }
  return state.sessionCards[state.currentCardIndex] ?? null
}

export const selectSessionProgress = (state: RevisionStore) => {
  const total = state.sessionCards.length
  const answered = state.sessionAnswers.length
  const remaining = total - answered

  return {
    total,
    answered,
    remaining,
    correctCount: state.correctCount,
    incorrectCount: answered - state.correctCount,
    progressPercent: total > 0 ? Math.round((answered / total) * 100) : 0,
    accuracyPercent: answered > 0 ? Math.round((state.correctCount / answered) * 100) : 0,
  }
}

export const selectSessionDuration = (state: RevisionStore): number => {
  if (!state.startTime) return 0
  return Math.floor((Date.now() - state.startTime) / 1000)
}

export const selectIsLastCard = (state: RevisionStore): boolean => {
  return state.currentCardIndex >= state.sessionCards.length - 1
}

export const selectHasAnsweredCurrentCard = (state: RevisionStore): boolean => {
  const currentCard = selectCurrentCard(state)
  if (!currentCard) return false
  return state.sessionAnswers.some((a) => a.flashcardId === currentCard.id)
}
