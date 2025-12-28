/**
 * GoalsTab - Goal management for family goal setting.
 *
 * Features:
 * - List of active and completed goals
 * - Create new goals
 * - Track progress towards goals
 * - Mark goals as achieved
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Target,
  Plus,
  CheckCircle,
  Clock,
  Trophy,
  Trash2,
  Calendar,
  Gift,
  AlertCircle,
  X,
} from 'lucide-react';
import { parentDashboardApi } from '@/lib/api';
import type { GoalWithProgress, CreateGoalRequest } from '@/lib/api';
import { Card, Button, Input, Label, Spinner } from '@/components/ui';

const goalSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(2000).optional(),
  targetMastery: z.coerce.number().min(0).max(100).optional(),
  targetDate: z.string().optional(),
  reward: z.string().max(255).optional(),
});

type GoalFormData = z.infer<typeof goalSchema>;

interface GoalsTabProps {
  studentId: string | null;
}

export function GoalsTab({ studentId }: GoalsTabProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'achieved'>('all');
  const queryClient = useQueryClient();

  const {
    data: goalsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['goals', studentId, filter],
    queryFn: () =>
      parentDashboardApi.getGoals({
        studentId: studentId || undefined,
        activeOnly: filter === 'active',
      }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const deleteGoal = useMutation({
    mutationFn: (goalId: string) => parentDashboardApi.deleteGoal(goalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });

  const checkAchievement = useMutation({
    mutationFn: (goalId: string) => parentDashboardApi.checkGoalAchievement(goalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });

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
        <p className="text-red-600">Failed to load goals</p>
        <p className="mt-2 text-sm text-gray-500">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </Card>
    );
  }

  const goals = goalsData?.goals ?? [];
  const filteredGoals =
    filter === 'achieved'
      ? goals.filter((g) => g.achievedAt !== null)
      : filter === 'active'
        ? goals.filter((g) => g.achievedAt === null)
        : goals;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Family Goals</h2>
          <p className="text-sm text-gray-500">
            {goalsData?.activeCount ?? 0} active • {goalsData?.achievedCount ?? 0} achieved
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Goal
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'active', 'achieved'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Create Goal Form */}
      {showCreateForm && studentId && (
        <CreateGoalForm
          studentId={studentId}
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false);
            queryClient.invalidateQueries({ queryKey: ['goals'] });
          }}
        />
      )}

      {showCreateForm && !studentId && (
        <Card className="p-6 text-center">
          <p className="text-gray-500">Please select a student first to create a goal.</p>
        </Card>
      )}

      {/* Goals List */}
      {filteredGoals.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onDelete={() => deleteGoal.mutate(goal.id)}
              onCheckAchievement={() => checkAchievement.mutate(goal.id)}
              isDeleting={deleteGoal.isPending && deleteGoal.variables === goal.id}
            />
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Target className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No goals yet</h3>
          <p className="mt-2 text-gray-500">
            Create a goal to help motivate learning with rewards!
          </p>
        </Card>
      )}
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

interface GoalCardProps {
  goal: GoalWithProgress;
  onDelete: () => void;
  onCheckAchievement: () => void;
  isDeleting: boolean;
}

function GoalCard({ goal, onDelete, onCheckAchievement, isDeleting }: GoalCardProps) {
  const isAchieved = goal.achievedAt !== null;
  const isOverdue = goal.targetDate && !isAchieved && new Date(goal.targetDate) < new Date();

  return (
    <Card
      className={`p-5 ${isAchieved ? 'border-green-200 bg-green-50' : isOverdue ? 'border-red-200' : ''}`}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          {isAchieved ? (
            <Trophy className="h-5 w-5 text-yellow-500" />
          ) : (
            <Target className="h-5 w-5 text-blue-500" />
          )}
          <h3 className="font-semibold text-gray-900">{goal.title}</h3>
        </div>
        <div className="flex gap-1">
          {!isAchieved && (
            <button
              onClick={onCheckAchievement}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
              title="Check if achieved"
              aria-label="Check if goal is achieved"
            >
              <CheckCircle className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:opacity-50"
            title="Delete goal"
            aria-label="Delete goal"
          >
            {isDeleting ? <Spinner size="sm" /> : <Trash2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Description */}
      {goal.description && (
        <p className="mb-3 text-sm text-gray-600">{goal.description}</p>
      )}

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="text-gray-500">Progress</span>
          <span className="font-medium">
            {goal.progress.progressPercentage.toFixed(0)}%
          </span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-gray-200"
          role="progressbar"
          aria-valuenow={Math.min(goal.progress.progressPercentage, 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Goal progress: ${goal.progress.progressPercentage.toFixed(0)}%`}
        >
          <div
            className={`h-full rounded-full transition-all ${
              isAchieved ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(goal.progress.progressPercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        {goal.targetMastery && (
          <span className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            Target: {goal.targetMastery}%
          </span>
        )}
        {goal.targetDate && (
          <span
            className={`flex items-center gap-1 ${isOverdue ? 'text-red-600' : ''}`}
          >
            <Calendar className="h-3 w-3" />
            {isOverdue ? 'Overdue: ' : ''}
            {formatDate(goal.targetDate)}
          </span>
        )}
        {goal.progress.daysRemaining !== null && goal.progress.daysRemaining > 0 && !isAchieved && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {goal.progress.daysRemaining} days left
          </span>
        )}
        {goal.reward && (
          <span className="flex items-center gap-1 text-purple-600">
            <Gift className="h-3 w-3" />
            {goal.reward}
          </span>
        )}
      </div>

      {/* Status indicators */}
      {isAchieved && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-100 p-2 text-sm text-green-700">
          <Trophy className="h-4 w-4" />
          Achieved on {formatDate(goal.achievedAt!)}
        </div>
      )}
      {!isAchieved && !goal.progress.isOnTrack && goal.progress.daysRemaining !== null && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-orange-100 p-2 text-sm text-orange-700">
          <AlertCircle className="h-4 w-4" />
          Behind schedule - extra effort needed!
        </div>
      )}
    </Card>
  );
}

interface CreateGoalFormProps {
  studentId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateGoalForm({ studentId, onClose, onSuccess }: CreateGoalFormProps) {
  const [error, setError] = useState<string | null>(null);

  const createGoal = useMutation({
    mutationFn: (data: CreateGoalRequest) => parentDashboardApi.createGoal(data),
    onSuccess: () => {
      onSuccess();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
  });

  const onSubmit = (data: GoalFormData) => {
    setError(null);
    createGoal.mutate({
      student_id: studentId,
      title: data.title,
      description: data.description,
      target_mastery: data.targetMastery,
      target_date: data.targetDate,
      reward: data.reward,
    });
  };

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Create New Goal</h3>
        <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="title">Goal Title *</Label>
          <Input
            id="title"
            {...register('title')}
            placeholder="e.g., Master multiplication tables"
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? 'title-error' : undefined}
          />
          {errors.title && (
            <p id="title-error" className="mt-1 text-sm text-red-600" role="alert">
              {errors.title.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            {...register('description')}
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Optional details about the goal..."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="targetMastery">Target Mastery (%)</Label>
            <Input
              id="targetMastery"
              type="number"
              min={0}
              max={100}
              {...register('targetMastery')}
              placeholder="e.g., 80"
            />
          </div>

          <div>
            <Label htmlFor="targetDate">Target Date</Label>
            <Input
              id="targetDate"
              type="date"
              {...register('targetDate')}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="reward">Reward (optional)</Label>
          <Input
            id="reward"
            {...register('reward')}
            placeholder="e.g., Pizza night!"
          />
          <p className="mt-1 text-xs text-gray-500">
            A family reward for achieving this goal
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createGoal.isPending}>
            {createGoal.isPending ? 'Creating...' : 'Create Goal'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' });
}
