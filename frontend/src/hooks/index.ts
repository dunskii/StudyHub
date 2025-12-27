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

// Tutor hooks
export {
  tutorKeys,
  useCreateSession,
  useEndSession,
  useSession,
  useActiveSession,
  useStudentSessions,
  useSendMessage,
  useChatHistory,
  useGenerateFlashcards,
  useSummariseText,
  useTutorChat,
} from './useTutor'

// Note hooks
export {
  noteKeys,
  useNotes,
  useNote,
  useUploadNote,
  useUpdateNote,
  useDeleteNote,
  useTriggerOcr,
  useOcrStatus,
  useAlignCurriculum,
  useUpdateOutcomes,
  useNoteManager,
} from './useNotes'
