/**
 * API client functions for account deletion.
 */
import { api } from './client';

// =============================================================================
// Types
// =============================================================================

export interface DeletionRequestCreate {
  reason?: string;
  export_data?: boolean;
}

export interface DeletionInitiatedResponse {
  message: string;
  deletion_request_id: string;
  scheduled_deletion_at: string;
  confirmation_email_sent: boolean;
  grace_period_days: number;
}

export interface DeletionConfirmRequest {
  password: string;
  confirmation_token: string;
}

export interface DeletionConfirmedResponse {
  message: string;
  deletion_request_id: string;
  scheduled_deletion_at: string;
  status: string;
}

export interface DeletionCancelledResponse {
  message: string;
  deletion_request_id: string;
  cancelled_at: string;
}

export interface DeletionRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'confirmed' | 'executed' | 'cancelled';
  requested_at: string;
  scheduled_deletion_at: string;
  confirmed_at?: string;
  cancelled_at?: string;
  data_export_requested: boolean;
  days_remaining: number;
  can_cancel: boolean;
}

export interface DeletionStatusResponse {
  has_pending_deletion: boolean;
  deletion_request?: DeletionRequest;
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Request account deletion with 7-day grace period.
 */
export async function requestDeletion(
  data: DeletionRequestCreate
): Promise<DeletionInitiatedResponse> {
  const response = await api.post<DeletionInitiatedResponse>(
    '/users/me/request-deletion',
    data
  );
  return response;
}

/**
 * Confirm account deletion with password and token.
 */
export async function confirmDeletion(
  data: DeletionConfirmRequest
): Promise<DeletionConfirmedResponse> {
  const response = await api.post<DeletionConfirmedResponse>(
    '/users/me/confirm-deletion',
    data
  );
  return response;
}

/**
 * Cancel a pending or confirmed deletion request.
 */
export async function cancelDeletion(): Promise<DeletionCancelledResponse> {
  const response = await api.delete<DeletionCancelledResponse>(
    '/users/me/cancel-deletion'
  );
  return response;
}

/**
 * Get the current deletion status.
 */
export async function getDeletionStatus(): Promise<DeletionStatusResponse> {
  const response = await api.get<DeletionStatusResponse>(
    '/users/me/deletion-status'
  );
  return response;
}
