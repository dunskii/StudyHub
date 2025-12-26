/**
 * OnboardingWizard - Multi-step wizard for setting up a new student profile.
 *
 * Steps:
 * 1. Student details (name, grade, stage)
 * 2. Subject selection
 * 3. Pathway selection (for Stage 5)
 * 4. Confirmation
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useCreateStudent, useCompleteOnboarding, useBulkEnrol } from '@/hooks';
import { Card } from '@/components/ui';
import { StudentDetailsStep } from './steps/StudentDetailsStep';
import { SubjectSelectionStep } from './steps/SubjectSelectionStep';
import { PathwaySelectionStep } from './steps/PathwaySelectionStep';
import { ConfirmationStep } from './steps/ConfirmationStep';

export type OnboardingStep = 'details' | 'subjects' | 'pathways' | 'confirm';

export interface StudentFormData {
  displayName: string;
  gradeLevel: number;
  schoolStage: string;
  frameworkId: string;
}

export interface SubjectSelection {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  pathway?: string;
  seniorCourseId?: string;
}

interface OnboardingWizardProps {
  onComplete?: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const navigate = useNavigate();
  const { user, setActiveStudent } = useAuthStore();
  const createStudent = useCreateStudent();
  const completeOnboarding = useCompleteOnboarding();
  const bulkEnrol = useBulkEnrol();

  const [currentStep, setCurrentStep] = useState<OnboardingStep>('details');
  const [studentData, setStudentData] = useState<StudentFormData | null>(null);
  const [createdStudentId, setCreatedStudentId] = useState<string | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<SubjectSelection[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine if pathways step is needed (Stage 5 with pathway subjects)
  const needsPathways =
    studentData?.schoolStage === 'S5' &&
    selectedSubjects.some((s) => !s.pathway);

  const steps: OnboardingStep[] = needsPathways
    ? ['details', 'subjects', 'pathways', 'confirm']
    : ['details', 'subjects', 'confirm'];

  const currentStepIndex = steps.indexOf(currentStep);

  /**
   * Handle student details submission.
   */
  const handleDetailsSubmit = useCallback(
    async (data: StudentFormData) => {
      if (!user) return;

      setError(null);
      setIsSubmitting(true);

      try {
        const student = await createStudent.mutateAsync({
          parentId: user.id,
          ...data,
        });

        setStudentData(data);
        setCreatedStudentId(student.id);
        setCurrentStep('subjects');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create student');
      } finally {
        setIsSubmitting(false);
      }
    },
    [user, createStudent]
  );

  /**
   * Handle subject selection.
   */
  const handleSubjectsSubmit = useCallback(
    (subjects: SubjectSelection[]) => {
      setSelectedSubjects(subjects);
      setCurrentStep(needsPathways ? 'pathways' : 'confirm');
    },
    [needsPathways]
  );

  /**
   * Handle pathway selection.
   */
  const handlePathwaysSubmit = useCallback((subjects: SubjectSelection[]) => {
    setSelectedSubjects(subjects);
    setCurrentStep('confirm');
  }, []);

  /**
   * Handle final confirmation and enrolment.
   */
  const handleConfirm = useCallback(async () => {
    if (!createdStudentId || selectedSubjects.length === 0) return;

    setError(null);
    setIsSubmitting(true);

    try {
      // Bulk enrol in subjects
      const result = await bulkEnrol.mutateAsync({
        studentId: createdStudentId,
        enrolments: selectedSubjects.map((s) => ({
          subjectId: s.subjectId,
          pathway: s.pathway,
          seniorCourseId: s.seniorCourseId,
        })),
      });

      if (result.failed.length > 0) {
        console.warn('Some enrolments failed:', result.failed);
      }

      // Complete onboarding
      const updatedStudent = await completeOnboarding.mutateAsync(createdStudentId);

      // Set as active student
      setActiveStudent(updatedStudent);

      // Call completion callback or navigate
      if (onComplete) {
        onComplete();
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete setup');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    createdStudentId,
    selectedSubjects,
    bulkEnrol,
    completeOnboarding,
    setActiveStudent,
    onComplete,
    navigate,
  ]);

  /**
   * Go to previous step.
   */
  const handleBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0 && steps[prevIndex]) {
      setCurrentStep(steps[prevIndex]);
    }
  }, [currentStepIndex, steps]);

  /**
   * Render current step content.
   */
  const renderStep = () => {
    switch (currentStep) {
      case 'details':
        return (
          <StudentDetailsStep
            defaultValues={studentData ?? undefined}
            onSubmit={handleDetailsSubmit}
            isLoading={isSubmitting}
          />
        );

      case 'subjects':
        return (
          <SubjectSelectionStep
            frameworkId={studentData?.frameworkId ?? ''}
            schoolStage={studentData?.schoolStage ?? ''}
            selectedSubjects={selectedSubjects}
            onSubmit={handleSubjectsSubmit}
            onBack={handleBack}
          />
        );

      case 'pathways':
        return (
          <PathwaySelectionStep
            subjects={selectedSubjects}
            onSubmit={handlePathwaysSubmit}
            onBack={handleBack}
          />
        );

      case 'confirm':
        return (
          <ConfirmationStep
            studentData={studentData!}
            subjects={selectedSubjects}
            onConfirm={handleConfirm}
            onBack={handleBack}
            isLoading={isSubmitting}
          />
        );
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex justify-between">
          {steps.map((step, index) => (
            <div
              key={step}
              className={`flex-1 ${index < steps.length - 1 ? 'border-b-2' : ''} ${
                index <= currentStepIndex
                  ? 'border-blue-500'
                  : 'border-gray-200'
              } pb-4`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  index < currentStepIndex
                    ? 'bg-blue-500 text-white'
                    : index === currentStepIndex
                      ? 'border-2 border-blue-500 text-blue-500'
                      : 'border-2 border-gray-300 text-gray-400'
                }`}
              >
                {index + 1}
              </div>
              <span
                className={`mt-2 block text-xs ${
                  index <= currentStepIndex ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                {step === 'details' && 'Details'}
                {step === 'subjects' && 'Subjects'}
                {step === 'pathways' && 'Pathways'}
                {step === 'confirm' && 'Confirm'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {/* Step content */}
      <Card className="p-6">{renderStep()}</Card>
    </div>
  );
}
