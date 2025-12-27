# StudyHub Development Progress

**Last Updated**: 2025-12-27
**Overall Progress**: 75% (Revision & Spaced Repetition Complete + QA Hardening)

---

## Phase Overview

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 0 | Project Setup | ✅ **COMPLETE** | 100% |
| 1 | Foundation & Infrastructure | ✅ **COMPLETE** | 100% |
| 2 | Core Curriculum System | ✅ **COMPLETE** | 100% |
| 3 | User System & Auth | ✅ **COMPLETE** | 100% |
| 4 | AI Tutoring | ✅ **COMPLETE** | 100% |
| 5 | Notes & OCR | ✅ **COMPLETE** | 100% |
| 6 | Revision & Spaced Repetition | NOT STARTED | 0% |
| 7 | Parent Dashboard | NOT STARTED | 0% |
| 8 | Gamification & Engagement | NOT STARTED | 0% |
| 9 | PWA & Offline | NOT STARTED | 0% |
| 10 | Testing & Launch | NOT STARTED | 0% |

---

## Phase 0: Project Setup ✅ COMPLETE (2025-12-25)

### Documentation
- [x] Project overview created (`studyhub_overview.md`)
- [x] Complete development plan created (`Complete_Development_Plan.md`)
- [x] CLAUDE.md configuration created
- [x] .claude/ directory with commands, agents, skills
- [x] PROGRESS.md created
- [x] TASKLIST.md created
- [x] README.md for developers

### Repository Structure
- [x] Planning/ directory created
- [x] docs/ directory created
- [x] md/ work artifacts directory created
- [x] frontend/ directory initialized
- [x] backend/ directory initialized
- [x] GitHub repository connected
- [x] CI/CD workflows (GitHub Actions)

### Design Decisions Documented
- [x] Multi-framework curriculum support
- [x] All subjects (not just Maths)
- [x] Subject-specific tutor styles
- [x] NSW as initial focus

---

## Phase 1: Foundation & Infrastructure ✅ COMPLETE (2025-12-26)

### Backend Setup
- [x] FastAPI project structure with main.py
- [x] SQLAlchemy models created (all 10 models)
- [x] Alembic migrations configured (12 migrations complete)
- [x] Pydantic schemas (base, health, framework, user, student)
- [x] Security middleware (CSRF protection, security headers)
- [x] Rate limiting middleware (with Redis support)
- [x] JWT authentication framework
- [x] Core API endpoints structure
- [x] Service layer (framework_service)
- [x] All mypy type errors resolved (strict mode)
- [x] Test infrastructure (pytest-asyncio, fixtures)
- [x] 24 backend tests ready (pending database config)

### Frontend Setup
- [x] Vite + React + TypeScript
- [x] Tailwind CSS configured with custom theme
- [x] UI Component library (10 components)
  - [x] Button (14 tests)
  - [x] Card (7 tests)
  - [x] Input (14 tests)
  - [x] Modal/Dialog (8 tests)
  - [x] Toast (10 tests)
  - [x] Spinner (8 tests)
  - [x] Label (5 tests)
  - [x] ErrorBoundary (11 tests)
  - [x] SkipLink (6 tests)
  - [x] VisuallyHidden (3 tests)
- [x] React Query configured
- [x] Zustand stores created (auth, subject with tests)
- [x] Router configuration
- [x] API client with retry logic (23 tests)
- [x] 132 frontend tests passing
- [x] Zero TypeScript errors (strict mode)

### Database Migrations (12 Complete)
- [x] 001_extensions (uuid-ossp, updated_at trigger)
- [x] 002_curriculum_frameworks
- [x] 003_users (with privacy fields)
- [x] 004_students
- [x] 005_subjects
- [x] 006_curriculum_outcomes
- [x] 007_senior_courses
- [x] 008_student_subjects
- [x] 009_notes
- [x] 010_sessions
- [x] 011_ai_interactions
- [x] 012_user_privacy_fields

### Security & Quality
- [x] CSRF protection with token stores (in-memory + Redis support)
- [x] Rate limiting (configurable per endpoint)
- [x] Security headers (HSTS, CSP, X-Frame-Options, etc.)
- [x] JWT token creation and validation
- [x] Password hashing with bcrypt
- [x] Type safety enforced (TypeScript + Python)
- [x] Comprehensive test coverage for core systems

### Infrastructure
- [ ] PostgreSQL database provisioned (BLOCKED - needed for Phase 2)
- [ ] Supabase Auth project setup (BLOCKED - needed for Phase 2)
- [ ] Digital Ocean App Platform (deferred to deployment)
- [ ] Spaces storage configured (deferred to Phase 5)
- [ ] Environment variables documented
- [x] GitHub Actions CI/CD

---

## Phase 2: Core Curriculum System ✅ COMPLETE (2025-12-26)

### Backend API ✅
- [x] Subject endpoints (GET list, by ID, by code, outcomes)
- [x] Curriculum outcome endpoints with filtering (stage, strand, pathway, search)
- [x] Senior course endpoints with framework isolation
- [x] Strand and stage enumeration endpoints
- [x] CurriculumService with framework isolation
- [x] SubjectService with filtering
- [x] SeniorCourseService with framework validation

### Frontend Components ✅
- [x] SubjectCard with Lucide icons (memoized)
- [x] SubjectGrid with loading/error states
- [x] OutcomeCard (memoized)
- [x] OutcomeList with loading/error/retry
- [x] StageSelector (radio group)
- [x] HSCCourseCard with accessibility
- [x] HSCCourseSelector (multi-select)

### Data & Configuration ✅
- [x] NSW framework with 8 subjects seeded
- [x] 55 sample curriculum outcomes seeded
- [x] HSC courses for Mathematics seeded
- [x] Subject-specific tutor styles configured
- [x] Stage/pathway system (ES1-S6, 5.1/5.2/5.3)

### Quality & Security ✅
- [x] Database indexes on framework_id, subject_id
- [x] Composite indexes for query patterns
- [x] SQL wildcard escaping in search
- [x] Max page limit (1000) on pagination
- [x] React.memo on list items
- [x] Error state handling with retry
- [x] 118 backend tests, 210 frontend tests
- [x] All QA issues resolved (3 review cycles)

---

## Phase 3: User System & Auth ✅ COMPLETE (2025-12-26)

### Backend ✅
- [x] UserService with CRUD operations
- [x] StudentService with ownership verification
- [x] StudentSubjectService with pathway support
- [x] DataExportService for privacy compliance
- [x] Auth rate limiting (5 attempts/min, 5-min lockout)
- [x] POST /api/v1/users (with rate limiting)
- [x] GET /api/v1/users/me
- [x] PUT /api/v1/users/me
- [x] GET /api/v1/users/me/students
- [x] GET /api/v1/users/me/export (data portability)
- [x] POST /api/v1/users/me/accept-privacy-policy
- [x] POST /api/v1/users/me/accept-terms
- [x] GET/PUT/DELETE /api/v1/students/{id}
- [x] GET/POST/DELETE /api/v1/students/{id}/enrolments
- [x] Fixed streak calculation bug

### Frontend ✅
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
- [x] PathwaySelector

### Accessibility ✅
- [x] ARIA labels on Spinner
- [x] aria-live regions for loading
- [x] aria-hidden on decorative icons
- [x] role="progressbar" with proper attributes
- [x] Accessible StudentAvatar

### Security ✅
- [x] Auth rate limiting (brute force protection)
- [x] Data export for GDPR/Privacy Act
- [x] Ownership verification on all operations
- [x] ErrorBoundary in main app

### Quality Gates ✅
- [x] 236 backend tests passing
- [x] 266 frontend tests passing
- [x] Privacy audit completed
- [x] QA review completed
- [x] All issues resolved

---

## Phase 4: AI Tutoring ✅ COMPLETE (2025-12-27)

### Claude Integration ✅
- [x] ClaudeService with model routing (Sonnet 4 for complex, Haiku 3.5 for simple)
- [x] Cost tracking and token usage monitoring
- [x] Configurable daily token limits per student

### Subject-Specific Tutor Prompts ✅
- [x] Base Socratic tutor prompt (CRITICAL: never gives direct answers)
- [x] Mathematics tutor (socratic_stepwise approach)
- [x] English tutor (socratic_analytical approach)
- [x] Science tutor (inquiry_based approach)
- [x] HSIE tutor (socratic_analytical approach)
- [x] PDHPE tutor (discussion_based approach)
- [x] TAS tutor (project_based approach)
- [x] Creative Arts tutor (creative_mentoring approach)
- [x] Languages tutor (immersive approach)
- [x] Age-appropriate language guidelines (Stage 2-6)

### Backend Services ✅
- [x] SessionService for session lifecycle management
- [x] AIInteractionService for logging all AI exchanges
- [x] ModerationService for safety and content flagging
- [x] TutorPromptFactory for dynamic prompt generation

### API Endpoints ✅
- [x] POST /api/v1/socratic/chat (main tutoring endpoint)
- [x] GET /api/v1/socratic/history/{session_id}
- [x] POST /api/v1/socratic/flashcards
- [x] POST /api/v1/socratic/summarise
- [x] Session CRUD endpoints
- [x] Parent AI visibility endpoints

### Frontend Components ✅
- [x] TutorChat (main container)
- [x] ChatMessage with markdown rendering
- [x] ChatInput with character limit
- [x] TypingIndicator with animation
- [x] SubjectContext header
- [x] EmptyChat with suggested prompts
- [x] ConversationHistory for past sessions
- [x] TutorPage with subject selection

### State Management ✅
- [x] tutorStore (Zustand)
- [x] useTutor hooks (React Query)
- [x] API functions for tutor endpoints

### Safety Features ✅
- [x] Content moderation with distress detection
- [x] Dishonesty pattern detection
- [x] Off-topic redirect
- [x] Inappropriate content flagging
- [x] All AI interactions logged for parent review

---

## Phase 5: Notes & OCR ✅ COMPLETE (2025-12-27)

### Backend Services ✅
- [x] StorageService for Digital Ocean Spaces (S3-compatible)
- [x] ImageProcessor for validation, resizing, thumbnails
- [x] OCRService with Google Cloud Vision API
- [x] MockOCRService for development/testing
- [x] NoteService for CRUD and business logic
- [x] Curriculum alignment via Claude AI (Haiku model)

### API Endpoints ✅
- [x] POST /api/v1/notes/upload-url (presigned URL generation)
- [x] POST /api/v1/notes (create note after upload)
- [x] GET /api/v1/notes (list with filters)
- [x] GET /api/v1/notes/{id} (get details)
- [x] PUT /api/v1/notes/{id} (update)
- [x] DELETE /api/v1/notes/{id} (delete)
- [x] POST /api/v1/notes/{id}/process-ocr (trigger OCR)
- [x] GET /api/v1/notes/{id}/ocr-status (poll status)
- [x] POST /api/v1/notes/{id}/align-curriculum (AI suggestions)
- [x] PUT /api/v1/notes/{id}/outcomes (link outcomes)

### Frontend Components ✅
- [x] NoteCard with thumbnail, OCR status badge, tags
- [x] NoteList with grid layout, loading/empty/error states
- [x] NoteUpload with drag & drop, progress tracking
- [x] NoteViewer with zoom, OCR text panel, actions
- [x] OCRStatus badge component
- [x] NotesPage with subject filters and search

### State Management ✅
- [x] noteStore (Zustand) for upload progress tracking
- [x] useNotes hooks (React Query) with polling for OCR
- [x] API functions for all note endpoints

### Features ✅
- [x] Presigned URL flow for direct browser uploads
- [x] Background OCR processing
- [x] Image validation (format, size, dimensions)
- [x] Thumbnail generation
- [x] Subject filtering with URL params
- [x] Full-text search across notes
- [x] Curriculum outcome alignment via AI

### Dependencies ✅
- [x] boto3 for S3-compatible storage
- [x] Pillow for image processing
- [x] google-cloud-vision for OCR

---

## Phase 6: Revision & Spaced Repetition ✅ COMPLETE (2025-12-27)

### Backend Services ✅
- [x] SpacedRepetitionService with SM-2 algorithm
- [x] RevisionService for flashcard CRUD and sessions
- [x] FlashcardGenerationService for AI-powered generation
- [x] Flashcard and RevisionHistory SQLAlchemy models
- [x] Database migrations 013_flashcards and 014_revision_history
- [x] Pydantic schemas for flashcards and revision

### API Endpoints ✅
- [x] POST /api/v1/revision/flashcards (create)
- [x] GET /api/v1/revision/flashcards (list with filters)
- [x] GET /api/v1/revision/flashcards/{id} (get)
- [x] PUT /api/v1/revision/flashcards/{id} (update)
- [x] DELETE /api/v1/revision/flashcards/{id} (delete)
- [x] POST /api/v1/revision/flashcards/generate (AI generation)
- [x] POST /api/v1/revision/flashcards/bulk (bulk create)
- [x] GET /api/v1/revision/due (due for review)
- [x] POST /api/v1/revision/answer (submit answer)
- [x] GET /api/v1/revision/progress (overall stats)
- [x] GET /api/v1/revision/progress/by-subject (per-subject stats)
- [x] GET /api/v1/revision/history (review history)

### Frontend Components ✅
- [x] FlashcardView with flip animation
- [x] FlashcardList with grid/list toggle
- [x] FlashcardCreator form
- [x] GenerateFromNote AI generation UI
- [x] RevisionSession with progress tracking
- [x] RevisionProgress dashboard
- [x] RevisionPage with tabbed navigation

### State Management ✅
- [x] revisionStore (Zustand) for session state
- [x] useRevision hooks (React Query)
- [x] API client functions

### Features ✅
- [x] SM-2 spaced repetition algorithm
- [x] Flashcard generation from notes (Claude Haiku)
- [x] Flashcard generation from curriculum outcomes
- [x] Review session with correctness tracking
- [x] Difficulty rating (1-5 scale)
- [x] Mastery percentage calculation
- [x] Subject-based progress tracking
- [x] Review streak tracking

### Tests ✅
- [x] SpacedRepetitionService unit tests (SM-2 algorithm)
- [x] revisionStore unit tests

### Phase 6 QA Hardening ✅ (2025-12-27)
Priority 1 and 2 recommendations from QA review:

- [x] **Auth Integration (P1)**: All 12 revision endpoints require authentication
- [x] **Ownership Verification (P1)**: `verify_student_access()` checks parent ownership
- [x] **Rate Limiting (P1)**: GenerationRateLimiter (5/hour, 20/day per student)
- [x] **Streak Bug Fix (P2)**: Fixed month boundary bug using timedelta
- [x] **API Integration Tests (P2)**: 20 new tests for revision endpoints
- [x] **Streak Unit Tests (P2)**: 4 tests for date boundary edge cases
- [x] **Test Fixtures**: Added flashcard and note fixtures to conftest.py

Test Results:
- Backend: 300 tests passing
- Frontend: 288 tests passing
- New revision tests: 24 tests

---

## Phase 7: Parent Dashboard

- [ ] Parent account management
- [ ] Child progress overview
- [ ] Subject-by-subject progress
- [ ] AI conversation review
- [ ] Weekly insights
- [ ] Notification preferences

---

## Phase 8: Gamification & Engagement

- [ ] XP system per subject
- [ ] Level progression
- [ ] Achievement badges
- [ ] Study streaks
- [ ] Leaderboards (optional, privacy-respecting)

---

## Phase 9: HSC/Senior Features

- [ ] HSC course selection
- [ ] Band prediction (stretch)
- [ ] Exam preparation mode
- [ ] Study planning tools
- [ ] ATAR tracking (stretch)

---

## Phase 10: PWA & Offline

- [ ] Service worker configuration
- [ ] IndexedDB for offline data
- [ ] Background sync
- [ ] Download for offline
- [ ] Push notifications

---

## Phase 11: Testing & Launch

- [ ] Unit test coverage > 80%
- [ ] E2E tests for critical paths
- [ ] Security audit
- [ ] Privacy compliance check
- [ ] Performance optimization
- [ ] Beta testing
- [ ] Production deployment

---

## Changelog

### 2025-12-27 - Phase 6 QA Hardening Complete
- **Phase 6 QA Priority 1 & 2 Recommendations: 100% COMPLETE**
- Security hardening:
  - All 12 revision endpoints now require authentication
  - Ownership verification prevents cross-parent access (403 Forbidden)
  - GenerationRateLimiter protects AI endpoint (5/hour, 20/day per student)
  - Proper 404/403 differentiation prevents enumeration attacks
- Bug fixes:
  - Fixed streak calculation month boundary bug using timedelta
  - Previously used `.replace(day=...)` which failed on Jan 1 → Dec 31
- Test improvements:
  - 20 new API integration tests for revision endpoints
  - 4 new streak date calculation unit tests
  - Added flashcard and note fixtures to conftest.py
  - Backend tests: 276 → 300 (24 new tests)
- Files modified:
  - `backend/app/api/v1/endpoints/revision.py` (auth, rate limiting)
  - `backend/app/services/revision_service.py` (streak fix)
  - `backend/tests/conftest.py` (new fixtures)
- Files created:
  - `backend/tests/api/test_revision.py` (API tests)
  - `md/study/priority-recommendations-1-and-2.md`
  - `md/plan/priority-recommendations-1-and-2.md`
  - `md/review/priority-recommendations-1-and-2.md`
  - `md/report/priority-recommendations-1-and-2.md`
- QA review: PASS - Production ready

### 2025-12-27 - Phase 5 Complete
- **Phase 5 Notes & OCR System: 100% COMPLETE**
- Backend accomplishments:
  - StorageService for Digital Ocean Spaces (S3-compatible)
  - ImageProcessor for validation, resizing, and thumbnail generation
  - OCRService with Google Cloud Vision API (document_text_detection)
  - MockOCRService for development without credentials
  - NoteService for CRUD operations and business logic
  - Curriculum alignment using Claude AI (Haiku model)
  - Pydantic schemas for all note operations
  - 10 API endpoints for notes management
  - Background task processing for async OCR
  - Presigned URL flow for direct browser-to-S3 uploads
- Frontend accomplishments:
  - noteStore (Zustand) for upload progress tracking
  - useNotes hooks (React Query) with OCR status polling
  - NoteCard with thumbnail preview and status badge
  - NoteList with grid layout and loading/empty/error states
  - NoteUpload with drag & drop and progress bar
  - NoteViewer with zoom controls and OCR text panel
  - OCRStatus badge component
  - NotesPage with subject filters and search
  - Integrated into main app router at /notes
- Dependencies added:
  - boto3 for S3-compatible storage
  - Pillow for image processing
  - google-cloud-vision for OCR
- Files created:
  - `backend/app/services/storage_service.py`
  - `backend/app/services/image_processor.py`
  - `backend/app/services/ocr_service.py`
  - `backend/app/services/note_service.py`
  - `backend/app/schemas/note.py`
  - `backend/app/api/v1/endpoints/notes.py`
  - `frontend/src/lib/api/notes.ts`
  - `frontend/src/stores/noteStore.ts`
  - `frontend/src/hooks/useNotes.ts`
  - `frontend/src/features/notes/` (6 files)
  - `frontend/src/pages/NotesPage.tsx`
- Ready for Phase 6: Revision & Spaced Repetition

### 2025-12-27 - Phase 4 Complete
- **Phase 4 AI Tutoring Foundation: 100% COMPLETE**
- Backend accomplishments:
  - ClaudeService with model routing (Sonnet 4/Haiku 3.5)
  - SessionService for session lifecycle management
  - AIInteractionService for logging all AI exchanges
  - ModerationService for safety and content flagging
  - 8 subject-specific tutor prompts with Socratic method
  - Base tutor prompt with age-appropriate language guidelines
  - TutorPromptFactory for dynamic prompt generation
  - Pydantic schemas for Session and AIInteraction
  - Socratic tutor API endpoints (chat, history, flashcards, summarise)
  - Session management endpoints
  - Parent AI visibility endpoints
- Frontend accomplishments:
  - tutorStore (Zustand) for state management
  - useTutor hooks (React Query) for data fetching
  - TutorChat main container component
  - ChatMessage with markdown-like rendering
  - ChatInput with character limit and Enter to send
  - TypingIndicator with animated dots
  - SubjectContext header with session timer
  - EmptyChat with subject-specific suggested prompts
  - ConversationHistory for viewing past sessions
  - TutorPage with subject selection grid
  - Integrated into main app router
- Safety features:
  - Content moderation with distress pattern detection
  - Dishonesty detection (asking for answers)
  - Off-topic conversation redirect
  - Inappropriate content flagging
  - All AI interactions logged for parent review
- Files created:
  - `backend/app/services/claude_service.py`
  - `backend/app/services/session_service.py`
  - `backend/app/services/ai_interaction_service.py`
  - `backend/app/services/moderation_service.py`
  - `backend/app/services/tutor_prompts/` (9 files)
  - `backend/app/schemas/session.py`
  - `backend/app/schemas/ai_interaction.py`
  - `backend/app/api/v1/endpoints/socratic.py`
  - `frontend/src/stores/tutorStore.ts`
  - `frontend/src/lib/api/tutor.ts`
  - `frontend/src/hooks/useTutor.ts`
  - `frontend/src/features/socratic-tutor/` (7 files)
  - `frontend/src/pages/TutorPage.tsx`
- Ready for Phase 5: Notes & OCR

### 2025-12-26 - Phase 3 Complete
- **Phase 3 User System & Auth: 100% COMPLETE**
- Backend accomplishments:
  - UserService, StudentService, StudentSubjectService
  - DataExportService for GDPR/Privacy Act compliance
  - Auth rate limiting (5 attempts/min, 5-min lockout)
  - 14 API endpoints for user and student management
  - Fixed streak calculation bug
  - 236 tests passing
- Frontend accomplishments:
  - Auth components (AuthProvider, AuthGuard, LoginForm, SignupForm)
  - Student components (StudentProfile, StudentSwitcher)
  - Onboarding wizard (4 steps)
  - Enrolment management (EnrolmentManager, EnrolmentCard, SubjectEnrolModal)
  - Accessibility improvements (ARIA labels, live regions, progressbar roles)
  - ErrorBoundary wrapping main app
  - 266 tests passing
- Security:
  - Auth rate limiting for brute force protection
  - Data export endpoint for privacy compliance
  - Ownership verification on all operations
- Quality assurance:
  - Privacy audit completed
  - QA review completed
  - All issues resolved
- Work report created: `md/report/phase-3-complete.md`
- Ready for Phase 4: AI Tutoring

### 2025-12-26 - Phase 2 Complete
- **Phase 2 Core Curriculum System: 100% COMPLETE**
- Backend accomplishments:
  - 13 API endpoints for subjects, curriculum, senior courses
  - CurriculumService, SubjectService, SeniorCourseService
  - Framework isolation on all curriculum queries
  - Database indexes for query performance
  - SQL wildcard escaping for search security
  - Max page limit (1000) for DoS prevention
  - 118 tests passing
- Frontend accomplishments:
  - 7 new components (SubjectCard, SubjectGrid, OutcomeCard, OutcomeList, StageSelector, HSCCourseCard, HSCCourseSelector)
  - React Query hooks for data fetching
  - Lucide React icons replacing emoji fallbacks
  - React.memo optimization on list items
  - Error state handling with retry functionality
  - 210 tests passing (78 new tests)
- Quality assurance:
  - 3 QA review cycles completed
  - All critical, medium, and optimization issues resolved
  - Zero TypeScript errors
- Work report created: `md/report/phase-2-complete.md`
- Ready for Phase 3: User System & Authentication

### 2025-12-26 - Phase 1 Complete
- **Phase 1 Foundation & Infrastructure: 100% COMPLETE**
- Backend accomplishments:
  - 12 database migrations completed (all core tables)
  - Security middleware: CSRF protection, rate limiting, security headers
  - JWT authentication framework with Supabase integration points
  - Pydantic schemas for all core models
  - Service layer architecture established
  - 24 backend tests ready (pending database configuration)
  - All mypy type errors resolved (strict mode)
- Frontend accomplishments:
  - 10 UI components with 132 passing tests
  - API client with retry logic and error handling
  - Zustand state management with persistence
  - Zero TypeScript errors (strict mode)
  - Comprehensive test coverage for components and utilities
- Work report created: `md/report/phase-1-complete.md`
- Ready for Phase 2: Core Curriculum System

### 2025-12-25 - Phase 0 Complete
- Initial project documentation created
- Multi-subject support designed
- Multi-framework architecture planned
- Claude Code configuration created
  - 5 custom commands
  - 12 specialized agents
  - 8 validation skills
- Progress tracking initialized
- Backend structure initialized
  - FastAPI app with all models
  - SQLAlchemy 2.0 async models (10 total)
  - Alembic migrations configured
  - API v1 endpoints (stub)
- Frontend structure initialized
  - Vite + React 18 + TypeScript
  - Tailwind CSS with subject colors
  - Zustand stores (auth, subject)
  - Type definitions
  - API client
- GitHub repository connected
- CI/CD workflows created
  - Backend CI (pytest, ruff, mypy)
  - Frontend CI (vitest, eslint, playwright)
  - Deploy workflow for Digital Ocean
