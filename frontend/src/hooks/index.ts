/**
 * React Query hooks exports
 */

// Student hooks
export {
  studentKeys,
  useStudents,
  useStudent,
  useCreateStudent,
  useUpdateStudent,
  useDeleteStudent,
  useCompleteOnboarding,
  useRecordActivity,
} from './useStudents'

// Enrolment hooks
export {
  enrolmentKeys,
  useEnrolments,
  useEnrol,
  useBulkEnrol,
  useUnenrol,
  useUpdateEnrolment,
  useUpdateProgress,
  useCompleteOutcome,
} from './useEnrolments'

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
