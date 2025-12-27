/**
 * React Query hooks for revision and flashcard management.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import {
  revisionApi,
  type Flashcard,
  type FlashcardCreate,
  type FlashcardGenerateRequest,
  type FlashcardListParams,
  type FlashcardListResponse,
  type FlashcardUpdate,
  type RevisionAnswerRequest,
  type RevisionProgress,
  type SubjectProgress,
} from '@/lib/api/revision'
import {
  useRevisionStore,
  selectCurrentCard,
  selectSessionProgress,
  selectSessionDuration,
  selectIsLastCard,
  selectHasAnsweredCurrentCard,
} from '@/stores/revisionStore'

// =============================================================================
// Query Keys
// =============================================================================

export const revisionKeys = {
  all: ['revision'] as const,
  flashcards: () => [...revisionKeys.all, 'flashcards'] as const,
  flashcardList: (params: FlashcardListParams) =>
    [...revisionKeys.flashcards(), 'list', params] as const,
  flashcard: (id: string) => [...revisionKeys.flashcards(), 'detail', id] as const,
  due: (studentId: string, subjectId?: string) =>
    [...revisionKeys.all, 'due', studentId, subjectId] as const,
  progress: (studentId: string) => [...revisionKeys.all, 'progress', studentId] as const,
  progressBySubject: (studentId: string) =>
    [...revisionKeys.all, 'progress-by-subject', studentId] as const,
  history: (studentId: string, flashcardId?: string) =>
    [...revisionKeys.all, 'history', studentId, flashcardId] as const,
}

// =============================================================================
// Flashcard Query Hooks
// =============================================================================

/**
 * Hook to get a paginated list of flashcards.
 */
export function useFlashcards(params: FlashcardListParams) {
  return useQuery<FlashcardListResponse>({
    queryKey: revisionKeys.flashcardList(params),
    queryFn: () => revisionApi.getFlashcards(params),
    enabled: Boolean(params.student_id),
  })
}

/**
 * Hook to get a single flashcard by ID.
 */
export function useFlashcard(flashcardId: string | null, studentId: string | null) {
  return useQuery<Flashcard>({
    queryKey: revisionKeys.flashcard(flashcardId ?? ''),
    queryFn: () => revisionApi.getFlashcard(flashcardId!, studentId!),
    enabled: Boolean(flashcardId && studentId),
  })
}

/**
 * Hook to get flashcards due for review.
 */
export function useDueFlashcards(
  studentId: string | null,
  subjectId?: string,
  limit?: number
) {
  return useQuery<Flashcard[]>({
    queryKey: revisionKeys.due(studentId ?? '', subjectId),
    queryFn: () => revisionApi.getDueFlashcards(studentId!, subjectId, limit),
    enabled: Boolean(studentId),
  })
}

/**
 * Hook to get overall revision progress.
 */
export function useRevisionProgress(studentId: string | null) {
  return useQuery<RevisionProgress>({
    queryKey: revisionKeys.progress(studentId ?? ''),
    queryFn: () => revisionApi.getProgress(studentId!),
    enabled: Boolean(studentId),
  })
}

/**
 * Hook to get per-subject revision progress.
 */
export function useProgressBySubject(studentId: string | null) {
  return useQuery<SubjectProgress[]>({
    queryKey: revisionKeys.progressBySubject(studentId ?? ''),
    queryFn: () => revisionApi.getProgressBySubject(studentId!),
    enabled: Boolean(studentId),
  })
}

// =============================================================================
// Flashcard Mutation Hooks
// =============================================================================

/**
 * Hook to create a new flashcard.
 */
export function useCreateFlashcard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      studentId,
      data,
    }: {
      studentId: string
      data: FlashcardCreate
    }) => revisionApi.createFlashcard(studentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: revisionKeys.flashcards() })
      queryClient.invalidateQueries({ queryKey: revisionKeys.all })
    },
  })
}

/**
 * Hook to create multiple flashcards at once.
 */
export function useCreateFlashcardsBulk() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      studentId,
      flashcards,
    }: {
      studentId: string
      flashcards: FlashcardCreate[]
    }) => revisionApi.createFlashcardsBulk(studentId, flashcards),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: revisionKeys.flashcards() })
      queryClient.invalidateQueries({ queryKey: revisionKeys.all })
    },
  })
}

/**
 * Hook to update a flashcard.
 */
export function useUpdateFlashcard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      flashcardId,
      studentId,
      data,
    }: {
      flashcardId: string
      studentId: string
      data: FlashcardUpdate
    }) => revisionApi.updateFlashcard(flashcardId, studentId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: revisionKeys.flashcard(variables.flashcardId),
      })
      queryClient.invalidateQueries({ queryKey: revisionKeys.flashcards() })
    },
  })
}

/**
 * Hook to delete a flashcard.
 */
export function useDeleteFlashcard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      flashcardId,
      studentId,
    }: {
      flashcardId: string
      studentId: string
    }) => revisionApi.deleteFlashcard(flashcardId, studentId),
    onSuccess: (_, variables) => {
      queryClient.removeQueries({
        queryKey: revisionKeys.flashcard(variables.flashcardId),
      })
      queryClient.invalidateQueries({ queryKey: revisionKeys.flashcards() })
      queryClient.invalidateQueries({ queryKey: revisionKeys.all })
    },
  })
}

/**
 * Hook to generate flashcards using AI.
 */
export function useGenerateFlashcards() {
  return useMutation({
    mutationFn: ({
      studentId,
      request,
    }: {
      studentId: string
      request: FlashcardGenerateRequest
    }) => revisionApi.generateFlashcards(studentId, request),
  })
}

/**
 * Hook to submit a flashcard answer.
 */
export function useSubmitAnswer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      studentId,
      answer,
    }: {
      studentId: string
      answer: RevisionAnswerRequest
    }) => revisionApi.submitAnswer(studentId, answer),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: revisionKeys.flashcard(variables.answer.flashcard_id),
      })
      queryClient.invalidateQueries({ queryKey: revisionKeys.all })
    },
  })
}

// =============================================================================
// Combined Hook for Revision Management
// =============================================================================

/**
 * Combined hook for revision management with store integration.
 */
export function useRevisionManager(studentId: string | null) {
  const store = useRevisionStore()
  const queryClient = useQueryClient()

  // Queries
  const progressQuery = useRevisionProgress(studentId)
  const subjectProgressQuery = useProgressBySubject(studentId)
  const dueCardsQuery = useDueFlashcards(
    studentId,
    store.selectedSubjectId ?? undefined
  )
  const flashcardsQuery = useFlashcards({
    student_id: studentId ?? '',
    subject_id: store.selectedSubjectId ?? undefined,
    search: store.searchQuery || undefined,
    limit: 50,
    offset: 0,
  })

  // Mutations
  const createFlashcard = useCreateFlashcard()
  const createFlashcardsBulk = useCreateFlashcardsBulk()
  const updateFlashcard = useUpdateFlashcard()
  const deleteFlashcard = useDeleteFlashcard()
  const generateFlashcards = useGenerateFlashcards()
  const submitAnswer = useSubmitAnswer()

  // Session management
  const startRevisionSession = useCallback(
    (cards?: Flashcard[]) => {
      const sessionCards = cards ?? dueCardsQuery.data ?? []
      if (sessionCards.length > 0) {
        store.startSession(sessionCards)
      }
    },
    [dueCardsQuery.data, store]
  )

  const endRevisionSession = useCallback(() => {
    store.endSession()
    // Refresh data after session
    queryClient.invalidateQueries({ queryKey: revisionKeys.all })
  }, [store, queryClient])

  // Answer submission with store update
  const handleAnswer = useCallback(
    async (wasCorrect: boolean, difficultyRating: number) => {
      if (!studentId) return

      const currentCard = selectCurrentCard(store)
      if (!currentCard) return

      const startTime = store.startTime ?? Date.now()
      const responseTime = Math.floor((Date.now() - startTime) / 1000)

      // Record locally
      store.recordAnswer({
        flashcardId: currentCard.id,
        wasCorrect,
        difficultyRating,
        responseTimeSeconds: responseTime,
      })

      // Submit to server
      await submitAnswer.mutateAsync({
        studentId,
        answer: {
          flashcard_id: currentCard.id,
          was_correct: wasCorrect,
          difficulty_rating: difficultyRating,
          response_time_seconds: responseTime,
          session_id: store.sessionId ?? undefined,
        },
      })

      // Move to next card if not the last one
      if (!selectIsLastCard(store)) {
        store.nextCard()
      }
    },
    [studentId, store, submitAnswer]
  )

  // Create flashcard helper
  const create = useCallback(
    async (data: FlashcardCreate) => {
      if (!studentId) throw new Error('No student selected')
      return createFlashcard.mutateAsync({ studentId, data })
    },
    [studentId, createFlashcard]
  )

  // Update flashcard helper
  const update = useCallback(
    async (flashcardId: string, data: FlashcardUpdate) => {
      if (!studentId) throw new Error('No student selected')
      return updateFlashcard.mutateAsync({ flashcardId, studentId, data })
    },
    [studentId, updateFlashcard]
  )

  // Delete flashcard helper
  const remove = useCallback(
    async (flashcardId: string) => {
      if (!studentId) throw new Error('No student selected')
      return deleteFlashcard.mutateAsync({ flashcardId, studentId })
    },
    [studentId, deleteFlashcard]
  )

  // Generate flashcards helper
  const generate = useCallback(
    async (request: FlashcardGenerateRequest) => {
      if (!studentId) throw new Error('No student selected')
      return generateFlashcards.mutateAsync({ studentId, request })
    },
    [studentId, generateFlashcards]
  )

  // Approve generated flashcards
  const approveGenerated = useCallback(
    async (flashcards: FlashcardCreate[]) => {
      if (!studentId) throw new Error('No student selected')
      return createFlashcardsBulk.mutateAsync({ studentId, flashcards })
    },
    [studentId, createFlashcardsBulk]
  )

  return {
    // Progress data
    progress: progressQuery.data,
    subjectProgress: subjectProgressQuery.data ?? [],
    isLoadingProgress: progressQuery.isLoading,

    // Due cards
    dueCards: dueCardsQuery.data ?? [],
    dueCardsCount: dueCardsQuery.data?.length ?? 0,
    isLoadingDue: dueCardsQuery.isLoading,

    // All flashcards
    flashcards: flashcardsQuery.data?.flashcards ?? [],
    totalFlashcards: flashcardsQuery.data?.total ?? 0,
    isLoadingFlashcards: flashcardsQuery.isLoading,

    // Session state
    isInSession: store.isInSession,
    currentCard: selectCurrentCard(store),
    showAnswer: store.showAnswer,
    sessionProgress: selectSessionProgress(store),
    sessionDuration: selectSessionDuration(store),
    isLastCard: selectIsLastCard(store),
    hasAnsweredCurrentCard: selectHasAnsweredCurrentCard(store),

    // Filter state
    selectedSubjectId: store.selectedSubjectId,
    searchQuery: store.searchQuery,

    // Session actions
    startSession: startRevisionSession,
    endSession: endRevisionSession,
    flipCard: store.flipCard,
    nextCard: store.nextCard,
    previousCard: store.previousCard,
    handleAnswer,

    // CRUD actions
    create,
    update,
    remove,
    generate,
    approveGenerated,

    // Filter actions
    setSubjectFilter: store.setSelectedSubjectId,
    setSearchQuery: store.setSearchQuery,
    clearFilters: store.clearFilters,

    // Loading states
    isCreating: createFlashcard.isPending,
    isUpdating: updateFlashcard.isPending,
    isDeleting: deleteFlashcard.isPending,
    isGenerating: generateFlashcards.isPending,
    isSubmittingAnswer: submitAnswer.isPending,

    // Refetch
    refetchProgress: progressQuery.refetch,
    refetchDue: dueCardsQuery.refetch,
    refetchFlashcards: flashcardsQuery.refetch,
  }
}
