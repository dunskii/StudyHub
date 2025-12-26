/**
 * Subject API functions
 */
import type { Subject, SubjectConfig } from '@/types/subject.types'
import { api } from './client'

/** Response from subject list endpoint */
export interface SubjectListResponse {
  subjects: Subject[]
  total: number
  page: number
  page_size: number
  total_pages: number
  has_next: boolean
  has_previous: boolean
}

/** Query parameters for fetching subjects */
export interface SubjectQueryParams {
  framework_code?: string
  active_only?: boolean
  page?: number
  page_size?: number
}

/**
 * Get all subjects for a framework.
 *
 * @param params - Query parameters
 * @returns Paginated list of subjects
 */
export async function getSubjects(
  params: SubjectQueryParams = {}
): Promise<SubjectListResponse> {
  const queryParams: Record<string, string> = {}

  if (params.framework_code) {
    queryParams.framework_code = params.framework_code
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

  return api.get<SubjectListResponse>('/api/v1/subjects', { params: queryParams })
}

/**
 * Get a subject by its ID.
 *
 * @param id - Subject UUID
 * @returns The subject
 */
export async function getSubject(id: string): Promise<Subject> {
  return api.get<Subject>(`/api/v1/subjects/${id}`)
}

/**
 * Get a subject by its code.
 *
 * @param code - Subject code (e.g., 'MATH')
 * @param frameworkCode - Framework code (default: 'NSW')
 * @returns The subject
 */
export async function getSubjectByCode(
  code: string,
  frameworkCode: string = 'NSW'
): Promise<Subject> {
  return api.get<Subject>(`/api/v1/subjects/code/${code}`, {
    params: { framework_code: frameworkCode },
  })
}

/**
 * Get the tutor style for a subject.
 *
 * @param subject - The subject
 * @returns The tutor style string
 */
export function getSubjectTutorStyle(subject: Subject): string {
  return (subject.config as SubjectConfig)?.tutorStyle || 'socratic'
}

/**
 * Check if a subject has pathways (e.g., Stage 5 Math).
 *
 * @param subject - The subject
 * @returns Whether the subject has pathways
 */
export function subjectHasPathways(subject: Subject): boolean {
  return (subject.config as SubjectConfig)?.hasPathways || false
}

/**
 * Get pathways for a subject.
 *
 * @param subject - The subject
 * @returns List of pathway codes
 */
export function getSubjectPathways(subject: Subject): string[] {
  return (subject.config as SubjectConfig)?.pathways || []
}
