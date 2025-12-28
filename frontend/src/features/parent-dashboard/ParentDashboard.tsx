/**
 * ParentDashboard - Main dashboard for parents to monitor children's progress.
 *
 * Features:
 * - Overview of all children's learning progress
 * - Weekly stats and study time tracking
 * - AI-generated insights
 * - Goal management
 * - Notification centre
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  TrendingUp,
  Target,
  Bell,
  Lightbulb,
  ChevronRight,
  Clock,
  Flame,
  Star,
  Trophy,
  GraduationCap,
  Settings,
} from 'lucide-react';
import { parentDashboardApi } from '@/lib/api';
import type { DashboardStudentSummary } from '@/lib/api';
import { Card, Button, Spinner } from '@/components/ui';
import { ProgressTab } from './components/ProgressTab';
import { InsightsTab } from './components/InsightsTab';
import { GoalsTab } from './components/GoalsTab';
import { NotificationsTab } from './components/NotificationsTab';
import { SettingsTab } from './components/SettingsTab';
import { HSCDashboard } from './components/HSCDashboard';

type TabId = 'overview' | 'progress' | 'insights' | 'goals' | 'notifications' | 'settings' | 'hsc';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const BASE_TABS: TabConfig[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'progress', label: 'Progress', icon: <TrendingUp className="h-4 w-4" /> },
  { id: 'insights', label: 'Weekly Insights', icon: <Lightbulb className="h-4 w-4" /> },
  { id: 'goals', label: 'Goals', icon: <Target className="h-4 w-4" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
];

const HSC_TAB: TabConfig = {
  id: 'hsc',
  label: 'HSC Dashboard',
  icon: <GraduationCap className="h-4 w-4" />,
};

export function ParentDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const {
    data: dashboard,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['parent-dashboard'],
    queryFn: () => parentDashboardApi.getDashboard(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="p-6 text-center">
          <p className="text-red-600">Failed to load dashboard</p>
          <p className="mt-2 text-sm text-gray-500">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </Card>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  // Default to first student if none selected
  const effectiveStudentId = selectedStudentId ?? dashboard.students[0]?.id ?? null;

  // Get selected student info
  const selectedStudent = dashboard.students.find((s) => s.id === effectiveStudentId);
  const isHSCStudent = selectedStudent?.schoolStage === 'S6';

  // Build tabs list - add HSC tab if selected student is in Stage 6
  const tabs = isHSCStudent ? [...BASE_TABS, HSC_TAB] : BASE_TABS;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Parent Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">
                Monitor your children's learning progress
              </p>
            </div>

            {/* Quick Stats */}
            <div className="hidden items-center gap-6 sm:flex">
              <QuickStat
                icon={<Clock className="h-5 w-5 text-blue-500" />}
                label="Study Time"
                value={formatMinutes(dashboard.totalStudyTimeWeekMinutes)}
              />
              <QuickStat
                icon={<Target className="h-5 w-5 text-green-500" />}
                label="Active Goals"
                value={dashboard.activeGoalsCount.toString()}
              />
              {dashboard.unreadNotifications > 0 && (
                <QuickStat
                  icon={<Bell className="h-5 w-5 text-orange-500" />}
                  label="Notifications"
                  value={dashboard.unreadNotifications.toString()}
                />
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div
            className="mt-6 flex gap-1 overflow-x-auto"
            role="tablist"
            aria-label="Dashboard sections"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`tabpanel-${tab.id}`}
                id={`tab-${tab.id}`}
                tabIndex={activeTab === tab.id ? 0 : -1}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.id === 'notifications' && dashboard.unreadNotifications > 0 && (
                  <span className="ml-1 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                    {dashboard.unreadNotifications}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Student Selector (for multi-child families) */}
        {dashboard.students.length > 1 && (
          <div className="mb-6">
            <fieldset>
              <legend className="block text-sm font-medium text-gray-700">Select Child</legend>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Student selection">
                {dashboard.students.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => setSelectedStudentId(student.id)}
                    aria-pressed={effectiveStudentId === student.id}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                      effectiveStudentId === student.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 shadow-sm hover:bg-gray-50'
                    }`}
                  >
                    {student.displayName}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {/* Tab Content */}
        <div
          role="tabpanel"
          id={`tabpanel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          tabIndex={0}
        >
          {activeTab === 'overview' && (
            <OverviewTab
              students={dashboard.students}
              onSelectStudent={(id) => {
                setSelectedStudentId(id);
                setActiveTab('progress');
              }}
            />
          )}

          {activeTab === 'progress' && effectiveStudentId && (
            <ProgressTab studentId={effectiveStudentId} />
          )}

          {activeTab === 'insights' && effectiveStudentId && (
            <InsightsTab studentId={effectiveStudentId} />
          )}

          {activeTab === 'goals' && <GoalsTab studentId={effectiveStudentId} />}

          {activeTab === 'notifications' && <NotificationsTab studentId={effectiveStudentId} />}

          {activeTab === 'settings' && <SettingsTab />}

          {activeTab === 'hsc' && effectiveStudentId && selectedStudent && (
            <HSCDashboard
              studentId={effectiveStudentId}
              studentName={selectedStudent.displayName}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

interface QuickStatProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function QuickStat({ icon, label, value }: QuickStatProps) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );
}

interface OverviewTabProps {
  students: DashboardStudentSummary[];
  onSelectStudent: (id: string) => void;
}

function OverviewTab({ students, onSelectStudent }: OverviewTabProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {students.map((student) => (
        <StudentSummaryCard
          key={student.id}
          student={student}
          onViewDetails={() => onSelectStudent(student.id)}
        />
      ))}
    </div>
  );
}

interface StudentSummaryCardProps {
  student: DashboardStudentSummary;
  onViewDetails: () => void;
}

function StudentSummaryCard({ student, onViewDetails }: StudentSummaryCardProps) {
  const stageLabel = getStageLabel(student.schoolStage);
  const gradeLabel = getGradeLabel(student.gradeLevel);

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{student.displayName}</h3>
          <p className="text-sm text-gray-500">
            {gradeLabel} ({stageLabel})
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1">
          <Star className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-700">Lvl {student.level}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <StatItem
          icon={<Clock className="h-4 w-4 text-gray-400" />}
          label="This Week"
          value={formatMinutes(student.studyTimeThisWeekMinutes)}
        />
        <StatItem
          icon={<Flame className="h-4 w-4 text-orange-400" />}
          label="Streak"
          value={`${student.currentStreak} days`}
        />
        <StatItem
          icon={<LayoutDashboard className="h-4 w-4 text-gray-400" />}
          label="Sessions"
          value={student.sessionsThisWeek.toString()}
        />
        <StatItem
          icon={<Trophy className="h-4 w-4 text-yellow-400" />}
          label="Total XP"
          value={formatXP(student.totalXp)}
        />
      </div>

      <div className="mt-4">
        <Button
          variant="outline"
          className="w-full justify-between"
          onClick={onViewDetails}
        >
          View Details
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function StatItem({ icon, label, value }: StatItemProps) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatXP(xp: number): string {
  if (xp >= 1000) {
    return `${(xp / 1000).toFixed(1)}k`;
  }
  return xp.toString();
}

function getStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    ES1: 'Early Stage 1',
    S1: 'Stage 1',
    S2: 'Stage 2',
    S3: 'Stage 3',
    S4: 'Stage 4',
    S5: 'Stage 5',
    S6: 'Stage 6',
  };
  return labels[stage] ?? stage;
}

function getGradeLabel(grade: number): string {
  if (grade === 0) return 'Kindergarten';
  return `Year ${grade}`;
}
