import { describe, it, expect, beforeEach } from 'vitest';
import { useSubjectStore } from './subjectStore';
import type { Subject, StudentSubject } from '@/types/subject.types';

// Mock subject data
const mockSubject1: Subject = {
  id: 'subject-1',
  frameworkId: 'nsw-framework',
  code: 'MATH',
  name: 'Mathematics',
  kla: 'Mathematics',
  description: 'Development of mathematical understanding',
  icon: 'calculator',
  color: '#3B82F6',
  availableStages: ['ES1', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
  config: {
    hasPathways: true,
    pathways: ['5.1', '5.2', '5.3'],
    seniorCourses: ['Mathematics Standard', 'Mathematics Advanced'],
    assessmentTypes: ['test', 'assignment'],
    tutorStyle: 'socratic_stepwise',
  },
  displayOrder: 1,
  isActive: true,
};

const mockSubject2: Subject = {
  id: 'subject-2',
  frameworkId: 'nsw-framework',
  code: 'ENG',
  name: 'English',
  kla: 'English',
  description: 'Development of communication skills',
  icon: 'book-open',
  color: '#8B5CF6',
  availableStages: ['ES1', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
  config: {
    hasPathways: false,
    pathways: [],
    seniorCourses: ['English Standard', 'English Advanced'],
    assessmentTypes: ['essay', 'creative_writing'],
    tutorStyle: 'mentor_guide',
  },
  displayOrder: 2,
  isActive: true,
};

const mockStudentSubject: StudentSubject = {
  id: 'student-subject-1',
  studentId: 'student-1',
  subjectId: 'subject-1',
  pathway: '5.2',
  enrolledAt: '2024-01-01T00:00:00Z',
  progress: {
    outcomesCompleted: ['MA3-RN-01'],
    outcomesInProgress: ['MA3-MR-01'],
    overallPercentage: 45,
    lastActivity: '2024-06-01T00:00:00Z',
    xpEarned: 500,
  },
};

describe('useSubjectStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useSubjectStore.setState({
      subjects: [],
      studentSubjects: [],
      activeSubject: null,
    });
  });

  describe('initial state', () => {
    it('starts with empty arrays and null active subject', () => {
      const state = useSubjectStore.getState();

      expect(state.subjects).toEqual([]);
      expect(state.studentSubjects).toEqual([]);
      expect(state.activeSubject).toBeNull();
    });
  });

  describe('setSubjects', () => {
    it('sets the subjects array', () => {
      const { setSubjects } = useSubjectStore.getState();

      setSubjects([mockSubject1, mockSubject2]);

      const state = useSubjectStore.getState();
      expect(state.subjects).toHaveLength(2);
      expect(state.subjects[0]).toEqual(mockSubject1);
      expect(state.subjects[1]).toEqual(mockSubject2);
    });

    it('replaces existing subjects', () => {
      const { setSubjects } = useSubjectStore.getState();

      // Set initial subjects
      setSubjects([mockSubject1, mockSubject2]);
      expect(useSubjectStore.getState().subjects).toHaveLength(2);

      // Replace with new subjects
      setSubjects([mockSubject1]);
      expect(useSubjectStore.getState().subjects).toHaveLength(1);
    });

    it('can set empty array', () => {
      const { setSubjects } = useSubjectStore.getState();

      setSubjects([mockSubject1]);
      setSubjects([]);

      expect(useSubjectStore.getState().subjects).toEqual([]);
    });
  });

  describe('setStudentSubjects', () => {
    it('sets the student subjects array', () => {
      const { setStudentSubjects } = useSubjectStore.getState();

      setStudentSubjects([mockStudentSubject]);

      const state = useSubjectStore.getState();
      expect(state.studentSubjects).toHaveLength(1);
      expect(state.studentSubjects[0]).toEqual(mockStudentSubject);
    });
  });

  describe('setActiveSubject', () => {
    it('sets the active subject', () => {
      const { setActiveSubject } = useSubjectStore.getState();

      setActiveSubject(mockSubject1);

      expect(useSubjectStore.getState().activeSubject).toEqual(mockSubject1);
    });

    it('can set active subject to null', () => {
      const { setActiveSubject } = useSubjectStore.getState();

      setActiveSubject(mockSubject1);
      setActiveSubject(null);

      expect(useSubjectStore.getState().activeSubject).toBeNull();
    });
  });

  describe('getSubjectByCode', () => {
    it('returns subject matching the code', () => {
      const { setSubjects, getSubjectByCode } = useSubjectStore.getState();

      setSubjects([mockSubject1, mockSubject2]);

      // Need to get fresh state after setSubjects
      const result = useSubjectStore.getState().getSubjectByCode('MATH');
      expect(result).toEqual(mockSubject1);
    });

    it('returns undefined for non-existent code', () => {
      const { setSubjects } = useSubjectStore.getState();

      setSubjects([mockSubject1, mockSubject2]);

      const result = useSubjectStore.getState().getSubjectByCode('PHYSICS');
      expect(result).toBeUndefined();
    });

    it('returns undefined when subjects array is empty', () => {
      const result = useSubjectStore.getState().getSubjectByCode('MATH');
      expect(result).toBeUndefined();
    });
  });

  describe('getStudentProgress', () => {
    it('returns student progress for a subject', () => {
      const { setStudentSubjects } = useSubjectStore.getState();

      setStudentSubjects([mockStudentSubject]);

      const result = useSubjectStore.getState().getStudentProgress('subject-1');
      expect(result).toEqual(mockStudentSubject);
    });

    it('returns undefined for non-enrolled subject', () => {
      const { setStudentSubjects } = useSubjectStore.getState();

      setStudentSubjects([mockStudentSubject]);

      const result = useSubjectStore.getState().getStudentProgress('subject-999');
      expect(result).toBeUndefined();
    });

    it('returns undefined when no student subjects', () => {
      const result = useSubjectStore.getState().getStudentProgress('subject-1');
      expect(result).toBeUndefined();
    });
  });
});
