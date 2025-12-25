import type { TutorStyle } from '@/types/subject.types'

/**
 * Subject-specific configuration for NSW curriculum
 */
export const NSW_SUBJECTS = {
  MATH: {
    code: 'MATH',
    name: 'Mathematics',
    kla: 'Mathematics',
    color: '#3b82f6',
    icon: 'Calculator',
    tutorStyle: 'socratic_stepwise' as TutorStyle,
    tutorDescription:
      'Uses step-by-step problem solving, never gives answers directly, asks guiding questions',
  },
  ENG: {
    code: 'ENG',
    name: 'English',
    kla: 'English',
    color: '#8b5cf6',
    icon: 'BookOpen',
    tutorStyle: 'mentor_guide' as TutorStyle,
    tutorDescription:
      'Writing workshops, literary analysis discussions, vocabulary building',
  },
  SCI: {
    code: 'SCI',
    name: 'Science',
    kla: 'Science',
    color: '#10b981',
    icon: 'Flask',
    tutorStyle: 'inquiry_based' as TutorStyle,
    tutorDescription:
      'Hypothesis-driven exploration, experiment design guidance, concept connections',
  },
  HSIE: {
    code: 'HSIE',
    name: 'HSIE',
    kla: 'Human Society and Its Environment',
    color: '#f59e0b',
    icon: 'Globe',
    tutorStyle: 'socratic_discussion' as TutorStyle,
    tutorDescription:
      'Discussion-based learning, evidence analysis, multiple perspectives',
  },
  PDHPE: {
    code: 'PDHPE',
    name: 'PDHPE',
    kla: 'Personal Development, Health and Physical Education',
    color: '#ef4444',
    icon: 'Heart',
    tutorStyle: 'activity_coach' as TutorStyle,
    tutorDescription:
      'Goal setting, health literacy, age-appropriate discussions',
  },
  TAS: {
    code: 'TAS',
    name: 'TAS',
    kla: 'Technology and Applied Studies',
    color: '#6366f1',
    icon: 'Wrench',
    tutorStyle: 'design_mentor' as TutorStyle,
    tutorDescription:
      'Design process guidance, project planning, troubleshooting support',
  },
  CA: {
    code: 'CA',
    name: 'Creative Arts',
    kla: 'Creative Arts',
    color: '#ec4899',
    icon: 'Palette',
    tutorStyle: 'creative_facilitator' as TutorStyle,
    tutorDescription:
      'Creative exploration, technique guidance, artistic vocabulary',
  },
  LANG: {
    code: 'LANG',
    name: 'Languages',
    kla: 'Languages',
    color: '#14b8a6',
    icon: 'Languages',
    tutorStyle: 'immersive_coach' as TutorStyle,
    tutorDescription:
      'Target language practice, cultural context, grammar scaffolding',
  },
} as const

export type SubjectCode = keyof typeof NSW_SUBJECTS
