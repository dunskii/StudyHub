# StudyHub Master Task List

**Single source of truth for all development tasks.**

**Last Updated**: 2025-12-25
**Current Phase**: 1 - Foundation & Infrastructure
**Overall Progress**: ~15%

---

## Quick Status

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 0 | Project Setup | COMPLETE | 100% |
| 1 | Foundation & Infrastructure | **IN PROGRESS** | 15% |
| 2 | Core Curriculum System | NOT STARTED | 0% |
| 3 | User System | NOT STARTED | 0% |
| 4 | AI Tutoring Foundation | NOT STARTED | 0% |
| 5 | Notes and OCR | NOT STARTED | 0% |
| 6 | Revision System | NOT STARTED | 0% |
| 7 | Parent Dashboard | NOT STARTED | 0% |
| 8 | Gamification | NOT STARTED | 0% |
| 9 | PWA/Offline & Launch | NOT STARTED | 0% |

---

## Current Sprint

### Active Tasks
- [ ] Configure PostgreSQL locally or via Supabase
- [ ] Run initial Alembic migrations
- [ ] Set up Supabase project and get API keys
- [ ] Create Pydantic schemas for all models

### Blocked
*None currently*

### Up Next
- [ ] Seed NSW curriculum data (subjects, outcomes)
- [ ] Implement Supabase auth middleware
- [ ] Create base UI components (Button, Card, Modal, Input, Toast)

---

## Phase 0: Project Setup ✅ COMPLETE

- [x] Create project documentation
  - [x] studyhub_overview.md
  - [x] Complete_Development_Plan.md
  - [x] Implementation_Plan.md
  - [x] README.md
  - [x] CLAUDE.md
- [x] Set up Claude Code configuration
  - [x] 5 custom commands (/study, /plan, /qa, /report, /commit)
  - [x] 12 specialized agents
  - [x] 8 validation skills
  - [x] settings.local.json
- [x] Initialize backend structure
  - [x] FastAPI app with main.py
  - [x] 10 SQLAlchemy models
  - [x] Alembic configuration
  - [x] API v1 endpoint stubs
  - [x] Core modules (config, database, security)
- [x] Initialize frontend structure
  - [x] Vite + React 18 + TypeScript
  - [x] Tailwind CSS with subject colors
  - [x] React Router v6
  - [x] TanStack Query
  - [x] Zustand stores (auth, subject)
  - [x] Type definitions
  - [x] API client
- [x] Set up GitHub repository
- [x] Create CI/CD workflows
  - [x] Backend CI (pytest, ruff, mypy)
  - [x] Frontend CI (vitest, eslint, playwright)
  - [x] Deploy workflow

---

## Phase 1: Foundation & Infrastructure

### 1.1 Database Setup
- [ ] Configure PostgreSQL connection
- [ ] Set up Supabase project
- [ ] Get Supabase API keys
- [ ] Update .env with real credentials

### 1.2 Backend Migrations
- [ ] Create 001_extensions.py (uuid-ossp, updated_at trigger)
- [ ] Create 002_curriculum_frameworks.py
- [ ] Create 003_users.py
- [ ] Create 004_students.py
- [ ] Run migrations successfully
- [ ] Seed NSW framework (is_default=TRUE)

### 1.3 Backend API
- [x] FastAPI project structure
- [x] SQLAlchemy models (all 10)
- [x] Database connection module
- [ ] Create Pydantic schemas
  - [ ] FrameworkSchema
  - [ ] SubjectSchema
  - [ ] StudentSchema
  - [ ] UserSchema
  - [ ] NoteSchema
  - [ ] SessionSchema
- [ ] Implement health endpoint (functional)
- [ ] Implement frameworks endpoints
- [ ] Supabase auth integration
- [ ] Auth middleware

### 1.4 Frontend Foundation
- [x] Vite + React + TypeScript
- [x] Tailwind CSS configured
- [x] React Query configured
- [x] Zustand stores
- [x] React Router setup
- [ ] Create base UI components
  - [ ] Button (variants: primary, secondary, ghost, destructive)
  - [ ] Card (with header, content, footer)
  - [ ] Modal (Dialog with Radix UI)
  - [ ] Input (text, email, password, textarea)
  - [ ] Toast/Alert (success, error, warning, info)
  - [ ] Spinner/Loading
- [ ] Supabase client integration
- [ ] Auth flow (login, signup, logout)
- [ ] AuthGuard component

### 1.5 Testing Setup
- [ ] Backend: pytest with async support
- [ ] Backend: conftest.py with test fixtures
- [ ] Backend: test_health.py
- [ ] Frontend: vitest configuration
- [ ] Frontend: first component test
- [ ] E2E: Playwright setup

### 1.6 Quality Gates
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] No Python type errors (mypy)
- [ ] Linting passes (ruff, eslint)

---

## Phase 2: Core Curriculum System

### 2.1 Database
- [ ] Create subjects migration
- [ ] Create curriculum_outcomes migration
- [ ] Create senior_courses migration
- [ ] Seed NSW subjects (8 KLAs)
- [ ] Seed NSW Mathematics outcomes (sample)
- [ ] Seed NSW English outcomes (sample)

### 2.2 Backend
- [ ] Subject model refinements
- [ ] CurriculumOutcome model refinements
- [ ] SeniorCourse model refinements
- [ ] Subject service
- [ ] Curriculum service
- [ ] GET /api/v1/subjects
- [ ] GET /api/v1/subjects/{id}
- [ ] GET /api/v1/frameworks/{code}/subjects
- [ ] GET /api/v1/outcomes (with filters)
- [ ] GET /api/v1/outcomes/{code}
- [ ] GET /api/v1/subjects/{id}/outcomes
- [ ] GET /api/v1/senior-courses
- [ ] Run curriculum-validator skill

### 2.3 Frontend
- [ ] SubjectCard component
- [ ] SubjectSelector component
- [ ] OutcomeCard component
- [ ] StrandNavigator component
- [ ] CurriculumBrowser component
- [ ] PathwaySelector (Stage 5 pathways)
- [ ] HSCCourseSelector (Stage 6)
- [ ] useSubjects hook
- [ ] useCurriculum hook
- [ ] CurriculumDashboard page

### 2.4 Quality Gates
- [ ] All curriculum tests passing
- [ ] Curriculum data validates against NESA
- [ ] Run subject-config-checker skill

---

## Phase 3: User System

### 3.1 Database
- [ ] Create student_subjects migration
- [ ] Add indexes for performance

### 3.2 Backend
- [ ] User service
- [ ] Student service
- [ ] StudentSubject service
- [ ] Access control (parent/child verification)
- [ ] POST /api/v1/users (after Supabase signup)
- [ ] GET /api/v1/users/me
- [ ] PUT /api/v1/users/me
- [ ] GET /api/v1/students
- [ ] POST /api/v1/students
- [ ] GET /api/v1/students/{id}
- [ ] PUT /api/v1/students/{id}
- [ ] DELETE /api/v1/students/{id}
- [ ] GET /api/v1/students/{id}/subjects
- [ ] POST /api/v1/students/{id}/subjects
- [ ] DELETE /api/v1/students/{id}/subjects/{sid}

### 3.3 Frontend
- [ ] Onboarding flow
- [ ] StudentOnboarding component
- [ ] SubjectSelection component
- [ ] PathwaySelection component
- [ ] StudentProfile component
- [ ] StudentSwitcher (for parents with multiple children)

### 3.4 Quality Gates
- [ ] Access control tests passing
- [ ] Run student-data-privacy-audit skill
- [ ] Parent cannot access other parents' children

---

## Phase 4: AI Tutoring Foundation

### 4.1 Database
- [ ] Create sessions migration
- [ ] Create ai_interactions migration
- [ ] Add indexes for AI interaction queries

### 4.2 Backend
- [ ] Claude service with Anthropic SDK
- [ ] Model routing (Haiku vs Sonnet)
- [ ] Subject-specific tutor prompts
  - [ ] Mathematics: socratic_stepwise
  - [ ] English: mentor_guide
  - [ ] Science: inquiry_based
  - [ ] HSIE: socratic_discussion
  - [ ] PDHPE: activity_coach
  - [ ] TAS: design_mentor
  - [ ] Creative Arts: creative_facilitator
  - [ ] Languages: immersive_coach
- [ ] Age-appropriate language filter
- [ ] Safety/moderation system
- [ ] AI interaction logging
- [ ] Cost tracking per interaction
- [ ] POST /api/v1/tutor/chat
- [ ] GET /api/v1/tutor/history/{session_id}
- [ ] POST /api/v1/tutor/flashcards
- [ ] POST /api/v1/tutor/summarise
- [ ] GET /api/v1/ai-interactions (parent view)

### 4.3 Frontend
- [ ] TutorChat component
- [ ] ChatMessage component
- [ ] ChatInput component
- [ ] SubjectContext display
- [ ] Conversation history view
- [ ] Typing indicator
- [ ] Error handling for AI failures

### 4.4 Quality Gates
- [ ] Run ai-prompt-tester skill
- [ ] Socratic method verified (never gives direct answers)
- [ ] Age-appropriate responses verified
- [ ] All AI interactions logged
- [ ] Security audit on AI endpoints

---

## Phase 5: Notes and OCR

### 5.1 Database
- [ ] Notes table enhancements
- [ ] OCR processing status tracking

### 5.2 Backend
- [ ] Google Cloud Vision integration
- [ ] Note upload endpoint
- [ ] OCR processing service
- [ ] Curriculum alignment via AI
- [ ] POST /api/v1/notes
- [ ] GET /api/v1/notes
- [ ] GET /api/v1/notes/{id}
- [ ] POST /api/v1/notes/{id}/ocr
- [ ] PUT /api/v1/notes/{id}
- [ ] DELETE /api/v1/notes/{id}

### 5.3 Frontend
- [ ] NoteUpload component (camera, file)
- [ ] NoteList component
- [ ] NoteViewer component
- [ ] NoteAnnotation component
- [ ] OCR status indicator
- [ ] Curriculum tagging UI

---

## Phase 6: Revision System

### 6.1 Database
- [ ] Flashcard model
- [ ] Revision history tracking
- [ ] SM-2 data fields

### 6.2 Backend
- [ ] SM-2 spaced repetition algorithm
- [ ] Flashcard generation from notes
- [ ] Revision session management
- [ ] Progress tracking per subject
- [ ] POST /api/v1/flashcards
- [ ] GET /api/v1/flashcards
- [ ] POST /api/v1/revision/session
- [ ] POST /api/v1/revision/answer
- [ ] GET /api/v1/revision/due

### 6.3 Frontend
- [ ] FlashcardView component
- [ ] RevisionSession component
- [ ] ProgressChart component
- [ ] DifficultyIndicator component
- [ ] Streak display

---

## Phase 7: Parent Dashboard

### 7.1 Backend
- [ ] Analytics service
- [ ] Weekly insights generation
- [ ] Email notification service (Resend)
- [ ] GET /api/v1/parent/children
- [ ] GET /api/v1/parent/children/{id}/progress
- [ ] GET /api/v1/parent/children/{id}/ai-logs
- [ ] GET /api/v1/parent/insights

### 7.2 Frontend
- [ ] ParentDashboard layout
- [ ] ChildProgressCard component
- [ ] SubjectProgressDetail component
- [ ] AIConversationReview component
- [ ] WeeklyInsights component
- [ ] NotificationPreferences component

---

## Phase 8: Gamification

### 8.1 Backend
- [ ] XP calculation logic (per subject)
- [ ] Level progression system
- [ ] Achievement definitions
- [ ] Streak tracking
- [ ] GET /api/v1/gamification/stats
- [ ] GET /api/v1/gamification/achievements
- [ ] GET /api/v1/gamification/leaderboard (optional)

### 8.2 Frontend
- [ ] XPBar component
- [ ] LevelBadge component
- [ ] AchievementCard component
- [ ] StreakCounter component
- [ ] CelebrationAnimation component

---

## Phase 9: PWA/Offline & Launch

### 9.1 PWA Setup
- [ ] Service worker configuration
- [ ] Web manifest
- [ ] App icons (all sizes)
- [ ] Splash screens

### 9.2 Offline Support
- [ ] IndexedDB setup (idb library)
- [ ] Offline curriculum cache
- [ ] Background sync for AI interactions
- [ ] Offline indicator

### 9.3 Push Notifications
- [ ] Push notification setup
- [ ] Study reminders
- [ ] Achievement notifications

### 9.4 Launch Preparation
- [ ] Comprehensive testing (all flows)
- [ ] Security audit (OWASP Top 10)
- [ ] Privacy compliance review (Australian Privacy Act)
- [ ] Performance audit (Lighthouse 90+)
- [ ] Documentation review
- [ ] Beta deployment
- [ ] Beta testing with real users
- [ ] Bug fixes from beta
- [ ] Production deployment
- [ ] Monitoring setup (Sentry, uptime)

---

## Cross-Phase Requirements

### Security (Every Phase)
- [ ] No direct student data exposure
- [ ] All curriculum queries filter by framework_id
- [ ] Parent can only access their children
- [ ] Student can only access their own data
- [ ] All AI interactions logged
- [ ] HTTPS only in production
- [ ] Rate limiting on all endpoints
- [ ] Input validation on all endpoints

### Testing (Every Phase)
- [ ] Unit tests: 80%+ coverage
- [ ] Integration tests: all API endpoints
- [ ] E2E tests: critical user flows
- [ ] Security tests: auth, injection, XSS

### Documentation (Every Phase)
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Component documentation (Storybook - optional)
- [ ] User guides (before launch)

---

## Completed Tasks Log

### 2025-12-25
- [x] Project documentation created
- [x] Claude Code configuration (commands, agents, skills)
- [x] Backend structure initialized (FastAPI, models, endpoints)
- [x] Frontend structure initialized (Vite, React, Tailwind)
- [x] GitHub repository connected
- [x] CI/CD workflows created
- [x] Initial commit pushed to main

---

## Notes

**Priority Rules:**
1. Foundation must be solid before features
2. Security and privacy are non-negotiable
3. Write tests alongside features, not after
4. NSW first, but always design for multi-framework

**Key Constraints:**
- Children's data protection (Australian Privacy Act)
- NEVER give direct answers (Socratic method)
- All AI interactions must be logged for parent review
- Every curriculum query must filter by framework_id

**Quick Commands:**
- View progress: Check PROGRESS.md
- View implementation details: Check Planning/roadmaps/Implementation_Plan.md
- View tech decisions: Check Complete_Development_Plan.md
