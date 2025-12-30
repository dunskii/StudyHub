/**
 * DeleteAccountModal - Modal for requesting account deletion.
 *
 * Implements a two-step confirmation flow:
 * 1. User requests deletion with optional reason
 * 2. User confirms with password via email token
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Label, Modal, Spinner } from '@/components/ui';
import { requestDeletion } from '@/lib/api/deletion';

const deletionRequestSchema = z.object({
  reason: z.string().max(1000).optional(),
  exportData: z.boolean().default(false),
  confirmText: z.literal('DELETE', {
    errorMap: () => ({ message: 'Please type DELETE to confirm' }),
  }),
});

type DeletionRequestFormData = z.infer<typeof deletionRequestSchema>;

interface DeleteAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentCount?: number;
}

export function DeleteAccountModal({
  open,
  onOpenChange,
  studentCount = 0,
}: DeleteAccountModalProps) {
  const [step, setStep] = useState<'warning' | 'confirm' | 'success'>('warning');
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DeletionRequestFormData>({
    resolver: zodResolver(deletionRequestSchema),
    defaultValues: {
      reason: '',
      exportData: false,
    },
  });

  const requestDeletionMutation = useMutation({
    mutationFn: requestDeletion,
    onSuccess: () => {
      setStep('success');
      queryClient.invalidateQueries({ queryKey: ['deletion-status'] });
    },
  });

  const handleClose = () => {
    if (!requestDeletionMutation.isPending) {
      onOpenChange(false);
      // Reset state after animation
      setTimeout(() => {
        setStep('warning');
        reset();
        requestDeletionMutation.reset();
      }, 200);
    }
  };

  const onSubmit = async (data: DeletionRequestFormData) => {
    await requestDeletionMutation.mutateAsync({
      reason: data.reason || undefined,
      export_data: data.exportData,
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={handleClose}
      title={step === 'success' ? 'Deletion Requested' : 'Delete Account'}
      ariaLabel="Delete account confirmation"
    >
      {step === 'warning' && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-600" />
            <div className="text-sm text-red-700">
              <p className="font-medium">This action cannot be undone</p>
              <p className="mt-1">
                Deleting your account will permanently remove:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>Your parent account and profile</li>
                {studentCount > 0 && (
                  <li>
                    {studentCount} student {studentCount === 1 ? 'profile' : 'profiles'} and all their data
                  </li>
                )}
                <li>All study notes, flashcards, and revision history</li>
                <li>All AI tutoring conversations</li>
                <li>All progress and achievement data</li>
              </ul>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            After you request deletion, you&apos;ll have <strong>7 days</strong> to
            cancel. We&apos;ll send you a confirmation email to finalise the process.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => setStep('confirm')}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 'confirm' && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {requestDeletionMutation.error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
              {requestDeletionMutation.error instanceof Error
                ? requestDeletionMutation.error.message
                : 'Failed to request deletion. Please try again.'}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason for leaving (optional)
            </Label>
            <textarea
              id="reason"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Help us improve by sharing why you're leaving..."
              rows={3}
              disabled={requestDeletionMutation.isPending}
              {...register('reason')}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="exportData"
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              disabled={requestDeletionMutation.isPending}
              {...register('exportData')}
            />
            <Label htmlFor="exportData" className="text-sm font-normal">
              Export my data before deletion
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmText">
              Type <span className="font-mono font-bold">DELETE</span> to confirm
            </Label>
            <Input
              id="confirmText"
              type="text"
              placeholder="DELETE"
              autoComplete="off"
              disabled={requestDeletionMutation.isPending}
              {...register('confirmText')}
              aria-invalid={!!errors.confirmText}
            />
            {errors.confirmText && (
              <p className="text-sm text-red-600">
                {errors.confirmText.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep('warning')}
              disabled={requestDeletionMutation.isPending}
            >
              Back
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={requestDeletionMutation.isPending}
            >
              {requestDeletionMutation.isPending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" aria-hidden="true" />
                  Requesting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Request Deletion
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      {step === 'success' && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-green-50 p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-5 w-5 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div className="text-sm text-green-700">
              <p className="font-medium">Deletion request submitted</p>
              <p className="mt-1">
                We&apos;ve sent a confirmation email to your registered address.
                Please check your inbox and click the confirmation link.
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
            <p className="font-medium">7-day grace period</p>
            <p className="mt-1">
              You can cancel this request at any time within the next 7 days
              from your account settings.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
