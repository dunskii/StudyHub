/**
 * Chat input component for sending messages to the tutor.
 */
import { useState, useCallback, type FormEvent, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  isSending?: boolean
  placeholder?: string
  maxLength?: number
}

/**
 * ChatInput component provides a text area for composing messages.
 */
export function ChatInput({
  onSend,
  disabled = false,
  isSending = false,
  placeholder = 'Type your question here...',
  maxLength = 4000,
}: ChatInputProps) {
  const [message, setMessage] = useState('')

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      if (message.trim() && !disabled && !isSending) {
        onSend(message.trim())
        setMessage('')
      }
    },
    [message, disabled, isSending, onSend]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Send on Enter, but not Shift+Enter (which adds a new line)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (message.trim() && !disabled && !isSending) {
          onSend(message.trim())
          setMessage('')
        }
      }
    },
    [message, disabled, isSending, onSend]
  )

  const isDisabled = disabled || isSending
  const canSend = message.trim().length > 0 && !isDisabled

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-200 bg-white p-4">
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isDisabled}
            maxLength={maxLength}
            rows={1}
            className={cn(
              'w-full resize-none rounded-lg border border-gray-300 px-4 py-3',
              'text-sm placeholder:text-gray-400',
              'focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none',
              'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
              'min-h-[48px] max-h-[200px]'
            )}
            style={{
              height: 'auto',
              minHeight: '48px',
            }}
            aria-label="Message input"
          />

          {/* Character count */}
          {message.length > maxLength * 0.8 && (
            <span
              className={cn(
                'absolute right-2 bottom-2 text-xs',
                message.length >= maxLength ? 'text-red-500' : 'text-gray-400'
              )}
            >
              {message.length}/{maxLength}
            </span>
          )}
        </div>

        <Button
          type="submit"
          disabled={!canSend}
          isLoading={isSending}
          className="flex-shrink-0"
          aria-label="Send message"
        >
          {!isSending && <Send className="w-4 h-4" />}
          <span className="ml-2 hidden sm:inline">Send</span>
        </Button>
      </div>

      {/* Hint text */}
      <p className="text-xs text-gray-400 mt-2">
        Press Enter to send, Shift+Enter for new line
      </p>
    </form>
  )
}

export default ChatInput
