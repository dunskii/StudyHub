/**
 * API client functions for AI usage tracking.
 */
import { api } from './client';

// =============================================================================
// Types
// =============================================================================

export interface AIUsageRecord {
  id: string;
  student_id: string;
  date: string;
  tokens_haiku: number;
  tokens_sonnet: number;
  total_tokens: number;
  total_cost_usd: string;
  request_count: number;
  created_at: string;
  updated_at: string;
}

export interface AIUsageLimits {
  today_tokens: number;
  today_cost_usd: string;
  today_requests: number;
  month_tokens: number;
  month_cost_usd: string;
  daily_token_limit: number;
  monthly_soft_limit: number;
  monthly_hard_limit: number;
  daily_limit_reached: boolean;
  monthly_soft_limit_reached: boolean;
  monthly_hard_limit_reached: boolean;
  daily_usage_percent: number;
  monthly_usage_percent: number;
}

export interface AIUsageSummary {
  student_id: string;
  period_start: string;
  period_end: string;
  total_tokens_haiku: number;
  total_tokens_sonnet: number;
  total_tokens: number;
  total_cost_usd: string;
  total_requests: number;
  daily_average_tokens: number;
}

export interface AIUsageHistoryResponse {
  usage: AIUsageRecord[];
  total: number;
  page: number;
  page_size: number;
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Get current AI usage limits and status for a student.
 */
export async function getAIUsageLimits(studentId: string): Promise<AIUsageLimits> {
  const response = await api.get<AIUsageLimits>(
    `/students/${studentId}/ai-usage/limits`
  );
  return response;
}

/**
 * Get AI usage history for a student.
 */
export async function getAIUsageHistory(
  studentId: string,
  days: number = 30
): Promise<AIUsageRecord[]> {
  const response = await api.get<AIUsageRecord[]>(
    `/students/${studentId}/ai-usage/history`,
    { params: { days: days.toString() } }
  );
  return response;
}

/**
 * Get AI usage summary for a student over a period.
 */
export async function getAIUsageSummary(
  studentId: string,
  startDate: string,
  endDate: string
): Promise<AIUsageSummary> {
  const response = await api.get<AIUsageSummary>(
    `/students/${studentId}/ai-usage/summary`,
    { params: { start_date: startDate, end_date: endDate } }
  );
  return response;
}

/**
 * Check if a student can make an AI request.
 */
export async function canMakeAIRequest(
  studentId: string,
  estimatedTokens: number = 0
): Promise<{ allowed: boolean; reason?: string }> {
  const response = await api.get<{ allowed: boolean; reason?: string }>(
    `/students/${studentId}/ai-usage/can-request`,
    { params: { estimated_tokens: estimatedTokens.toString() } }
  );
  return response;
}
