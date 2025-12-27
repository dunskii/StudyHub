/**
 * RevisionPage - main page for flashcard revision and management.
 */
import { useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Plus,
  Sparkles,
  LayoutGrid,
  BarChart3,
  Play,
  BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import {
  FlashcardList,
  FlashcardCreator,
  RevisionSession,
  RevisionProgress,
  GenerateFromNote,
} from '@/features/revision'
import { useRevisionManager } from '@/hooks/useRevision'
import { useRevisionStore, selectSessionProgress } from '@/stores/revisionStore'
import type { Flashcard, FlashcardCreate, FlashcardDraft } from '@/lib/api/revision'

// TODO: Get from auth context
const MOCK_STUDENT_ID = 'mock-student-id'

type TabType = 'cards' | 'create' | 'generate' | 'progress'

export default function RevisionPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = (searchParams.get('tab') as TabType) || 'cards'

  const [showSessionModal, setShowSessionModal] = useState(false)
  const [editingFlashcard, setEditingFlashcard] = useState<Flashcard | null>(null)

  const store = useRevisionStore()
  const manager = useRevisionManager(MOCK_STUDENT_ID)

  const setActiveTab = useCallback(
    (tab: TabType) => {
      setSearchParams({ tab })
    },
    [setSearchParams]
  )

  const handleStartSession = useCallback(() => {
    if (manager.dueCards.length > 0) {
      manager.startSession(manager.dueCards)
      setShowSessionModal(true)
    }
  }, [manager])

  const handleEndSession = useCallback(() => {
    manager.endSession()
    setShowSessionModal(false)
  }, [manager])

  const handleCreateFlashcard = useCallback(
    async (data: FlashcardCreate) => {
      await manager.create(data)
      setActiveTab('cards')
    },
    [manager, setActiveTab]
  )

  const handleGenerate = useCallback(
    async (count: number): Promise<FlashcardDraft[]> => {
      // For demo, we'll use a mock note/outcome
      // In real implementation, user would select the source
      const response = await manager.generate({ count })
      return response.drafts
    },
    [manager]
  )

  const handleApproveGenerated = useCallback(
    async (flashcards: FlashcardCreate[]) => {
      await manager.approveGenerated(flashcards)
      setActiveTab('cards')
    },
    [manager, setActiveTab]
  )

  const handleDeleteFlashcard = useCallback(
    async (flashcardId: string) => {
      if (confirm('Are you sure you want to delete this flashcard?')) {
        await manager.remove(flashcardId)
      }
    },
    [manager]
  )

  const handleEditFlashcard = useCallback((flashcard: Flashcard) => {
    setEditingFlashcard(flashcard)
  }, [])

  const handleUpdateFlashcard = useCallback(
    async (data: FlashcardCreate) => {
      if (editingFlashcard) {
        await manager.update(editingFlashcard.id, {
          front: data.front,
          back: data.back,
          difficulty_level: data.difficulty_level,
          tags: data.tags,
        })
        setEditingFlashcard(null)
      }
    },
    [editingFlashcard, manager]
  )

  const sessionProgress = selectSessionProgress(store)

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Revision
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Master your knowledge with spaced repetition
          </p>
        </div>

        <div className="flex items-center gap-3">
          {manager.dueCardsCount > 0 && (
            <Button
              variant="primary"
              onClick={handleStartSession}
              className="flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Review {manager.dueCardsCount} Due Cards
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => setActiveTab('create')}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg mb-6 overflow-x-auto">
        <button
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-shrink-0 ${
            activeTab === 'cards'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
          onClick={() => setActiveTab('cards')}
        >
          <LayoutGrid className="w-4 h-4" />
          All Cards
        </button>
        <button
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-shrink-0 ${
            activeTab === 'create'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
          onClick={() => setActiveTab('create')}
        >
          <Plus className="w-4 h-4" />
          Create
        </button>
        <button
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-shrink-0 ${
            activeTab === 'generate'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
          onClick={() => setActiveTab('generate')}
        >
          <Sparkles className="w-4 h-4" />
          AI Generate
        </button>
        <button
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-shrink-0 ${
            activeTab === 'progress'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
          onClick={() => setActiveTab('progress')}
        >
          <BarChart3 className="w-4 h-4" />
          Progress
        </button>
      </div>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {activeTab === 'cards' && (
          <div>
            {manager.flashcards.length === 0 && !manager.isLoadingFlashcards ? (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No flashcards yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Create your first flashcard to start learning
                </p>
                <div className="flex justify-center gap-3">
                  <Button
                    variant="primary"
                    onClick={() => setActiveTab('create')}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create Flashcard
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setActiveTab('generate')}
                    className="flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Generate with AI
                  </Button>
                </div>
              </div>
            ) : (
              <FlashcardList
                flashcards={manager.flashcards}
                isLoading={manager.isLoadingFlashcards}
                onSearch={manager.setSearchQuery}
                onEdit={handleEditFlashcard}
                onDelete={handleDeleteFlashcard}
              />
            )}
          </div>
        )}

        {activeTab === 'create' && (
          <FlashcardCreator
            onSubmit={handleCreateFlashcard}
            onCancel={() => setActiveTab('cards')}
            isSubmitting={manager.isCreating}
          />
        )}

        {activeTab === 'generate' && (
          <GenerateFromNote
            onGenerate={handleGenerate}
            onApprove={handleApproveGenerated}
            onCancel={() => setActiveTab('cards')}
            isGenerating={manager.isGenerating}
            isApproving={manager.isCreating}
          />
        )}

        {activeTab === 'progress' && (
          <RevisionProgress
            progress={manager.progress}
            subjectProgress={manager.subjectProgress}
            isLoading={manager.isLoadingProgress}
            onStartRevision={handleStartSession}
            onSubjectClick={(subjectId) => {
              manager.setSubjectFilter(subjectId)
              setActiveTab('cards')
            }}
          />
        )}
      </div>

      {/* Revision session modal */}
      <Modal
        isOpen={showSessionModal}
        onClose={handleEndSession}
        title=""
        size="xl"
      >
        {store.isInSession && (
          <RevisionSession
            cards={store.sessionCards}
            currentIndex={store.currentCardIndex}
            showAnswer={store.showAnswer}
            correctCount={sessionProgress.correctCount}
            answeredCount={sessionProgress.answered}
            startTime={store.startTime ?? Date.now()}
            onFlip={store.flipCard}
            onAnswer={(wasCorrect, difficulty) => {
              manager.handleAnswer(wasCorrect, difficulty)
            }}
            onNext={store.nextCard}
            onPrevious={store.previousCard}
            onEnd={handleEndSession}
            isSubmitting={manager.isSubmittingAnswer}
          />
        )}
      </Modal>

      {/* Edit flashcard modal */}
      <Modal
        isOpen={!!editingFlashcard}
        onClose={() => setEditingFlashcard(null)}
        title="Edit Flashcard"
      >
        {editingFlashcard && (
          <FlashcardCreator
            onSubmit={handleUpdateFlashcard}
            onCancel={() => setEditingFlashcard(null)}
            isSubmitting={manager.isUpdating}
          />
        )}
      </Modal>
    </div>
  )
}
