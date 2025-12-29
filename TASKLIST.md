# StudyHub Master Task List

**Single source of truth for all development tasks.**

**Last Updated**: 2025-12-29
**Current Phase**: 9 - PWA & Offline
**Overall Progress**: ~90%

---

## Quick Status

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 0 | Project Setup | ✅ COMPLETE | 100% |
| 1 | Foundation & Infrastructure | ✅ COMPLETE | 100% |
| 2 | Core Curriculum System | ✅ COMPLETE | 100% |
| 3 | User System & Auth | ✅ COMPLETE | 100% |
| 4 | AI Tutoring Foundation | ✅ COMPLETE | 100% |
| 5 | Notes and OCR | ✅ COMPLETE | 100% |
| 6 | Revision System | ✅ COMPLETE | 100% |
| 7 | Parent Dashboard | ✅ COMPLETE | 100% |
| 8 | Gamification | ✅ COMPLETE | 100% |
| 9 | PWA/Offline & Launch | NOT STARTED | 0% |

---

## Current Sprint - Phase 9 PWA & Offline

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

## Phase 2: Core Curriculum System ✅ COMPLETE (2025-12-26)

### 2.1 Database ✅
- [x] Subjects seeded (8 NSW KLAs)
- [x] Curriculum outcomes seeded (55 samples)
- [x] Senior courses seeded (HSC Mathematics)
- [x] Database indexes on framework_id, subject_id
- [x] Composite indexes for query patterns

### 2.2 Backend ✅
- [x] CurriculumService with framework isolation
- [x] SubjectService with filtering
- [x] SeniorCourseService with validation
- [x] GET /api/v1/subjects (list with pagination)
- [x] GET /api/v1/subjects/{id}
- [x] GET /api/v1/subjects/code/{code}
- [x] GET /api/v1/subjects/{id}/outcomes
- [x] GET /api/v1/curriculum/outcomes (with filters)
- [x] GET /api/v1/curriculum/outcomes/{code}
- [x] GET /api/v1/curriculum/strands
- [x] GET /api/v1/curriculum/stages
- [x] GET /api/v1/senior-courses
- [x] SQL wildcard escaping in search
- [x] Max page limit (1000)

### 2.3 Frontend ✅
- [x] SubjectCard component (Lucide icons, memoized)
- [x] SubjectGrid component (loading/error states)
- [x] OutcomeCard component (memoized)
- [x] OutcomeList component (loading/error/retry)
- [x] StageSelector component
- [x] HSCCourseCard component (accessible)
- [x] HSCCourseSelector component
- [x] useSubjects hook
- [x] useCurriculum hook
- [x] useSeniorCourses hook

### 2.4 Quality Gates ✅
- [x] 118 backend tests passing
- [x] 210 frontend tests passing
- [x] Zero TypeScript errors
- [x] 3 QA review cycles completed
- [x] All issues resolved (critical, medium, optimizations)

---

## Phase 3: User System ✅ COMPLETE (2025-12-26)

### 3.1 Backend ✅
- [x] UserService with CRUD operations
- [x] StudentService with ownership verification
- [x] StudentSubjectService with pathway support
- [x] DataExportService for privacy compliance
- [x] Auth rate limiting (5 attempts/min, 5-min lockout)
- [x] POST /api/v1/users (with rate limiting)
- [x] GET /api/v1/users/me
- [x] PUT /api/v1/users/me
- [x] GET /api/v1/users/me/students
- [x] GET /api/v1/users/me/export
- [x] GET/PUT/DELETE /api/v1/students/{id}
- [x] GET/POST/DELETE /api/v1/students/{id}/enrolments

### 3.2 Frontend ✅
- [x] AuthProvider context
- [x] AuthGuard route protection
- [x] LoginForm with validation
- [x] SignupForm with validation
- [x] StudentProfile component
- [x] StudentSwitcher dropdown
- [x] OnboardingWizard (4 steps)
- [x] EnrolmentManager with progress
- [x] EnrolmentCard with progress bar
- [x] SubjectEnrolModal

### 3.3 Security ✅
- [x] Auth rate limiting for brute force protection
- [x] Data export for GDPR/Privacy Act
- [x] Ownership verification on all operations
- [x] ErrorBoundary in main app

### 3.4 Quality Gates ✅
- [x] 236 backend tests passing
- [x] 266 frontend tests passing
- [x] Privacy audit completed
- [x] QA review completed

---

## Phase 4: AI Tutoring Foundation ✅ COMPLETE (2025-12-27)

- [x] ClaudeService with model routing (Sonnet 4/Haiku 3.5)
- [x] 8 subject-specific tutor prompts with Socratic method
- [x] Age-appropriate language guidelines (Stage 2-6)
- [x] ModerationService for safety and content flagging
- [x] SessionService and AIInteractionService
- [x] All endpoints: chat, history, flashcards, summarise
- [x] Frontend: TutorChat, ChatMessage, ChatInput, TypingIndicator
- [x] All AI interactions logged for parent review

---

## Phase 5: Notes and OCR ✅ COMPLETE (2025-12-27)

- [x] StorageService for Digital Ocean Spaces (S3-compatible)
- [x] ImageProcessor for validation, resizing, thumbnails
- [x] OCRService with Google Cloud Vision API
- [x] NoteService with curriculum alignment via Claude AI
- [x] Presigned URL flow for direct browser uploads
- [x] Frontend: NoteUpload, NoteList, NoteViewer, OCRStatus
- [x] Subject filtering and full-text search

---

## Phase 6: Revision System ✅ COMPLETE (2025-12-27)

- [x] SM-2 spaced repetition algorithm
- [x] FlashcardGenerationService for AI-powered generation
- [x] RevisionService for flashcard CRUD and sessions
- [x] All endpoints: flashcards, due, answer, progress, history
- [x] Frontend: FlashcardView, RevisionSession, RevisionProgress
- [x] Auth integration and rate limiting (5/hour, 20/day)
- [x] 300 backend tests passing

---

## Phase 7: Parent Dashboard ✅ COMPLETE (2025-12-28)

- [x] ParentAnalyticsService for progress calculations
- [x] GoalService for family goal management
- [x] NotificationService for parent alerts
- [x] All endpoints: dashboard, progress, insights, goals, notifications
- [x] Frontend: 5 tabs (Overview, Progress, Goals, Notifications, Settings)
- [x] HSCDashboard component for Stage 6 students
- [x] InsightsTab with AI-generated weekly insights
- [x] P1/P2 QA fixes: division by zero, N+1 queries, code quality
- [x] Medium/Low QA fixes: accessibility, error hints, framework caching
- [x] Key Findings Implementation:
  - [x] Ownership verification in `get_student_summary()` (security fix)
  - [x] N+1 query fix with batch prefetch in `get_students_summary()`
  - [x] Zod validation schemas for frontend type safety (285 lines)
  - [x] SettingsTab component with full accessibility (480 lines)
  - [x] Batch delete for `delete_old_notifications()` (performance fix)
  - [x] 24 HTTP integration tests for ownership verification
- [x] 76 backend tests, 83 frontend tests, 24 integration tests passing

---

## Phase 8: Gamification ✅ COMPLETE (2025-12-29)

### 8.1 Backend Services ✅
- [x] XPService with daily caps and streak multipliers (375 lines)
- [x] LevelService with 20-level progression
- [x] StreakService with milestone detection
- [x] AchievementService with progress tracking (548 lines)
- [x] GamificationService orchestration
- [x] Centralized config (config/gamification.py - 531 lines)
- [x] AchievementDefinition model and migration

### 8.2 API Endpoints ✅ (12 endpoints)
- [x] GET /students/{id}/stats - Basic gamification stats
- [x] GET /students/{id}/stats/detailed - Full stats with achievements
- [x] GET /students/{id}/level - Level info only
- [x] GET /students/{id}/streak - Streak info only
- [x] GET /students/{id}/achievements - All with progress
- [x] GET /students/{id}/achievements/unlocked - Unlocked only
- [x] GET /students/{id}/subjects - Subject XP/levels
- [x] GET /achievements/definitions - Available achievements
- [x] Parent endpoints: GET /parent/students/{id}, achievements, subjects

### 8.3 Frontend ✅ (10 components)
- [x] XPBar - Horizontal progress bar with XP display
- [x] LevelBadge - Circular badge with tier colors
- [x] StreakCounter - Flame icon with streak/multiplier
- [x] AchievementCard - Lock/progress states
- [x] AchievementGrid - Grid layout
- [x] AchievementUnlockModal - Celebration modal
- [x] LevelUpModal - Celebration modal
- [x] XPToast - Toast notification
- [x] GamificationSummary - Dashboard summary
- [x] GamificationPage - Full page

### 8.4 Testing ✅ (145 tests)
- [x] 88 backend tests (58 unit + 9 integration + 21 API)
- [x] 57 frontend tests (6 test files)
- [x] All test infrastructure complete

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

### 2025-12-29 - Phase 8 Gamification Complete
- [x] 5 backend services (XP, Level, Streak, Achievement, Gamification)
- [x] Centralized config (config/gamification.py - 531 lines)
- [x] AchievementDefinition model and migration
- [x] 12 API endpoints with ownership verification
- [x] 10 frontend components with accessibility
- [x] API client with snake_case → camelCase transforms (516 lines)
- [x] 145 tests passing (88 backend + 57 frontend)
- [x] QA review: PASS - `md/review/phase-8-gamification-qa.md`
- [x] Work report: `md/report/phase-8-complete.md`

### 2025-12-29 - Phase 8 Test Infrastructure Complete
- [x] Fixed 5 method signature mismatches in test_gamification_services.py
- [x] Added 8 gamification fixtures to conftest.py
- [x] Added 25 new unit tests across 5 test classes
- [x] Added 4 mock helper functions (mock_student_query, mock_session_query, etc.)
- [x] Created test_gamification_integration.py with 9 integration tests
- [x] All 67 tests passing in 3.44s
- [x] QA review: PASS
- [x] Work report: `md/report/test-infrastructure-fixes.md`

### 2025-12-26 - Phase 3 Complete
- [x] UserService, StudentService, StudentSubjectService
- [x] DataExportService for GDPR/Privacy Act compliance
- [x] Auth rate limiting (5 attempts/min, 5-min lockout)
- [x] 14 API endpoints for user and student management
- [x] Fixed streak calculation bug
- [x] Auth components (AuthProvider, AuthGuard, LoginForm, SignupForm)
- [x] Student components (StudentProfile, StudentSwitcher)
- [x] Onboarding wizard (4 steps)
- [x] Enrolment management (EnrolmentManager, EnrolmentCard, SubjectEnrolModal)
- [x] Accessibility improvements (ARIA labels, live regions, progressbar roles)
- [x] ErrorBoundary wrapping main app
- [x] 236 backend tests, 266 frontend tests
- [x] Privacy audit completed
- [x] QA review completed
- [x] Work report: `md/report/phase-3-complete.md`

### 2025-12-26 - Phase 2 Complete
- [x] 13 API endpoints for subjects, curriculum, senior courses
- [x] CurriculumService, SubjectService, SeniorCourseService
- [x] Framework isolation on all curriculum queries
- [x] Database indexes for query performance
- [x] SQL wildcard escaping for search security
- [x] Max page limit (1000) for DoS prevention
- [x] 7 new frontend components with tests
- [x] React Query hooks for data fetching
- [x] Lucide React icons replacing emoji fallbacks
- [x] 118 backend tests, 210 frontend tests
- [x] 3 QA review cycles - all issues resolved
- [x] Work report: `md/report/phase-2-complete.md`

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
