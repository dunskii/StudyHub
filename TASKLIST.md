# StudyHub Master Task List

**Single source of truth for all development tasks.**

**Last Updated**: 2025-12-26
**Current Phase**: 2 - Core Curriculum System
**Overall Progress**: ~12%

---

## Quick Status

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 0 | Project Setup | ✅ COMPLETE | 100% |
| 1 | Foundation & Infrastructure | ✅ COMPLETE | 100% |
| 2 | Core Curriculum System | **NEXT** | 0% |
| 3 | User System | NOT STARTED | 0% |
| 4 | AI Tutoring Foundation | NOT STARTED | 0% |
| 5 | Notes and OCR | NOT STARTED | 0% |
| 6 | Revision System | NOT STARTED | 0% |
| 7 | Parent Dashboard | NOT STARTED | 0% |
| 8 | Gamification | NOT STARTED | 0% |
| 9 | PWA/Offline & Launch | NOT STARTED | 0% |

---

## Current Sprint - Phase 2 Kickoff

### Priority 1: Database Setup (BLOCKING)
- [ ] Configure PostgreSQL locally or via Supabase
- [ ] Set DATABASE_URL and TEST_DATABASE_URL in .env
- [ ] Run all 12 Alembic migrations: `alembic upgrade head`
- [ ] Verify database connectivity
- [ ] Run backend tests to ensure all pass

### Priority 2: Supabase Auth Setup (BLOCKING)
- [ ] Create Supabase project
- [ ] Get Supabase API keys (URL, ANON_KEY, SERVICE_KEY)
- [ ] Set environment variables in both frontend and backend
- [ ] Test Supabase connection

### Priority 3: Curriculum Data Seeding
- [ ] Seed NSW framework data
- [ ] Seed 8 NSW subjects (MATH, ENG, SCI, HSIE, PDHPE, TAS, CA, LANG)
- [ ] Seed sample Mathematics outcomes (Stage 3)
- [ ] Seed sample English outcomes (Stage 3)
- [ ] Run curriculum-validator skill to verify data

### Up Next (Phase 2 Week 2)
- [ ] Implement subject endpoints (GET, POST, PUT, DELETE)
- [ ] Implement curriculum outcome endpoints with filtering
- [ ] Build SubjectSelector component
- [ ] Build CurriculumBrowser component
- [ ] Complete authentication flow

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

## Phase 1: Foundation & Infrastructure ✅ COMPLETE (2025-12-26)

### 1.1 Database Setup
- [x] Alembic configuration complete
- [x] 12 migrations created covering all core tables
- [ ] PostgreSQL connection (deferred - needs environment setup)
- [ ] Supabase project setup (deferred - Phase 2 Priority 2)

### 1.2 Backend Migrations ✅ ALL COMPLETE
- [x] Create 001_extensions.py (uuid-ossp, updated_at trigger)
- [x] Create 002_curriculum_frameworks.py
- [x] Create 003_users.py (with privacy fields)
- [x] Create 004_students.py
- [x] Create 005_subjects.py
- [x] Create 006_curriculum_outcomes.py
- [x] Create 007_senior_courses.py
- [x] Create 008_student_subjects.py
- [x] Create 009_notes.py
- [x] Create 010_sessions.py
- [x] Create 011_ai_interactions.py
- [x] Create 012_user_privacy_fields.py

### 1.3 Backend API ✅ COMPLETE
- [x] FastAPI project structure with main.py
- [x] SQLAlchemy models (all 10)
- [x] Database connection module
- [x] Pydantic schemas created
  - [x] BaseSchema with timestamp mixins
  - [x] HealthSchema
  - [x] FrameworkSchema
  - [x] SubjectSchema (basic)
  - [x] StudentSchema
  - [x] UserSchema
- [x] Security middleware (CSRF, rate limiting, headers)
- [x] JWT authentication framework
- [x] Service layer (framework_service)
- [x] API endpoint structure (7 endpoint files)
- [x] All mypy type errors resolved

### 1.4 Frontend Foundation ✅ COMPLETE
- [x] Vite + React + TypeScript
- [x] Tailwind CSS configured with custom theme
- [x] React Query configured
- [x] Zustand stores (auth, subject with tests)
- [x] React Router setup
- [x] UI Components (10 components, 86 tests)
  - [x] Button (14 tests) - variants, sizes, loading, disabled
  - [x] Card (7 tests) - header, content, footer composition
  - [x] Modal (8 tests) - Radix Dialog with keyboard nav
  - [x] Input (14 tests) - text, email, password, textarea, error states
  - [x] Toast (10 tests) - variants, auto-dismiss, actions
  - [x] Spinner (8 tests) - sizes, colors, accessibility
  - [x] Label (5 tests) - required indicator, error states
  - [x] ErrorBoundary (11 tests) - fallback UI, reset
  - [x] SkipLink (6 tests) - WCAG compliance
  - [x] VisuallyHidden (3 tests) - screen reader only
- [x] API client with retry logic (23 tests)
- [ ] Supabase client integration (Phase 2 Priority 2)
- [ ] Auth flow (Phase 2 Week 2)
- [ ] AuthGuard component (Phase 2 Week 2)

### 1.5 Testing Setup ✅ COMPLETE
- [x] Backend: pytest with async support
- [x] Backend: conftest.py with test fixtures
- [x] Backend: 24 tests ready (test_health, test_frameworks, test_security, test_rate_limit)
- [x] Frontend: vitest configuration
- [x] Frontend: 132 tests passing (13 test files)
- [x] E2E: Playwright configured (tests deferred to Phase 2+)

### 1.6 Quality Gates ✅ COMPLETE
- [x] Frontend tests passing (132/132)
- [x] Backend tests ready (pending database)
- [x] No TypeScript errors (strict mode)
- [x] No Python type errors (mypy strict mode)
- [x] Linting configured (ruff, eslint)

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

### 2025-12-26 - Phase 1 Complete
- [x] 12 database migrations completed (all core tables)
- [x] Security middleware: CSRF protection, rate limiting, security headers
- [x] JWT authentication framework
- [x] 10 UI components with 132 passing tests
- [x] API client with retry logic (23 tests)
- [x] Zustand state management with tests
- [x] Pydantic schemas for all core models
- [x] Service layer architecture
- [x] All mypy type errors resolved (strict mode)
- [x] All TypeScript errors resolved (strict mode)
- [x] Comprehensive work report: `md/report/phase-1-complete.md`
- [x] Updated PROGRESS.md to mark Phase 0 and Phase 1 complete

### 2025-12-25 - Phase 0 Complete
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
