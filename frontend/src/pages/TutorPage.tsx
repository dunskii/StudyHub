/**
 * Tutor page for the Socratic AI tutor feature.
 * Handles subject selection and chat interface.
 *
 * Note: This page is wrapped by AuthGuard in App.tsx which ensures
 * the user is authenticated and has an active student selected.
 */
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TutorChat, ConversationHistory } from '@/features/socratic-tutor'
import { Button } from '@/components/ui/Button'
import { BookOpen, History, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

// Subject configuration matching the NSW curriculum
const SUBJECTS = [
  { code: 'MATH', name: 'Mathematics', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { code: 'ENG', name: 'English', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { code: 'SCI', name: 'Science', color: 'bg-green-100 text-green-700 border-green-200' },
  { code: 'HSIE', name: 'History & Geography', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { code: 'PDHPE', name: 'PDHPE', color: 'bg-red-100 text-red-700 border-red-200' },
  { code: 'TAS', name: 'Technology', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { code: 'CA', name: 'Creative Arts', color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { code: 'LANG', name: 'Languages', color: 'bg-teal-100 text-teal-700 border-teal-200' },
] as const

type ViewMode = 'select' | 'chat' | 'history'

/**
 * TutorPage is the main page for the AI tutor feature.
 */
export function TutorPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { activeStudent } = useAuthStore()

  const [viewMode, setViewMode] = useState<ViewMode>('select')
  const [selectedSubject, setSelectedSubject] = useState<typeof SUBJECTS[number] | null>(null)

  // Handle URL params for deep linking
  useEffect(() => {
    const subjectCode = searchParams.get('subject')
    const view = searchParams.get('view')

    if (view === 'history') {
      setViewMode('history')
    } else if (subjectCode) {
      const subject = SUBJECTS.find((s) => s.code === subjectCode)
      if (subject) {
        setSelectedSubject(subject)
        setViewMode('chat')
      }
    }
  }, [searchParams])

  // Get student ID from auth store (AuthGuard guarantees activeStudent exists)
  const studentId = activeStudent!.id

  // Handle subject selection
  const handleSelectSubject = (subject: typeof SUBJECTS[number]) => {
    setSelectedSubject(subject)
    setViewMode('chat')
    setSearchParams({ subject: subject.code })
  }

  // Handle going back to subject selection
  const handleBack = () => {
    setSelectedSubject(null)
    setViewMode('select')
    setSearchParams({})
  }

  // Handle viewing history
  const handleViewHistory = () => {
    setViewMode('history')
    setSearchParams({ view: 'history' })
  }

  // Handle session end
  const handleSessionEnd = () => {
    handleBack()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {viewMode !== 'select' && (
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              <h1 className="text-xl font-semibold text-gray-900">
                {viewMode === 'history' ? 'Tutoring History' : 'AI Tutor'}
              </h1>
            </div>

            {viewMode === 'select' && (
              <Button variant="outline" onClick={handleViewHistory}>
                <History className="w-4 h-4 mr-2" />
                View History
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {viewMode === 'select' && (
          <SubjectSelection subjects={SUBJECTS} onSelect={handleSelectSubject} />
        )}

        {viewMode === 'chat' && selectedSubject && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[calc(100vh-12rem)]">
            <TutorChat
              studentId={studentId}
              subjectCode={selectedSubject.code}
              subjectName={selectedSubject.name}
              onSessionEnd={handleSessionEnd}
              className="h-full"
            />
          </div>
        )}

        {viewMode === 'history' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <ConversationHistory studentId={studentId} />
          </div>
        )}
      </main>
    </div>
  )
}

/**
 * Subject selection grid.
 */
function SubjectSelection({
  subjects,
  onSelect,
}: {
  subjects: readonly typeof SUBJECTS[number][]
  onSelect: (subject: typeof SUBJECTS[number]) => void
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          What would you like help with today?
        </h2>
        <p className="text-gray-600">
          Choose a subject to start a tutoring session. Your AI tutor will guide you through questions using the Socratic method.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        {subjects.map((subject) => (
          <button
            key={subject.code}
            onClick={() => onSelect(subject)}
            className={cn(
              'flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all',
              'hover:scale-105 hover:shadow-md',
              subject.color
            )}
          >
            <BookOpen className="w-8 h-8" />
            <span className="font-medium text-center">{subject.name}</span>
          </button>
        ))}
      </div>

      <div className="mt-12 bg-emerald-50 rounded-lg p-6 text-center">
        <h3 className="font-semibold text-emerald-800 mb-2">
          How the Socratic Tutor works
        </h3>
        <p className="text-emerald-700 text-sm max-w-2xl mx-auto">
          Your AI tutor won&apos;t just give you answers. Instead, it will ask guiding questions to help you discover the answers yourself. This method helps you truly understand concepts and remember them better.
        </p>
      </div>
    </div>
  )
}

export default TutorPage
