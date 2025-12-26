/**
 * Curriculum API functions
 */
import type { CurriculumOutcome } from '@/types/curriculum.types'
import { api } from './client'

/** Response from outcome list endpoint */
export interface OutcomeListResponse {
  outcomes: CurriculumOutcome[]
  total: number
  page: number
  page_size: number
  total_pages: number
  has_next: boolean
  has_previous: boolean
}

/** Response from strands endpoint */
export interface StrandListResponse {
  strands: string[]
  framework_id: string
  subject_id: string | null
}

/** Query parameters for fetching outcomes */
export interface OutcomeQueryParams {
  framework_code?: string
  subject_id?: string
  stage?: string
  strand?: string
  pathway?: string
  search?: string
  page?: number
  page_size?: number
}

/**
 * Query curriculum outcomes with filtering.
 *
 * CRITICAL: Framework isolation - outcomes are filtered by framework.
 *
 * @param params - Query parameters
 * @returns Paginated list of outcomes
 */
export async function getOutcomes(
  params: OutcomeQueryParams = {}
): Promise<OutcomeListResponse> {
  const queryParams: Record<string, string> = {}

  if (params.framework_code) {
    queryParams.framework_code = params.framework_code
  }
  if (params.subject_id) {
    queryParams.subject_id = params.subject_id
  }
  if (params.stage) {
    queryParams.stage = params.stage
  }
  if (params.strand) {
    queryParams.strand = params.strand
  }
  if (params.pathway) {
    queryParams.pathway = params.pathway
  }
  if (params.search) {
    queryParams.search = params.search
  }
  if (params.page) {
    queryParams.page = String(params.page)
  }
  if (params.page_size) {
    queryParams.page_size = String(params.page_size)
  }

  return api.get<OutcomeListResponse>('/api/v1/curriculum/outcomes', {
    params: queryParams,
  })
}

/**
 * Get a curriculum outcome by its code.
 *
 * @param code - Outcome code (e.g., 'MA3-RN-01')
 * @param frameworkCode - Framework code (default: 'NSW')
 * @returns The curriculum outcome
 */
export async function getOutcomeByCode(
  code: string,
  frameworkCode: string = 'NSW'
): Promise<CurriculumOutcome> {
  return api.get<CurriculumOutcome>(`/api/v1/curriculum/outcomes/${code}`, {
    params: { framework_code: frameworkCode },
  })
}

/**
 * Get a curriculum outcome by its ID.
 *
 * @param id - Outcome UUID
 * @returns The curriculum outcome
 */
export async function getOutcomeById(id: string): Promise<CurriculumOutcome> {
  return api.get<CurriculumOutcome>(`/api/v1/curriculum/outcomes/id/${id}`)
}

/**
 * Get outcomes for a subject.
 *
 * @param subjectId - Subject UUID
 * @param params - Optional filtering parameters
 * @returns Paginated list of outcomes
 */
export async function getSubjectOutcomes(
  subjectId: string,
  params: Omit<OutcomeQueryParams, 'subject_id'> = {}
): Promise<OutcomeListResponse> {
  const queryParams: Record<string, string> = {}

  if (params.stage) {
    queryParams.stage = params.stage
  }
  if (params.strand) {
    queryParams.strand = params.strand
  }
  if (params.pathway) {
    queryParams.pathway = params.pathway
  }
  if (params.page) {
    queryParams.page = String(params.page)
  }
  if (params.page_size) {
    queryParams.page_size = String(params.page_size)
  }

  return api.get<OutcomeListResponse>(`/api/v1/subjects/${subjectId}/outcomes`, {
    params: queryParams,
  })
}

/**
 * Get distinct strands for a framework/subject.
 *
 * @param frameworkCode - Framework code
 * @param subjectId - Optional subject ID to filter by
 * @returns List of strand names
 */
export async function getStrands(
  frameworkCode: string = 'NSW',
  subjectId?: string
): Promise<StrandListResponse> {
  const queryParams: Record<string, string> = {
    framework_code: frameworkCode,
  }

  if (subjectId) {
    queryParams.subject_id = subjectId
  }

  return api.get<StrandListResponse>('/api/v1/curriculum/strands', {
    params: queryParams,
  })
}

/**
 * Get distinct stages for a framework/subject.
 *
 * @param frameworkCode - Framework code
 * @param subjectId - Optional subject ID to filter by
 * @returns List of stage names
 */
export async function getStages(
  frameworkCode: string = 'NSW',
  subjectId?: string
): Promise<string[]> {
  const queryParams: Record<string, string> = {
    framework_code: frameworkCode,
  }

  if (subjectId) {
    queryParams.subject_id = subjectId
  }

  return api.get<string[]>('/api/v1/curriculum/stages', {
    params: queryParams,
  })
}
