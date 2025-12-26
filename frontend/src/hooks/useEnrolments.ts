/**
 * React Query hooks for enrolment operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { enrolmentsApi, type Enrolment } from '@/lib/api';

/** Query keys for enrolment data */
export const enrolmentKeys = {
  all: ['enrolments'] as const,
  lists: () => [...enrolmentKeys.all, 'list'] as const,
  list: (studentId: string) => [...enrolmentKeys.lists(), studentId] as const,
  details: () => [...enrolmentKeys.all, 'detail'] as const,
  detail: (studentId: string, subjectId: string) =>
    [...enrolmentKeys.details(), studentId, subjectId] as const,
};

/**
 * Fetch all enrolments for a student.
 */
export function useEnrolments(studentId: string | undefined) {
  return useQuery({
    queryKey: enrolmentKeys.list(studentId ?? ''),
    queryFn: () => enrolmentsApi.getForStudent(studentId!),
    enabled: !!studentId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

interface EnrolData {
  studentId: string;
  subjectId: string;
  pathway?: string;
  seniorCourseId?: string;
}

/**
 * Enrol a student in a subject.
 */
export function useEnrol() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ studentId, subjectId, ...options }: EnrolData) =>
      enrolmentsApi.enrol(studentId, subjectId, options),
    onSuccess: (newEnrolment, { studentId }) => {
      // Add to list cache
      queryClient.setQueryData<Enrolment[]>(enrolmentKeys.list(studentId), (old) =>
        old ? [...old, newEnrolment] : [newEnrolment]
      );
    },
  });
}

interface BulkEnrolData {
  studentId: string;
  enrolments: Array<{
    subjectId: string;
    pathway?: string;
    seniorCourseId?: string;
  }>;
}

/**
 * Bulk enrol a student in multiple subjects.
 */
export function useBulkEnrol() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ studentId, enrolments }: BulkEnrolData) =>
      enrolmentsApi.bulkEnrol(studentId, enrolments),
    onSuccess: (result, { studentId }) => {
      // Add successful enrolments to cache
      if (result.successful.length > 0) {
        queryClient.setQueryData<Enrolment[]>(enrolmentKeys.list(studentId), (old) =>
          old ? [...old, ...result.successful] : result.successful
        );
      }
    },
  });
}

/**
 * Unenrol a student from a subject.
 */
export function useUnenrol() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ studentId, subjectId }: { studentId: string; subjectId: string }) =>
      enrolmentsApi.unenrol(studentId, subjectId),
    onSuccess: (_, { studentId, subjectId }) => {
      // Remove from list cache
      queryClient.setQueryData<Enrolment[]>(enrolmentKeys.list(studentId), (old) =>
        old?.filter((e) => e.subjectId !== subjectId)
      );
    },
  });
}

interface UpdateEnrolmentData {
  studentId: string;
  subjectId: string;
  pathway?: string;
  seniorCourseId?: string;
}

/**
 * Update an enrolment (pathway or senior course).
 */
export function useUpdateEnrolment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ studentId, subjectId, ...data }: UpdateEnrolmentData) =>
      enrolmentsApi.updateEnrolment(studentId, subjectId, data),
    onSuccess: (updatedEnrolment, { studentId }) => {
      // Update list cache
      queryClient.setQueryData<Enrolment[]>(enrolmentKeys.list(studentId), (old) =>
        old?.map((e) => (e.subjectId === updatedEnrolment.subjectId ? updatedEnrolment : e))
      );
    },
  });
}

interface UpdateProgressData {
  studentId: string;
  subjectId: string;
  outcomesCompleted?: string[];
  outcomesInProgress?: string[];
  overallPercentage?: number;
  xpEarned?: number;
}

/**
 * Update enrolment progress.
 */
export function useUpdateProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ studentId, subjectId, ...progress }: UpdateProgressData) =>
      enrolmentsApi.updateProgress(studentId, subjectId, progress),
    onSuccess: (updatedEnrolment, { studentId }) => {
      // Update list cache
      queryClient.setQueryData<Enrolment[]>(enrolmentKeys.list(studentId), (old) =>
        old?.map((e) => (e.subjectId === updatedEnrolment.subjectId ? updatedEnrolment : e))
      );
    },
  });
}

interface CompleteOutcomeData {
  studentId: string;
  subjectId: string;
  outcomeCode: string;
  xpAward?: number;
}

/**
 * Mark an outcome as completed.
 */
export function useCompleteOutcome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ studentId, subjectId, outcomeCode, xpAward }: CompleteOutcomeData) =>
      enrolmentsApi.completeOutcome(studentId, subjectId, outcomeCode, xpAward),
    onSuccess: (updatedEnrolment, { studentId }) => {
      // Update list cache
      queryClient.setQueryData<Enrolment[]>(enrolmentKeys.list(studentId), (old) =>
        old?.map((e) => (e.subjectId === updatedEnrolment.subjectId ? updatedEnrolment : e))
      );
    },
  });
}
