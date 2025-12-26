/**
 * EnrolmentManager - Manages student subject enrolments.
 *
 * Shows enrolled subjects with progress and allows adding/removing subjects.
 */

import { useState } from 'react';
import { useEnrolments, useUnenrol, useSubjectList } from '@/hooks';
import { Button, Card, Spinner, Modal } from '@/components/ui';
import { EnrolmentCard } from './EnrolmentCard';
import { SubjectEnrolModal } from './SubjectEnrolModal';
import type { Student } from '@/types/student.types';
import type { Enrolment } from '@/lib/api';

interface EnrolmentManagerProps {
  student: Student;
}

export function EnrolmentManager({ student }: EnrolmentManagerProps) {
  const { data: enrolments, isLoading, error } = useEnrolments(student.id);
  const { data: allSubjects } = useSubjectList('NSW');
  const unenrol = useUnenrol();

  const [isEnrolModalOpen, setIsEnrolModalOpen] = useState(false);
  const [unenrolConfirm, setUnenrolConfirm] = useState<Enrolment | null>(null);

  // Get subjects not yet enrolled
  const enrolledSubjectIds = new Set(enrolments?.map((e) => e.subjectId) ?? []);
  const availableSubjects = allSubjects.filter(
    (s) =>
      !enrolledSubjectIds.has(s.id) && s.availableStages.includes(student.schoolStage)
  );

  const handleUnenrol = async () => {
    if (!unenrolConfirm) return;

    try {
      await unenrol.mutateAsync({
        studentId: student.id,
        subjectId: unenrolConfirm.subjectId,
      });
      setUnenrolConfirm(null);
    } catch (err) {
      console.error('Failed to unenrol:', err);
    }
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
      <Card className="p-6 text-center">
        <p className="text-red-600">Failed to load enrolments. Please try again.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Enrolled Subjects</h2>
          <p className="text-sm text-gray-600">
            {enrolments?.length ?? 0} subjects enrolled
          </p>
        </div>
        {availableSubjects.length > 0 && (
          <Button onClick={() => setIsEnrolModalOpen(true)}>Add subject</Button>
        )}
      </div>

      {enrolments && enrolments.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {enrolments.map((enrolment) => (
            <EnrolmentCard
              key={enrolment.id}
              enrolment={enrolment}
              onUnenrol={() => setUnenrolConfirm(enrolment)}
            />
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <p className="text-gray-600">No subjects enrolled yet.</p>
          {availableSubjects.length > 0 && (
            <Button className="mt-4" onClick={() => setIsEnrolModalOpen(true)}>
              Add your first subject
            </Button>
          )}
        </Card>
      )}

      {/* Enrol modal */}
      <SubjectEnrolModal
        isOpen={isEnrolModalOpen}
        onClose={() => setIsEnrolModalOpen(false)}
        student={student}
        availableSubjects={availableSubjects}
      />

      {/* Unenrol confirmation modal */}
      <Modal
        open={!!unenrolConfirm}
        onOpenChange={(open) => !open && setUnenrolConfirm(null)}
        title="Remove subject"
      >
        <div className="space-y-4">
          <p>
            Are you sure you want to remove{' '}
            <strong>{unenrolConfirm?.subject.name}</strong>? This will remove all
            progress for this subject.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setUnenrolConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleUnenrol}
              disabled={unenrol.isPending}
            >
              {unenrol.isPending ? 'Removing...' : 'Remove subject'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
