/**
 * StudentSwitcher - Dropdown to switch between students.
 *
 * Allows parents with multiple children to switch the active student.
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useStudents } from '@/hooks';
import { Button, Spinner } from '@/components/ui';
import type { Student } from '@/types/student.types';

interface StudentSwitcherProps {
  onAddStudent?: () => void;
}

export function StudentSwitcher({ onAddStudent }: StudentSwitcherProps) {
  const navigate = useNavigate();
  const { activeStudent, setActiveStudent } = useAuthStore();
  const { data: students, isLoading } = useStudents();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleSelectStudent = (student: Student) => {
    setActiveStudent(student);
    setIsOpen(false);

    // If student hasn't completed onboarding, redirect
    if (!student.onboardingCompleted) {
      navigate('/onboarding');
    }
  };

  const handleAddStudent = () => {
    setIsOpen(false);
    if (onAddStudent) {
      onAddStudent();
    } else {
      navigate('/add-student');
    }
  };

  if (isLoading) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2"
        role="status"
        aria-live="polite"
      >
        <Spinner size="sm" aria-hidden="true" />
        <span className="text-sm text-gray-500">Loading students...</span>
      </div>
    );
  }

  if (!students || students.length === 0) {
    return (
      <Button variant="outline" size="sm" onClick={handleAddStudent}>
        Add student
      </Button>
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <StudentAvatar student={activeStudent} size="sm" />
        <span className="font-medium">{activeStudent?.displayName ?? 'Select student'}</span>
        <ChevronIcon isOpen={isOpen} />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 z-50 mt-1 w-64 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          role="listbox"
          aria-label="Select student"
        >
          {students.map((student) => (
            <button
              key={student.id}
              type="button"
              role="option"
              aria-selected={activeStudent?.id === student.id}
              onClick={() => handleSelectStudent(student)}
              className={`flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 ${
                activeStudent?.id === student.id ? 'bg-blue-50' : ''
              }`}
            >
              <StudentAvatar student={student} size="sm" />
              <div className="flex-1 overflow-hidden">
                <div className="truncate font-medium">{student.displayName}</div>
                <div className="text-xs text-gray-500">
                  {getGradeName(student.gradeLevel)} · Level {student.gamification.level}
                </div>
              </div>
              {activeStudent?.id === student.id && (
                <CheckIcon className="h-4 w-4 text-blue-600" />
              )}
              {!student.onboardingCompleted && (
                <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-700">
                  Setup
                </span>
              )}
            </button>
          ))}

          <div className="my-1 border-t border-gray-100" />

          <button
            type="button"
            onClick={handleAddStudent}
            className="flex w-full items-center gap-3 px-3 py-2 text-left text-blue-600 hover:bg-gray-50"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Add another student</span>
          </button>
        </div>
      )}
    </div>
  );
}

// Helper components

interface StudentAvatarProps {
  student: Student | null;
  size?: 'sm' | 'md' | 'lg';
}

function StudentAvatar({ student, size = 'md' }: StudentAvatarProps) {
  const sizeClasses = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg',
  };

  const initial = student?.displayName?.charAt(0).toUpperCase() ?? '?';
  const studentName = student?.displayName ?? 'Unknown student';

  // Generate a consistent colour based on the name
  const colours = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-teal-500',
  ];
  const colourIndex = student?.displayName
    ? student.displayName.charCodeAt(0) % colours.length
    : 0;

  return (
    <div
      className={`flex items-center justify-center rounded-full text-white ${sizeClasses[size]} ${colours[colourIndex]}`}
      role="img"
      aria-label={`Avatar for ${studentName}`}
    >
      <span aria-hidden="true">{initial}</span>
    </div>
  );
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function getGradeName(gradeLevel: number): string {
  if (gradeLevel === 0) return 'Kindergarten';
  return `Year ${gradeLevel}`;
}
