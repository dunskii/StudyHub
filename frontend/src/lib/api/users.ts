/**
 * User API client for parent account operations.
 */

import { api } from './client';
import type { User } from '@/types/student.types';

interface CreateUserRequest {
  supabase_auth_id: string;
  email: string;
  display_name: string;
  phone_number?: string;
}

interface UpdateUserRequest {
  display_name?: string;
  phone_number?: string;
  preferences?: Record<string, unknown>;
}

interface UserResponse {
  id: string;
  supabase_auth_id: string;
  email: string;
  display_name: string;
  phone_number?: string;
  subscription_tier: string;
  subscription_expires_at?: string;
  preferences: Record<string, unknown>;
  last_login_at?: string;
  privacy_policy_accepted_at?: string;
  terms_accepted_at?: string;
  created_at: string;
  updated_at: string;
}

interface StudentListResponse {
  students: Array<{
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
  }>;
  total: number;
}

/**
 * Transform API response to User type (camelCase).
 */
function transformUserResponse(response: UserResponse): Omit<User, 'students'> {
  return {
    id: response.id,
    email: response.email,
    displayName: response.display_name,
    phoneNumber: response.phone_number,
    subscriptionTier: response.subscription_tier as User['subscriptionTier'],
    subscriptionExpiresAt: response.subscription_expires_at,
    preferences: {
      emailNotifications: Boolean(response.preferences?.emailNotifications ?? true),
      weeklyReports: Boolean(response.preferences?.weeklyReports ?? true),
      language: String(response.preferences?.language ?? 'en-AU'),
      timezone: String(response.preferences?.timezone ?? 'Australia/Sydney'),
    },
  };
}

export const usersApi = {
  /**
   * Create a new user account.
   */
  async create(data: CreateUserRequest): Promise<User> {
    const response = await api.post<UserResponse>('/api/v1/users', data);
    return {
      ...transformUserResponse(response),
      students: [],
    };
  },

  /**
   * Get the current authenticated user.
   */
  async getCurrentUser(): Promise<User> {
    const [userResponse, studentsResponse] = await Promise.all([
      api.get<UserResponse>('/api/v1/users/me'),
      api.get<StudentListResponse>('/api/v1/users/me/students'),
    ]);

    return {
      ...transformUserResponse(userResponse),
      students: studentsResponse.students.map((s) => ({
        id: s.id,
        parentId: s.parent_id,
        displayName: s.display_name,
        gradeLevel: s.grade_level,
        schoolStage: s.school_stage,
        frameworkId: s.framework_id,
        onboardingCompleted: s.onboarding_completed,
        preferences: {
          theme: (s.preferences?.theme as 'light' | 'dark' | 'auto') ?? 'auto',
          studyReminders: Boolean(s.preferences?.studyReminders ?? true),
          dailyGoalMinutes: Number(s.preferences?.dailyGoalMinutes ?? 30),
          language: String(s.preferences?.language ?? 'en-AU'),
        },
        gamification: {
          totalXP: Number(s.gamification?.totalXP ?? 0),
          level: Number(s.gamification?.level ?? 1),
          achievements: (s.gamification?.achievements as string[]) ?? [],
          streaks: {
            current: Number((s.gamification?.streaks as Record<string, unknown>)?.current ?? 0),
            longest: Number((s.gamification?.streaks as Record<string, unknown>)?.longest ?? 0),
            lastActiveDate: (s.gamification?.streaks as Record<string, unknown>)?.lastActiveDate as
              | string
              | undefined,
          },
        },
        createdAt: s.created_at,
        lastActiveAt: s.last_active_at,
      })),
    };
  },

  /**
   * Update the current user's profile.
   */
  async updateCurrentUser(data: UpdateUserRequest): Promise<User> {
    const response = await api.put<UserResponse>('/api/v1/users/me', data);
    return {
      ...transformUserResponse(response),
      students: [],
    };
  },

  /**
   * Accept the privacy policy.
   */
  async acceptPrivacyPolicy(): Promise<void> {
    await api.post('/api/v1/users/me/accept-privacy-policy');
  },

  /**
   * Accept the terms of service.
   */
  async acceptTerms(): Promise<void> {
    await api.post('/api/v1/users/me/accept-terms');
  },
};
