/**
 * API functions for note management.
 */
import { api } from './client'

// =============================================================================
// Types
// =============================================================================

export interface UploadUrlRequest {
  filename: string
  content_type: string
}

export interface UploadUrlResponse {
  upload_url: string
  fields: Record<string, string>
  storage_key: string
  expires_at: string
}

export interface NoteCreateRequest {
  title: string
  storage_key: string
  content_type: string
  subject_id?: string
  tags?: string[]
}

export interface NoteUpdateRequest {
  title?: string
  subject_id?: string
  tags?: string[]
}

export interface NoteResponse {
  id: string
  student_id: string
  subject_id?: string
  title: string
  content_type: string
  storage_url?: string
  download_url?: string
  thumbnail_url?: string
  ocr_text?: string
  ocr_status: 'pending' | 'processing' | 'completed' | 'failed' | 'not_applicable'
  curriculum_outcomes?: string[]
  tags?: string[]
  note_metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface NoteListResponse {
  notes: NoteResponse[]
  total: number
  limit: number
  offset: number
}

export interface OCRStatusResponse {
  status: string
  text?: string
  confidence?: number
  language?: string
  error?: string
}

export interface CurriculumSuggestion {
  id: string
  code: string
  description: string
  stage?: string
  strand?: string
}

export interface CurriculumAlignmentResponse {
  suggested_outcomes: CurriculumSuggestion[]
  detected_subject?: string
  confidence: number
}

export interface NoteListParams {
  student_id: string
  subject_id?: string
  search?: string
  offset?: number
  limit?: number
}

// =============================================================================
// Note API Functions
// =============================================================================

/**
 * Get a presigned URL for uploading a file.
 */
export async function getUploadUrl(
  studentId: string,
  request: UploadUrlRequest
): Promise<UploadUrlResponse> {
  return api.post('/api/v1/notes/upload-url', request, {
    params: { student_id: studentId },
  })
}

/**
 * Upload a file directly to storage using the presigned URL.
 */
export async function uploadFileToStorage(
  uploadUrl: string,
  fields: Record<string, string>,
  file: File,
  onProgress?: (progress: number) => void
): Promise<void> {
  const formData = new FormData()

  // Add all the presigned fields first
  Object.entries(fields).forEach(([key, value]) => {
    formData.append(key, value)
  })

  // Add the file last
  formData.append('file', file)

  // Use XMLHttpRequest for progress tracking
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = (event.loaded / event.total) * 100
        onProgress(progress)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'))
    })

    xhr.open('POST', uploadUrl)
    xhr.send(formData)
  })
}

/**
 * Create a note record after successful upload.
 */
export async function createNote(
  studentId: string,
  request: NoteCreateRequest
): Promise<NoteResponse> {
  return api.post('/api/v1/notes', request, {
    params: { student_id: studentId },
  })
}

/**
 * Get a list of notes for a student.
 */
export async function getNotes(params: NoteListParams): Promise<NoteListResponse> {
  const queryParams: Record<string, string> = {
    student_id: params.student_id,
  }

  if (params.subject_id) queryParams.subject_id = params.subject_id
  if (params.search) queryParams.search = params.search
  if (params.offset !== undefined) queryParams.offset = String(params.offset)
  if (params.limit !== undefined) queryParams.limit = String(params.limit)

  return api.get('/api/v1/notes', { params: queryParams })
}

/**
 * Get a single note by ID.
 */
export async function getNote(noteId: string, studentId: string): Promise<NoteResponse> {
  return api.get(`/api/v1/notes/${noteId}`, {
    params: { student_id: studentId },
  })
}

/**
 * Update a note's metadata.
 */
export async function updateNote(
  noteId: string,
  studentId: string,
  request: NoteUpdateRequest
): Promise<NoteResponse> {
  return api.put(`/api/v1/notes/${noteId}`, request, {
    params: { student_id: studentId },
  })
}

/**
 * Delete a note.
 */
export async function deleteNote(noteId: string, studentId: string): Promise<void> {
  return api.delete(`/api/v1/notes/${noteId}`, {
    params: { student_id: studentId },
  })
}

/**
 * Trigger OCR processing for a note.
 */
export async function triggerOcr(noteId: string, studentId: string): Promise<OCRStatusResponse> {
  return api.post(`/api/v1/notes/${noteId}/process-ocr`, undefined, {
    params: { student_id: studentId },
  })
}

/**
 * Get OCR status for a note.
 */
export async function getOcrStatus(noteId: string, studentId: string): Promise<OCRStatusResponse> {
  return api.get(`/api/v1/notes/${noteId}/ocr-status`, {
    params: { student_id: studentId },
  })
}

/**
 * Get AI-suggested curriculum outcomes for a note.
 */
export async function alignCurriculum(
  noteId: string,
  studentId: string
): Promise<CurriculumAlignmentResponse> {
  return api.post(`/api/v1/notes/${noteId}/align-curriculum`, undefined, {
    params: { student_id: studentId },
  })
}

/**
 * Update linked curriculum outcomes for a note.
 */
export async function updateOutcomes(
  noteId: string,
  studentId: string,
  outcomeIds: string[]
): Promise<NoteResponse> {
  return api.put(
    `/api/v1/notes/${noteId}/outcomes`,
    { outcome_ids: outcomeIds },
    { params: { student_id: studentId } }
  )
}

// =============================================================================
// Export as namespace for convenience
// =============================================================================

export const notesApi = {
  getUploadUrl,
  uploadFileToStorage,
  createNote,
  getNotes,
  getNote,
  updateNote,
  deleteNote,
  triggerOcr,
  getOcrStatus,
  alignCurriculum,
  updateOutcomes,
}
