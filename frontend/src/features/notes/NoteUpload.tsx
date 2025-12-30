/**
 * Note upload component with drag & drop support.
 */
import { useState, useCallback, useRef } from 'react'
import { Upload, X, FileImage, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

interface NoteUploadProps {
  /** Student ID for the upload */
  studentId: string
  /** Subject ID (optional) */
  subjectId?: string
  /** Upload progress (0-100) */
  uploadProgress?: number
  /** Whether upload is in progress */
  isUploading?: boolean
  /** Upload error message */
  error?: string | null
  /** Callback when upload is requested */
  onUpload: (file: File, title: string, subjectId?: string, tags?: string[]) => Promise<void>
  /** Callback to clear state */
  onClear?: () => void
  /** Custom class name */
  className?: string
}

const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * NoteUpload provides file selection and upload functionality.
 */
export function NoteUpload({
  studentId: _studentId,
  subjectId,
  uploadProgress = 0,
  isUploading = false,
  error,
  onUpload,
  onClear,
  className,
}: NoteUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback((file: File): string | null => {
    if (!SUPPORTED_TYPES.includes(file.type)) {
      return 'Unsupported file type. Please use JPEG, PNG, WebP, HEIC, or PDF.'
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File is too large. Maximum size is 10MB.'
    }
    return null
  }, [])

  const handleFileSelect = useCallback(
    (file: File) => {
      const error = validateFile(file)
      if (error) {
        setValidationError(error)
        return
      }

      setValidationError(null)
      setSelectedFile(file)

      // Set default title from filename
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
      setTitle(nameWithoutExt)

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file)
        setPreviewUrl(url)
      } else {
        setPreviewUrl(null)
      }
    },
    [validateFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (file) {
        handleFileSelect(file)
      }
    },
    [handleFileSelect]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFileSelect(file)
      }
    },
    [handleFileSelect]
  )

  const handleClear = useCallback(() => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setTitle('')
    setValidationError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClear?.()
  }, [onClear])

  const handleSubmit = useCallback(async () => {
    if (!selectedFile || !title.trim()) return

    try {
      await onUpload(selectedFile, title.trim(), subjectId)
      handleClear()
    } catch {
      // Error is handled by parent
    }
  }, [selectedFile, title, subjectId, onUpload, handleClear])

  const displayError = validationError || error

  return (
    <div className={cn('space-y-4', className)}>
      {/* File selection area */}
      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
            isDragging
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-gray-300 hover:border-gray-400'
          )}
        >
          <Upload
            className={cn(
              'mb-4 h-12 w-12',
              isDragging ? 'text-emerald-500' : 'text-gray-400'
            )}
          />
          <p className="mb-2 text-sm font-medium text-gray-700">
            Drop your note here, or{' '}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-emerald-600 hover:text-emerald-700"
            >
              browse
            </button>
          </p>
          <p className="text-xs text-gray-500">
            JPEG, PNG, WebP, HEIC, or PDF up to 10MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept={SUPPORTED_TYPES.join(',')}
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      ) : (
        /* File preview area */
        <div className="relative rounded-lg border border-gray-200 bg-white p-4">
          {/* Clear button */}
          <button
            onClick={handleClear}
            disabled={isUploading}
            className="absolute right-2 top-2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex gap-4">
            {/* Preview */}
            <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <FileImage className="h-8 w-8 text-gray-400" />
              )}
            </div>

            {/* Details */}
            <div className="flex flex-1 flex-col">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Note title"
                disabled={isUploading}
                className="mb-2"
              />
              <p className="text-xs text-gray-500">
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            </div>
          </div>

          {/* Progress bar */}
          {isUploading && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Uploading...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {displayError && (
        <p className="text-sm text-red-600">{displayError}</p>
      )}

      {/* Submit button */}
      {selectedFile && (
        <Button
          onClick={handleSubmit}
          disabled={isUploading || !title.trim()}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Upload Note
            </>
          )}
        </Button>
      )}
    </div>
  )
}

export default NoteUpload
