/**
 * Note viewer component for displaying a single note with OCR text.
 */
import { useState, memo } from 'react'
import {
  X,
  ZoomIn,
  ZoomOut,
  FileText,
  Tag,
  Clock,
  Trash2,
  Wand2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { OCRStatus } from './OCRStatus'
import type { NoteResponse } from '@/lib/api/notes'

interface NoteViewerProps {
  /** Note to display */
  note: NoteResponse
  /** Download URL for the full image */
  downloadUrl?: string
  /** Whether OCR is processing */
  isOcrProcessing?: boolean
  /** Whether curriculum alignment is loading */
  isAligning?: boolean
  /** Callback to close the viewer */
  onClose?: () => void
  /** Callback to delete the note */
  onDelete?: () => void
  /** Callback to trigger OCR */
  onTriggerOcr?: () => void
  /** Callback to align curriculum */
  onAlignCurriculum?: () => void
  /** Custom class name */
  className?: string
}

/**
 * Format a date for display.
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * NoteViewer displays a full note with image and OCR text.
 */
export const NoteViewer = memo(function NoteViewer({
  note,
  downloadUrl,
  isOcrProcessing = false,
  isAligning = false,
  onClose,
  onDelete,
  onTriggerOcr,
  onAlignCurriculum,
  className,
}: NoteViewerProps) {
  const [zoom, setZoom] = useState(1)
  const [showOcrText, setShowOcrText] = useState(true)

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3))
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5))

  const hasOcrText = note.ocr_text && note.ocr_text.length > 0
  const canTriggerOcr =
    note.ocr_status === 'pending' || note.ocr_status === 'failed'

  return (
    <div className={cn('flex h-full flex-col bg-white', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900">{note.title}</h2>
          <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDate(note.created_at)}
            </span>
            <OCRStatus status={note.ocr_status} showLabel />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Image viewer */}
        <div className="relative flex-1 overflow-auto bg-gray-900 p-4">
          {/* Zoom controls */}
          <div className="absolute left-4 top-4 z-10 flex gap-1 rounded-lg bg-black/50 p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              className="text-white hover:bg-white/20"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="flex items-center px-2 text-sm text-white">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              className="text-white hover:bg-white/20"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {/* Image */}
          <div
            className="flex min-h-full items-center justify-center"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
          >
            {downloadUrl ? (
              <img
                src={downloadUrl}
                alt={note.title}
                className="max-h-full max-w-full object-contain"
              />
            ) : note.thumbnail_url ? (
              <img
                src={note.thumbnail_url}
                alt={note.title}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center text-gray-400">
                <FileText className="h-16 w-16" />
                <p className="mt-2">No preview available</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - OCR Text */}
        <div className="flex w-80 flex-col border-l border-gray-200 bg-gray-50">
          {/* OCR Text header */}
          <button
            onClick={() => setShowOcrText(!showOcrText)}
            className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3"
          >
            <span className="font-medium text-gray-900">OCR Text</span>
            {showOcrText ? (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </button>

          {showOcrText && (
            <div className="flex-1 overflow-auto p-4">
              {hasOcrText ? (
                <div className="whitespace-pre-wrap rounded-lg bg-white p-4 text-sm text-gray-700 shadow-sm">
                  {note.ocr_text}
                </div>
              ) : isOcrProcessing ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                  <p className="text-sm text-gray-500">Processing OCR...</p>
                </div>
              ) : canTriggerOcr ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <FileText className="mb-4 h-8 w-8 text-gray-300" />
                  <p className="mb-4 text-sm text-gray-500">
                    {note.ocr_status === 'failed'
                      ? 'OCR processing failed. Would you like to try again?'
                      : 'No text extracted yet. Click below to process.'}
                  </p>
                  {onTriggerOcr && (
                    <Button size="sm" onClick={onTriggerOcr}>
                      Process OCR
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 text-center">
                  <FileText className="mb-4 h-8 w-8 text-gray-300" />
                  <p className="text-sm text-gray-500">
                    No text available for this note.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* AI Curriculum Alignment */}
          {hasOcrText && (
            <div className="border-t border-gray-200 bg-white p-4">
              <Button
                variant="outline"
                size="sm"
                onClick={onAlignCurriculum}
                disabled={isAligning}
                className="w-full"
              >
                <Wand2 className="mr-2 h-4 w-4" />
                {isAligning ? 'Analysing...' : 'Suggest Curriculum Tags'}
              </Button>
            </div>
          )}

          {/* Tags */}
          {note.tags && note.tags.length > 0 && (
            <div className="border-t border-gray-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-medium text-gray-700">Tags</h3>
              <div className="flex flex-wrap gap-1">
                {note.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

export default NoteViewer
