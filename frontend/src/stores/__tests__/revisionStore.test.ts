/**
 * Tests for the revision store.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import {
  useRevisionStore,
  selectCurrentCard,
  selectSessionProgress,
  selectSessionDuration,
  selectIsLastCard,
  selectHasAnsweredCurrentCard,
} from '../revisionStore'
import type { Flashcard } from '@/lib/api/revision'

const mockFlashcard = (id: string, front: string = 'Question'): Flashcard => ({
  id,
  student_id: 'student-1',
  subject_id: null,
  curriculum_outcome_id: null,
  context_note_id: null,
  front,
  back: 'Answer',
  generated_by: 'user',
  generation_model: null,
  review_count: 0,
  correct_count: 0,
  mastery_percent: 0,
  sr_interval: 1,
  sr_ease_factor: 2.5,
  sr_next_review: null,
  sr_repetition: 0,
  difficulty_level: 3,
  tags: [],
  is_due: true,
  success_rate: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})

describe('revisionStore', () => {
  beforeEach(() => {
    // Reset store before each test
    act(() => {
      useRevisionStore.getState().reset()
    })
  })

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = useRevisionStore.getState()

      expect(state.isInSession).toBe(false)
      expect(state.sessionCards).toEqual([])
      expect(state.currentCardIndex).toBe(0)
      expect(state.showAnswer).toBe(false)
      expect(state.sessionAnswers).toEqual([])
      expect(state.correctCount).toBe(0)
      expect(state.startTime).toBeNull()
    })
  })

  describe('startSession', () => {
    it('should start a new session with cards', () => {
      const cards = [mockFlashcard('1'), mockFlashcard('2'), mockFlashcard('3')]

      act(() => {
        useRevisionStore.getState().startSession(cards)
      })

      const state = useRevisionStore.getState()
      expect(state.isInSession).toBe(true)
      expect(state.sessionCards).toEqual(cards)
      expect(state.currentCardIndex).toBe(0)
      expect(state.startTime).not.toBeNull()
    })

    it('should reset previous session state', () => {
      const cards = [mockFlashcard('1')]

      // Start first session and answer a card
      act(() => {
        useRevisionStore.getState().startSession(cards)
        useRevisionStore.getState().recordAnswer({
          flashcardId: '1',
          wasCorrect: true,
          difficultyRating: 3,
          responseTimeSeconds: 5,
        })
      })

      // Start new session
      const newCards = [mockFlashcard('2')]
      act(() => {
        useRevisionStore.getState().startSession(newCards)
      })

      const state = useRevisionStore.getState()
      expect(state.sessionAnswers).toEqual([])
      expect(state.correctCount).toBe(0)
    })
  })

  describe('endSession', () => {
    it('should end the session', () => {
      const cards = [mockFlashcard('1')]

      act(() => {
        useRevisionStore.getState().startSession(cards)
        useRevisionStore.getState().endSession()
      })

      const state = useRevisionStore.getState()
      expect(state.isInSession).toBe(false)
      expect(state.showAnswer).toBe(false)
    })
  })

  describe('flipCard', () => {
    it('should toggle showAnswer', () => {
      const cards = [mockFlashcard('1')]

      act(() => {
        useRevisionStore.getState().startSession(cards)
      })

      expect(useRevisionStore.getState().showAnswer).toBe(false)

      act(() => {
        useRevisionStore.getState().flipCard()
      })

      expect(useRevisionStore.getState().showAnswer).toBe(true)

      act(() => {
        useRevisionStore.getState().flipCard()
      })

      expect(useRevisionStore.getState().showAnswer).toBe(false)
    })
  })

  describe('nextCard', () => {
    it('should move to next card and reset showAnswer', () => {
      const cards = [mockFlashcard('1'), mockFlashcard('2')]

      act(() => {
        useRevisionStore.getState().startSession(cards)
        useRevisionStore.getState().flipCard() // Show answer
        useRevisionStore.getState().nextCard()
      })

      const state = useRevisionStore.getState()
      expect(state.currentCardIndex).toBe(1)
      expect(state.showAnswer).toBe(false)
    })

    it('should not go past last card', () => {
      const cards = [mockFlashcard('1'), mockFlashcard('2')]

      act(() => {
        useRevisionStore.getState().startSession(cards)
        useRevisionStore.getState().nextCard()
        useRevisionStore.getState().nextCard() // Try to go past last
      })

      expect(useRevisionStore.getState().currentCardIndex).toBe(1)
    })
  })

  describe('previousCard', () => {
    it('should move to previous card', () => {
      const cards = [mockFlashcard('1'), mockFlashcard('2')]

      act(() => {
        useRevisionStore.getState().startSession(cards)
        useRevisionStore.getState().nextCard()
        useRevisionStore.getState().previousCard()
      })

      expect(useRevisionStore.getState().currentCardIndex).toBe(0)
    })

    it('should not go before first card', () => {
      const cards = [mockFlashcard('1')]

      act(() => {
        useRevisionStore.getState().startSession(cards)
        useRevisionStore.getState().previousCard()
      })

      expect(useRevisionStore.getState().currentCardIndex).toBe(0)
    })
  })

  describe('recordAnswer', () => {
    it('should record correct answer', () => {
      const cards = [mockFlashcard('1')]

      act(() => {
        useRevisionStore.getState().startSession(cards)
        useRevisionStore.getState().recordAnswer({
          flashcardId: '1',
          wasCorrect: true,
          difficultyRating: 3,
          responseTimeSeconds: 5,
        })
      })

      const state = useRevisionStore.getState()
      expect(state.sessionAnswers).toHaveLength(1)
      expect(state.correctCount).toBe(1)
    })

    it('should record incorrect answer', () => {
      const cards = [mockFlashcard('1')]

      act(() => {
        useRevisionStore.getState().startSession(cards)
        useRevisionStore.getState().recordAnswer({
          flashcardId: '1',
          wasCorrect: false,
          difficultyRating: 4,
          responseTimeSeconds: 10,
        })
      })

      const state = useRevisionStore.getState()
      expect(state.sessionAnswers).toHaveLength(1)
      expect(state.correctCount).toBe(0)
    })

    it('should accumulate answers', () => {
      const cards = [mockFlashcard('1'), mockFlashcard('2'), mockFlashcard('3')]

      act(() => {
        useRevisionStore.getState().startSession(cards)
        useRevisionStore.getState().recordAnswer({
          flashcardId: '1',
          wasCorrect: true,
          difficultyRating: 3,
          responseTimeSeconds: 5,
        })
        useRevisionStore.getState().recordAnswer({
          flashcardId: '2',
          wasCorrect: false,
          difficultyRating: 5,
          responseTimeSeconds: 15,
        })
        useRevisionStore.getState().recordAnswer({
          flashcardId: '3',
          wasCorrect: true,
          difficultyRating: 2,
          responseTimeSeconds: 3,
        })
      })

      const state = useRevisionStore.getState()
      expect(state.sessionAnswers).toHaveLength(3)
      expect(state.correctCount).toBe(2)
    })
  })

  describe('filters', () => {
    it('should set subject filter', () => {
      act(() => {
        useRevisionStore.getState().setSelectedSubjectId('subject-1')
      })

      expect(useRevisionStore.getState().selectedSubjectId).toBe('subject-1')
    })

    it('should set search query', () => {
      act(() => {
        useRevisionStore.getState().setSearchQuery('test query')
      })

      expect(useRevisionStore.getState().searchQuery).toBe('test query')
    })

    it('should clear filters', () => {
      act(() => {
        useRevisionStore.getState().setSelectedSubjectId('subject-1')
        useRevisionStore.getState().setSearchQuery('test')
        useRevisionStore.getState().clearFilters()
      })

      const state = useRevisionStore.getState()
      expect(state.selectedSubjectId).toBeNull()
      expect(state.searchQuery).toBe('')
    })
  })

  describe('selectors', () => {
    describe('selectCurrentCard', () => {
      it('should return null when not in session', () => {
        const state = useRevisionStore.getState()
        expect(selectCurrentCard(state)).toBeNull()
      })

      it('should return current card during session', () => {
        const cards = [mockFlashcard('1', 'First'), mockFlashcard('2', 'Second')]

        act(() => {
          useRevisionStore.getState().startSession(cards)
        })

        const state = useRevisionStore.getState()
        expect(selectCurrentCard(state)?.front).toBe('First')
      })
    })

    describe('selectSessionProgress', () => {
      it('should return correct progress metrics', () => {
        const cards = [mockFlashcard('1'), mockFlashcard('2'), mockFlashcard('3')]

        act(() => {
          useRevisionStore.getState().startSession(cards)
          useRevisionStore.getState().recordAnswer({
            flashcardId: '1',
            wasCorrect: true,
            difficultyRating: 3,
            responseTimeSeconds: 5,
          })
          useRevisionStore.getState().recordAnswer({
            flashcardId: '2',
            wasCorrect: false,
            difficultyRating: 4,
            responseTimeSeconds: 10,
          })
        })

        const state = useRevisionStore.getState()
        const progress = selectSessionProgress(state)

        expect(progress.total).toBe(3)
        expect(progress.answered).toBe(2)
        expect(progress.remaining).toBe(1)
        expect(progress.correctCount).toBe(1)
        expect(progress.incorrectCount).toBe(1)
        expect(progress.progressPercent).toBe(67) // 2/3 * 100
        expect(progress.accuracyPercent).toBe(50) // 1/2 * 100
      })
    })

    describe('selectIsLastCard', () => {
      it('should return true on last card', () => {
        const cards = [mockFlashcard('1'), mockFlashcard('2')]

        act(() => {
          useRevisionStore.getState().startSession(cards)
          useRevisionStore.getState().nextCard()
        })

        expect(selectIsLastCard(useRevisionStore.getState())).toBe(true)
      })

      it('should return false when not on last card', () => {
        const cards = [mockFlashcard('1'), mockFlashcard('2')]

        act(() => {
          useRevisionStore.getState().startSession(cards)
        })

        expect(selectIsLastCard(useRevisionStore.getState())).toBe(false)
      })
    })

    describe('selectHasAnsweredCurrentCard', () => {
      it('should return false when not answered', () => {
        const cards = [mockFlashcard('1')]

        act(() => {
          useRevisionStore.getState().startSession(cards)
        })

        expect(selectHasAnsweredCurrentCard(useRevisionStore.getState())).toBe(false)
      })

      it('should return true when answered', () => {
        const cards = [mockFlashcard('1')]

        act(() => {
          useRevisionStore.getState().startSession(cards)
          useRevisionStore.getState().recordAnswer({
            flashcardId: '1',
            wasCorrect: true,
            difficultyRating: 3,
            responseTimeSeconds: 5,
          })
        })

        expect(selectHasAnsweredCurrentCard(useRevisionStore.getState())).toBe(true)
      })
    })
  })
})
