/**
 * React Query hooks for student operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentsApi } from '@/lib/api';
import type { Student } from '@/types/student.types';

/** Query keys for student data */
export const studentKeys = {
  all: ['students'] as const,
  lists: () => [...studentKeys.all, 'list'] as const,
  list: () => [...studentKeys.lists()] as const,
  details: () => [...studentKeys.all, 'detail'] as const,
  detail: (id: string) => [...studentKeys.details(), id] as const,
};

/**
 * Fetch all students for the current user.
 */
export function useStudents() {
  return useQuery({
    queryKey: studentKeys.list(),
    queryFn: () => studentsApi.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch a single student by ID.
 */
export function useStudent(studentId: string | undefined) {
  return useQuery({
    queryKey: studentKeys.detail(studentId ?? ''),
    queryFn: () => studentsApi.getById(studentId!),
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000,
  });
}

interface CreateStudentData {
  parentId: string;
  displayName: string;
  gradeLevel: number;
  schoolStage: string;
  frameworkId: string;
  preferences?: Record<string, unknown>;
}

/**
 * Create a new student.
 */
export function useCreateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStudentData) =>
      studentsApi.create({
        parent_id: data.parentId,
        display_name: data.displayName,
        grade_level: data.gradeLevel,
        school_stage: data.schoolStage,
        framework_id: data.frameworkId,
        preferences: data.preferences,
      }),
    onSuccess: (newStudent) => {
      // Add to list cache
      queryClient.setQueryData<Student[]>(studentKeys.list(), (old) =>
        old ? [...old, newStudent] : [newStudent]
      );

      // Set individual cache
      queryClient.setQueryData(studentKeys.detail(newStudent.id), newStudent);
    },
  });
}

interface UpdateStudentData {
  studentId: string;
  displayName?: string;
  gradeLevel?: number;
  schoolStage?: string;
  preferences?: Record<string, unknown>;
  onboardingCompleted?: boolean;
}

/**
 * Update a student.
 */
export function useUpdateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ studentId, ...data }: UpdateStudentData) =>
      studentsApi.update(studentId, {
        display_name: data.displayName,
        grade_level: data.gradeLevel,
        school_stage: data.schoolStage,
        preferences: data.preferences,
        onboarding_completed: data.onboardingCompleted,
      }),
    onSuccess: (updatedStudent) => {
      // Update list cache
      queryClient.setQueryData<Student[]>(studentKeys.list(), (old) =>
        old?.map((s) => (s.id === updatedStudent.id ? updatedStudent : s))
      );

      // Update individual cache
      queryClient.setQueryData(studentKeys.detail(updatedStudent.id), updatedStudent);
    },
  });
}

/**
 * Delete a student.
 */
export function useDeleteStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (studentId: string) => studentsApi.delete(studentId),
    onSuccess: (_, studentId) => {
      // Remove from list cache
      queryClient.setQueryData<Student[]>(studentKeys.list(), (old) =>
        old?.filter((s) => s.id !== studentId)
      );

      // Remove individual cache
      queryClient.removeQueries({ queryKey: studentKeys.detail(studentId) });
    },
  });
}

/**
 * Complete student onboarding.
 */
export function useCompleteOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (studentId: string) => studentsApi.completeOnboarding(studentId),
    onSuccess: (updatedStudent) => {
      // Update caches
      queryClient.setQueryData<Student[]>(studentKeys.list(), (old) =>
        old?.map((s) => (s.id === updatedStudent.id ? updatedStudent : s))
      );
      queryClient.setQueryData(studentKeys.detail(updatedStudent.id), updatedStudent);
    },
  });
}

/**
 * Record student activity.
 */
export function useRecordActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (studentId: string) => studentsApi.recordActivity(studentId),
    onSuccess: (updatedStudent) => {
      // Update caches
      queryClient.setQueryData<Student[]>(studentKeys.list(), (old) =>
        old?.map((s) => (s.id === updatedStudent.id ? updatedStudent : s))
      );
      queryClient.setQueryData(studentKeys.detail(updatedStudent.id), updatedStudent);
    },
  });
}
