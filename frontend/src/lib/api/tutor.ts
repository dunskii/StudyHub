/**
 * API functions for AI tutor interactions.
 */
import { api } from './client'

// =============================================================================
// Types
// =============================================================================

export interface ChatRequest {
  session_id: string
  message: string
  subject_code?: string
  outcome_code?: string
}

export interface ChatResponse {
  response: string
  model_used: string
  input_tokens: number
  output_tokens: number
  estimated_cost_usd: number
  interaction_id: string
  flagged: boolean
}

export interface ChatHistoryMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  flagged: boolean
}

export interface ChatHistoryResponse {
  session_id: string
  messages: ChatHistoryMessage[]
  total_messages: number
}

export interface FlashcardItem {
  front: string
  back: string
}

export interface FlashcardRequest {
  text: string
  subject_code?: string
  num_cards?: number
}

export interface FlashcardResponse {
  flashcards: FlashcardItem[]
  model_used: string
  input_tokens: number
  output_tokens: number
  estimated_cost_usd: number
}

export interface SummariseRequest {
  text: string
  subject_code?: string
  target_length?: 'short' | 'medium' | 'long'
}

export interface SummariseResponse {
  summary: string
  model_used: string
  input_tokens: number
  output_tokens: number
  estimated_cost_usd: number
}

export interface SessionCreateRequest {
  student_id: string
  subject_id?: string
  session_type: string
}

export interface SessionResponse {
  id: string
  student_id: string
  subject_id?: string
  session_type: string
  started_at: string
  ended_at?: string
  duration_minutes?: number
  xp_earned: number
  data: {
    outcomesWorkedOn: string[]
    questionsAttempted: number
    questionsCorrect: number
    flashcardsReviewed: number
  }
  subject_code?: string
  subject_name?: string
}

export interface GamificationResult {
  xpAwarded: number
  multiplier: number
  newTotalXp: number
  oldLevel: number
  newLevel: number
  leveledUp: boolean
  newLevelTitle?: string
  streakUpdated: boolean
  currentStreak: number
  achievementsUnlocked: {
    code: string
    name: string
    description: string
    xpReward: number
    category: string
    icon: string
  }[]
}

export interface SessionCompleteResponse extends SessionResponse {
  gamification?: GamificationResult
}

export interface SessionListResponse {
  sessions: SessionResponse[]
  total: number
  limit: number
  offset: number
}

// =============================================================================
// Tutor API Functions
// =============================================================================

/**
 * Send a chat message to the Socratic tutor.
 */
export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  return api.post('/api/v1/socratic/chat', request)
}

/**
 * Get chat history for a session.
 */
export async function getChatHistory(
  sessionId: string,
  limit = 100,
  offset = 0
): Promise<ChatHistoryResponse> {
  return api.get(`/api/v1/socratic/history/${sessionId}`, {
    params: { limit: String(limit), offset: String(offset) },
  })
}

/**
 * Generate flashcards from text.
 */
export async function generateFlashcards(request: FlashcardRequest): Promise<FlashcardResponse> {
  return api.post('/api/v1/socratic/flashcards', request)
}

/**
 * Summarise text.
 */
export async function summariseText(request: SummariseRequest): Promise<SummariseResponse> {
  return api.post('/api/v1/socratic/summarise', request)
}

// =============================================================================
// Session API Functions
// =============================================================================

/**
 * Create a new tutoring session.
 */
export async function createSession(request: SessionCreateRequest): Promise<SessionResponse> {
  return api.post('/api/v1/sessions', request)
}

/**
 * Get a session by ID.
 */
export async function getSession(sessionId: string): Promise<SessionResponse> {
  return api.get(`/api/v1/sessions/${sessionId}`)
}

/**
 * End a tutoring session.
 */
export async function endSession(sessionId: string, xpEarned = 0): Promise<SessionResponse> {
  return api.post(`/api/v1/sessions/${sessionId}/end`, { xp_earned: xpEarned })
}

/**
 * Complete a session and get gamification results.
 *
 * Returns XP earned, level changes, streak updates, and achievements unlocked.
 */
export async function completeSession(
  sessionId: string,
  xpEarned = 0
): Promise<SessionCompleteResponse> {
  const response = await api.post(`/api/v1/sessions/${sessionId}/complete`, {
    xp_earned: xpEarned,
  })

  // Transform snake_case to camelCase for gamification result
  if (response.gamification) {
    const g = response.gamification
    return {
      ...response,
      gamification: {
        xpAwarded: g.xp_awarded,
        multiplier: g.multiplier,
        newTotalXp: g.new_total_xp,
        oldLevel: g.old_level,
        newLevel: g.new_level,
        leveledUp: g.leveled_up,
        newLevelTitle: g.new_level_title,
        streakUpdated: g.streak_updated,
        currentStreak: g.current_streak,
        achievementsUnlocked: (g.achievements_unlocked || []).map(
          (a: Record<string, unknown>) => ({
            code: a.code,
            name: a.name,
            description: a.description,
            xpReward: a.xp_reward,
            category: a.category,
            icon: a.icon,
          })
        ),
      },
    }
  }

  return response
}

/**
 * Get sessions for a student.
 */
export async function getStudentSessions(
  studentId: string,
  params: {
    subject_id?: string
    session_type?: string
    limit?: number
    offset?: number
  } = {}
): Promise<SessionListResponse> {
  const queryParams: Record<string, string> = {}
  if (params.subject_id) queryParams.subject_id = params.subject_id
  if (params.session_type) queryParams.session_type = params.session_type
  if (params.limit !== undefined) queryParams.limit = String(params.limit)
  if (params.offset !== undefined) queryParams.offset = String(params.offset)

  return api.get(`/api/v1/sessions/student/${studentId}`, { params: queryParams })
}

/**
 * Get the active session for a student.
 */
export async function getActiveSession(
  studentId: string,
  subjectId?: string
): Promise<SessionResponse | null> {
  const params: Record<string, string> = {}
  if (subjectId) params.subject_id = subjectId

  return api.get(`/api/v1/sessions/student/${studentId}/active`, { params })
}

// =============================================================================
// Export as namespace for convenience
// =============================================================================

export const tutorApi = {
  sendChatMessage,
  getChatHistory,
  generateFlashcards,
  summariseText,
  createSession,
  getSession,
  endSession,
  completeSession,
  getStudentSessions,
  getActiveSession,
}
