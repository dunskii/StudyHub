/**
 * Typing indicator component shown when the tutor is "thinking".
 */
import { Bot } from 'lucide-react'

interface TypingIndicatorProps {
  /** Optional custom text to display */
  text?: string
}

/**
 * TypingIndicator shows an animated indicator while waiting for AI response.
 */
export function TypingIndicator({ text = 'Tutor is thinking' }: TypingIndicatorProps) {
  return (
    <div className="flex gap-3 p-4" role="status" aria-label={text}>
      {/* Avatar */}
      <div
        className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600"
        aria-hidden="true"
      >
        <Bot className="w-4 h-4" />
      </div>

      {/* Indicator */}
      <div className="flex flex-col items-start">
        <div className="bg-gray-100 rounded-lg rounded-tl-none px-4 py-3">
          <div className="flex items-center gap-2">
            {/* Animated dots */}
            <div className="flex gap-1">
              <span
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
            <span className="text-sm text-gray-500">{text}...</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TypingIndicator
