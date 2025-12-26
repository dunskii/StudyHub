/**
 * StudentDetailsStep - First step of onboarding wizard.
 *
 * Collects student name, grade level, and assigns school stage.
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Label } from '@/components/ui';
import type { StudentFormData } from '../OnboardingWizard';

// NSW default framework ID - in production this would come from the API
const NSW_FRAMEWORK_ID = 'nsw';

// Grade to stage mapping for NSW
const GRADE_TO_STAGE: Record<number, string> = {
  0: 'ES1', // Kindergarten
  1: 'S1',
  2: 'S1',
  3: 'S2',
  4: 'S2',
  5: 'S3',
  6: 'S3',
  7: 'S4',
  8: 'S4',
  9: 'S5',
  10: 'S5',
  11: 'S6',
  12: 'S6',
};

const STAGE_NAMES: Record<string, string> = {
  ES1: 'Early Stage 1 (Kindergarten)',
  S1: 'Stage 1 (Years 1-2)',
  S2: 'Stage 2 (Years 3-4)',
  S3: 'Stage 3 (Years 5-6)',
  S4: 'Stage 4 (Years 7-8)',
  S5: 'Stage 5 (Years 9-10)',
  S6: 'Stage 6 (Years 11-12)',
};

const detailsSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  gradeLevel: z.coerce
    .number()
    .min(0, 'Please select a grade level')
    .max(12, 'Grade level must be between K and 12'),
});

type DetailsFormData = z.infer<typeof detailsSchema>;

interface StudentDetailsStepProps {
  defaultValues?: Partial<StudentFormData>;
  onSubmit: (data: StudentFormData) => void;
  isLoading?: boolean;
}

export function StudentDetailsStep({
  defaultValues,
  onSubmit,
  isLoading = false,
}: StudentDetailsStepProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<DetailsFormData>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      displayName: defaultValues?.displayName ?? '',
      gradeLevel: defaultValues?.gradeLevel ?? -1,
    },
  });

  const gradeLevel = watch('gradeLevel');
  const schoolStage = gradeLevel >= 0 ? GRADE_TO_STAGE[gradeLevel] : undefined;

  const handleFormSubmit = (data: DetailsFormData) => {
    const stage = GRADE_TO_STAGE[data.gradeLevel] ?? 'S1';
    onSubmit({
      displayName: data.displayName,
      gradeLevel: data.gradeLevel,
      schoolStage: stage,
      frameworkId: NSW_FRAMEWORK_ID,
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Add a student</h2>
        <p className="mt-1 text-sm text-gray-600">
          Tell us about who will be using StudyHub
        </p>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="displayName">Student&apos;s name</Label>
          <Input
            id="displayName"
            type="text"
            placeholder="Enter student's name"
            disabled={isLoading}
            {...register('displayName')}
            aria-invalid={!!errors.displayName}
            aria-describedby={errors.displayName ? 'name-error' : undefined}
          />
          {errors.displayName && (
            <p id="name-error" className="text-sm text-red-600">
              {errors.displayName.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="gradeLevel">Grade level</Label>
          <select
            id="gradeLevel"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={isLoading}
            {...register('gradeLevel')}
            aria-invalid={!!errors.gradeLevel}
            aria-describedby={errors.gradeLevel ? 'grade-error' : undefined}
          >
            <option value="-1">Select a grade</option>
            <option value={0}>Kindergarten</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((grade) => (
              <option key={grade} value={grade}>
                Year {grade}
              </option>
            ))}
          </select>
          {errors.gradeLevel && (
            <p id="grade-error" className="text-sm text-red-600">
              {errors.gradeLevel.message}
            </p>
          )}
        </div>

        {schoolStage && (
          <div className="rounded-md bg-blue-50 p-3">
            <p className="text-sm text-blue-700">
              <span className="font-medium">NSW Curriculum Stage: </span>
              {STAGE_NAMES[schoolStage]}
            </p>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Continue'}
        </Button>
      </form>
    </div>
  );
}
