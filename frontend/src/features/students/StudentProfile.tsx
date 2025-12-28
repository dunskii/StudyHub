/**
 * StudentProfile - Displays and allows editing of student profile information.
 *
 * Includes gamification display with level badge, XP progress, and streak counter.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Award } from 'lucide-react';
import { useUpdateStudent } from '@/hooks';
import { useGamificationStats } from '@/hooks/useGamification';
import { Button, Input, Label, Card } from '@/components/ui';
import { LevelBadge } from '@/features/gamification/components/LevelBadge';
import { XPBar } from '@/features/gamification/components/XPBar';
import { StreakCounter } from '@/features/gamification/components/StreakCounter';
import type { Student } from '@/types/student.types';

const STAGE_NAMES: Record<string, string> = {
  ES1: 'Early Stage 1',
  S1: 'Stage 1',
  S2: 'Stage 2',
  S3: 'Stage 3',
  S4: 'Stage 4',
  S5: 'Stage 5',
  S6: 'Stage 6',
};

const GRADE_NAMES: Record<number, string> = {
  0: 'Kindergarten',
  1: 'Year 1',
  2: 'Year 2',
  3: 'Year 3',
  4: 'Year 4',
  5: 'Year 5',
  6: 'Year 6',
  7: 'Year 7',
  8: 'Year 8',
  9: 'Year 9',
  10: 'Year 10',
  11: 'Year 11',
  12: 'Year 12',
};

const profileSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  dailyGoalMinutes: z.coerce
    .number()
    .min(5, 'Minimum 5 minutes')
    .max(240, 'Maximum 4 hours'),
  studyReminders: z.boolean(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface StudentProfileProps {
  student: Student;
  onUpdate?: (student: Student) => void;
}

export function StudentProfile({ student, onUpdate }: StudentProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const updateStudent = useUpdateStudent();
  const { data: gamificationStats } = useGamificationStats(student.id);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: student.displayName,
      dailyGoalMinutes: student.preferences.dailyGoalMinutes,
      studyReminders: student.preferences.studyReminders,
    },
  });

  const handleCancel = () => {
    reset();
    setIsEditing(false);
    setError(null);
  };

  const onSubmit = async (data: ProfileFormData) => {
    setError(null);

    try {
      const updated = await updateStudent.mutateAsync({
        studentId: student.id,
        displayName: data.displayName,
        preferences: {
          ...student.preferences,
          dailyGoalMinutes: data.dailyGoalMinutes,
          studyReminders: data.studyReminders,
        },
      });

      setIsEditing(false);
      onUpdate?.(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Student Profile</h2>
        {!isEditing && (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            Edit
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {isEditing ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Name</Label>
            <Input
              id="displayName"
              {...register('displayName')}
              aria-invalid={!!errors.displayName}
            />
            {errors.displayName && (
              <p className="text-sm text-red-600">{errors.displayName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dailyGoalMinutes">Daily study goal (minutes)</Label>
            <Input
              id="dailyGoalMinutes"
              type="number"
              min={5}
              max={240}
              {...register('dailyGoalMinutes')}
              aria-invalid={!!errors.dailyGoalMinutes}
            />
            {errors.dailyGoalMinutes && (
              <p className="text-sm text-red-600">{errors.dailyGoalMinutes.message}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              id="studyReminders"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300"
              {...register('studyReminders')}
            />
            <Label htmlFor="studyReminders" className="font-normal">
              Enable study reminders
            </Label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={updateStudent.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isDirty || updateStudent.isPending}
            >
              {updateStudent.isPending ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </form>
      ) : (
        <dl className="space-y-4">
          <div>
            <dt className="text-sm text-gray-500">Name</dt>
            <dd className="font-medium">{student.displayName}</dd>
          </div>

          <div>
            <dt className="text-sm text-gray-500">Grade</dt>
            <dd className="font-medium">{GRADE_NAMES[student.gradeLevel]}</dd>
          </div>

          <div>
            <dt className="text-sm text-gray-500">Stage</dt>
            <dd className="font-medium">{STAGE_NAMES[student.schoolStage]}</dd>
          </div>

          <div>
            <dt className="text-sm text-gray-500">Daily study goal</dt>
            <dd className="font-medium">{student.preferences.dailyGoalMinutes} minutes</dd>
          </div>

          <div>
            <dt className="text-sm text-gray-500">Study reminders</dt>
            <dd className="font-medium">
              {student.preferences.studyReminders ? 'Enabled' : 'Disabled'}
            </dd>
          </div>

          {/* Gamification Section */}
          <div className="border-t border-gray-100 pt-4 mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Award className="w-4 h-4" aria-hidden="true" />
              Progress
            </h3>

            {/* Level and XP */}
            <div className="flex items-center gap-4 mb-4">
              <LevelBadge
                level={gamificationStats?.level ?? student.gamification.level}
                title={gamificationStats?.levelTitle}
                size="lg"
                showTitle
              />
              <div className="flex-1">
                {gamificationStats ? (
                  <XPBar
                    currentXp={gamificationStats.totalXp}
                    levelStartXp={0}
                    nextLevelXp={gamificationStats.nextLevelXp ?? 0}
                    progressPercent={gamificationStats.levelProgressPercent}
                    size="md"
                  />
                ) : (
                  <div className="text-sm text-gray-600">
                    {student.gamification.totalXP.toLocaleString()} XP
                  </div>
                )}
              </div>
            </div>

            {/* Streak */}
            <div>
              <StreakCounter
                current={gamificationStats?.streak.current ?? student.gamification.streaks.current}
                longest={gamificationStats?.streak.longest ?? student.gamification.streaks.longest}
                multiplier={gamificationStats?.streak.multiplier}
                size="md"
                showLongest
                showMultiplier
              />
            </div>

            {/* Achievements count */}
            {gamificationStats && (
              <div className="mt-3 text-sm text-gray-600">
                <Award className="w-4 h-4 inline mr-1" aria-hidden="true" />
                {gamificationStats.achievementsUnlocked} / {gamificationStats.achievementsTotal} achievements unlocked
              </div>
            )}
          </div>
        </dl>
      )}
    </Card>
  );
}
