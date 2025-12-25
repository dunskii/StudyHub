/**
 * Subject-related types
 */

export type TutorStyle =
  | 'socratic_stepwise'    // Mathematics
  | 'mentor_guide'         // English
  | 'inquiry_based'        // Science
  | 'socratic_discussion'  // HSIE
  | 'activity_coach'       // PDHPE
  | 'design_mentor'        // TAS
  | 'creative_facilitator' // Creative Arts
  | 'immersive_coach'      // Languages

export interface SubjectConfig {
  hasPathways: boolean
  pathways: string[]
  seniorCourses: string[]
  assessmentTypes: string[]
  tutorStyle: TutorStyle
}

export interface Subject {
  id: string
  frameworkId: string
  code: string
  name: string
  kla: string
  description?: string
  icon?: string
  color?: string
  availableStages: string[]
  config: SubjectConfig
  displayOrder: number
  isActive: boolean
}

export interface StudentSubject {
  id: string
  studentId: string
  subjectId: string
  pathway?: string
  seniorCourseId?: string
  enrolledAt: string
  progress: {
    outcomesCompleted: string[]
    outcomesInProgress: string[]
    overallPercentage: number
    lastActivity?: string
    xpEarned: number
  }
}
