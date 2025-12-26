/**
 * React Query hooks exports
 */

// Subject hooks
export {
  subjectKeys,
  useSubjects,
  useSubject,
  useSubjectByCode,
  useSubjectList,
} from './useSubjects'

// Curriculum hooks
export {
  curriculumKeys,
  useOutcomes,
  useOutcomeByCode,
  useOutcome,
  useSubjectOutcomes,
  useStrands,
  useStages,
  useOutcomeList,
} from './useCurriculum'

// Senior course hooks
export {
  seniorCourseKeys,
  useSeniorCourses,
  useAtarCourses,
  useSeniorCourse,
  useSeniorCourseByCode,
  useCoursesBySubject,
  useSeniorCourseList,
} from './useSeniorCourses'
