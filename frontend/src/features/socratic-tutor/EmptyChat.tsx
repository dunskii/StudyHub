/**
 * Empty state component for when there are no messages.
 * Shows a welcome message and suggested prompts.
 */
import { Bot, Lightbulb } from 'lucide-react'

interface EmptyChatProps {
  subjectName?: string
  subjectCode?: string
  onPromptClick?: (prompt: string) => void
}

/**
 * Get suggested prompts for a subject.
 */
function getSubjectPrompts(subjectCode?: string): string[] {
  switch (subjectCode?.toUpperCase()) {
    case 'MATH':
      return [
        "I'm stuck on a maths problem, can you help?",
        'How do I solve quadratic equations?',
        'Can you explain fractions to me?',
        "I don't understand algebra",
      ]
    case 'ENG':
      return [
        "I need help analysing a text",
        "How do I structure an essay?",
        'Can you help me understand this poem?',
        "I'm working on my creative writing",
      ]
    case 'SCI':
      return [
        'Can you explain photosynthesis?',
        "I'm confused about forces and motion",
        'How does the digestive system work?',
        'What is the scientific method?',
      ]
    case 'HSIE':
      return [
        'How do I analyse a historical source?',
        'Can you explain Australian history?',
        'Help me understand geography concepts',
        "What's the difference between primary and secondary sources?",
      ]
    case 'PDHPE':
      return [
        'Can you explain the health benefits of exercise?',
        'How does nutrition affect the body?',
        'What are some stress management strategies?',
        'Help me understand fitness concepts',
      ]
    case 'TAS':
      return [
        'How do I design a solution to a problem?',
        'Can you help me with my project planning?',
        'What are the steps in the design process?',
        "I'm working on a technology project",
      ]
    case 'CA':
      return [
        'How can I improve my artwork?',
        'What are the elements of art?',
        'Can you help me analyse a piece of art?',
        "I'm working on a creative project",
      ]
    case 'LANG':
      return [
        'Can you help me practise conversation?',
        "I'm struggling with grammar",
        'How do I improve my vocabulary?',
        'Can you explain this phrase?',
      ]
    default:
      return [
        "I need help with my homework",
        "Can you explain this concept to me?",
        "I'm studying for a test",
        "I don't understand this topic",
      ]
  }
}

/**
 * EmptyChat displays a welcome message when there are no messages yet.
 */
export function EmptyChat({
  subjectName = 'your studies',
  subjectCode,
  onPromptClick,
}: EmptyChatProps) {
  const prompts = getSubjectPrompts(subjectCode)

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      {/* Welcome icon */}
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
        <Bot className="w-8 h-8 text-emerald-600" />
      </div>

      {/* Welcome message */}
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Welcome to your {subjectName} tutor!
      </h2>
      <p className="text-gray-600 max-w-md mb-8">
        I&apos;m here to help you learn by guiding you through questions and problems.
        I won&apos;t just give you the answers - I&apos;ll help you discover them yourself!
      </p>

      {/* Suggested prompts */}
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
          <Lightbulb className="w-4 h-4" />
          <span>Try asking:</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {prompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => onPromptClick?.(prompt)}
              className="text-left px-4 py-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors text-sm text-gray-700"
            >
              &ldquo;{prompt}&rdquo;
            </button>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="mt-8 text-xs text-gray-400 max-w-md">
        <p>
          <strong>Tip:</strong> The more specific your question, the better I can help.
          Try including what you&apos;ve already tried or where you&apos;re stuck!
        </p>
      </div>
    </div>
  )
}

export default EmptyChat
