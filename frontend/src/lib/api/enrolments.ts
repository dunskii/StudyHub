/**
 * Enrolment API client for student subject enrolment operations.
 */

import { api } from './client';

export interface EnrolmentProgress {
  outcomesCompleted: string[];
  outcomesInProgress: string[];
  overallPercentage: number;
  lastActivity?: string;
  xpEarned: number;
}

export interface SubjectSummary {
  id: string;
  code: string;
  name: string;
  icon: string;
  color: string;
}

export interface SeniorCourseSummary {
  id: string;
  code: string;
  name: string;
  units: number;
}

export interface Enrolment {
  id: string;
  studentId: string;
  subjectId: string;
  pathway?: string;
  seniorCourseId?: string;
  enrolledAt: string;
  progress: EnrolmentProgress;
  subject: SubjectSummary;
  seniorCourse?: SeniorCourseSummary;
}

interface EnrolmentResponse {
  id: string;
  student_id: string;
  subject_id: string;
  pathway?: string;
  senior_course_id?: string;
  enrolled_at: string;
  progress: EnrolmentProgress;
}

interface EnrolmentWithDetailsResponse extends EnrolmentResponse {
  subject: {
    id: string;
    code: string;
    name: string;
    icon: string;
    color: string;
  };
  senior_course?: {
    id: string;
    code: string;
    name: string;
    units: number;
  };
}

interface EnrolmentListResponse {
  enrolments: EnrolmentWithDetailsResponse[];
  total: number;
}

interface EnrolRequest {
  subject_id: string;
  pathway?: string;
  senior_course_id?: string;
}

interface BulkEnrolRequest {
  enrolments: EnrolRequest[];
}

interface BulkEnrolResponse {
  successful: EnrolmentResponse[];
  failed: Array<{
    subject_id: string;
    error_code: string;
    message: string;
  }>;
}

interface UpdateProgressRequest {
  outcomesCompleted?: string[];
  outcomesInProgress?: string[];
  overallPercentage?: number;
  xpEarned?: number;
}

/**
 * Transform API response to Enrolment type (camelCase).
 */
function transformEnrolmentResponse(response: EnrolmentWithDetailsResponse): Enrolment {
  return {
    id: response.id,
    studentId: response.student_id,
    subjectId: response.subject_id,
    pathway: response.pathway,
    seniorCourseId: response.senior_course_id,
    enrolledAt: response.enrolled_at,
    progress: response.progress,
    subject: response.subject,
    seniorCourse: response.senior_course,
  };
}

export const enrolmentsApi = {
  /**
   * Get all enrolments for a student.
   */
  async getForStudent(studentId: string): Promise<Enrolment[]> {
    const response = await api.get<EnrolmentListResponse>(
      `/api/v1/students/${studentId}/subjects`
    );
    return response.enrolments.map(transformEnrolmentResponse);
  },

  /**
   * Enrol a student in a subject.
   */
  async enrol(
    studentId: string,
    subjectId: string,
    options?: { pathway?: string; seniorCourseId?: string }
  ): Promise<Enrolment> {
    const response = await api.post<EnrolmentWithDetailsResponse>(
      `/api/v1/students/${studentId}/subjects`,
      {
        subject_id: subjectId,
        pathway: options?.pathway,
        senior_course_id: options?.seniorCourseId,
      }
    );
    return transformEnrolmentResponse(response);
  },

  /**
   * Bulk enrol a student in multiple subjects.
   */
  async bulkEnrol(
    studentId: string,
    enrolments: Array<{
      subjectId: string;
      pathway?: string;
      seniorCourseId?: string;
    }>
  ): Promise<{
    successful: Enrolment[];
    failed: Array<{ subjectId: string; errorCode: string; message: string }>;
  }> {
    const request: BulkEnrolRequest = {
      enrolments: enrolments.map((e) => ({
        subject_id: e.subjectId,
        pathway: e.pathway,
        senior_course_id: e.seniorCourseId,
      })),
    };

    const response = await api.post<BulkEnrolResponse>(
      `/api/v1/students/${studentId}/subjects/bulk`,
      request
    );

    return {
      successful: response.successful.map((e) => ({
        id: e.id,
        studentId: e.student_id,
        subjectId: e.subject_id,
        pathway: e.pathway,
        seniorCourseId: e.senior_course_id,
        enrolledAt: e.enrolled_at,
        progress: e.progress,
        subject: { id: e.subject_id, code: '', name: '', icon: '', color: '' },
      })),
      failed: response.failed.map((f) => ({
        subjectId: f.subject_id,
        errorCode: f.error_code,
        message: f.message,
      })),
    };
  },

  /**
   * Unenrol a student from a subject.
   */
  async unenrol(studentId: string, subjectId: string): Promise<void> {
    await api.delete(`/api/v1/students/${studentId}/subjects/${subjectId}`);
  },

  /**
   * Update enrolment pathway or senior course.
   */
  async updateEnrolment(
    studentId: string,
    subjectId: string,
    data: { pathway?: string; seniorCourseId?: string }
  ): Promise<Enrolment> {
    const response = await api.put<EnrolmentWithDetailsResponse>(
      `/api/v1/students/${studentId}/subjects/${subjectId}`,
      {
        pathway: data.pathway,
        senior_course_id: data.seniorCourseId,
      }
    );
    return transformEnrolmentResponse(response);
  },

  /**
   * Update enrolment progress.
   */
  async updateProgress(
    studentId: string,
    subjectId: string,
    progress: UpdateProgressRequest
  ): Promise<Enrolment> {
    const response = await api.put<EnrolmentWithDetailsResponse>(
      `/api/v1/students/${studentId}/subjects/${subjectId}/progress`,
      progress
    );
    return transformEnrolmentResponse(response);
  },

  /**
   * Mark an outcome as completed.
   */
  async completeOutcome(
    studentId: string,
    subjectId: string,
    outcomeCode: string,
    xpAward?: number
  ): Promise<Enrolment> {
    const params = xpAward !== undefined ? { xp_award: String(xpAward) } : undefined;
    const response = await api.post<EnrolmentWithDetailsResponse>(
      `/api/v1/students/${studentId}/subjects/${subjectId}/outcomes/${outcomeCode}/complete`,
      undefined,
      { params }
    );
    return transformEnrolmentResponse(response);
  },
};
