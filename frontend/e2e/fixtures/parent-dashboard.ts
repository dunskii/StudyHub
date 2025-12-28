/**
 * Test fixtures and utilities for parent dashboard E2E tests.
 */

import { Page } from '@playwright/test';

/**
 * Mock parent user for testing.
 */
export const mockParentUser = {
  id: 'parent-test-123',
  email: 'parent@example.com',
  password: 'TestPassword123!',
};

/**
 * Mock students for testing.
 */
export const mockStudents = [
  {
    id: 'student-1',
    displayName: 'Emma',
    gradeLevel: 5,
    schoolStage: 'S3',
    totalXp: 2500,
    level: 8,
    currentStreak: 5,
    longestStreak: 12,
    sessionsThisWeek: 4,
    studyTimeThisWeekMinutes: 180,
  },
  {
    id: 'student-2',
    displayName: 'Oliver',
    gradeLevel: 11,
    schoolStage: 'S6',
    totalXp: 5200,
    level: 15,
    currentStreak: 8,
    longestStreak: 21,
    sessionsThisWeek: 6,
    studyTimeThisWeekMinutes: 420,
  },
];

/**
 * Mock goals for testing.
 */
export const mockGoals = [
  {
    id: 'goal-1',
    studentId: 'student-1',
    title: 'Master Multiplication Tables',
    description: 'Learn all multiplication tables from 1 to 12',
    targetMastery: 80,
    targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    reward: 'Pizza night!',
    isActive: true,
    achievedAt: null,
    progress: {
      progressPercentage: 62.5,
      daysRemaining: 30,
      isOnTrack: true,
    },
  },
  {
    id: 'goal-2',
    studentId: 'student-1',
    title: 'Complete Reading Challenge',
    description: 'Read 10 books this term',
    targetMastery: null,
    targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    reward: 'New book set',
    isActive: true,
    achievedAt: null,
    progress: {
      progressPercentage: 40,
      daysRemaining: 60,
      isOnTrack: true,
    },
  },
];

/**
 * Mock notifications for testing.
 */
export const mockNotifications = [
  {
    id: 'notif-1',
    type: 'milestone',
    title: 'Milestone Reached!',
    message: 'Emma completed 100 flashcard reviews!',
    priority: 'normal',
    readAt: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'notif-2',
    type: 'streak',
    title: '5 Day Streak!',
    message: 'Emma is on a 5-day study streak!',
    priority: 'normal',
    readAt: null,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-3',
    type: 'struggle_alert',
    title: 'Needs Attention',
    message: 'Oliver is struggling with Chemistry concepts',
    priority: 'high',
    readAt: null,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

/**
 * Setup API mocks for parent dashboard.
 */
export async function setupParentDashboardMocks(page: Page) {
  // Mock dashboard overview endpoint
  await page.route('**/api/v1/parent/dashboard', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        students: mockStudents.map((s) => ({
          ...s,
          display_name: s.displayName,
          grade_level: s.gradeLevel,
          school_stage: s.schoolStage,
          total_xp: s.totalXp,
          current_streak: s.currentStreak,
          longest_streak: s.longestStreak,
          sessions_this_week: s.sessionsThisWeek,
          study_time_this_week_minutes: s.studyTimeThisWeekMinutes,
          last_active_at: new Date().toISOString(),
          framework_id: 'nsw-k12',
        })),
        total_study_time_week_minutes: 600,
        total_sessions_week: 10,
        unread_notifications: 3,
        active_goals_count: 2,
        achievements_this_week: 1,
      }),
    });
  });

  // Mock student progress endpoint
  await page.route('**/api/v1/parent/students/*/progress', async (route) => {
    const url = route.request().url();
    const studentId = url.match(/students\/([^/]+)\/progress/)?.[1];
    const student = mockStudents.find((s) => s.id === studentId) || mockStudents[0];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        student_id: student.id,
        student_name: student.displayName,
        grade_level: student.gradeLevel,
        school_stage: student.schoolStage,
        framework_code: 'NSW',
        overall_mastery: 72.5,
        foundation_strength: {
          overall_strength: 68,
          prior_year_mastery: 75,
          gaps_identified: 2,
          critical_gaps: ['Fractions', 'Decimals'],
          strengths: ['Addition', 'Subtraction'],
        },
        weekly_stats: {
          study_time_minutes: student.studyTimeThisWeekMinutes,
          study_goal_minutes: 300,
          sessions_count: student.sessionsThisWeek,
          topics_covered: 8,
          mastery_improvement: 2.5,
          flashcards_reviewed: 45,
          questions_answered: 30,
          accuracy_percentage: 78,
          goal_progress_percentage: 75,
        },
        subject_progress: [
          {
            subject_id: 'math-1',
            subject_code: 'MATH',
            subject_name: 'Mathematics',
            subject_color: '#3B82F6',
            mastery_level: 75,
            strand_progress: [
              {
                strand: 'Number and Algebra',
                strand_code: 'NA',
                mastery: 80,
                outcomes_mastered: 5,
                outcomes_in_progress: 2,
                outcomes_total: 8,
                trend: 'improving',
              },
            ],
            recent_activity: '2 hours ago',
            sessions_this_week: 3,
            time_spent_this_week_minutes: 90,
            xp_earned_this_week: 150,
            current_focus_outcomes: ['MA3-RN-01'],
          },
        ],
        mastery_change_30_days: 5.2,
        current_focus_subjects: ['Mathematics'],
      }),
    });
  });

  // Mock weekly insights endpoint
  await page.route('**/api/v1/parent/students/*/insights**', async (route) => {
    const url = route.request().url();
    const studentId = url.match(/students\/([^/]+)\/insights/)?.[1];
    const student = mockStudents.find((s) => s.id === studentId) || mockStudents[0];
    const isHSC = student.schoolStage === 'S6';

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        student_id: student.id,
        week_start: new Date().toISOString(),
        insights: {
          wins: [
            {
              title: 'Great progress in Mathematics!',
              description: 'Improved mastery by 5% this week.',
              subject_id: 'math-1',
              subject_name: 'Mathematics',
              priority: 'high',
              outcome_codes: ['MA3-RN-01'],
            },
          ],
          areas_to_watch: [
            {
              title: 'Fractions need attention',
              description: 'Consider extra practice with fractions.',
              subject_id: 'math-1',
              subject_name: 'Mathematics',
              priority: 'medium',
              outcome_codes: ['MA3-FR-01'],
            },
          ],
          recommendations: [
            {
              title: 'Daily flashcard review',
              description: 'Spend 10 minutes on flashcard review each day.',
              action_type: 'study',
              subject_id: null,
              estimated_time_minutes: 10,
              priority: 'high',
            },
          ],
          teacher_talking_points: [
            'Discuss multiplication strategies',
            'Review fraction concepts',
          ],
          pathway_readiness: null,
          hsc_projection: isHSC
            ? {
                predicted_band: 5,
                band_range: '80-89',
                current_average: 82,
                atar_contribution: 85.5,
                days_until_hsc: 180,
                strengths: ['Mathematics', 'Physics'],
                focus_areas: ['Chemistry', 'English Advanced'],
                exam_readiness: 65,
                trajectory: 'improving',
              }
            : null,
          summary: 'Good progress this week with room for improvement.',
        },
        generated_at: new Date().toISOString(),
      }),
    });
  });

  // Mock goals endpoint
  await page.route('**/api/v1/parent/goals**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          goals: mockGoals.map((g) => ({
            ...g,
            student_id: g.studentId,
            target_mastery: g.targetMastery,
            target_date: g.targetDate,
            is_active: g.isActive,
            achieved_at: g.achievedAt,
            parent_id: mockParentUser.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            progress: {
              current_mastery: null,
              progress_percentage: g.progress.progressPercentage,
              outcomes_mastered: 0,
              outcomes_total: 0,
              days_remaining: g.progress.daysRemaining,
              is_on_track: g.progress.isOnTrack,
            },
          })),
          total: mockGoals.length,
          active_count: mockGoals.filter((g) => g.isActive).length,
          achieved_count: mockGoals.filter((g) => g.achievedAt).length,
        }),
      });
    } else if (route.request().method() === 'POST') {
      const body = await route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'new-goal-123',
          ...body,
          is_active: true,
          achieved_at: null,
          parent_id: mockParentUser.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          progress: {
            current_mastery: null,
            progress_percentage: 0,
            outcomes_mastered: 0,
            outcomes_total: 0,
            days_remaining: 30,
            is_on_track: true,
          },
        }),
      });
    }
  });

  // Mock delete goal endpoint
  await page.route('**/api/v1/parent/goals/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({ status: 204 });
    }
  });

  // Mock notifications endpoint
  await page.route('**/api/v1/parent/notifications**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          notifications: mockNotifications.map((n) => ({
            ...n,
            user_id: mockParentUser.id,
            related_student_id: 'student-1',
            related_subject_id: null,
            related_goal_id: null,
            delivery_method: 'in_app',
            data: {},
            sent_at: n.createdAt,
            read_at: n.readAt,
            created_at: n.createdAt,
          })),
          total: mockNotifications.length,
          unread_count: mockNotifications.filter((n) => !n.readAt).length,
        }),
      });
    }
  });

  // Mock mark notification read
  await page.route('**/api/v1/parent/notifications/*/read', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...mockNotifications[0],
        read_at: new Date().toISOString(),
      }),
    });
  });

  // Mock mark all read
  await page.route('**/api/v1/parent/notifications/read-all', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ marked_read: 3 }),
    });
  });
}

/**
 * Login as parent user (mock).
 */
export async function loginAsParent(page: Page) {
  // Mock the auth state
  await page.addInitScript(() => {
    localStorage.setItem(
      'sb-auth-token',
      JSON.stringify({
        access_token: 'mock-access-token',
        user: {
          id: 'parent-test-123',
          email: 'parent@example.com',
          role: 'parent',
        },
      })
    );
  });
}

/**
 * Navigate to parent dashboard.
 */
export async function goToParentDashboard(page: Page) {
  await page.goto('/parent-dashboard');
  // Wait for dashboard to load
  await page.waitForSelector('[data-testid="parent-dashboard"]', { timeout: 10000 }).catch(() => {
    // Fallback: wait for heading
    return page.waitForSelector('h1:has-text("Parent Dashboard")', { timeout: 10000 });
  });
}
