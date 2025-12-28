# Study: Phase 8 - Gamification & Engagement

## Summary

Phase 8 focuses on implementing a gamification system to motivate students through reward mechanisms aligned with educational outcomes. The phase builds on existing foundations already in place (XP fields in database models, session tracking, parent dashboard) and aims to create engaging experiences without encouraging unhealthy learning habits.

**Status**: Not Started (0% complete)
**Priority**: High - Foundation already in place from Phases 1-7
**Dependencies**: All previous phases (1-7) - completed successfully

---

## Key Requirements

### 1. XP System (Experience Points)
- Track learning progress with per-subject XP accumulation
- XP earned on session completion (revision, tutor, flashcards)
- Subject-specific XP tracking (per subject, per student)
- Daily, weekly, and total XP aggregation
- Different activities earn different XP amounts

### 2. Level Progression System
- Students advance through levels as they earn XP
- XP-to-level mapping (e.g., Level 1: 0 XP, Level 2: 500 XP, etc.)
- Level names/titles per subject ("Mathematics Explorer", "Reading Master", etc.)
- Level-up notifications for students and parents
- Visual progression indicator (XP bar showing progress to next level)

### 3. Achievement Badges/Unlockables
- Recognize specific learning milestones and accomplishments
- Categories:
  - **Curriculum-based**: "Secured all Stage 3 Number outcomes", "Mastered Decimals"
  - **Engagement-based**: "7-Day Streak", "Study Warrior (5+ hours)"
  - **Subject-specific**: "Mathematics Explorer", "Literary Analyst"
  - **Milestone-based**: "Level 5 Reached", "100 Flashcards Reviewed"
  - **Challenge-based**: "Perfect Session", "No Hints"

### 4. Study Streaks
- Encourage consistent daily study habits
- Daily check-in increments streak on consecutive days
- Streak multiplier: XP multiplier based on current streak
- Visual streak counter in UI
- Parent notifications for milestone streaks (7, 30, 100 days)

### 5. Optional Leaderboards (Privacy-Respecting)
- Must respect student privacy (Australian Privacy Act)
- Only show within family context (private leaderboards)
- No public ranking of children
- Focus on personal best, not ranking vs. others
- Opt-in rather than default

---

## Existing Patterns

### Database Schema (Already Integrated)

| Table | Field | Type | Purpose |
|-------|-------|------|---------|
| `students` | `gamification` | JSONB | Global XP, level, achievements, streaks |
| `student_subjects` | `progress.xpEarned` | JSONB | Subject-specific XP |
| `sessions` | `xp_earned` | Integer | XP earned in this session |

### JSONB Structure (Already Defined)
```json
{
  "totalXP": 2450,
  "level": 12,
  "achievements": [
    {
      "id": "mastered-decimals",
      "name": "Decimal Master",
      "description": "Secured all Year 5 decimal outcomes",
      "icon": "star",
      "unlockedAt": "2025-12-28T10:30:00Z",
      "subject": "MATH"
    }
  ],
  "streaks": {
    "current": 7,
    "longest": 14,
    "lastActiveDate": "2025-12-28"
  }
}
```

### Service Patterns to Follow
- `backend/app/services/goal_service.py` - Service architecture pattern
- `backend/app/services/spaced_repetition.py` - Calculation logic pattern
- `backend/app/api/v1/endpoints/parent_dashboard.py` - API endpoint patterns

### Frontend Patterns
- `frontend/src/features/parent-dashboard/` - Feature organization
- Existing UI components in `frontend/src/components/ui/`
- React Query patterns for data fetching

---

## Technical Considerations

### API Endpoints Needed

**Gamification Stats**:
- `GET /api/v1/gamification/stats` - Student's XP, level, achievements
- `GET /api/v1/gamification/achievements` - List of available achievements + unlocked status
- `GET /api/v1/gamification/streak` - Current streak info

**Subject-Specific**:
- `GET /api/v1/gamification/subjects/{id}` - XP and level per subject
- `GET /api/v1/gamification/subjects/{id}/achievements` - Subject-specific achievements

**Parent Dashboard Integration**:
- `GET /api/v1/parent/gamification` - Child's XP, level, achievements (parent view)

### Frontend Components Needed

**Student-Facing**:
- `XPBar` - Shows current XP and progress to next level
- `LevelBadge` - Display current level with title
- `AchievementCard` - Individual achievement display (locked/unlocked state)
- `AchievementShowcase` - Grid of all achievements
- `StreakCounter` - Visual streak indicator with celebration
- `CelebrationAnimation` - Confetti/effects on level-up or achievement unlock
- `GamificationDashboard` - Central gamification page with all stats

**Parent-Facing**:
- Gamification section in ParentDashboard
- Achievement notifications
- Level milestone celebrations
- Streak tracking in insights

### New Service Layer

- `GamificationService` - XP calculation, level progression, achievement logic
- `StreakService` - Streak calculation and maintenance
- `AchievementService` - Achievement unlock logic and notifications

### XP Earning Rules (Proposed)

| Activity | Base XP | Notes |
|----------|---------|-------|
| Revision Session | 10 XP per card | +50 XP bonus if 100% correct |
| Socratic Tutor Chat | 25 XP per Q&A pair | Encourages engagement |
| Note Upload + OCR | 20 XP per note | Rewards content creation |

**Streak Multipliers**:
- 1-7 days: 1.1x
- 8-30 days: 1.2x
- 31+ days: 1.5x

### Level Progression (Proposed)

```
Level 1: 0 XP - "Learner"
Level 2: 500 XP - "Student"
Level 3: 1,500 XP - "Scholar"
Level 4: 3,000 XP - "Researcher"
Level 5: 5,000 XP - "Master"
...
Level 20: 50,000 XP - "Learning Legend"
```

Subject-specific titles:
- Mathematics: "Calculator", "Problem Solver", "Mathematics Master"
- English: "Word Collector", "Literary Analyst", "Writing Virtuoso"
- Science: "Explorer", "Investigator", "Scientist"

---

## Curriculum Alignment

- XP must correlate with learning progress, not just app usage
- Achievements should recognize curriculum milestones (e.g., "Secured all Stage 3 outcomes")
- Subject-specific gamification respects different learning approaches
- Level progression encourages comprehensive curriculum coverage

---

## Security/Privacy Considerations

### Critical Requirements
- Prevent XP manipulation via API (validate session completion server-side)
- Ensure students can only view own gamification data
- Parents can view linked children's data only
- No XP leakage between frameworks or between students
- Log significant gamification changes (for audit trail)

### Privacy Act Compliance
- No public leaderboards
- No student identification outside family context
- Opt-in for any competitive features
- Family-only visibility for achievements

### Design Principles
1. **No Addictive Mechanics**:
   - No random rewards
   - No artificial urgency or time pressure
   - No pay-to-win mechanics
2. **Parent-Student Transparency**: Parents see and understand the gamification system
3. **Accessibility**: Non-gamers should find value; gamification is optional enhancement

---

## Dependencies

### From Previous Phases (All Complete)
- **Phase 1 (Setup)**: Project structure, database, auth ✓
- **Phase 2 (Curriculum)**: Subject system, outcomes ✓
- **Phase 3 (Auth)**: Student/parent accounts ✓
- **Phase 4 (AI Tutoring)**: Sessions track XP earned ✓
- **Phase 5 (Notes)**: Note management ✓
- **Phase 6 (Revision)**: Flashcard reviews track session XP ✓
- **Phase 7 (Parent Dashboard)**: Will integrate gamification data ✓

### Database Fields (Already In Place)
- `Student.gamification` (JSONB) ✓
- `StudentSubject.progress.xpEarned` ✓
- `Session.xp_earned` ✓

---

## Implementation Priorities

### Priority 1 (MVP)
- XP earning on session completion
- Level progression system (5-10 levels)
- Basic achievement system (5-10 achievements)
- Streak tracking enhancement
- XP/level display in student profile and parent dashboard

### Priority 2 (Polish)
- Subject-specific level titles
- Achievement notification system
- Celebration animations
- Streak milestones (7, 30, 100 days)
- More achievements (30+)

### Priority 3 (Nice-to-Have)
- Private family leaderboard
- Achievement descriptions and hints
- XP history/log
- Streaks per subject

---

## Testing Requirements

- Unit tests for XP calculation logic (rounding, multipliers)
- Streak calculation edge cases (day boundaries, timezone handling)
- Achievement unlock conditions
- Level progression thresholds
- Integration tests for API endpoints
- Frontend component tests (rendering, animations)

---

## Risk Factors & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Gamification reduces intrinsic motivation | HIGH | Focus on curriculum alignment, optional features |
| XP manipulation/cheating | MEDIUM | Validate all XP-earning actions server-side |
| Privacy concerns with achievements | MEDIUM | Ensure family-only visibility |
| Performance with large achievement arrays | LOW | Limit to 50-100 achievements per student |
| Complexity bloat | MEDIUM | Keep Phase 8 focused; defer social features |

---

## Open Questions

1. **XP Values**: What specific XP values for each activity type?
2. **Level Curve**: Linear or exponential XP requirements per level?
3. **Achievement Count**: How many achievements for MVP vs. full release?
4. **Streak Grace Period**: Allow "streak freeze" for missed days?
5. **Parent Opt-Out**: Can parents disable gamification for their children?
6. **Subject vs. Global**: Separate levels per subject or one global level?

---

## Sources Referenced

- `CLAUDE.md` - Project configuration and conventions
- `PROGRESS.md` - Current development progress
- `Complete_Development_Plan.md` - Technical specifications and database schema
- `studyhub_overview.md` - Product overview and features
- `backend/app/models/student.py` - Student model with gamification fields
- `backend/app/models/student_subject.py` - Subject-level progress tracking
- `backend/app/models/session.py` - Session XP tracking
- `backend/app/services/goal_service.py` - Service pattern reference
- `frontend/src/features/parent-dashboard/` - UI pattern reference
