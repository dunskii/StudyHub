/**
 * React Query hooks for note management.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import {
  notesApi,
  type NoteCreateRequest,
  type NoteListParams,
  type NoteListResponse,
  type NoteResponse,
  type NoteUpdateRequest,
  type OCRStatusResponse,
  type CurriculumAlignmentResponse,
  type UploadUrlRequest,
} from '@/lib/api/notes'
import { useNoteStore } from '@/stores/noteStore'

// =============================================================================
// Query Keys
// =============================================================================

export const noteKeys = {
  all: ['notes'] as const,
  lists: () => [...noteKeys.all, 'list'] as const,
  list: (params: NoteListParams) => [...noteKeys.lists(), params] as const,
  details: () => [...noteKeys.all, 'detail'] as const,
  detail: (id: string) => [...noteKeys.details(), id] as const,
  ocrStatus: (id: string) => [...noteKeys.all, 'ocr', id] as const,
}

// =============================================================================
// Note List Hooks
// =============================================================================

/**
 * Hook to get a paginated list of notes.
 */
export function useNotes(params: NoteListParams) {
  return useQuery<NoteListResponse>({
    queryKey: noteKeys.list(params),
    queryFn: () => notesApi.getNotes(params),
    enabled: Boolean(params.student_id),
  })
}

/**
 * Hook to get a single note by ID.
 */
export function useNote(noteId: string | null, studentId: string | null) {
  return useQuery<NoteResponse>({
    queryKey: noteKeys.detail(noteId ?? ''),
    queryFn: () => notesApi.getNote(noteId!, studentId!),
    enabled: Boolean(noteId && studentId),
  })
}

// =============================================================================
// Note Mutation Hooks
// =============================================================================

/**
 * Hook to upload a note file and create the note record.
 * Handles the full upload flow: presigned URL -> upload to storage -> create note.
 */
export function useUploadNote() {
  const queryClient = useQueryClient()
  const { setUploadProgress, setUploading, setUploadError, clearUploadState } =
    useNoteStore()

  return useMutation({
    mutationFn: async ({
      studentId,
      file,
      title,
      subjectId,
      tags,
    }: {
      studentId: string
      file: File
      title: string
      subjectId?: string
      tags?: string[]
    }) => {
      setUploading(true)
      setUploadError(null)
      setUploadProgress(0)

      try {
        // Step 1: Get presigned upload URL
        const uploadRequest: UploadUrlRequest = {
          filename: file.name,
          content_type: file.type,
        }
        const uploadUrl = await notesApi.getUploadUrl(studentId, uploadRequest)

        // Step 2: Upload file to storage
        await notesApi.uploadFileToStorage(
          uploadUrl.upload_url,
          uploadUrl.fields,
          file,
          (progress) => setUploadProgress(progress)
        )

        // Step 3: Create note record
        const noteRequest: NoteCreateRequest = {
          title,
          storage_key: uploadUrl.storage_key,
          content_type: file.type,
          subject_id: subjectId,
          tags,
        }
        const note = await notesApi.createNote(studentId, noteRequest)

        return note
      } finally {
        setUploading(false)
      }
    },
    onSuccess: (data) => {
      // Invalidate note list queries
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() })
      clearUploadState()
    },
    onError: (error: Error) => {
      setUploadError(error.message || 'Failed to upload note')
    },
  })
}

/**
 * Hook to update a note's metadata.
 */
export function useUpdateNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      noteId,
      studentId,
      request,
    }: {
      noteId: string
      studentId: string
      request: NoteUpdateRequest
    }) => notesApi.updateNote(noteId, studentId, request),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: noteKeys.detail(variables.noteId) })
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() })
    },
  })
}

/**
 * Hook to delete a note.
 */
export function useDeleteNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ noteId, studentId }: { noteId: string; studentId: string }) =>
      notesApi.deleteNote(noteId, studentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() })
      queryClient.removeQueries({ queryKey: noteKeys.detail(variables.noteId) })
    },
  })
}

// =============================================================================
// OCR Hooks
// =============================================================================

/**
 * Hook to trigger OCR processing for a note.
 */
export function useTriggerOcr() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ noteId, studentId }: { noteId: string; studentId: string }) =>
      notesApi.triggerOcr(noteId, studentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: noteKeys.ocrStatus(variables.noteId) })
      queryClient.invalidateQueries({ queryKey: noteKeys.detail(variables.noteId) })
    },
  })
}

/**
 * Hook to poll OCR status.
 */
export function useOcrStatus(noteId: string | null, studentId: string | null) {
  return useQuery<OCRStatusResponse>({
    queryKey: noteKeys.ocrStatus(noteId ?? ''),
    queryFn: () => notesApi.getOcrStatus(noteId!, studentId!),
    enabled: Boolean(noteId && studentId),
    refetchInterval: (query) => {
      // Stop polling when OCR is complete or failed
      const status = query.state.data?.status
      if (status === 'completed' || status === 'failed' || status === 'not_applicable') {
        return false
      }
      return 2000 // Poll every 2 seconds while processing
    },
  })
}

// =============================================================================
// Curriculum Alignment Hooks
// =============================================================================

/**
 * Hook to get AI-suggested curriculum outcomes.
 */
export function useAlignCurriculum() {
  return useMutation<
    CurriculumAlignmentResponse,
    Error,
    { noteId: string; studentId: string }
  >({
    mutationFn: ({ noteId, studentId }) => notesApi.alignCurriculum(noteId, studentId),
  })
}

/**
 * Hook to update linked curriculum outcomes.
 */
export function useUpdateOutcomes() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      noteId,
      studentId,
      outcomeIds,
    }: {
      noteId: string
      studentId: string
      outcomeIds: string[]
    }) => notesApi.updateOutcomes(noteId, studentId, outcomeIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: noteKeys.detail(variables.noteId) })
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() })
    },
  })
}

// =============================================================================
// Combined Hook for Note Management
// =============================================================================

/**
 * Combined hook for note management with store integration.
 */
export function useNoteManager(studentId: string | null) {
  const store = useNoteStore()
  const uploadNote = useUploadNote()
  const updateNote = useUpdateNote()
  const deleteNote = useDeleteNote()
  const triggerOcr = useTriggerOcr()
  const alignCurriculum = useAlignCurriculum()
  const updateOutcomes = useUpdateOutcomes()

  // Notes list with filters
  const notesQuery = useNotes({
    student_id: studentId ?? '',
    subject_id: store.selectedSubjectId ?? undefined,
    search: store.searchQuery || undefined,
    limit: 50,
    offset: 0,
  })

  // Upload a new note
  const upload = useCallback(
    async (file: File, title: string, subjectId?: string, tags?: string[]) => {
      if (!studentId) throw new Error('No student selected')
      return uploadNote.mutateAsync({
        studentId,
        file,
        title,
        subjectId,
        tags,
      })
    },
    [studentId, uploadNote]
  )

  // Update note metadata
  const update = useCallback(
    async (noteId: string, request: NoteUpdateRequest) => {
      if (!studentId) throw new Error('No student selected')
      return updateNote.mutateAsync({ noteId, studentId, request })
    },
    [studentId, updateNote]
  )

  // Delete a note
  const remove = useCallback(
    async (noteId: string) => {
      if (!studentId) throw new Error('No student selected')
      return deleteNote.mutateAsync({ noteId, studentId })
    },
    [studentId, deleteNote]
  )

  // Trigger OCR processing
  const processOcr = useCallback(
    async (noteId: string) => {
      if (!studentId) throw new Error('No student selected')
      return triggerOcr.mutateAsync({ noteId, studentId })
    },
    [studentId, triggerOcr]
  )

  // Get curriculum suggestions
  const getCurriculumSuggestions = useCallback(
    async (noteId: string) => {
      if (!studentId) throw new Error('No student selected')
      return alignCurriculum.mutateAsync({ noteId, studentId })
    },
    [studentId, alignCurriculum]
  )

  // Update linked outcomes
  const setOutcomes = useCallback(
    async (noteId: string, outcomeIds: string[]) => {
      if (!studentId) throw new Error('No student selected')
      return updateOutcomes.mutateAsync({ noteId, studentId, outcomeIds })
    },
    [studentId, updateOutcomes]
  )

  return {
    // Query data
    notes: notesQuery.data?.notes ?? [],
    total: notesQuery.data?.total ?? 0,
    isLoading: notesQuery.isLoading,
    error: notesQuery.error,

    // Upload state
    uploadProgress: store.uploadProgress,
    isUploading: store.isUploading,
    uploadError: store.uploadError,

    // Filter state
    selectedSubjectId: store.selectedSubjectId,
    searchQuery: store.searchQuery,

    // Actions
    upload,
    update,
    remove,
    processOcr,
    getCurriculumSuggestions,
    setOutcomes,

    // Filter actions
    setSubjectFilter: store.setSelectedSubjectId,
    setSearchQuery: store.setSearchQuery,
    clearFilters: () => store.setFilter(null, ''),

    // Refetch
    refetch: notesQuery.refetch,
  }
}
