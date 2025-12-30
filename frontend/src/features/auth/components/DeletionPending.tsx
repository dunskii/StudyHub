/**
 * DeletionPending - Banner/card showing pending deletion status.
 *
 * Displays countdown and allows cancellation of deletion request.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Clock, X } from 'lucide-react';
import { Button, Spinner } from '@/components/ui';
import { cancelDeletion, getDeletionStatus } from '@/lib/api/deletion';

interface DeletionPendingProps {
  variant?: 'banner' | 'card';
}

export function DeletionPending({ variant = 'banner' }: DeletionPendingProps) {
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery({
    queryKey: ['deletion-status'],
    queryFn: getDeletionStatus,
    refetchInterval: 60000, // Refresh every minute
  });

  const cancelMutation = useMutation({
    mutationFn: cancelDeletion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deletion-status'] });
    },
  });

  if (isLoading) {
    return null;
  }

  if (!status?.has_pending_deletion || !status.deletion_request) {
    return null;
  }

  const { deletion_request: request } = status;
  const scheduledDate = new Date(request.scheduled_deletion_at);

  if (variant === 'card') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-600" />
          <div className="flex-1">
            <h3 className="font-medium text-red-800">
              Account Deletion Scheduled
            </h3>
            <p className="mt-1 text-sm text-red-700">
              Your account is scheduled for deletion on{' '}
              <strong>{scheduledDate.toLocaleDateString('en-AU', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}</strong>
              {request.days_remaining > 0 && (
                <span className="ml-1">
                  ({request.days_remaining} day{request.days_remaining !== 1 ? 's' : ''} remaining)
                </span>
              )}
            </p>

            <div className="mt-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-700">
                Status: {request.status === 'pending' ? 'Awaiting confirmation' : 'Confirmed'}
              </span>
            </div>

            {request.can_cancel && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  {cancelMutation.isPending ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" aria-hidden="true" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <X className="mr-2 h-4 w-4" />
                      Cancel Deletion
                    </>
                  )}
                </Button>
              </div>
            )}

            {cancelMutation.error && (
              <p className="mt-2 text-sm text-red-600">
                Failed to cancel deletion. Please try again.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Banner variant
  return (
    <div className="bg-red-600 px-4 py-3 text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <span className="text-sm font-medium">
            Your account is scheduled for deletion in {request.days_remaining} day
            {request.days_remaining !== 1 ? 's' : ''}
          </span>
        </div>

        {request.can_cancel && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
            className="border-white bg-transparent text-white hover:bg-white hover:text-red-600"
          >
            {cancelMutation.isPending ? (
              <>
                <Spinner className="mr-2 h-4 w-4" aria-hidden="true" />
                Cancelling...
              </>
            ) : (
              'Cancel Deletion'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Hook to check if there's a pending deletion.
 */
export function useDeletionStatus() {
  return useQuery({
    queryKey: ['deletion-status'],
    queryFn: getDeletionStatus,
    staleTime: 60000, // 1 minute
  });
}
