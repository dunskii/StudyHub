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
