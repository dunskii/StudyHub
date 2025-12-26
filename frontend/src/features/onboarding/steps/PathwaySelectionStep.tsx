/**
 * PathwaySelectionStep - Third step of onboarding wizard (Stage 5 only).
 *
 * Allows selecting pathways (5.1, 5.2, 5.3) for applicable subjects.
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui';
import type { SubjectSelection } from '../OnboardingWizard';

// Pathway descriptions for NSW Stage 5
const PATHWAY_INFO = {
  '5.1': {
    name: 'Pathway 5.1',
    description: 'Foundation level - builds core skills and understanding',
  },
  '5.2': {
    name: 'Pathway 5.2',
    description: 'Intermediate level - extends knowledge and application',
  },
  '5.3': {
    name: 'Pathway 5.3',
    description: 'Advanced level - prepares for higher-level senior courses',
  },
};

// Subjects that have pathways in Stage 5
const PATHWAY_SUBJECTS = ['MATH'];

interface PathwaySelectionStepProps {
  subjects: SubjectSelection[];
  onSubmit: (subjects: SubjectSelection[]) => void;
  onBack: () => void;
}

export function PathwaySelectionStep({
  subjects,
  onSubmit,
  onBack,
}: PathwaySelectionStepProps) {
  // Filter subjects that need pathway selection
  const subjectsNeedingPathways = subjects.filter((s) =>
    PATHWAY_SUBJECTS.includes(s.subjectCode)
  );

  const [pathways, setPathways] = useState<Map<string, string>>(
    new Map(
      subjects
        .filter((s) => s.pathway)
        .map((s) => [s.subjectId, s.pathway!])
    )
  );

  /**
   * Set pathway for a subject.
   */
  const setPathway = useCallback((subjectId: string, pathway: string) => {
    setPathways((prev) => new Map(prev).set(subjectId, pathway));
  }, []);

  /**
   * Check if all pathways are selected.
   */
  const allPathwaysSelected = subjectsNeedingPathways.every((s) =>
    pathways.has(s.subjectId)
  );

  /**
   * Handle form submission.
   */
  const handleSubmit = () => {
    const updatedSubjects = subjects.map((s) => ({
      ...s,
      pathway: pathways.get(s.subjectId),
    }));
    onSubmit(updatedSubjects);
  };

  if (subjectsNeedingPathways.length === 0) {
    // No pathway subjects selected, skip this step
    handleSubmit();
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Select pathways</h2>
        <p className="mt-1 text-sm text-gray-600">
          Choose the appropriate pathway for each subject
        </p>
      </div>

      <div className="space-y-6">
        {subjectsNeedingPathways.map((subject) => (
          <div key={subject.subjectId} className="space-y-3">
            <h3 className="font-medium">{subject.subjectName}</h3>

            <div className="space-y-2">
              {(['5.1', '5.2', '5.3'] as const).map((pathway) => {
                const isSelected = pathways.get(subject.subjectId) === pathway;
                const info = PATHWAY_INFO[pathway];

                return (
                  <button
                    key={pathway}
                    type="button"
                    onClick={() => setPathway(subject.subjectId, pathway)}
                    className={`w-full rounded-lg border-2 p-3 text-left transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    aria-pressed={isSelected}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{info.name}</span>
                      {isSelected && (
                        <span className="text-sm text-blue-600">Selected</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{info.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!allPathwaysSelected}
          className="flex-1"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
