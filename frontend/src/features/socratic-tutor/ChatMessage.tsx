/**
 * Individual chat message component.
 * Displays user or AI messages with appropriate styling.
 */
import { memo } from 'react'
import { cn } from '@/lib/utils'
import { AlertTriangle, User, Bot } from 'lucide-react'
import type { ChatMessage as ChatMessageType } from '@/stores/tutorStore'

interface ChatMessageProps {
  message: ChatMessageType
  isLastMessage?: boolean
}

/**
 * Format a date as a short time string.
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * ChatMessage component displays a single message in the chat.
 */
export const ChatMessage = memo(function ChatMessage({
  message,
  isLastMessage = false,
}: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn(
        'flex gap-3 p-4',
        isUser ? 'flex-row-reverse' : 'flex-row',
        isLastMessage && 'pb-6'
      )}
      role="article"
      aria-label={`${isUser ? 'Your message' : 'Tutor response'}`}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full',
          isUser ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
        )}
        aria-hidden="true"
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message content */}
      <div
        className={cn(
          'flex flex-col max-w-[75%]',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        {/* Message bubble */}
        <div
          className={cn(
            'rounded-lg px-4 py-2 text-sm',
            isUser
              ? 'bg-blue-600 text-white rounded-tr-none'
              : 'bg-gray-100 text-gray-900 rounded-tl-none',
            message.flagged && 'border-2 border-amber-400'
          )}
        >
          {/* Flagged indicator */}
          {message.flagged && (
            <div className="flex items-center gap-1 text-amber-600 text-xs mb-1">
              <AlertTriangle className="w-3 h-3" />
              <span>Flagged for review</span>
            </div>
          )}

          {/* Message text with markdown-like rendering */}
          <div className={cn('whitespace-pre-wrap', isUser ? 'text-white' : 'text-gray-900')}>
            {renderMessageContent(message.content)}
          </div>
        </div>

        {/* Timestamp */}
        <span
          className={cn(
            'text-xs text-gray-400 mt-1',
            isUser ? 'text-right' : 'text-left'
          )}
        >
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  )
})

/**
 * Simple markdown-like rendering for message content.
 * Handles bold, italic, and code formatting.
 */
function renderMessageContent(content: string): React.ReactNode {
  // Split content into paragraphs
  const paragraphs = content.split('\n\n')

  return paragraphs.map((paragraph, pIdx) => {
    // Handle bullet points
    if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
      const items = paragraph.split('\n').filter(Boolean)
      return (
        <ul key={pIdx} className="list-disc list-inside my-2">
          {items.map((item, iIdx) => (
            <li key={iIdx} className="ml-2">
              {formatInlineText(item.replace(/^[-*]\s+/, ''))}
            </li>
          ))}
        </ul>
      )
    }

    // Handle numbered lists
    if (/^\d+\.\s/.test(paragraph)) {
      const items = paragraph.split('\n').filter(Boolean)
      return (
        <ol key={pIdx} className="list-decimal list-inside my-2">
          {items.map((item, iIdx) => (
            <li key={iIdx} className="ml-2">
              {formatInlineText(item.replace(/^\d+\.\s+/, ''))}
            </li>
          ))}
        </ol>
      )
    }

    // Regular paragraph
    return (
      <p key={pIdx} className={pIdx > 0 ? 'mt-2' : ''}>
        {formatInlineText(paragraph)}
      </p>
    )
  })
}

/**
 * Format inline text elements (bold, italic, code).
 */
function formatInlineText(text: string): React.ReactNode {
  // Replace **bold** with bold
  // Replace *italic* with italic
  // Replace `code` with code styling
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    // Check for bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
    // Check for italic
    const italicMatch = remaining.match(/(?<!\*)\*([^*]+?)\*(?!\*)/)
    // Check for code
    const codeMatch = remaining.match(/`([^`]+)`/)

    // Find the first match
    const matches = [
      { match: boldMatch, type: 'bold' },
      { match: italicMatch, type: 'italic' },
      { match: codeMatch, type: 'code' },
    ].filter((m) => m.match !== null)

    if (matches.length === 0) {
      parts.push(remaining)
      break
    }

    // Get the match that appears first
    const firstMatch = matches.reduce((first, current) => {
      if (!first.match) return current
      if (!current.match) return first
      return current.match.index! < first.match.index! ? current : first
    })

    if (!firstMatch.match) {
      parts.push(remaining)
      break
    }

    // Add text before match
    if (firstMatch.match.index! > 0) {
      parts.push(remaining.substring(0, firstMatch.match.index!))
    }

    // Add formatted content
    const content = firstMatch.match[1]
    switch (firstMatch.type) {
      case 'bold':
        parts.push(<strong key={key++}>{content}</strong>)
        break
      case 'italic':
        parts.push(<em key={key++}>{content}</em>)
        break
      case 'code':
        parts.push(
          <code
            key={key++}
            className="bg-gray-200 px-1 py-0.5 rounded text-sm font-mono"
          >
            {content}
          </code>
        )
        break
    }

    // Continue with remaining text
    remaining = remaining.substring(firstMatch.match.index! + firstMatch.match[0].length)
  }

  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts
}

export default ChatMessage
