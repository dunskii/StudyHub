# Study: Phase 1 - Foundation & Infrastructure

## Summary

Phase 1 establishes the core infrastructure for StudyHub, an AI-powered study assistant for Australian students. This phase creates the foundational backend (FastAPI), frontend (React/TypeScript), database schema (PostgreSQL), and CI/CD pipelines that all subsequent phases depend upon. Current progress is 15% complete.

**Duration**: 3 weeks
**Status**: IN PROGRESS
**Dependencies**: None (baseline phase)
**Priority**: Critical

---

## Key Requirements

### Backend Requirements
- FastAPI 0.109 with async architecture (Uvicorn)
- SQLAlchemy 2.0 with asyncpg for async PostgreSQL
- Pydantic v2 for validation
- Alembic for database migrations
- pytest with pytest-asyncio for testing
- slowapi for rate limiting

### Frontend Requirements
- React 18.3 with TypeScript 5.3
- Vite 5.x build tool
- Tailwind CSS 3.4 + Tailwind UI
- @tanstack/react-query v5 + Zustand 4.5 for state
- React Router v6.22
- React Hook Form 7.50 + Zod 3.22 for forms
- Radix UI + Framer Motion + Lucide Icons
- Vitest + React Testing Library + Playwright for testing

### Infrastructure Requirements
- Docker Compose for local development
- GitHub Actions CI/CD
- Digital Ocean App Platform (deployment)
- Supabase Auth integration
- PostgreSQL 15+

---

## Database Schema (Phase 1 Tables)

### Migration 001: Extensions
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
```

### Migration 002: curriculum_frameworks
```sql
CREATE TABLE curriculum_frameworks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,        -- 'NSW', 'VIC', 'QLD', etc.
    name VARCHAR(100) NOT NULL,               -- 'New South Wales', etc.
    country VARCHAR(50) NOT NULL DEFAULT 'Australia',
    region_type VARCHAR(20),                  -- 'state', 'national', 'international'
    structure JSONB DEFAULT '{}',
    syllabus_authority VARCHAR(100),          -- 'NESA', 'VCAA', etc.
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Migration 003: users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supabase_auth_id UUID UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    subscription_tier VARCHAR(20) DEFAULT 'free',
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);
```

### Migration 004: students
```sql
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES users(id) ON DELETE CASCADE,
    supabase_auth_id UUID UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    grade_level INTEGER NOT NULL CHECK (grade_level BETWEEN 1 AND 13),
    school_stage VARCHAR(20) NOT NULL,
    framework_id UUID REFERENCES curriculum_frameworks(id),
    preferences JSONB DEFAULT '{}',
    gamification JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ,
    onboarding_completed BOOLEAN DEFAULT FALSE
);
```

---

## API Endpoints (Phase 1)

### Health Check
```
GET /health
- No authentication required
- Returns: {"status": "ok", "version": "1.0.0"}
```

### Frameworks
```
GET /api/v1/frameworks
- Authentication: Required
- Returns: List of active curriculum frameworks

GET /api/v1/frameworks/{code}
- Authentication: Required
- Parameter: code (e.g., "NSW")
- Returns: Framework details with structure
```

---

## Project Structure

### Backend
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── api/
│   │   ├── v1/
│   │   │   ├── router.py
│   │   │   └── endpoints/
│   │   │       ├── health.py
│   │   │       └── frameworks.py
│   │   └── middleware/
│   │       └── security.py
│   ├── core/
│   │   ├── config.py
│   │   ├── database.py
│   │   └── security.py
│   ├── models/
│   │   ├── base.py
│   │   ├── curriculum_framework.py
│   │   ├── user.py
│   │   └── student.py
│   ├── schemas/
│   │   ├── framework.py
│   │   ├── user.py
│   │   └── student.py
│   ├── services/
│   └── utils/
├── alembic/
│   ├── versions/
│   └── env.py
├── tests/
│   ├── conftest.py
│   └── api/
│       └── test_health.py
├── requirements.txt
├── Dockerfile
└── .env.example
```

### Frontend
```
frontend/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button/
│   │   │   ├── Card/
│   │   │   ├── Modal/
│   │   │   ├── Input/
│   │   │   └── Toast/
│   │   └── shared/
│   │       ├── Layout/
│   │       └── Navigation/
│   ├── features/
│   │   └── auth/
│   ├── lib/
│   │   ├── api/
│   │   └── supabase/
│   ├── hooks/
│   ├── stores/
│   ├── types/
│   └── styles/
├── public/
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── vitest.config.ts
├── playwright.config.ts
└── package.json
```

---

## Technical Considerations

### Async-First Architecture
- All database operations MUST be async using asyncpg
- SQLAlchemy 2.0 async session factory pattern
- FastAPI async endpoints

### Multi-Framework Support
- NSW curriculum is the initial focus, but architecture must support VIC, QLD, IB, UK GCSE, etc.
- **CRITICAL**: All curriculum queries MUST filter by `framework_id`
- Framework isolation prevents cross-curriculum data leakage

### Type Safety
- Full type hints required for Python functions
- TypeScript strict mode enabled
- Pydantic v2 for runtime validation
- Zod for frontend schema validation

### Testing Strategy
- Backend: pytest + pytest-asyncio with 80%+ coverage target
- Frontend: Vitest + React Testing Library for unit tests
- E2E: Playwright for integration testing

---

## Security/Privacy Considerations

### Children's Data Protection (CRITICAL)
- **Australian Privacy Act**: Parental consent for under-15s
- **COPPA best practices**: Minimal data collection from children
- **Data minimization**: Only collect what's necessary
- **Right to deletion**: Support deletion on request

### Phase 1 Data Collection (Minimal)
- User: email, display_name, phone (minimal parent info)
- Student: display_name, grade_level, school_stage (minimal student info)
- No sensitive data stored in Phase 1

### API Security
- All endpoints (except /health) require Supabase Auth
- Rate limiting on all endpoints (slowapi)
- Input validation via Pydantic
- CORS configuration for frontend domain
- HTTPS enforced in production

### Framework Isolation Pattern
```python
# ALWAYS filter by framework_id
outcomes = await db.execute(
    select(CurriculumOutcome)
    .where(CurriculumOutcome.framework_id == student.framework_id)
    .where(CurriculumOutcome.subject_id == subject_id)
)
```

---

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/studyhub
SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_KEY=eyJ...
APP_SECRET_KEY=your-secret-key
APP_ENV=development
```

### Frontend (.env)
```
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=http://localhost:8000
VITE_APP_ENV=development
```

---

## Deliverables Checklist

### Backend
- [ ] FastAPI project structure with async support
- [ ] SQLAlchemy models: CurriculumFramework, User, Student
- [ ] Alembic migrations (001-004)
- [ ] PostgreSQL database with all Phase 1 tables
- [ ] Health check endpoint (functional)
- [ ] Frameworks CRUD endpoints
- [ ] Supabase Auth integration (stub)
- [ ] pytest setup with conftest.py
- [ ] Docker support
- [ ] GitHub Actions CI workflow

### Frontend
- [ ] Vite + React + TypeScript setup
- [ ] Tailwind CSS with subject colour palette
- [ ] React Router configuration
- [ ] React Query configuration
- [ ] Zustand auth store
- [ ] Base UI components (Button, Card, Modal, Input, Toast, Spinner)
- [ ] Supabase client integration
- [ ] Vitest configuration
- [ ] Playwright E2E setup
- [ ] Docker support
- [ ] GitHub Actions CI workflow

### Infrastructure
- [ ] docker-compose.yml for development
- [ ] GitHub Actions CI for backend
- [ ] GitHub Actions CI for frontend
- [ ] Digital Ocean deployment workflow
- [ ] Environment variable templates

---

## Dependencies

### Prerequisites
- PostgreSQL 15+ (local or Supabase)
- Python 3.11
- Node.js 20
- Docker and Docker Compose
- GitHub repository access

### Build Commands
```bash
# Backend
cd backend
pip install -r requirements.txt
alembic upgrade head
pytest --cov=app tests/

# Frontend
cd frontend
npm install
npm run dev
npm run test

# Docker
docker-compose up -d
```

---

## Quality Gates

Phase 1 is complete when:
- [ ] All tests passing (backend + frontend)
- [ ] Backend: 80%+ code coverage
- [ ] No TypeScript errors
- [ ] No Python type errors (mypy)
- [ ] Linting passes (ruff, eslint)
- [ ] Health endpoint returns 200 OK
- [ ] Frameworks endpoints functional
- [ ] Database migrations run successfully
- [ ] Docker Compose starts all services
- [ ] GitHub Actions CI passing

---

## Open Questions

1. **Supabase Configuration**: Need actual Supabase project credentials for development
2. **Digital Ocean Setup**: Need DO account and App Platform configuration
3. **Domain Configuration**: Need domain for production deployment
4. **SSL Certificates**: Cloudflare or Let's Encrypt for HTTPS

---

## Phase 1 → Phase 2 Handoff

When Phase 1 completes, Phase 2 (Curriculum Data System) will add:
- Subjects, Curriculum Outcomes, Senior Courses tables
- Subject CRUD endpoints
- Curriculum browser components
- NSW curriculum data seeding

---

## Sources Referenced

- `C:\Users\dunsk\code\StudyHub\PROGRESS.md`
- `C:\Users\dunsk\code\StudyHub\TASKLIST.md`
- `C:\Users\dunsk\code\StudyHub\Complete_Development_Plan.md`
- `C:\Users\dunsk\code\StudyHub\studyhub_overview.md`
- `C:\Users\dunsk\code\StudyHub\CLAUDE.md`
- `C:\Users\dunsk\code\StudyHub\Planning\roadmaps\Implementation_Plan.md`
