/**
 * Senior Course API functions
 */
import type { SeniorCourse } from '@/types/curriculum.types'
import { api } from './client'

/** Response from senior course list endpoint */
export interface SeniorCourseListResponse {
  courses: SeniorCourse[]
  total: number
  page: number
  page_size: number
  total_pages: number
  has_next: boolean
  has_previous: boolean
}

/** Query parameters for fetching senior courses */
export interface SeniorCourseQueryParams {
  framework_code?: string
  subject_id?: string
  active_only?: boolean
  page?: number
  page_size?: number
}

/**
 * Get all senior courses for a framework.
 *
 * @param params - Query parameters
 * @returns Paginated list of senior courses
 */
export async function getSeniorCourses(
  params: SeniorCourseQueryParams = {}
): Promise<SeniorCourseListResponse> {
  const queryParams: Record<string, string> = {}

  if (params.framework_code) {
    queryParams.framework_code = params.framework_code
  }
  if (params.subject_id) {
    queryParams.subject_id = params.subject_id
  }
  if (params.active_only !== undefined) {
    queryParams.active_only = String(params.active_only)
  }
  if (params.page) {
    queryParams.page = String(params.page)
  }
  if (params.page_size) {
    queryParams.page_size = String(params.page_size)
  }

  return api.get<SeniorCourseListResponse>('/api/v1/senior-courses', {
    params: queryParams,
  })
}

/**
 * Get ATAR-eligible senior courses.
 *
 * @param frameworkCode - Framework code
 * @param subjectId - Optional subject ID to filter by
 * @returns List of ATAR-eligible courses
 */
export async function getAtarCourses(
  frameworkCode: string = 'NSW',
  subjectId?: string
): Promise<SeniorCourseListResponse> {
  const queryParams: Record<string, string> = {
    framework_code: frameworkCode,
  }

  if (subjectId) {
    queryParams.subject_id = subjectId
  }

  return api.get<SeniorCourseListResponse>('/api/v1/senior-courses/atar', {
    params: queryParams,
  })
}

/**
 * Get a senior course by its ID.
 *
 * @param id - Course UUID
 * @returns The senior course
 */
export async function getSeniorCourse(id: string): Promise<SeniorCourse> {
  return api.get<SeniorCourse>(`/api/v1/senior-courses/${id}`)
}

/**
 * Get a senior course by its code.
 *
 * @param code - Course code
 * @param frameworkCode - Framework code (default: 'NSW')
 * @returns The senior course
 */
export async function getSeniorCourseByCode(
  code: string,
  frameworkCode: string = 'NSW'
): Promise<SeniorCourse> {
  return api.get<SeniorCourse>(`/api/v1/senior-courses/code/${code}`, {
    params: { framework_code: frameworkCode },
  })
}

/**
 * Get senior courses for a subject.
 *
 * @param subjectId - Subject UUID
 * @param activeOnly - Only return active courses
 * @returns List of senior courses
 */
export async function getCoursesBySubject(
  subjectId: string,
  activeOnly: boolean = true
): Promise<SeniorCourse[]> {
  const queryParams: Record<string, string> = {
    active_only: String(activeOnly),
  }

  return api.get<SeniorCourse[]>(`/api/v1/senior-courses/subject/${subjectId}`, {
    params: queryParams,
  })
}
