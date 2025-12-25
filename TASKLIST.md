# StudyHub Task List

Quick reference for current and upcoming tasks.

---

## Current Sprint: Foundation Setup

### In Progress
- [ ] Configure PostgreSQL locally
- [ ] Create initial Alembic migrations
- [ ] Set up Supabase project

### Up Next
- [ ] Seed NSW curriculum data
- [ ] Implement auth middleware
- [ ] Create base UI components

---

## Backlog by Phase

### Phase 1: Foundation

#### Backend
- [x] Create FastAPI app structure
- [x] Define SQLAlchemy models
  - [x] CurriculumFramework model
  - [x] Subject model
  - [x] CurriculumOutcome model
  - [x] SeniorCourse model
  - [x] User model
  - [x] Student model
  - [x] StudentSubject model
  - [x] Note model
  - [x] Session model
  - [x] AIInteraction model
- [ ] Create Pydantic schemas
- [x] Set up database connection
- [ ] Create initial migrations
- [ ] Seed NSW curriculum data
- [ ] Implement auth middleware

#### Frontend
- [x] Initialize Vite project
- [x] Configure TypeScript
- [x] Set up Tailwind CSS
- [ ] Create base components
  - [ ] Button
  - [ ] Card
  - [ ] Modal
  - [ ] Form inputs
  - [ ] Toast/Alert
- [x] Configure React Query
- [x] Create Zustand stores
- [x] Set up routing

#### Infrastructure
- [x] Set up GitHub repository
- [x] Create GitHub Actions workflow
- [ ] Configure Digital Ocean
- [ ] Set up Sentry monitoring

### Phase 2: Notes & Curriculum

- [ ] Note upload component
- [ ] OCR integration
- [ ] Note list view
- [ ] Note detail view
- [ ] Subject selector component
- [ ] Curriculum browser component
- [ ] Outcome cards
- [ ] Progress indicators

### Phase 3: AI Tutoring

- [ ] Claude service implementation
- [ ] Subject-specific prompts
- [ ] Chat interface
- [ ] Message history
- [ ] Safety logging
- [ ] Cost tracking

### Phase 4: Revision

- [ ] Flashcard model
- [ ] SM-2 algorithm
- [ ] Revision session UI
- [ ] Progress tracking
- [ ] Difficulty adjustment

### Phase 5: Parent Dashboard

- [ ] Parent dashboard layout
- [ ] Child progress cards
- [ ] Subject progress detail
- [ ] AI conversation review
- [ ] Insights generation
- [ ] Email notifications

### Phase 6: Gamification

- [ ] XP calculation logic
- [ ] Level system
- [ ] Achievement definitions
- [ ] Badge display
- [ ] Streak tracking
- [ ] Celebration animations

### Phase 7: HSC Features

- [ ] HSC course selection flow
- [ ] Course prerequisites check
- [ ] ATAR unit tracking
- [ ] Exam mode
- [ ] Study planner

### Phase 8: PWA

- [ ] Manifest configuration
- [ ] Service worker
- [ ] IndexedDB setup
- [ ] Offline curriculum cache
- [ ] Background sync
- [ ] Push notifications

### Phase 9: Launch

- [ ] Comprehensive testing
- [ ] Security audit
- [ ] Privacy review
- [ ] Performance audit
- [ ] Documentation review
- [ ] Beta deployment
- [ ] Production deployment

---

## Completed Tasks

### 2025-12-25
- [x] Create studyhub_overview.md
- [x] Create Complete_Development_Plan.md
- [x] Create CLAUDE.md
- [x] Create .claude/commands/
  - [x] study.md
  - [x] plan.md
  - [x] qa.md
  - [x] report.md
  - [x] commit.md
- [x] Create .claude/agents/ (12 agents)
- [x] Create .claude/skills/ (8 skills)
- [x] Create .claude/settings.local.json
- [x] Create PROGRESS.md
- [x] Create TASKLIST.md
- [x] Create Planning/ directory structure
- [x] Create md/ work artifacts structure
- [x] Create docs/ directory
- [x] Create developer README.md
- [x] Initialize backend directory structure
  - [x] FastAPI app with main.py
  - [x] All 10 SQLAlchemy models
  - [x] API v1 endpoints (stub)
  - [x] Core config, database, security
  - [x] Alembic setup
- [x] Initialize frontend directory structure
  - [x] Vite + React + TypeScript
  - [x] Tailwind CSS with subject colors
  - [x] Type definitions
  - [x] Zustand stores
  - [x] API client
- [x] Set up GitHub repository
- [x] Create GitHub Actions CI/CD workflows

---

## Notes

- **Priority**: Foundation must be solid before features
- **Testing**: Write tests alongside features, not after
- **Security**: Children's data protection is critical
- **Curriculum**: NSW first, but always design for multi-framework
