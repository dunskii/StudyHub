/**
 * API client exports
 */

// Base client
export { api, ApiClient, ApiError } from './client'
export type { ApiErrorCode } from './client'

// User API
export { usersApi } from './users'

// Student API
export { studentsApi } from './students'

// Enrolment API
export { enrolmentsApi } from './enrolments'
export type { Enrolment, EnrolmentProgress, SubjectSummary, SeniorCourseSummary } from './enrolments'

// Subject API
export {
  getSubjects,
  getSubject,
  getSubjectByCode,
  getSubjectTutorStyle,
  subjectHasPathways,
  getSubjectPathways,
} from './subjects'
export type { SubjectListResponse, SubjectQueryParams } from './subjects'

// Curriculum API
export {
  getOutcomes,
  getOutcomeByCode,
  getOutcomeById,
  getSubjectOutcomes,
  getStrands,
  getStages,
} from './curriculum'
export type { OutcomeListResponse, OutcomeQueryParams, StrandListResponse } from './curriculum'

// Senior Course API
export {
  getSeniorCourses,
  getAtarCourses,
  getSeniorCourse,
  getSeniorCourseByCode,
  getCoursesBySubject,
} from './senior-courses'
export type { SeniorCourseListResponse, SeniorCourseQueryParams } from './senior-courses'

// Tutor API
export {
  tutorApi,
  sendChatMessage,
  getChatHistory,
  generateFlashcards,
  summariseText,
  createSession,
  getSession,
  endSession,
  getStudentSessions,
  getActiveSession,
} from './tutor'
export type {
  ChatRequest,
  ChatResponse,
  ChatHistoryMessage,
  ChatHistoryResponse,
  FlashcardItem,
  FlashcardRequest,
  FlashcardResponse,
  SummariseRequest,
  SummariseResponse,
  SessionCreateRequest,
  SessionResponse,
  SessionListResponse,
} from './tutor'

// Notes API
export { notesApi } from './notes'
export type {
  UploadUrlRequest,
  UploadUrlResponse,
  NoteCreateRequest,
  NoteUpdateRequest,
  NoteResponse,
  NoteListResponse,
  OCRStatusResponse,
  CurriculumSuggestion,
  CurriculumAlignmentResponse,
  NoteListParams,
} from './notes'
