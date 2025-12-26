/**
 * React Query hooks for subjects
 */
import { useQuery } from '@tanstack/react-query'
import {
  getSubjects,
  getSubject,
  getSubjectByCode,
  type SubjectQueryParams,
  type SubjectListResponse,
} from '@/lib/api'
import type { Subject } from '@/types/subject.types'

/** Query keys for subject queries */
export const subjectKeys = {
  all: ['subjects'] as const,
  lists: () => [...subjectKeys.all, 'list'] as const,
  list: (params: SubjectQueryParams) => [...subjectKeys.lists(), params] as const,
  details: () => [...subjectKeys.all, 'detail'] as const,
  detail: (id: string) => [...subjectKeys.details(), id] as const,
  byCode: (code: string, frameworkCode: string) =>
    [...subjectKeys.all, 'code', code, frameworkCode] as const,
}

/**
 * Hook to fetch all subjects for a framework.
 *
 * @param params - Query parameters
 * @returns Query result with subjects
 */
export function useSubjects(params: SubjectQueryParams = {}) {
  return useQuery<SubjectListResponse>({
    queryKey: subjectKeys.list(params),
    queryFn: () => getSubjects(params),
  })
}

/**
 * Hook to fetch a subject by ID.
 *
 * @param id - Subject UUID
 * @returns Query result with subject
 */
export function useSubject(id: string) {
  return useQuery<Subject>({
    queryKey: subjectKeys.detail(id),
    queryFn: () => getSubject(id),
    enabled: Boolean(id),
  })
}

/**
 * Hook to fetch a subject by code.
 *
 * @param code - Subject code (e.g., 'MATH')
 * @param frameworkCode - Framework code (default: 'NSW')
 * @returns Query result with subject
 */
export function useSubjectByCode(code: string, frameworkCode: string = 'NSW') {
  return useQuery<Subject>({
    queryKey: subjectKeys.byCode(code, frameworkCode),
    queryFn: () => getSubjectByCode(code, frameworkCode),
    enabled: Boolean(code),
  })
}

/**
 * Hook to get all subjects as a simple array.
 * Useful when you just need the subject list without pagination info.
 *
 * @param frameworkCode - Framework code (default: 'NSW')
 * @returns Query result with subjects array
 */
export function useSubjectList(frameworkCode: string = 'NSW') {
  const query = useSubjects({ framework_code: frameworkCode, page_size: 100 })

  return {
    ...query,
    data: query.data?.subjects ?? [],
  }
}
