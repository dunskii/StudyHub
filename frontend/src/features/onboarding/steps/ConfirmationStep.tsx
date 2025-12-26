/**
 * ConfirmationStep - Final step of onboarding wizard.
 *
 * Shows a summary and confirms the setup.
 */

import { Button } from '@/components/ui';
import type { StudentFormData, SubjectSelection } from '../OnboardingWizard';

const STAGE_NAMES: Record<string, string> = {
  ES1: 'Early Stage 1',
  S1: 'Stage 1',
  S2: 'Stage 2',
  S3: 'Stage 3',
  S4: 'Stage 4',
  S5: 'Stage 5',
  S6: 'Stage 6',
};

const GRADE_NAMES: Record<number, string> = {
  0: 'Kindergarten',
  1: 'Year 1',
  2: 'Year 2',
  3: 'Year 3',
  4: 'Year 4',
  5: 'Year 5',
  6: 'Year 6',
  7: 'Year 7',
  8: 'Year 8',
  9: 'Year 9',
  10: 'Year 10',
  11: 'Year 11',
  12: 'Year 12',
};

interface ConfirmationStepProps {
  studentData: StudentFormData;
  subjects: SubjectSelection[];
  onConfirm: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

export function ConfirmationStep({
  studentData,
  subjects,
  onConfirm,
  onBack,
  isLoading = false,
}: ConfirmationStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Confirm setup</h2>
        <p className="mt-1 text-sm text-gray-600">
          Review the details before completing setup
        </p>
      </div>

      {/* Student details */}
      <div className="rounded-lg bg-gray-50 p-4">
        <h3 className="font-medium">Student</h3>
        <dl className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-600">Name</dt>
            <dd className="font-medium">{studentData.displayName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Grade</dt>
            <dd className="font-medium">{GRADE_NAMES[studentData.gradeLevel]}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Stage</dt>
            <dd className="font-medium">{STAGE_NAMES[studentData.schoolStage]}</dd>
          </div>
        </dl>
      </div>

      {/* Selected subjects */}
      <div className="rounded-lg bg-gray-50 p-4">
        <h3 className="font-medium">Subjects ({subjects.length})</h3>
        <ul className="mt-2 space-y-2">
          {subjects.map((subject) => (
            <li
              key={subject.subjectId}
              className="flex items-center justify-between text-sm"
            >
              <span>{subject.subjectName}</span>
              {subject.pathway && (
                <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                  Pathway {subject.pathway}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg bg-green-50 p-4">
        <p className="text-sm text-green-700">
          Once confirmed, {studentData.displayName} will be able to start learning
          with their selected subjects. You can always add or remove subjects later.
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isLoading}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? 'Setting up...' : 'Complete setup'}
        </Button>
      </div>
    </div>
  );
}
