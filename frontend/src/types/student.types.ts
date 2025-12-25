/**
 * Student-related types
 */

export interface Student {
  id: string
  parentId: string
  email?: string
  displayName: string
  gradeLevel: number
  schoolStage: string
  school?: string
  frameworkId?: string
  onboardingCompleted: boolean
  preferences: StudentPreferences
  gamification: Gamification
  createdAt: string
  lastActiveAt?: string
}

export interface StudentPreferences {
  theme: 'light' | 'dark' | 'auto'
  studyReminders: boolean
  dailyGoalMinutes: number
  language: string
}

export interface Gamification {
  totalXP: number
  level: number
  achievements: string[]
  streaks: {
    current: number
    longest: number
    lastActiveDate?: string
  }
}

export interface User {
  id: string
  email: string
  displayName: string
  phoneNumber?: string
  subscriptionTier: 'free' | 'premium' | 'school'
  subscriptionStartedAt?: string
  subscriptionExpiresAt?: string
  preferences: UserPreferences
  students: Student[]
}

export interface UserPreferences {
  emailNotifications: boolean
  weeklyReports: boolean
  language: string
  timezone: string
}
