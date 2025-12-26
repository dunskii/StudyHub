/**
 * React Query hooks for senior courses
 */
import { useQuery } from '@tanstack/react-query'
import {
  getSeniorCourses,
  getAtarCourses,
  getSeniorCourse,
  getSeniorCourseByCode,
  getCoursesBySubject,
  type SeniorCourseQueryParams,
  type SeniorCourseListResponse,
} from '@/lib/api'
import type { SeniorCourse } from '@/types/curriculum.types'

/** Query keys for senior course queries */
export const seniorCourseKeys = {
  all: ['senior-courses'] as const,
  lists: () => [...seniorCourseKeys.all, 'list'] as const,
  list: (params: SeniorCourseQueryParams) => [...seniorCourseKeys.lists(), params] as const,
  atar: (frameworkCode: string, subjectId?: string) =>
    [...seniorCourseKeys.all, 'atar', frameworkCode, subjectId] as const,
  details: () => [...seniorCourseKeys.all, 'detail'] as const,
  detail: (id: string) => [...seniorCourseKeys.details(), id] as const,
  byCode: (code: string, frameworkCode: string) =>
    [...seniorCourseKeys.all, 'code', code, frameworkCode] as const,
  bySubject: (subjectId: string, activeOnly: boolean) =>
    [...seniorCourseKeys.all, 'subject', subjectId, activeOnly] as const,
}

/**
 * Hook to fetch all senior courses for a framework.
 *
 * @param params - Query parameters
 * @returns Query result with senior courses
 */
export function useSeniorCourses(params: SeniorCourseQueryParams = {}) {
  return useQuery<SeniorCourseListResponse>({
    queryKey: seniorCourseKeys.list(params),
    queryFn: () => getSeniorCourses(params),
  })
}

/**
 * Hook to fetch ATAR-eligible senior courses.
 *
 * @param frameworkCode - Framework code
 * @param subjectId - Optional subject ID to filter by
 * @returns Query result with ATAR courses
 */
export function useAtarCourses(frameworkCode: string = 'NSW', subjectId?: string) {
  return useQuery<SeniorCourseListResponse>({
    queryKey: seniorCourseKeys.atar(frameworkCode, subjectId),
    queryFn: () => getAtarCourses(frameworkCode, subjectId),
  })
}

/**
 * Hook to fetch a senior course by ID.
 *
 * @param id - Course UUID
 * @returns Query result with senior course
 */
export function useSeniorCourse(id: string) {
  return useQuery<SeniorCourse>({
    queryKey: seniorCourseKeys.detail(id),
    queryFn: () => getSeniorCourse(id),
    enabled: Boolean(id),
  })
}

/**
 * Hook to fetch a senior course by code.
 *
 * @param code - Course code
 * @param frameworkCode - Framework code (default: 'NSW')
 * @returns Query result with senior course
 */
export function useSeniorCourseByCode(code: string, frameworkCode: string = 'NSW') {
  return useQuery<SeniorCourse>({
    queryKey: seniorCourseKeys.byCode(code, frameworkCode),
    queryFn: () => getSeniorCourseByCode(code, frameworkCode),
    enabled: Boolean(code),
  })
}

/**
 * Hook to fetch senior courses for a subject.
 *
 * @param subjectId - Subject UUID
 * @param activeOnly - Only return active courses
 * @returns Query result with senior courses
 */
export function useCoursesBySubject(subjectId: string, activeOnly: boolean = true) {
  return useQuery<SeniorCourse[]>({
    queryKey: seniorCourseKeys.bySubject(subjectId, activeOnly),
    queryFn: () => getCoursesBySubject(subjectId, activeOnly),
    enabled: Boolean(subjectId),
  })
}

/**
 * Hook to get senior courses as a simple array.
 * Useful when you just need the course list without pagination info.
 *
 * @param frameworkCode - Framework code (default: 'NSW')
 * @returns Query result with courses array
 */
export function useSeniorCourseList(frameworkCode: string = 'NSW') {
  const query = useSeniorCourses({ framework_code: frameworkCode, page_size: 100 })

  return {
    ...query,
    data: query.data?.courses ?? [],
  }
}
