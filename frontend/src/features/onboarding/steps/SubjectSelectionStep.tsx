/**
 * SubjectSelectionStep - Second step of onboarding wizard.
 *
 * Allows selecting subjects for the student to enrol in.
 */

import { useState, useCallback } from 'react';
import { useSubjectList } from '@/hooks';
import { Button, Spinner } from '@/components/ui';
import type { Subject } from '@/types/subject.types';
import type { SubjectSelection } from '../OnboardingWizard';

interface SubjectSelectionStepProps {
  frameworkId: string;
  schoolStage: string;
  selectedSubjects: SubjectSelection[];
  onSubmit: (subjects: SubjectSelection[]) => void;
  onBack: () => void;
}

export function SubjectSelectionStep({
  frameworkId: _frameworkId,
  schoolStage,
  selectedSubjects,
  onSubmit,
  onBack,
}: SubjectSelectionStepProps) {
  // Use NSW framework by default - in production frameworkId would be used
  const { data: subjects, isLoading, error } = useSubjectList('NSW');

  const [selected, setSelected] = useState<Map<string, SubjectSelection>>(
    new Map(selectedSubjects.map((s) => [s.subjectId, s]))
  );

  // Filter subjects by stage availability
  const availableSubjects = subjects.filter((subject: Subject) =>
    subject.availableStages.includes(schoolStage)
  );

  /**
   * Toggle subject selection.
   */
  const toggleSubject = useCallback(
    (subject: { id: string; name: string; code: string }) => {
      setSelected((prev) => {
        const next = new Map(prev);
        if (next.has(subject.id)) {
          next.delete(subject.id);
        } else {
          next.set(subject.id, {
            subjectId: subject.id,
            subjectName: subject.name,
            subjectCode: subject.code,
          });
        }
        return next;
      });
    },
    []
  );

  /**
   * Handle form submission.
   */
  const handleSubmit = () => {
    onSubmit(Array.from(selected.values()));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-red-600">Failed to load subjects. Please try again.</p>
        <Button onClick={onBack} variant="outline">
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Choose subjects</h2>
        <p className="mt-1 text-sm text-gray-600">
          Select the subjects your student will be studying
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {availableSubjects.map((subject: Subject) => {
          const isSelected = selected.has(subject.id);
          return (
            <button
              key={subject.id}
              type="button"
              onClick={() =>
                toggleSubject({
                  id: subject.id,
                  name: subject.name,
                  code: subject.code,
                })
              }
              className={`flex flex-col items-center rounded-lg border-2 p-4 transition-colors ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              aria-pressed={isSelected}
            >
              <div
                className="mb-2 flex h-12 w-12 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: subject.color }}
              >
                <span className="text-lg">{subject.code.charAt(0)}</span>
              </div>
              <span className="text-sm font-medium">{subject.name}</span>
              {isSelected && (
                <span className="mt-1 text-xs text-blue-600">Selected</span>
              )}
            </button>
          );
        })}
      </div>

      {availableSubjects?.length === 0 && (
        <p className="text-center text-gray-500">
          No subjects available for this stage.
        </p>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={selected.size === 0}
          className="flex-1"
        >
          Continue ({selected.size} selected)
        </Button>
      </div>
    </div>
  );
}
