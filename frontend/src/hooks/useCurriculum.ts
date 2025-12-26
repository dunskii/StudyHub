/**
 * React Query hooks for curriculum outcomes
 */
import { useQuery } from '@tanstack/react-query'
import {
  getOutcomes,
  getOutcomeByCode,
  getOutcomeById,
  getSubjectOutcomes,
  getStrands,
  getStages,
  type OutcomeQueryParams,
  type OutcomeListResponse,
  type StrandListResponse,
} from '@/lib/api'
import type { CurriculumOutcome } from '@/types/curriculum.types'

/** Query keys for curriculum queries */
export const curriculumKeys = {
  all: ['curriculum'] as const,
  outcomes: () => [...curriculumKeys.all, 'outcomes'] as const,
  outcomeList: (params: OutcomeQueryParams) =>
    [...curriculumKeys.outcomes(), 'list', params] as const,
  outcomeDetail: (id: string) => [...curriculumKeys.outcomes(), 'detail', id] as const,
  outcomeByCode: (code: string, frameworkCode: string) =>
    [...curriculumKeys.outcomes(), 'code', code, frameworkCode] as const,
  subjectOutcomes: (subjectId: string, params?: Omit<OutcomeQueryParams, 'subject_id'>) =>
    [...curriculumKeys.outcomes(), 'subject', subjectId, params] as const,
  strands: (frameworkCode: string, subjectId?: string) =>
    [...curriculumKeys.all, 'strands', frameworkCode, subjectId] as const,
  stages: (frameworkCode: string, subjectId?: string) =>
    [...curriculumKeys.all, 'stages', frameworkCode, subjectId] as const,
}

/**
 * Hook to query curriculum outcomes with filtering.
 *
 * CRITICAL: Framework isolation - outcomes are filtered by framework.
 *
 * @param params - Query parameters
 * @returns Query result with outcomes
 */
export function useOutcomes(params: OutcomeQueryParams = {}) {
  return useQuery<OutcomeListResponse>({
    queryKey: curriculumKeys.outcomeList(params),
    queryFn: () => getOutcomes(params),
  })
}

/**
 * Hook to fetch a curriculum outcome by code.
 *
 * @param code - Outcome code (e.g., 'MA3-RN-01')
 * @param frameworkCode - Framework code (default: 'NSW')
 * @returns Query result with outcome
 */
export function useOutcomeByCode(code: string, frameworkCode: string = 'NSW') {
  return useQuery<CurriculumOutcome>({
    queryKey: curriculumKeys.outcomeByCode(code, frameworkCode),
    queryFn: () => getOutcomeByCode(code, frameworkCode),
    enabled: Boolean(code),
  })
}

/**
 * Hook to fetch a curriculum outcome by ID.
 *
 * @param id - Outcome UUID
 * @returns Query result with outcome
 */
export function useOutcome(id: string) {
  return useQuery<CurriculumOutcome>({
    queryKey: curriculumKeys.outcomeDetail(id),
    queryFn: () => getOutcomeById(id),
    enabled: Boolean(id),
  })
}

/**
 * Hook to fetch outcomes for a subject.
 *
 * @param subjectId - Subject UUID
 * @param params - Optional filtering parameters
 * @returns Query result with outcomes
 */
export function useSubjectOutcomes(
  subjectId: string,
  params: Omit<OutcomeQueryParams, 'subject_id'> = {}
) {
  return useQuery<OutcomeListResponse>({
    queryKey: curriculumKeys.subjectOutcomes(subjectId, params),
    queryFn: () => getSubjectOutcomes(subjectId, params),
    enabled: Boolean(subjectId),
  })
}

/**
 * Hook to fetch distinct strands.
 *
 * @param frameworkCode - Framework code
 * @param subjectId - Optional subject ID to filter by
 * @returns Query result with strands
 */
export function useStrands(frameworkCode: string = 'NSW', subjectId?: string) {
  return useQuery<StrandListResponse>({
    queryKey: curriculumKeys.strands(frameworkCode, subjectId),
    queryFn: () => getStrands(frameworkCode, subjectId),
  })
}

/**
 * Hook to fetch distinct stages.
 *
 * @param frameworkCode - Framework code
 * @param subjectId - Optional subject ID to filter by
 * @returns Query result with stages
 */
export function useStages(frameworkCode: string = 'NSW', subjectId?: string) {
  return useQuery<string[]>({
    queryKey: curriculumKeys.stages(frameworkCode, subjectId),
    queryFn: () => getStages(frameworkCode, subjectId),
  })
}

/**
 * Hook to get outcomes as a simple array.
 * Useful when you just need the outcomes without pagination info.
 *
 * @param params - Query parameters
 * @returns Query result with outcomes array
 */
export function useOutcomeList(params: OutcomeQueryParams = {}) {
  const query = useOutcomes({ ...params, page_size: 100 })

  return {
    ...query,
    data: query.data?.outcomes ?? [],
  }
}
