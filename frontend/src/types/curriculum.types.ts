/**
 * Curriculum-related types
 */

export interface CurriculumFramework {
  id: string
  code: string
  name: string
  country: string
  regionType: 'state' | 'national' | 'international'
  structure: FrameworkStructure
  syllabusAuthority?: string
  syllabusUrl?: string
  isActive: boolean
  isDefault: boolean
  displayOrder: number
}

export interface FrameworkStructure {
  stages: string[]
  gradeMapping: Record<string, string>
  pathwaySystem?: {
    [stage: string]: {
      subjects: string[]
      pathways: string[]
    }
  }
  seniorSecondary?: {
    name: string
    fullName: string
    years: number[]
  }
}

export interface CurriculumOutcome {
  id: string
  frameworkId: string
  subjectId: string
  outcomeCode: string
  description: string
  stage: string
  strand?: string
  substrand?: string
  pathway?: string
  contentDescriptors?: string[]
  elaborations?: Record<string, unknown>
  prerequisites?: string[]
  displayOrder: number
}

export interface SeniorCourse {
  id: string
  frameworkId: string
  subjectId: string
  code: string
  name: string
  description?: string
  courseType: string
  units: number
  isAtar: boolean
  prerequisites?: string[]
  exclusions?: string[]
  modules?: Record<string, unknown>
  assessmentComponents?: Record<string, unknown>
  isActive: boolean
}
