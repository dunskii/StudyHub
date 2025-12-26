/**
 * PathwaySelector - Allows selecting a Stage 5 pathway.
 *
 * Used for subjects like Mathematics that have different pathways
 * (5.1, 5.2, 5.3) in Stage 5.
 */

interface PathwayInfo {
  code: string;
  name: string;
  description: string;
  difficulty: 'Foundation' | 'Intermediate' | 'Advanced';
}

const PATHWAYS: PathwayInfo[] = [
  {
    code: '5.1',
    name: 'Pathway 5.1',
    description:
      'Foundation level focusing on core mathematical skills and practical applications.',
    difficulty: 'Foundation',
  },
  {
    code: '5.2',
    name: 'Pathway 5.2',
    description:
      'Intermediate level extending mathematical knowledge and problem-solving abilities.',
    difficulty: 'Intermediate',
  },
  {
    code: '5.3',
    name: 'Pathway 5.3',
    description:
      'Advanced level preparing students for higher-level senior mathematics courses.',
    difficulty: 'Advanced',
  },
];

interface PathwaySelectorProps {
  selectedPathway: string | null;
  onSelect: (pathway: string) => void;
  disabled?: boolean;
}

export function PathwaySelector({
  selectedPathway,
  onSelect,
  disabled = false,
}: PathwaySelectorProps) {
  return (
    <div className="space-y-2">
      {PATHWAYS.map((pathway) => {
        const isSelected = selectedPathway === pathway.code;

        return (
          <button
            key={pathway.code}
            type="button"
            onClick={() => onSelect(pathway.code)}
            disabled={disabled}
            className={`w-full rounded-lg border-2 p-4 text-left transition-colors ${
              isSelected
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            aria-pressed={isSelected}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">{pathway.name}</span>
                <DifficultyBadge difficulty={pathway.difficulty} />
              </div>
              {isSelected && <CheckIcon className="h-5 w-5 text-blue-600" />}
            </div>
            <p className="mt-1 text-sm text-gray-600">{pathway.description}</p>
          </button>
        );
      })}
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: PathwayInfo['difficulty'] }) {
  const colours = {
    Foundation: 'bg-green-100 text-green-700',
    Intermediate: 'bg-yellow-100 text-yellow-700',
    Advanced: 'bg-purple-100 text-purple-700',
  };

  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${colours[difficulty]}`}>
      {difficulty}
    </span>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
