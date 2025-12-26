/**
 * EnrolmentCard - Displays a single subject enrolment with progress.
 */

import { Card } from '@/components/ui';
import type { Enrolment } from '@/lib/api';

interface EnrolmentCardProps {
  enrolment: Enrolment;
  onUnenrol?: () => void;
  onClick?: () => void;
}

export function EnrolmentCard({ enrolment, onUnenrol, onClick }: EnrolmentCardProps) {
  const { subject, progress, pathway } = enrolment;

  return (
    <Card
      className={`relative overflow-hidden ${onClick ? 'cursor-pointer hover:shadow-md' : ''}`}
      onClick={onClick}
    >
      {/* Colour bar */}
      <div className="h-2" style={{ backgroundColor: subject.color }} />

      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium">{subject.name}</h3>
            <p className="text-sm text-gray-500">{subject.code}</p>
            {pathway && (
              <span className="mt-1 inline-block rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                Pathway {pathway}
              </span>
            )}
          </div>

          {onUnenrol && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUnenrol();
              }}
              className="text-gray-400 hover:text-red-500"
              aria-label={`Remove ${subject.name}`}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-gray-600" id={`progress-label-${enrolment.id}`}>
              Progress
            </span>
            <span className="font-medium">{progress.overallPercentage}%</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-gray-200"
            role="progressbar"
            aria-valuenow={progress.overallPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-labelledby={`progress-label-${enrolment.id}`}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progress.overallPercentage}%`,
                backgroundColor: subject.color,
              }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="mt-3 flex gap-4 text-xs text-gray-600">
          <div>
            <span className="font-medium text-gray-900">
              {progress.outcomesCompleted.length}
            </span>{' '}
            outcomes
          </div>
          <div>
            <span className="font-medium text-gray-900">{progress.xpEarned}</span> XP
          </div>
        </div>
      </div>
    </Card>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}
