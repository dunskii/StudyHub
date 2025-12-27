/**
 * Notes page for managing student notes.
 *
 * Note: This page is wrapped by AuthGuard in App.tsx which ensures
 * the user is authenticated and has an active student selected.
 */
import { useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search, X, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { NoteList, NoteUpload, NoteViewer } from '@/features/notes'
import { useNoteManager, useNote, useOcrStatus, useTriggerOcr, useAlignCurriculum } from '@/hooks'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

// Subject configuration matching the NSW curriculum
const SUBJECTS = [
  { code: 'MATH', name: 'Mathematics', color: 'bg-blue-100 text-blue-700' },
  { code: 'ENG', name: 'English', color: 'bg-purple-100 text-purple-700' },
  { code: 'SCI', name: 'Science', color: 'bg-green-100 text-green-700' },
  { code: 'HSIE', name: 'History & Geography', color: 'bg-amber-100 text-amber-700' },
  { code: 'PDHPE', name: 'PDHPE', color: 'bg-red-100 text-red-700' },
  { code: 'TAS', name: 'Technology', color: 'bg-indigo-100 text-indigo-700' },
  { code: 'CA', name: 'Creative Arts', color: 'bg-pink-100 text-pink-700' },
  { code: 'LANG', name: 'Languages', color: 'bg-teal-100 text-teal-700' },
] as const

/**
 * NotesPage is the main page for note management.
 */
export function NotesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { activeStudent } = useAuthStore()

  // State
  const [showUpload, setShowUpload] = useState(false)
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)

  // Get student ID from auth store (AuthGuard guarantees activeStudent exists)
  const studentId = activeStudent!.id

  // Note manager hook
  const noteManager = useNoteManager(studentId)

  // Selected note data
  const { data: selectedNote } = useNote(selectedNoteId, studentId)

  // OCR status polling
  const { data: ocrStatus, isLoading: isOcrPolling } = useOcrStatus(
    selectedNoteId,
    studentId
  )

  // Mutations
  const triggerOcr = useTriggerOcr()
  const alignCurriculum = useAlignCurriculum()

  // Handle subject filter from URL
  const selectedSubject = searchParams.get('subject')

  // Handle search from URL
  const searchQuery = searchParams.get('search') || ''

  // Update filters when URL params change
  const handleSubjectFilter = useCallback(
    (subjectCode: string | null) => {
      const params = new URLSearchParams(searchParams)
      if (subjectCode) {
        params.set('subject', subjectCode)
      } else {
        params.delete('subject')
      }
      setSearchParams(params)
      noteManager.setSubjectFilter(subjectCode)
    },
    [searchParams, setSearchParams, noteManager]
  )

  const handleSearch = useCallback(
    (query: string) => {
      const params = new URLSearchParams(searchParams)
      if (query) {
        params.set('search', query)
      } else {
        params.delete('search')
      }
      setSearchParams(params)
      noteManager.setSearchQuery(query)
    },
    [searchParams, setSearchParams, noteManager]
  )

  // Handle note upload
  const handleUpload = useCallback(
    async (file: File, title: string, subjectId?: string, tags?: string[]) => {
      await noteManager.upload(file, title, subjectId, tags)
      setShowUpload(false)
    },
    [noteManager]
  )

  // Handle note selection
  const handleNoteClick = useCallback((note: { id: string }) => {
    setSelectedNoteId(note.id)
  }, [])

  // Handle close viewer
  const handleCloseViewer = useCallback(() => {
    setSelectedNoteId(null)
  }, [])

  // Handle delete note
  const handleDeleteNote = useCallback(async () => {
    if (!selectedNoteId) return
    if (window.confirm('Are you sure you want to delete this note?')) {
      await noteManager.remove(selectedNoteId)
      setSelectedNoteId(null)
    }
  }, [selectedNoteId, noteManager])

  // Handle trigger OCR
  const handleTriggerOcr = useCallback(async () => {
    if (!selectedNoteId) return
    await triggerOcr.mutateAsync({ noteId: selectedNoteId, studentId })
  }, [selectedNoteId, studentId, triggerOcr])

  // Handle curriculum alignment
  const handleAlignCurriculum = useCallback(async () => {
    if (!selectedNoteId) return
    const result = await alignCurriculum.mutateAsync({
      noteId: selectedNoteId,
      studentId,
    })
    // TODO: Show suggestions in a modal
    console.log('Suggested outcomes:', result.suggested_outcomes)
  }, [selectedNoteId, studentId, alignCurriculum])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">My Notes</h1>
            <Button onClick={() => setShowUpload(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Upload Note
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Subject filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleSubjectFilter(null)}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                !selectedSubject
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              All Subjects
            </button>
            {SUBJECTS.map((subject) => (
              <button
                key={subject.code}
                onClick={() => handleSubjectFilter(subject.code)}
                className={cn(
                  'flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                  selectedSubject === subject.code
                    ? subject.color
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                <BookOpen className="h-3.5 w-3.5" />
                {subject.name}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="search"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Note list */}
        <NoteList
          notes={noteManager.notes}
          isLoading={noteManager.isLoading}
          error={noteManager.error?.message}
          selectedNoteId={selectedNoteId}
          onNoteClick={handleNoteClick}
          onRetry={noteManager.refetch}
        />

        {/* Upload modal */}
        {showUpload && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Upload Note
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUpload(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <NoteUpload
                studentId={studentId}
                uploadProgress={noteManager.uploadProgress}
                isUploading={noteManager.isUploading}
                error={noteManager.uploadError}
                onUpload={handleUpload}
              />
            </div>
          </div>
        )}

        {/* Note viewer modal */}
        {selectedNote && (
          <div className="fixed inset-0 z-50 bg-white">
            <NoteViewer
              note={selectedNote}
              downloadUrl={selectedNote.download_url}
              isOcrProcessing={isOcrPolling || triggerOcr.isPending}
              isAligning={alignCurriculum.isPending}
              onClose={handleCloseViewer}
              onDelete={handleDeleteNote}
              onTriggerOcr={handleTriggerOcr}
              onAlignCurriculum={handleAlignCurriculum}
            />
          </div>
        )}
      </main>
    </div>
  )
}

export default NotesPage
