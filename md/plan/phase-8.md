# Implementation Plan: Phase 8 - Gamification & Engagement

## Overview

Phase 8 implements a curriculum-aligned gamification system to motivate students through XP, levels, achievements, and streaks. The system is designed with privacy-first principles (no public leaderboards) and avoids addictive mechanics (no random rewards, no time pressure). All gamification data integrates with the existing parent dashboard.

**Complexity**: Medium-High
**Database Fields**: Already in place (gamification JSONB, session.xp_earned)
**Dependencies**: Phases 1-7 complete ✓

---

## Prerequisites

- [x] Database gamification JSONB fields exist in Student model
- [x] Session model has xp_earned field
- [x] StudentSubject has progress.xpEarned field
- [x] Parent dashboard exists for integration
- [x] Session tracking from Phase 4/6 working
- [ ] Confirm XP values with stakeholder (defaulting to proposed values)
- [ ] Confirm level progression curve (linear vs exponential)

---

## Phase 1: Database & Configuration

### 1.1 Achievement Definitions Table
- [ ] Create `achievement_definitions` table (id, code, name, description, icon, category, subject_code, requirements JSONB, xp_reward, created_at)
- [ ] Seed initial achievements (10-15 for MVP)
- [ ] Create database migration `015_achievement_definitions.py`

### 1.2 Level Configuration
- [ ] Create `config/gamification.py` with:
  - XP_RULES: XP values per activity type
  - LEVEL_THRESHOLDS: XP required per level (1-20)
  - STREAK_MULTIPLIERS: bonus multipliers by streak length
  - LEVEL_TITLES: Global and subject-specific titles

### 1.3 Pydantic Schemas
- [ ] Create `schemas/gamification.py`:
  - `GamificationStats` (totalXP, level, levelProgress, streaks, achievementCount)
  - `Achievement` (id, code, name, description, icon, unlockedAt, subject)
  - `AchievementDefinition` (code, name, description, requirements, xpReward)
  - `StreakInfo` (current, longest, lastActiveDate, multiplier)
  - `LevelInfo` (level, title, currentXP, nextLevelXP, progressPercent)
  - `XPEvent` (amount, source, multiplier, timestamp)
  - `SubjectXP` (subjectId, subjectCode, xpEarned, level, title)

---

## Phase 2: Backend Services

### 2.1 XP Service (`services/xp_service.py`)
- [ ] `award_xp(student_id, amount, source, session_id=None)` - core XP awarding
- [ ] `calculate_streak_multiplier(student_id)` - get current multiplier
- [ ] `get_xp_for_activity(activity_type, **kwargs)` - XP rules lookup
- [ ] `sync_session_xp(session_id)` - sync XP to student after session
- [ ] `get_xp_history(student_id, limit=50)` - recent XP events (optional)

### 2.2 Level Service (`services/level_service.py`)
- [ ] `get_level_for_xp(xp)` - calculate level from XP
- [ ] `get_level_info(student_id)` - full level details
- [ ] `get_level_title(level, subject_code=None)` - get title string
- [ ] `check_level_up(student_id)` - detect and record level-ups
- [ ] `get_subject_level(student_id, subject_id)` - subject-specific level

### 2.3 Achievement Service (`services/achievement_service.py`)
- [ ] `check_achievements(student_id)` - evaluate all unlock conditions
- [ ] `unlock_achievement(student_id, achievement_code)` - grant achievement
- [ ] `get_unlocked_achievements(student_id)` - list unlocked
- [ ] `get_available_achievements()` - all achievement definitions
- [ ] `get_achievement_progress(student_id, achievement_code)` - % progress

### 2.4 Streak Service (`services/streak_service.py`)
- [ ] `update_streak(student_id)` - increment or reset streak
- [ ] `get_streak_info(student_id)` - current streak details
- [ ] `check_streak_milestones(student_id)` - 7, 30, 100 day checks
- [ ] `calculate_streak_bonus(streak_days)` - multiplier calculation

### 2.5 Gamification Service (`services/gamification_service.py`)
- [ ] `get_stats(student_id)` - aggregate all gamification data
- [ ] `get_subject_stats(student_id, subject_id)` - per-subject stats
- [ ] `on_session_complete(session_id)` - hook for session end (XP, streak, achievements)
- [ ] `get_recent_activity(student_id, limit=10)` - recent unlocks, level-ups

---

## Phase 3: Backend API Endpoints

### 3.1 Student Gamification Endpoints
- [ ] `GET /api/v1/gamification/stats` - student's full gamification stats
- [ ] `GET /api/v1/gamification/level` - current level and progress
- [ ] `GET /api/v1/gamification/achievements` - unlocked + available achievements
- [ ] `GET /api/v1/gamification/achievements/{code}` - specific achievement details
- [ ] `GET /api/v1/gamification/streak` - current streak info
- [ ] `GET /api/v1/gamification/subjects` - XP/level per enrolled subject
- [ ] `GET /api/v1/gamification/subjects/{id}` - specific subject stats
- [ ] `GET /api/v1/gamification/recent` - recent XP events and unlocks

### 3.2 Parent Dashboard Integration
- [ ] `GET /api/v1/parent/students/{id}/gamification` - child's gamification summary
- [ ] Add gamification summary to existing `GET /api/v1/parent/dashboard` response

### 3.3 Internal Hooks (called by other services)
- [ ] Hook into SessionService.end_session() to trigger gamification updates
- [ ] Hook into RevisionService to award XP on flashcard review
- [ ] Hook into NoteService to award XP on note upload

---

## Phase 4: Frontend Components

### 4.1 Core Gamification Components (`features/gamification/components/`)
- [ ] `XPBar.tsx` - horizontal progress bar to next level
- [ ] `LevelBadge.tsx` - circular badge showing level number
- [ ] `StreakCounter.tsx` - flame icon with streak count
- [ ] `AchievementCard.tsx` - single achievement (locked/unlocked states)
- [ ] `AchievementGrid.tsx` - grid of achievements with filters
- [ ] `XPToast.tsx` - notification for XP earned
- [ ] `LevelUpModal.tsx` - celebration on level up
- [ ] `AchievementUnlockModal.tsx` - celebration on achievement

### 4.2 Pages
- [ ] `GamificationPage.tsx` - main gamification dashboard
  - Overview section (level, XP, streak)
  - Achievements section (grid with categories)
  - Subject progress section (XP per subject)
  - Recent activity section

### 4.3 Integration Components
- [ ] Update `StudentProfile.tsx` to show level badge and XP bar
- [ ] Update session complete screens to show XP earned
- [ ] Add streak counter to navigation/header

### 4.4 Parent Dashboard Integration
- [ ] `GamificationSummary.tsx` - compact view for parent dashboard
- [ ] Add tab or section to ParentDashboard for gamification overview

---

## Phase 5: Frontend State & API

### 5.1 Zustand Store (`stores/gamificationStore.ts`)
- [ ] `stats` - cached gamification stats
- [ ] `recentXP` - recent XP events for toast display
- [ ] `newAchievements` - newly unlocked achievements queue
- [ ] `showLevelUp` - level up modal state
- [ ] `fetchStats()` - refresh stats from API
- [ ] `addXPEvent(event)` - add XP toast
- [ ] `dismissAchievement(code)` - clear from queue

### 5.2 React Query Hooks (`hooks/useGamification.ts`)
- [ ] `useGamificationStats()` - fetch full stats
- [ ] `useLevel()` - fetch level info
- [ ] `useAchievements()` - fetch achievements list
- [ ] `useStreak()` - fetch streak info
- [ ] `useSubjectXP(subjectId)` - fetch subject-specific XP

### 5.3 API Client (`lib/api/gamification.ts`)
- [ ] `getStats()` - GET /gamification/stats
- [ ] `getLevel()` - GET /gamification/level
- [ ] `getAchievements()` - GET /gamification/achievements
- [ ] `getStreak()` - GET /gamification/streak
- [ ] `getSubjectStats(subjectId)` - GET /gamification/subjects/{id}
- [ ] `getRecent()` - GET /gamification/recent

---

## Phase 6: Integration & Hooks

### 6.1 Session Completion Integration
- [ ] Update `SessionService.end_session()` to call `gamification_service.on_session_complete()`
- [ ] Update frontend session complete flow to:
  1. Fetch updated stats
  2. Show XP earned toast
  3. Check for level up (show modal)
  4. Check for new achievements (show modal)

### 6.2 Revision Integration
- [ ] Update flashcard review to award XP via XP service
- [ ] Show XP earned per card in revision UI

### 6.3 Note Upload Integration
- [ ] Award XP on successful note upload
- [ ] Show XP toast after upload completes

### 6.4 Parent Notification Integration
- [ ] Create notifications for:
  - Streak milestones (7, 30, 100 days)
  - Level milestones (every 5 levels)
  - Achievement unlocks (notable ones)

---

## Phase 7: Testing

### 7.1 Backend Unit Tests
- [ ] `test_xp_service.py` - XP calculation, multipliers
- [ ] `test_level_service.py` - level calculation, thresholds
- [ ] `test_achievement_service.py` - unlock conditions
- [ ] `test_streak_service.py` - streak logic, date boundaries
- [ ] `test_gamification_service.py` - integration of all services

### 7.2 Backend API Tests
- [ ] `test_gamification_api.py` - all endpoints
- [ ] Auth verification tests
- [ ] Ownership verification tests

### 7.3 Frontend Tests
- [ ] Component tests for all gamification components
- [ ] Store tests for gamificationStore
- [ ] Hook tests for useGamification hooks

### 7.4 Integration Tests
- [ ] E2E: Complete session → XP awarded → level check → achievement check
- [ ] E2E: Streak incrementing across days
- [ ] E2E: Parent viewing child's gamification data

---

## Phase 8: Documentation

- [ ] API documentation for gamification endpoints
- [ ] Achievement catalogue (all achievements with unlock conditions)
- [ ] XP earning guide (how to earn XP)
- [ ] Level progression table

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| XP manipulation via API | HIGH | LOW | Server-side validation, session-based XP only |
| Gamification reduces intrinsic motivation | HIGH | MEDIUM | Curriculum alignment, optional visibility |
| Performance with large achievement arrays | LOW | LOW | Limit achievements per student, pagination |
| Streak timezone issues | MEDIUM | MEDIUM | Use UTC, document timezone handling |
| Parent opt-out complexity | MEDIUM | LOW | Simple preference flag in student settings |

---

## Curriculum Considerations

- XP amounts tied to curriculum engagement (outcomes worked on)
- Subject-specific achievements recognize curriculum mastery
- Level titles reflect educational progression, not gaming terms
- Achievements can reference specific curriculum milestones

---

## Privacy/Security Checklist

- [x] No public leaderboards
- [ ] Students can only view own gamification data
- [ ] Parents can only view linked children's gamification
- [ ] XP awarded only through validated actions (not API manipulation)
- [ ] Achievements visible only to student and parent
- [ ] All gamification changes auditable via session logs

---

## Implementation Order

### Week 1: Backend Foundation
1. Configuration and schemas
2. XP and Level services
3. Achievement service
4. Streak service
5. Gamification service (orchestration)

### Week 2: API & Integration
1. Gamification API endpoints
2. Hook into session completion
3. Parent dashboard integration
4. Backend tests

### Week 3: Frontend
1. Core components (XPBar, LevelBadge, etc.)
2. GamificationPage
3. Store and hooks
4. Integration with existing UI

### Week 4: Polish & Testing
1. Celebration modals
2. Toast notifications
3. E2E testing
4. Documentation

---

## MVP Scope (Priority 1)

For initial release, focus on:
- XP earning on session completion
- 10 levels with global titles
- 10 achievements (5 engagement, 3 curriculum, 2 milestone)
- Streak tracking with multipliers
- XP bar and level badge in profile
- Parent gamification summary

**Defer to Priority 2**:
- Subject-specific levels and titles
- 30+ achievements
- Celebration animations
- XP history log
- Achievement progress indicators

---

## Estimated Files to Create

### Backend
- `backend/app/config/gamification.py` (100 lines)
- `backend/app/schemas/gamification.py` (150 lines)
- `backend/app/models/achievement_definition.py` (50 lines)
- `backend/app/services/xp_service.py` (200 lines)
- `backend/app/services/level_service.py` (150 lines)
- `backend/app/services/achievement_service.py` (250 lines)
- `backend/app/services/streak_service.py` (150 lines)
- `backend/app/services/gamification_service.py` (200 lines)
- `backend/app/api/v1/endpoints/gamification.py` (300 lines)
- `backend/alembic/versions/015_achievement_definitions.py` (50 lines)
- `backend/tests/services/test_xp_service.py` (200 lines)
- `backend/tests/services/test_level_service.py` (150 lines)
- `backend/tests/services/test_achievement_service.py` (200 lines)
- `backend/tests/services/test_streak_service.py` (150 lines)
- `backend/tests/api/test_gamification.py` (300 lines)

### Frontend
- `frontend/src/lib/api/gamification.ts` (100 lines)
- `frontend/src/stores/gamificationStore.ts` (100 lines)
- `frontend/src/hooks/useGamification.ts` (80 lines)
- `frontend/src/features/gamification/components/XPBar.tsx` (80 lines)
- `frontend/src/features/gamification/components/LevelBadge.tsx` (60 lines)
- `frontend/src/features/gamification/components/StreakCounter.tsx` (70 lines)
- `frontend/src/features/gamification/components/AchievementCard.tsx` (100 lines)
- `frontend/src/features/gamification/components/AchievementGrid.tsx` (120 lines)
- `frontend/src/features/gamification/components/XPToast.tsx` (60 lines)
- `frontend/src/features/gamification/components/LevelUpModal.tsx` (100 lines)
- `frontend/src/features/gamification/components/AchievementUnlockModal.tsx` (100 lines)
- `frontend/src/features/gamification/GamificationPage.tsx` (200 lines)
- `frontend/src/features/parent-dashboard/components/GamificationSummary.tsx` (150 lines)

**Estimated Total**: ~3,500 lines of code + tests

---

## Recommended Agent

**Primary**: `full-stack-developer` - End-to-end feature implementation

**Supporting Agents**:
- `backend-architect` for service layer design
- `frontend-developer` for React components
- `testing-qa-specialist` for comprehensive test coverage

---

## Open Questions to Resolve

1. ✅ XP Values confirmed (use proposed values from study doc)
2. ❓ Level curve: Linear or exponential? (Recommend: slightly exponential)
3. ❓ Parent opt-out: Can parents disable gamification display for their child?
4. ❓ Streak freeze: Allow purchased/earned "streak freeze" items?
5. ❓ Subject vs Global: One global level or separate per-subject levels?
