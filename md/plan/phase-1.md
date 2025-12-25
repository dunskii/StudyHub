# Implementation Plan: Phase 1 - Foundation & Infrastructure

## Overview

Phase 1 establishes the core infrastructure for StudyHub. This phase creates the foundational backend (FastAPI), frontend (React/TypeScript), database schema (PostgreSQL), and CI/CD pipelines that all subsequent phases depend upon.

**Current Status**: ~15% complete (Phase 0 setup done, structure in place, but core functionality needs implementation)

**What Exists**:
- FastAPI app structure with main.py
- 10 SQLAlchemy models (stubs)
- Alembic configured (no migrations yet)
- Frontend Vite + React + TypeScript setup
- Tailwind CSS configured
- React Query + Zustand configured
- CI/CD workflows created
- Docker Compose files exist

**What's Missing**:
- Alembic migrations (none created)
- Pydantic schemas (empty)
- Backend tests (empty test folder)
- Frontend UI components (none created)
- API endpoints (stubs only)
- pytest conftest.py fixtures

---

## Prerequisites

- [x] PostgreSQL 15+ available (local or Supabase)
- [x] Python 3.11 installed
- [x] Node.js 20 installed
- [x] Docker and Docker Compose available
- [ ] Supabase project created with API keys
- [ ] Environment variables configured (.env files)

---

## Step 1: Database Migrations

Create Alembic migrations for Phase 1 tables in order.

### 1.1 Migration 001: Extensions
```
File: backend/alembic/versions/001_extensions.py
```
- Enable uuid-ossp extension
- Create update_updated_at_column() trigger function

### 1.2 Migration 002: curriculum_frameworks
```
File: backend/alembic/versions/002_curriculum_frameworks.py
```
- Create curriculum_frameworks table
- Add updated_at trigger
- Seed NSW framework (is_default=TRUE)

### 1.3 Migration 003: users
```
File: backend/alembic/versions/003_users.py
```
- Create users table
- Add indexes on email, supabase_auth_id
- Add updated_at trigger

### 1.4 Migration 004: students
```
File: backend/alembic/versions/004_students.py
```
- Create students table
- Add foreign keys to users and curriculum_frameworks
- Add indexes on parent_id, framework_id
- Add updated_at trigger

---

## Step 2: Backend API

### 2.1 Pydantic Schemas
```
Files: backend/app/schemas/
```

| Schema File | Contents |
|-------------|----------|
| `base.py` | Base schema with from_orm config |
| `framework.py` | FrameworkCreate, FrameworkResponse, FrameworkList |
| `user.py` | UserCreate, UserResponse, UserUpdate |
| `student.py` | StudentCreate, StudentResponse, StudentUpdate |
| `health.py` | HealthResponse |

### 2.2 Endpoints

| Endpoint | File | Priority |
|----------|------|----------|
| `GET /health` | Already exists in main.py | Done |
| `GET /api/v1/frameworks` | endpoints/frameworks.py | High |
| `GET /api/v1/frameworks/{code}` | endpoints/frameworks.py | High |
| `POST /api/v1/frameworks` | endpoints/frameworks.py | Medium |

### 2.3 Services

| Service | File | Purpose |
|---------|------|---------|
| FrameworkService | services/framework_service.py | CRUD for frameworks |

### 2.4 Auth Middleware (Stub)
```
File: backend/app/api/middleware/auth.py
```
- Supabase JWT validation (stub for now)
- get_current_user dependency

---

## Step 3: Backend Testing

### 3.1 Test Configuration
```
File: backend/tests/conftest.py
```
- Async test database setup
- Test fixtures for database session
- Test fixtures for API client

### 3.2 Test Files

| Test File | Coverage |
|-----------|----------|
| `tests/api/test_health.py` | Health endpoint |
| `tests/api/test_frameworks.py` | Framework CRUD |

---

## Step 4: Frontend Components

### 4.1 Base UI Components
```
Directory: frontend/src/components/ui/
```

| Component | Variants | Priority |
|-----------|----------|----------|
| Button | primary, secondary, ghost, destructive, outline | High |
| Card | with header, content, footer | High |
| Input | text, email, password, textarea | High |
| Modal | Dialog using Radix UI | High |
| Toast | success, error, warning, info | High |
| Spinner | sizes: sm, md, lg | High |
| Badge | default, secondary, destructive, outline | Medium |
| Label | standard form label | Medium |

### 4.2 Component Structure
Each component should follow this pattern:
```
Button/
├── Button.tsx
├── Button.test.tsx (optional for Phase 1)
└── index.ts
```

### 4.3 Utility Functions
```
File: frontend/src/lib/utils.ts
```
- `cn()` function for Tailwind class merging (clsx + tailwind-merge)

---

## Step 5: Frontend Infrastructure

### 5.1 Supabase Client Enhancement
```
File: frontend/src/lib/supabase/client.ts
```
- Auth state listener
- Session management

### 5.2 Auth Store Enhancement
```
File: frontend/src/stores/authStore.ts
```
- Login/logout actions
- Session persistence
- Loading states

### 5.3 API Client Enhancement
```
File: frontend/src/lib/api/client.ts
```
- Add auth header injection
- Error handling
- Retry logic

---

## Step 6: Frontend Testing

### 6.1 Vitest Configuration
```
File: frontend/vitest.config.ts
```
- jsdom environment
- Coverage configuration
- Path aliases

### 6.2 Test Setup
```
File: frontend/src/test/setup.ts
```
- @testing-library/jest-dom matchers
- Mock providers

### 6.3 First Component Test
```
File: frontend/src/components/ui/Button/Button.test.tsx
```
- Basic rendering test
- Variant tests
- Click handler test

---

## Step 7: Environment & Docker

### 7.1 Environment Templates
```
Files:
- backend/.env.example
- frontend/.env.example
```

### 7.2 Docker Verification
- Verify docker-compose.yml works
- Verify docker-compose.dev.yml for hot reload
- Test local PostgreSQL container

---

## Step 8: Quality Gates

### 8.1 Backend Quality
- [ ] pytest runs with 0 errors
- [ ] ruff check passes
- [ ] mypy check passes
- [ ] Health endpoint returns 200

### 8.2 Frontend Quality
- [ ] vitest runs with 0 errors
- [ ] eslint passes
- [ ] TypeScript compiles with no errors
- [ ] App renders without errors

### 8.3 Integration
- [ ] docker-compose up starts all services
- [ ] Frontend can reach backend /health
- [ ] Database migrations run successfully

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Supabase credentials unavailable | High | Use local PostgreSQL for development initially |
| Async database issues | Medium | Use pytest-asyncio fixtures properly |
| TypeScript strict mode errors | Low | Fix types incrementally |
| Radix UI learning curve | Low | Follow existing patterns from docs |

---

## Curriculum Considerations

Phase 1 establishes the multi-framework architecture:
- `curriculum_frameworks` table supports NSW, VIC, QLD, IB, etc.
- NSW seeded as default framework
- All subsequent curriculum queries will filter by framework_id

---

## Privacy/Security Checklist

- [x] Minimal data collection in Phase 1
- [x] Framework isolation architecture in place
- [x] Parent-child relationship via foreign key
- [ ] Supabase Auth integration (stub only in Phase 1)
- [ ] HTTPS configuration (production only)
- [ ] Rate limiting configured (slowapi in requirements)

---

## Estimated Complexity

**Medium** - Significant setup work but well-defined patterns to follow

---

## Dependencies on Other Features

None - This is the foundation phase

---

## Recommended Agents

| Task | Agent |
|------|-------|
| Alembic migrations | `database-architect` |
| Pydantic schemas & endpoints | `backend-architect` |
| UI components | `frontend-developer` |
| Testing setup | `testing-qa-specialist` |
| Docker & CI/CD | `devops-automator` |

---

## Implementation Order

### Priority 1 (Critical Path)
1. Create Alembic migrations (001-004)
2. Create Pydantic schemas
3. Implement frameworks endpoints
4. Create pytest fixtures and health test

### Priority 2 (Frontend Foundation)
5. Create utils.ts (cn function)
6. Create base UI components (Button, Card, Input, Modal, Toast, Spinner)
7. Enhance Supabase client
8. Configure Vitest properly

### Priority 3 (Integration)
9. Test docker-compose setup
10. Verify CI workflows pass
11. Create environment templates

---

## Success Criteria

Phase 1 is complete when:
1. `docker-compose up` starts all services successfully
2. `GET /health` returns `{"status": "healthy", "version": "0.1.0"}`
3. `GET /api/v1/frameworks` returns NSW framework
4. All backend tests pass with 80%+ coverage
5. All frontend tests pass
6. TypeScript compiles without errors
7. Python type checks pass (mypy)
8. GitHub Actions CI passes

---

## Actionable Task List

### Database (4 tasks)
- [ ] Create 001_extensions.py migration
- [ ] Create 002_curriculum_frameworks.py migration
- [ ] Create 003_users.py migration
- [ ] Create 004_students.py migration

### Backend Schemas (5 tasks)
- [ ] Create base.py schema
- [ ] Create health.py schema
- [ ] Create framework.py schemas
- [ ] Create user.py schemas
- [ ] Create student.py schemas

### Backend API (3 tasks)
- [ ] Implement GET /api/v1/frameworks endpoint
- [ ] Implement GET /api/v1/frameworks/{code} endpoint
- [ ] Create framework service

### Backend Testing (3 tasks)
- [ ] Create conftest.py with async fixtures
- [ ] Create test_health.py
- [ ] Create test_frameworks.py

### Frontend Components (7 tasks)
- [ ] Create utils.ts with cn() function
- [ ] Create Button component
- [ ] Create Card component
- [ ] Create Input component
- [ ] Create Modal component
- [ ] Create Toast component
- [ ] Create Spinner component

### Frontend Infrastructure (3 tasks)
- [ ] Enhance authStore with actions
- [ ] Configure Vitest properly
- [ ] Create test setup file

### Integration (3 tasks)
- [ ] Create backend .env.example
- [ ] Create frontend .env.example
- [ ] Verify docker-compose works

**Total: 28 tasks**
