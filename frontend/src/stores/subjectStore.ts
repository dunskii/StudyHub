import { create } from 'zustand'
import type { Subject, StudentSubject } from '@/types/subject.types'

interface SubjectState {
  subjects: Subject[]
  studentSubjects: StudentSubject[]
  activeSubject: Subject | null
  setSubjects: (subjects: Subject[]) => void
  setStudentSubjects: (subjects: StudentSubject[]) => void
  setActiveSubject: (subject: Subject | null) => void
  getSubjectByCode: (code: string) => Subject | undefined
  getStudentProgress: (subjectId: string) => StudentSubject | undefined
}

export const useSubjectStore = create<SubjectState>((set, get) => ({
  subjects: [],
  studentSubjects: [],
  activeSubject: null,
  setSubjects: (subjects) => set({ subjects }),
  setStudentSubjects: (studentSubjects) => set({ studentSubjects }),
  setActiveSubject: (subject) => set({ activeSubject: subject }),
  getSubjectByCode: (code) => get().subjects.find((s) => s.code === code),
  getStudentProgress: (subjectId) =>
    get().studentSubjects.find((ss) => ss.subjectId === subjectId),
}))
