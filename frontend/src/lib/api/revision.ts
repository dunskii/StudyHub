/**
 * API client functions for revision and flashcard operations.
 */
import { api } from './client'

// =============================================================================
// Types
// =============================================================================

export interface Flashcard {
  id: string
  student_id: string
  subject_id: string | null
  curriculum_outcome_id: string | null
  context_note_id: string | null
  front: string
  back: string
  generated_by: string | null
  generation_model: string | null
  review_count: number
  correct_count: number
  mastery_percent: number
  sr_interval: number
  sr_ease_factor: number
  sr_next_review: string | null
  sr_repetition: number
  difficulty_level: number | null
  tags: string[] | null
  is_due: boolean
  success_rate: number
  created_at: string
  updated_at: string
}

export interface FlashcardCreate {
  front: string
  back: string
  subject_id?: string
  curriculum_outcome_id?: string
  context_note_id?: string
  difficulty_level?: number
  tags?: string[]
}

export interface FlashcardUpdate {
  front?: string
  back?: string
  difficulty_level?: number
  tags?: string[]
}

export interface FlashcardListParams {
  student_id: string
  subject_id?: string
  outcome_id?: string
  due_only?: boolean
  search?: string
  offset?: number
  limit?: number
}

export interface FlashcardListResponse {
  flashcards: Flashcard[]
  total: number
  offset: number
  limit: number
}

export interface FlashcardDraft {
  front: string
  back: string
  difficulty_level: number
  tags: string[]
}

export interface FlashcardGenerateRequest {
  note_id?: string
  outcome_id?: string
  count?: number
}

export interface FlashcardGenerateResponse {
  drafts: FlashcardDraft[]
  source_type: 'note' | 'outcome'
  source_id: string
}

export interface RevisionAnswerRequest {
  flashcard_id: string
  was_correct: boolean
  difficulty_rating: number
  response_time_seconds?: number
  session_id?: string
}

export interface RevisionAnswerResponse {
  flashcard_id: string
  was_correct: boolean
  quality_rating: number
  new_interval: number
  new_ease_factor: number
  next_review: string
  mastery_percent: number
}

export interface RevisionProgress {
  total_flashcards: number
  cards_due: number
  cards_mastered: number
  overall_mastery_percent: number
  review_streak: number
  last_review_date: string | null
  total_reviews: number
}

export interface SubjectProgress {
  subject_id: string
  subject_name: string
  subject_code: string
  total_cards: number
  cards_due: number
  mastery_percent: number
}

export interface RevisionHistory {
  id: string
  flashcard_id: string
  session_id: string | null
  was_correct: boolean
  quality_rating: number
  response_time_seconds: number | null
  sr_interval_before: number
  sr_interval_after: number
  sr_ease_before: number
  sr_ease_after: number
  created_at: string
}

// =============================================================================
// API Functions
// =============================================================================

export const revisionApi = {
  // Flashcard CRUD
  async createFlashcard(
    studentId: string,
    data: FlashcardCreate
  ): Promise<Flashcard> {
    return api.post<Flashcard>(
      `/revision/flashcards?student_id=${studentId}`,
      data
    )
  },

  async createFlashcardsBulk(
    studentId: string,
    flashcards: FlashcardCreate[]
  ): Promise<Flashcard[]> {
    return api.post<Flashcard[]>(
      `/revision/flashcards/bulk?student_id=${studentId}`,
      { flashcards }
    )
  },

  async getFlashcards(params: FlashcardListParams): Promise<FlashcardListResponse> {
    const searchParams = new URLSearchParams()
    searchParams.set('student_id', params.student_id)
    if (params.subject_id) searchParams.set('subject_id', params.subject_id)
    if (params.outcome_id) searchParams.set('outcome_id', params.outcome_id)
    if (params.due_only) searchParams.set('due_only', 'true')
    if (params.search) searchParams.set('search', params.search)
    if (params.offset !== undefined) searchParams.set('offset', String(params.offset))
    if (params.limit !== undefined) searchParams.set('limit', String(params.limit))

    return api.get<FlashcardListResponse>(
      `/revision/flashcards?${searchParams.toString()}`
    )
  },

  async getFlashcard(flashcardId: string, studentId: string): Promise<Flashcard> {
    return api.get<Flashcard>(
      `/revision/flashcards/${flashcardId}?student_id=${studentId}`
    )
  },

  async updateFlashcard(
    flashcardId: string,
    studentId: string,
    data: FlashcardUpdate
  ): Promise<Flashcard> {
    return api.put<Flashcard>(
      `/revision/flashcards/${flashcardId}?student_id=${studentId}`,
      data
    )
  },

  async deleteFlashcard(flashcardId: string, studentId: string): Promise<void> {
    return api.delete(`/revision/flashcards/${flashcardId}?student_id=${studentId}`)
  },

  // AI Generation
  async generateFlashcards(
    studentId: string,
    request: FlashcardGenerateRequest
  ): Promise<FlashcardGenerateResponse> {
    return api.post<FlashcardGenerateResponse>(
      `/revision/flashcards/generate?student_id=${studentId}`,
      request
    )
  },

  // Review Operations
  async getDueFlashcards(
    studentId: string,
    subjectId?: string,
    limit?: number
  ): Promise<Flashcard[]> {
    const searchParams = new URLSearchParams()
    searchParams.set('student_id', studentId)
    if (subjectId) searchParams.set('subject_id', subjectId)
    if (limit) searchParams.set('limit', String(limit))

    return api.get<Flashcard[]>(`/revision/due?${searchParams.toString()}`)
  },

  async submitAnswer(
    studentId: string,
    answer: RevisionAnswerRequest
  ): Promise<RevisionAnswerResponse> {
    return api.post<RevisionAnswerResponse>(
      `/revision/answer?student_id=${studentId}`,
      answer
    )
  },

  // Progress
  async getProgress(studentId: string): Promise<RevisionProgress> {
    return api.get<RevisionProgress>(
      `/revision/progress?student_id=${studentId}`
    )
  },

  async getProgressBySubject(studentId: string): Promise<SubjectProgress[]> {
    return api.get<SubjectProgress[]>(
      `/revision/progress/by-subject?student_id=${studentId}`
    )
  },

  async getHistory(
    studentId: string,
    flashcardId?: string,
    limit?: number
  ): Promise<RevisionHistory[]> {
    const searchParams = new URLSearchParams()
    searchParams.set('student_id', studentId)
    if (flashcardId) searchParams.set('flashcard_id', flashcardId)
    if (limit) searchParams.set('limit', String(limit))

    return api.get<RevisionHistory[]>(`/revision/history?${searchParams.toString()}`)
  },
}
