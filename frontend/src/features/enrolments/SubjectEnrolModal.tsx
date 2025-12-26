/**
 * SubjectEnrolModal - Modal for enrolling in a new subject.
 */

import { useState } from 'react';
import { useEnrol } from '@/hooks';
import { Button, Modal, Spinner } from '@/components/ui';
import { PathwaySelector } from './PathwaySelector';
import type { Student } from '@/types/student.types';
import type { Subject } from '@/types/subject.types';

// Subjects that have pathways in Stage 5
const PATHWAY_SUBJECTS = ['MATH'];

interface SubjectEnrolModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  availableSubjects: Subject[];
}

export function SubjectEnrolModal({
  isOpen,
  onClose,
  student,
  availableSubjects,
}: SubjectEnrolModalProps) {
  const enrol = useEnrol();

  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedPathway, setSelectedPathway] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if pathway selection is needed
  const needsPathway =
    student.schoolStage === 'S5' &&
    selectedSubject &&
    PATHWAY_SUBJECTS.includes(selectedSubject.code);

  const handleSelectSubject = (subject: Subject) => {
    setSelectedSubject(subject);
    setSelectedPathway(null);
    setError(null);
  };

  const handleEnrol = async () => {
    if (!selectedSubject) return;

    if (needsPathway && !selectedPathway) {
      setError('Please select a pathway');
      return;
    }

    setError(null);

    try {
      await enrol.mutateAsync({
        studentId: student.id,
        subjectId: selectedSubject.id,
        pathway: selectedPathway ?? undefined,
      });

      // Reset and close
      setSelectedSubject(null);
      setSelectedPathway(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enrol');
    }
  };

  const handleClose = () => {
    setSelectedSubject(null);
    setSelectedPathway(null);
    setError(null);
    onClose();
  };

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && handleClose()} title="Add subject">
      <div className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {!selectedSubject ? (
          // Subject selection
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Select a subject to enrol in:</p>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {availableSubjects.map((subject) => (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => handleSelectSubject(subject)}
                  className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left hover:border-blue-300 hover:bg-blue-50"
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: subject.color }}
                  >
                    {subject.code.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium">{subject.name}</div>
                    <div className="text-sm text-gray-500">{subject.code}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : needsPathway && !selectedPathway ? (
          // Pathway selection
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedSubject(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <BackIcon className="h-5 w-5" />
              </button>
              <div>
                <h3 className="font-medium">{selectedSubject.name}</h3>
                <p className="text-sm text-gray-500">Select a pathway</p>
              </div>
            </div>

            <PathwaySelector
              selectedPathway={selectedPathway}
              onSelect={setSelectedPathway}
            />
          </div>
        ) : (
          // Confirmation
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  needsPathway ? setSelectedPathway(null) : setSelectedSubject(null)
                }
                className="text-gray-400 hover:text-gray-600"
              >
                <BackIcon className="h-5 w-5" />
              </button>
              <div>
                <h3 className="font-medium">{selectedSubject.name}</h3>
                {selectedPathway && (
                  <p className="text-sm text-gray-500">Pathway {selectedPathway}</p>
                )}
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-600">
                {student.displayName} will be enrolled in {selectedSubject.name}
                {selectedPathway && ` (Pathway ${selectedPathway})`}.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {selectedSubject && (!needsPathway || selectedPathway) && (
            <Button onClick={handleEnrol} disabled={enrol.isPending}>
              {enrol.isPending ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Enrolling...
                </>
              ) : (
                'Enrol'
              )}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 19l-7-7 7-7"
      />
    </svg>
  );
}
