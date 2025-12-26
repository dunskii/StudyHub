/**
 * Student API client for student profile operations.
 */

import { api } from './client';
import type { Student } from '@/types/student.types';

interface CreateStudentRequest {
  parent_id: string;
  display_name: string;
  grade_level: number;
  school_stage: string;
  framework_id: string;
  preferences?: Record<string, unknown>;
}

interface UpdateStudentRequest {
  display_name?: string;
  grade_level?: number;
  school_stage?: string;
  preferences?: Record<string, unknown>;
  onboarding_completed?: boolean;
}

interface StudentResponse {
  id: string;
  parent_id: string;
  display_name: string;
  grade_level: number;
  school_stage: string;
  framework_id: string;
  preferences: Record<string, unknown>;
  gamification: Record<string, unknown>;
  onboarding_completed: boolean;
  last_active_at?: string;
  created_at: string;
  updated_at: string;
}

interface StudentListResponse {
  students: StudentResponse[];
  total: number;
}

/**
 * Transform API response to Student type (camelCase).
 */
function transformStudentResponse(response: StudentResponse): Student {
  return {
    id: response.id,
    parentId: response.parent_id,
    displayName: response.display_name,
    gradeLevel: response.grade_level,
    schoolStage: response.school_stage,
    frameworkId: response.framework_id,
    onboardingCompleted: response.onboarding_completed,
    preferences: {
      theme: (response.preferences?.theme as 'light' | 'dark' | 'auto') ?? 'auto',
      studyReminders: Boolean(response.preferences?.studyReminders ?? true),
      dailyGoalMinutes: Number(response.preferences?.dailyGoalMinutes ?? 30),
      language: String(response.preferences?.language ?? 'en-AU'),
    },
    gamification: {
      totalXP: Number(response.gamification?.totalXP ?? 0),
      level: Number(response.gamification?.level ?? 1),
      achievements: (response.gamification?.achievements as string[]) ?? [],
      streaks: {
        current: Number((response.gamification?.streaks as Record<string, unknown>)?.current ?? 0),
        longest: Number((response.gamification?.streaks as Record<string, unknown>)?.longest ?? 0),
        lastActiveDate: (response.gamification?.streaks as Record<string, unknown>)
          ?.lastActiveDate as string | undefined,
      },
    },
    createdAt: response.created_at,
    lastActiveAt: response.last_active_at,
  };
}

export const studentsApi = {
  /**
   * Get all students for the current user.
   */
  async getAll(): Promise<Student[]> {
    const response = await api.get<StudentListResponse>('/api/v1/students');
    return response.students.map(transformStudentResponse);
  },

  /**
   * Get a single student by ID.
   */
  async getById(studentId: string): Promise<Student> {
    const response = await api.get<StudentResponse>(`/api/v1/students/${studentId}`);
    return transformStudentResponse(response);
  },

  /**
   * Create a new student.
   */
  async create(data: CreateStudentRequest): Promise<Student> {
    const response = await api.post<StudentResponse>('/api/v1/students', data);
    return transformStudentResponse(response);
  },

  /**
   * Update a student.
   */
  async update(studentId: string, data: UpdateStudentRequest): Promise<Student> {
    const response = await api.put<StudentResponse>(`/api/v1/students/${studentId}`, data);
    return transformStudentResponse(response);
  },

  /**
   * Delete a student.
   */
  async delete(studentId: string): Promise<void> {
    await api.delete(`/api/v1/students/${studentId}`);
  },

  /**
   * Mark student onboarding as completed.
   */
  async completeOnboarding(studentId: string): Promise<Student> {
    const response = await api.post<StudentResponse>(
      `/api/v1/students/${studentId}/complete-onboarding`
    );
    return transformStudentResponse(response);
  },

  /**
   * Record student activity (updates last_active_at).
   */
  async recordActivity(studentId: string): Promise<Student> {
    const response = await api.post<StudentResponse>(`/api/v1/students/${studentId}/activity`);
    return transformStudentResponse(response);
  },
};
