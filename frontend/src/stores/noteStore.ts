/**
 * Zustand store for managing note state.
 */
import { create } from 'zustand'
import type { NoteResponse } from '@/lib/api/notes'

export interface NoteState {
  // Upload state
  uploadProgress: number
  isUploading: boolean
  uploadError: string | null

  // Current note being viewed/edited
  currentNote: NoteResponse | null

  // Filter state
  selectedSubjectId: string | null
  searchQuery: string

  // Actions
  setUploadProgress: (progress: number) => void
  setUploading: (isUploading: boolean) => void
  setUploadError: (error: string | null) => void
  setCurrentNote: (note: NoteResponse | null) => void
  setSelectedSubjectId: (subjectId: string | null) => void
  setSearchQuery: (query: string) => void
  setFilter: (subjectId: string | null, query: string) => void
  clearUploadState: () => void
  reset: () => void
}

const initialState = {
  uploadProgress: 0,
  isUploading: false,
  uploadError: null,
  currentNote: null,
  selectedSubjectId: null,
  searchQuery: '',
}

export const useNoteStore = create<NoteState>()((set) => ({
  ...initialState,

  setUploadProgress: (progress) => set({ uploadProgress: progress }),

  setUploading: (isUploading) => set({ isUploading }),

  setUploadError: (error) => set({ uploadError: error }),

  setCurrentNote: (note) => set({ currentNote: note }),

  setSelectedSubjectId: (subjectId) => set({ selectedSubjectId: subjectId }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setFilter: (subjectId, query) =>
    set({ selectedSubjectId: subjectId, searchQuery: query }),

  clearUploadState: () =>
    set({
      uploadProgress: 0,
      isUploading: false,
      uploadError: null,
    }),

  reset: () => set(initialState),
}))
