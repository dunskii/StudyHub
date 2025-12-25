/**
 * Zod validation schemas for forms and API data.
 */
import { z } from 'zod';

// ============================================
// Common Validators
// ============================================

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const phoneSchema = z
  .string()
  .regex(
    /^\+?[1-9]\d{1,14}$/,
    'Please enter a valid phone number (e.g., +61400000000)'
  )
  .optional()
  .or(z.literal(''));

export const displayNameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes');

// ============================================
// Authentication Schemas
// ============================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    displayName: displayNameSchema,
    phoneNumber: phoneSchema,
    agreeToTerms: z.boolean().refine((val) => val === true, {
      message: 'You must agree to the terms and conditions',
    }),
    agreeToPrivacy: z.boolean().refine((val) => val === true, {
      message: 'You must agree to the privacy policy',
    }),
    marketingConsent: z.boolean().default(false),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

// ============================================
// Student Schemas
// ============================================

export const studentSchema = z.object({
  displayName: displayNameSchema,
  gradeLevel: z
    .number()
    .min(0, 'Grade must be at least Kindergarten (0)')
    .max(12, 'Grade must be at most Year 12'),
  schoolStage: z.string().min(1, 'School stage is required'),
  school: z.string().max(255, 'School name is too long').optional(),
  frameworkId: z.string().uuid('Invalid framework ID').optional(),
});

export type StudentFormData = z.infer<typeof studentSchema>;

export const studentUpdateSchema = studentSchema.partial();

export type StudentUpdateFormData = z.infer<typeof studentUpdateSchema>;

// ============================================
// Subject Schemas
// ============================================

export const subjectEnrollmentSchema = z.object({
  subjectId: z.string().uuid('Invalid subject ID'),
  pathway: z.string().optional(),
  seniorCourseId: z.string().uuid('Invalid course ID').optional(),
});

export type SubjectEnrollmentFormData = z.infer<typeof subjectEnrollmentSchema>;

// ============================================
// Note Schemas
// ============================================

export const noteSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be less than 255 characters'),
  contentType: z.enum(['text', 'image', 'pdf', 'audio'], {
    errorMap: () => ({ message: 'Please select a valid content type' }),
  }),
  subjectId: z.string().uuid('Invalid subject ID').optional(),
  tags: z.array(z.string().max(50)).max(10, 'Maximum 10 tags allowed').optional(),
});

export type NoteFormData = z.infer<typeof noteSchema>;

// ============================================
// Session/Study Schemas
// ============================================

export const startSessionSchema = z.object({
  subjectId: z.string().uuid('Invalid subject ID'),
  sessionType: z.enum(['study', 'revision', 'practice', 'assessment'], {
    errorMap: () => ({ message: 'Please select a valid session type' }),
  }),
});

export type StartSessionFormData = z.infer<typeof startSessionSchema>;

// ============================================
// Profile/Settings Schemas
// ============================================

export const profileUpdateSchema = z.object({
  displayName: displayNameSchema.optional(),
  phoneNumber: phoneSchema,
  preferences: z
    .object({
      emailNotifications: z.boolean().optional(),
      weeklyReports: z.boolean().optional(),
      language: z.string().optional(),
      timezone: z.string().optional(),
    })
    .optional(),
});

export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;

export const studentPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  studyReminders: z.boolean().optional(),
  dailyGoalMinutes: z
    .number()
    .min(5, 'Minimum 5 minutes')
    .max(480, 'Maximum 8 hours')
    .optional(),
});

export type StudentPreferencesFormData = z.infer<typeof studentPreferencesSchema>;

// ============================================
// Feedback/Report Schemas
// ============================================

export const feedbackSchema = z.object({
  type: z.enum(['bug', 'feature', 'general', 'concern'], {
    errorMap: () => ({ message: 'Please select a feedback type' }),
  }),
  subject: z
    .string()
    .min(5, 'Subject must be at least 5 characters')
    .max(100, 'Subject must be less than 100 characters'),
  message: z
    .string()
    .min(20, 'Please provide more detail (at least 20 characters)')
    .max(2000, 'Message is too long (maximum 2000 characters)'),
  email: emailSchema.optional(),
});

export type FeedbackFormData = z.infer<typeof feedbackSchema>;

// ============================================
// AI/Tutor Interaction Schemas
// ============================================

export const tutorMessageSchema = z.object({
  message: z
    .string()
    .min(1, 'Please enter a message')
    .max(2000, 'Message is too long (maximum 2000 characters)'),
  outcomeId: z.string().uuid('Invalid outcome ID').optional(),
});

export type TutorMessageFormData = z.infer<typeof tutorMessageSchema>;
