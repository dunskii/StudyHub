/**
 * AIUsageCard - Displays AI usage statistics and limits for a student.
 *
 * Shows daily/monthly usage with visual progress bars and cost information.
 */
import { useQuery } from '@tanstack/react-query';
import { Cpu, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, Spinner } from '@/components/ui';
import { UsageBar } from '@/components/ui/UsageBar';
import { getAIUsageLimits, type AIUsageLimits } from '@/lib/api/ai-usage';

interface AIUsageCardProps {
  studentId: string;
  studentName: string;
}

export function AIUsageCard({ studentId, studentName }: AIUsageCardProps) {
  const {
    data: limits,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['ai-usage-limits', studentId],
    queryFn: () => getAIUsageLimits(studentId),
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000, // Consider stale after 30 seconds
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Spinner size="default" />
        </div>
      </Card>
    );
  }

  if (error || !limits) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <p>Unable to load AI usage data</p>
        </div>
      </Card>
    );
  }

  const formatTokens = (tokens: number): string => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(0)}K`;
    }
    return tokens.toString();
  };

  const formatCost = (cost: string): string => {
    const num = parseFloat(cost);
    return `$${num.toFixed(2)}`;
  };

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            AI Usage - {studentName}
          </h3>
        </div>
        <StatusBadge limits={limits} />
      </div>

      {/* Usage Bars */}
      <div className="space-y-6">
        {/* Daily Usage */}
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">Today&apos;s Usage</span>
            <span className="text-gray-500">
              {formatTokens(limits.today_tokens)} / {formatTokens(limits.daily_token_limit)} tokens
            </span>
          </div>
          <UsageBar
            value={limits.today_tokens}
            max={limits.daily_token_limit}
            softLimit={80}
            showPercentage={false}
            size="md"
          />
          <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
            <span>{limits.today_requests} requests today</span>
            <span>Cost: {formatCost(limits.today_cost_usd)}</span>
          </div>
        </div>

        {/* Monthly Usage */}
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">Monthly Usage</span>
            <span className="text-gray-500">
              {formatTokens(limits.month_tokens)} / {formatTokens(limits.monthly_hard_limit)} tokens
            </span>
          </div>
          <UsageBar
            value={limits.month_tokens}
            max={limits.monthly_hard_limit}
            softLimit={(limits.monthly_soft_limit / limits.monthly_hard_limit) * 100}
            showPercentage={false}
            size="md"
          />
          <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
            <span>Soft limit at {formatTokens(limits.monthly_soft_limit)}</span>
            <span>Cost: {formatCost(limits.month_cost_usd)}</span>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {limits.monthly_hard_limit_reached && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Monthly limit reached</p>
            <p className="mt-1">
              {studentName} has reached the monthly AI usage limit. Consider reviewing
              usage patterns or adjusting limits.
            </p>
          </div>
        </div>
      )}

      {limits.monthly_soft_limit_reached && !limits.monthly_hard_limit_reached && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
          <TrendingUp className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Approaching monthly limit</p>
            <p className="mt-1">
              {studentName} is nearing the monthly AI usage limit. Usage will be
              restricted once the hard limit is reached.
            </p>
          </div>
        </div>
      )}

      {limits.daily_limit_reached && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Daily limit reached</p>
            <p className="mt-1">
              {studentName} has reached today&apos;s AI usage limit. Usage will reset
              tomorrow.
            </p>
          </div>
        </div>
      )}

      {/* Info Footer */}
      <div className="mt-6 border-t border-gray-100 pt-4">
        <p className="text-xs text-gray-500">
          AI usage is tracked to ensure fair access and manage costs. Daily limits
          help encourage balanced study habits.
        </p>
      </div>
    </Card>
  );
}

function StatusBadge({ limits }: { limits: AIUsageLimits }) {
  if (limits.monthly_hard_limit_reached) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
        <AlertTriangle className="h-3 w-3" />
        Limit Reached
      </span>
    );
  }

  if (limits.daily_limit_reached || limits.monthly_soft_limit_reached) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
        <TrendingUp className="h-3 w-3" />
        High Usage
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
      <CheckCircle className="h-3 w-3" />
      Normal
    </span>
  );
}
