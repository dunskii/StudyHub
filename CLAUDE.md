# StudyHub - Claude Code Configuration

## Project Overview

**StudyHub** is an AI-powered study assistant for Australian students (Years 1-13) targeting all subjects across multiple curriculum frameworks. The initial focus is the NSW curriculum, with architecture supporting future expansion to VIC, QLD, SA, WA, national (ACARA), and international frameworks (UK GCSE, IB).

### Core Value Proposition
- First educational platform with deep curriculum integration
- Socratic AI tutoring that guides rather than gives answers
- Subject-specific tutoring styles adapted to each discipline
- Parent dashboard with progress visibility (not surveillance)
- Privacy-first design for student data

### Project Status
- **Current Phase**: 0 - Project Setup
- **Progress**: See `PROGRESS.md` for detailed tracking
- **Tasks**: See `TASKLIST.md` for current sprint

---

## Development Workflow

### Recommended Sequence
```
1. /study <feature>     → Research requirements and existing patterns
2. /plan <feature>      → Generate implementation plan with todos
3. [Use Agent]          → Execute using appropriate specialized agent
4. /qa <feature>        → Comprehensive code review
5. /commit "message"    → Git commit with proper format
6. /report <feature>    → Document accomplishment, update progress
```

### Custom Commands

| Command | Purpose | Output Location |
|---------|---------|-----------------|
| `/study <topic>` | Research docs before implementation | `md/study/<topic>.md` |
| `/plan <task>` | Generate detailed implementation plan | `md/plan/<task>.md` |
| `/qa <feature>` | Code review with security/curriculum checks | `md/review/<feature>.md` |
| `/report <feature>` | Document work, update PROGRESS.md | `md/report/<feature>.md` |
| `/commit <message>` | Git commit with co-author attribution | N/A |

### Specialized Agents

Use the appropriate agent for each task type:

| Agent | Use For |
|-------|---------|
| `full-stack-developer` | End-to-end feature implementation |
| `backend-architect` | FastAPI, database design, API architecture |
| `frontend-developer` | React components, TypeScript, UI |
| `curriculum-integration-specialist` | NSW curriculum, outcome mapping, frameworks |
| `ai-tutor-engineer` | Claude prompts, Socratic method, subject styles |
| `multi-tenancy-enforcer` | Security, data isolation, access control |
| `education-ux-specialist` | Age-appropriate design, parent dashboards |
| `security-auditor` | Privacy compliance, children's data protection |
| `testing-qa-specialist` | pytest, Vitest, Playwright, test coverage |
| `api-tester` | Endpoint testing, contract validation |
| `devops-automator` | Digital Ocean, CI/CD, Docker |
| `database-architect` | PostgreSQL, SQLAlchemy, migrations |
| `pwa-offline-specialist` | Service workers, IndexedDB, offline-first |

### Validation Skills

Run skills to validate specific aspects:

| Skill | Purpose |
|-------|---------|
| `curriculum-validator` | Validate outcome codes, stage mappings |
| `subject-config-checker` | Verify subject tutor styles, configs |
| `framework-migration-validator` | Validate new curriculum frameworks |
| `student-data-privacy-audit` | COPPA/Privacy Act compliance |
| `ai-prompt-tester` | Test Socratic method, age-appropriateness |
| `database-schema-review` | Schema best practices, indexes |
| `api-contract-checker` | Frontend/backend type alignment |
| `test-fixture-generator` | Generate test data for curriculum/students |

---

## Technology Stack

### Frontend
- **Framework**: React 18.3 + TypeScript 5.3
- **Build**: Vite 5.x
- **Styling**: Tailwind CSS 3.4 + Tailwind UI
- **State**: @tanstack/react-query v5 + Zustand 4.5
- **Routing**: React Router v6.22
- **Forms**: React Hook Form 7.50 + Zod 3.22
- **UI Components**: Radix UI + Framer Motion + Lucide Icons
- **PWA**: Vite PWA Plugin + Workbox 7.0
- **Testing**: Vitest + React Testing Library + Playwright

### Backend
- **Runtime**: Python 3.11
- **Framework**: FastAPI 0.109 + Uvicorn
- **Database ORM**: SQLAlchemy 2.0 (async) + asyncpg
- **Migrations**: Alembic
- **Validation**: Pydantic v2
- **Testing**: pytest + pytest-asyncio + pytest-cov

### Infrastructure
- **AI**: Anthropic Claude API (Sonnet 4 for complex, Haiku 3.5 for simple tasks)
- **OCR**: Google Cloud Vision API
- **Database**: PostgreSQL (Digital Ocean Managed)
- **Storage**: Digital Ocean Spaces (S3-compatible)
- **Auth**: Supabase Auth
- **Email**: Resend API
- **Hosting**: Digital Ocean App Platform
- **CDN**: Cloudflare

---

## Project Structure

```
studyhub/
├── .claude/                     # Claude Code configuration
│   ├── commands/               # Custom slash commands
│   │   ├── study.md
│   │   ├── plan.md
│   │   ├── qa.md
│   │   ├── report.md
│   │   └── commit.md
│   ├── agents/                 # Specialized subagents
│   │   ├── full-stack-developer.md
│   │   ├── backend-architect.md
│   │   ├── frontend-developer.md
│   │   ├── curriculum-integration-specialist.md
│   │   ├── ai-tutor-engineer.md
│   │   ├── multi-tenancy-enforcer.md
│   │   ├── education-ux-specialist.md
│   │   ├── security-auditor.md
│   │   ├── testing-qa-specialist.md
│   │   ├── api-tester.md
│   │   ├── devops-automator.md
│   │   ├── database-architect.md
│   │   └── pwa-offline-specialist.md
│   ├── skills/                 # Validation skills
│   │   ├── curriculum-validator/
│   │   ├── subject-config-checker/
│   │   ├── framework-migration-validator/
│   │   ├── student-data-privacy-audit/
│   │   ├── ai-prompt-tester/
│   │   ├── database-schema-review/
│   │   ├── api-contract-checker/
│   │   └── test-fixture-generator/
│   └── settings.local.json
│
├── md/                          # Work artifacts from Claude sessions
│   ├── study/                  # Research findings
│   ├── plan/                   # Implementation plans
│   ├── review/                 # Code reviews
│   └── report/                 # Accomplishment reports
│
├── Planning/                    # Project documentation
│   ├── specifications/         # Feature specs
│   ├── roadmaps/              # Sprint plans
│   └── reference/             # Reference materials
│
├── docs/                        # Developer documentation
│
├── frontend/                    # React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/             # Base UI components
│   │   │   ├── curriculum/     # Curriculum display
│   │   │   ├── subjects/       # Subject selection
│   │   │   ├── notes/          # Note management
│   │   │   └── shared/         # Layout, Navigation
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── onboarding/
│   │   │   ├── subjects/
│   │   │   ├── revision/
│   │   │   ├── socratic-tutor/
│   │   │   ├── rewards/
│   │   │   └── parent-dashboard/
│   │   ├── lib/
│   │   │   ├── api/
│   │   │   ├── supabase/
│   │   │   ├── curriculum/
│   │   │   ├── offline/
│   │   │   └── ai/
│   │   ├── hooks/
│   │   ├── stores/
│   │   ├── types/
│   │   └── utils/
│   └── public/
│
├── backend/                     # Python FastAPI application
│   ├── app/
│   │   ├── api/v1/endpoints/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   │   ├── claude_service.py
│   │   │   ├── ocr_service.py
│   │   │   ├── tutor_prompts/
│   │   │   └── spaced_repetition.py
│   │   └── utils/
│   ├── alembic/
│   └── tests/
│
├── infrastructure/
│   ├── docker/
│   └── scripts/
│
├── CLAUDE.md                    # This file
├── PROGRESS.md                  # Development progress tracker
├── TASKLIST.md                  # Current sprint tasks
├── studyhub_overview.md         # Product overview
├── Complete_Development_Plan.md # Technical specifications
└── .github/workflows/
```

---

## Database Schema (Key Tables)

### Core Entities
| Table | Purpose |
|-------|---------|
| `curriculum_frameworks` | NSW, VIC, QLD, IB, etc. |
| `subjects` | KLAs per framework (MATH, ENG, SCI, etc.) |
| `curriculum_outcomes` | Learning outcomes per subject/stage |
| `senior_courses` | HSC, VCE, A-Levels courses |
| `users` | Parent accounts (linked to Supabase Auth) |
| `students` | Student profiles with grade, stage, framework |
| `student_subjects` | Student enrolments with pathways |
| `notes` | Uploaded study materials |
| `revision_history` | Spaced repetition tracking |
| `sessions` | Learning session analytics |
| `ai_interactions` | AI conversation logs for safety |

### Key Relationships
```
curriculum_frameworks
    └── subjects (1:many)
            └── curriculum_outcomes (1:many)
            └── senior_courses (1:many)

users (parents)
    └── students (1:many)
            └── student_subjects (1:many) → subjects
            └── notes (1:many)
            └── sessions (1:many)
            └── ai_interactions (1:many)
```

### Critical Rule: Framework Isolation
```python
# ALWAYS filter curriculum queries by framework
outcomes = await db.execute(
    select(CurriculumOutcome)
    .where(CurriculumOutcome.framework_id == student.framework_id)
    .where(CurriculumOutcome.subject_id == subject_id)
)
```

---

## Subject Configuration

### NSW Subjects (Initial Focus)
| Code | Name | Tutor Style | Icon | Color |
|------|------|-------------|------|-------|
| MATH | Mathematics | socratic_stepwise | calculator | #3B82F6 |
| ENG | English | socratic_analytical | book-open | #8B5CF6 |
| SCI | Science | inquiry_based | flask-conical | #10B981 |
| HSIE | History/Geography | socratic_analytical | globe | #F59E0B |
| PDHPE | PDHPE | discussion_based | heart-pulse | #EF4444 |
| TAS | Technology | project_based | wrench | #6366F1 |
| CA | Creative Arts | creative_mentoring | palette | #EC4899 |
| LANG | Languages | immersive | languages | #14B8A6 |

### Stage/Pathway System
```
Early Stage 1 → Kindergarten
Stage 1       → Years 1-2
Stage 2       → Years 3-4
Stage 3       → Years 5-6
Stage 4       → Years 7-8
Stage 5       → Years 9-10 (with pathways: 5.1, 5.2, 5.3 for Maths)
Stage 6       → Years 11-12 (HSC courses)
```

### Outcome Code Patterns (NSW)
| Subject | Pattern | Example |
|---------|---------|---------|
| Mathematics | MA{stage}-{strand}-{num} | MA3-RN-01 |
| English | EN{stage}-{strand}-{num} | EN4-VOCAB-01 |
| Science | SC{stage}-{strand}-{num} | SC5-WS-02 |
| History | HT{stage}-{num} | HT3-1 |
| Geography | GE{stage}-{num} | GE4-1 |
| PDHPE | PD{stage}-{num} | PD5-9 |

---

## AI Integration Guidelines

### Model Routing
| Task Type | Model | Cost | Use Case |
|-----------|-------|------|----------|
| Haiku | claude-3-5-haiku | $0.80/$4.00 per 1M | Flashcards, summaries, simple Q&A |
| Sonnet | claude-sonnet-4 | $3.00/$15.00 per 1M | Socratic tutoring, curriculum alignment, essay feedback |

### Subject-Specific Tutoring Approaches

| Subject | Style | Approach |
|---------|-------|----------|
| MATH | socratic_stepwise | "What do we know? What are we finding? What method helps?" |
| ENG | socratic_analytical | "What is the author conveying? What evidence supports this?" |
| SCI | inquiry_based | "What do you predict? How could we test this?" |
| HSIE | socratic_analytical | "What bias might this source have? What perspectives are missing?" |
| PDHPE | discussion_based | "How might this apply to your life? What factors influence this?" |
| TAS | project_based | "What problem are you solving? What constraints exist?" |
| CA | creative_mentoring | "What mood are you creating? What techniques enhance this?" |
| LANG | immersive | Scaffolded target language use with gentle correction |

### The Socratic Rule (CRITICAL)
**NEVER give direct answers.** Always guide students to discover answers through questions.

```python
# BAD
"The answer is 42."

# GOOD
"Let's think about this step by step. What do we know from the problem?"
"You're on the right track! What would happen if we tried..."
```

### Age-Appropriate Language
| Stage | Years | Approach |
|-------|-------|----------|
| Stage 2 | 3-4 | Simple words, short sentences, lots of encouragement |
| Stage 3 | 5-6 | Clear explanations, real-world examples |
| Stage 4 | 7-8 | More sophisticated vocabulary, challenge thinking |
| Stage 5 | 9-10 | Academic language, independent thinking |
| Stage 6 | 11-12 | HSC-level discourse, exam technique |

### Safety Requirements
- All AI interactions logged to `ai_interactions` table
- Flag concerning messages for parent/teacher review
- Never discuss violence, self-harm, inappropriate content
- Redirect off-topic conversations back to learning

---

## Coding Standards

### TypeScript/React
- Use functional components with hooks
- Prefer `interface` over `type` for object shapes
- Use Zod for runtime validation
- Co-locate tests with components (`Component.test.tsx`)
- Use absolute imports via `@/` alias

### Python/FastAPI
- Async by default for all database operations
- Use Pydantic v2 models for request/response schemas
- Prefix private methods with underscore
- Type hints required for all functions
- Use `pytest` fixtures for test setup

### Database
- Use UUID primary keys
- JSONB for flexible structured data
- Always include `created_at`, `updated_at` timestamps
- Use Row Level Security (RLS) via Supabase
- Always include `framework_id` on curriculum tables

### Git Workflow
- Branch naming: `feature/`, `fix/`, `refactor/`
- Use `/commit` command for proper formatting
- Commit message includes co-author attribution
- PR required for `main` and `staging` branches

---

## Security & Privacy (CRITICAL)

### Children's Data Protection
- **Australian Privacy Act**: Parental consent for under-15s
- **COPPA best practices**: Minimal data collection from children
- **Data minimization**: Only collect what's necessary
- **Right to deletion**: Support deletion on request

### Access Control
- Students can only access their own data
- Parents can only access their linked children
- AI conversations logged for parent oversight
- Admin actions are audited

### Framework Isolation
- All curriculum queries MUST filter by `framework_id`
- No cross-framework data leakage
- Verify ownership on all data access

---

## Environment Variables

### Frontend (.env)
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=
VITE_SENTRY_DSN=
VITE_APP_ENV=development
```

### Backend (.env)
```
DATABASE_URL=postgresql+asyncpg://...
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
ANTHROPIC_API_KEY=
GOOGLE_APPLICATION_CREDENTIALS=
RESEND_API_KEY=
DO_SPACES_KEY=
DO_SPACES_SECRET=
DO_SPACES_BUCKET=
APP_ENV=development
APP_SECRET_KEY=
```

---

## Common Tasks

### Adding a New Subject
1. Insert into `subjects` table with framework reference
2. Add tutor style config in `SUBJECT_TUTOR_STYLES`
3. Create tutor prompt file in `services/tutor_prompts/`
4. Run `/skill subject-config-checker` to validate
5. Add frontend components if needed

### Adding a New Curriculum Framework
1. Insert into `curriculum_frameworks` with structure config
2. Seed subjects for that framework
3. Import curriculum outcomes
4. Run `/skill framework-migration-validator` to validate
5. Test grade/stage mapping

### Creating Database Migrations
```bash
cd backend
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

### Running Tests
```bash
# Frontend
cd frontend && npm test

# Backend
cd backend && pytest --cov=app tests/

# E2E
cd frontend && npx playwright test
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `CLAUDE.md` | This file - project configuration |
| `PROGRESS.md` | Development progress by phase |
| `TASKLIST.md` | Current sprint task list |
| `studyhub_overview.md` | Product overview and features |
| `Complete_Development_Plan.md` | Technical specifications and database schema |

---

## Important Links

- **NSW Syllabus**: https://curriculum.nsw.edu.au/
- **NESA**: https://educationstandards.nsw.edu.au/
- **Anthropic API Docs**: https://docs.anthropic.com/
- **Supabase Docs**: https://supabase.com/docs
- **Digital Ocean App Platform**: https://docs.digitalocean.com/products/app-platform/
- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **React Query**: https://tanstack.com/query
- **Tailwind CSS**: https://tailwindcss.com/

---

## Notes for Claude

### Project Context
- This is a greenfield project - no existing codebase yet
- Focus on NSW curriculum first, but keep architecture flexible
- Privacy is critical - this is for children
- Australian English spelling (colour, organisation, etc.)
- Use Australian context in examples (Sydney, Melbourne, AFL, NRL, etc.)

### Core Principles
1. **Socratic method is sacred** - Never just give answers
2. **Privacy first** - Children's data must be protected
3. **Multi-framework ready** - NSW first, but don't hardcode
4. **Subject-aware** - Each subject has unique tutoring needs
5. **Parent trust** - Visibility without surveillance

### When Starting Work
1. Check `PROGRESS.md` for current status
2. Check `TASKLIST.md` for current sprint
3. Use `/study` before implementing new features
4. Use appropriate specialized agent for the task
5. Run `/qa` before considering work complete
6. Update progress tracking with `/report`

### Quality Gates
- Security audit passes (use `security-auditor` agent)
- Privacy compliance verified (use `student-data-privacy-audit` skill)
- Tests pass with 80%+ coverage
- No TypeScript or Python type errors
- Curriculum validation passes (use `curriculum-validator` skill)
