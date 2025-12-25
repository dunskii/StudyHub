# StudyHub Implementation Plan

**Created**: 2025-12-25
**Status**: Approved
**Total Phases**: 9

---

## Executive Summary

This implementation plan provides a comprehensive roadmap for building StudyHub, an AI-powered study assistant for Australian students (Years 1-13). The plan follows all established standards from CLAUDE.md and Complete_Development_Plan.md. The architecture supports multi-framework curriculum expansion (NSW first, then VIC, QLD, etc.) with subject-specific AI tutoring using the Socratic method.

---

## Phase Overview

| Phase | Name | Duration | Dependencies |
|-------|------|----------|--------------|
| 1 | Foundation & Infrastructure | 3 weeks | None |
| 2 | Core Curriculum System | 2 weeks | Phase 1 |
| 3 | User System | 2 weeks | Phase 1, 2 |
| 4 | AI Tutoring Foundation | 3 weeks | Phase 1, 2, 3 |
| 5 | Notes and OCR | 2 weeks | Phase 1-4 |
| 6 | Revision System | 2 weeks | Phase 1-5 |
| 7 | Parent Dashboard | 2 weeks | Phase 1-4 |
| 8 | Gamification | 1 week | Phase 1-4 |
| 9 | PWA/Offline | 2 weeks | Phase 1-4 |

---

## Phase 1: Foundation & Infrastructure

### 1.1 Backend Setup (FastAPI)

#### Directory Structure
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app entry
│   ├── api/
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── router.py          # API router aggregator
│   │   │   └── endpoints/
│   │   │       ├── __init__.py
│   │   │       ├── health.py
│   │   │       └── frameworks.py
│   │   └── middleware/
│   │       ├── __init__.py
│   │       └── security.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py              # Settings from environment
│   │   ├── database.py            # Async SQLAlchemy setup
│   │   └── security.py            # Auth utilities
│   ├── models/
│   │   ├── __init__.py
│   │   ├── base.py                # Base model with UUID, timestamps
│   │   ├── curriculum_framework.py
│   │   ├── user.py
│   │   └── student.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── framework.py
│   │   ├── user.py
│   │   └── student.py
│   ├── services/
│   │   └── __init__.py
│   └── utils/
│       └── __init__.py
├── alembic/
│   ├── versions/
│   │   ├── 001_extensions.py
│   │   ├── 002_curriculum_frameworks.py
│   │   ├── 003_users.py
│   │   └── 004_students.py
│   ├── env.py
│   └── alembic.ini
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   └── api/
│       └── test_health.py
├── requirements.txt
├── pyproject.toml
├── Dockerfile
└── .env.example
```

#### Database Migrations

**001_extensions.py**
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

**002_curriculum_frameworks.py**
- Create `curriculum_frameworks` table
- Seed NSW, VIC, QLD, SA, WA, AU_NATIONAL, UK_GCSE, IB
- NSW set as `is_default = TRUE`, `is_active = TRUE`

**003_users.py**
- Create `users` table (parent accounts)
- Link to Supabase Auth via `supabase_auth_id`

**004_students.py**
- Create `students` table
- Foreign key to `curriculum_frameworks`
- Foreign key to `users` (parent)

#### API Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/health` | GET | No | Health check |
| `/api/v1/frameworks` | GET | Yes | List active frameworks |
| `/api/v1/frameworks/{code}` | GET | Yes | Get framework details |

#### Dependencies

```txt
# requirements.txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
sqlalchemy[asyncio]==2.0.25
asyncpg==0.29.0
alembic==1.13.1
pydantic==2.5.0
pydantic-settings==2.1.0
python-dotenv==1.0.0
httpx==0.26.0
python-jose[cryptography]==3.3.0
supabase==2.3.0
slowapi==0.1.9
pytest==7.4.0
pytest-asyncio==0.23.0
pytest-cov==4.1.0
```

---

### 1.2 Frontend Setup (React + Vite)

#### Directory Structure
```
frontend/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Button.test.tsx
│   │   │   │   └── index.ts
│   │   │   ├── Card/
│   │   │   ├── Modal/
│   │   │   ├── Input/
│   │   │   └── Toast/
│   │   └── shared/
│   │       ├── Layout/
│   │       ├── Navigation/
│   │       └── ErrorBoundary/
│   ├── features/
│   │   └── auth/
│   │       ├── LoginForm.tsx
│   │       ├── SignupForm.tsx
│   │       └── AuthGuard.tsx
│   ├── lib/
│   │   ├── api/
│   │   │   └── client.ts
│   │   └── supabase/
│   │       ├── client.ts
│   │       └── auth.ts
│   ├── hooks/
│   │   └── useAuth.ts
│   ├── stores/
│   │   └── authStore.ts
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   └── index.ts
│   └── styles/
│       └── globals.css
├── public/
│   └── icons/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── vitest.config.ts
├── playwright.config.ts
├── Dockerfile
├── .env.example
└── package.json
```

#### Dependencies

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.22.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.5.0",
    "react-hook-form": "^7.50.0",
    "zod": "^3.22.0",
    "@hookform/resolvers": "^3.0.0",
    "@supabase/supabase-js": "^2.0.0",
    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-dropdown-menu": "^2.0.0",
    "@radix-ui/react-toast": "^1.0.0",
    "framer-motion": "^11.0.0",
    "lucide-react": "^0.300.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@playwright/test": "^1.40.0",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0"
  }
}
```

---

### 1.3 Infrastructure Setup

#### Docker Compose (Development)

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: studyhub
      POSTGRES_PASSWORD: studyhub_dev
      POSTGRES_DB: studyhub
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://studyhub:studyhub_dev@postgres:5432/studyhub
    depends_on:
      - postgres
    volumes:
      - ./backend:/app

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules

volumes:
  postgres_data:
```

#### GitHub Actions CI

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      - name: Run tests
        run: |
          cd backend
          pytest --cov=app tests/
        env:
          DATABASE_URL: postgresql+asyncpg://postgres:postgres@localhost:5432/test

  frontend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      - name: Run tests
        run: |
          cd frontend
          npm run test
```

---

### 1.4 Phase 1 Checklist

- [ ] Initialize backend with FastAPI structure
- [ ] Configure SQLAlchemy async with PostgreSQL
- [ ] Set up Alembic for migrations
- [ ] Create base models (UUID, timestamps)
- [ ] Create curriculum_frameworks migration and seed NSW
- [ ] Create users and students tables
- [ ] Implement health endpoint
- [ ] Implement frameworks endpoints
- [ ] Configure Supabase Auth integration
- [ ] Initialize frontend with Vite + React
- [ ] Configure Tailwind CSS
- [ ] Create base UI components (Button, Card, Modal, Input)
- [ ] Set up React Query
- [ ] Set up Zustand stores
- [ ] Create auth flow with Supabase
- [ ] Set up Docker Compose for development
- [ ] Configure GitHub Actions CI
- [ ] Write tests (80%+ coverage target)

---

## Phase 2: Core Curriculum System

### 2.1 Database Migrations

**005_subjects.py**
```sql
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    framework_id UUID REFERENCES curriculum_frameworks(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    kla VARCHAR(100) NOT NULL,
    available_stages TEXT[] NOT NULL,
    config JSONB DEFAULT '{}',
    icon VARCHAR(50),
    color VARCHAR(7),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(framework_id, code)
);

CREATE INDEX idx_subjects_framework ON subjects(framework_id);
CREATE INDEX idx_subjects_code ON subjects(code);
```

**006_curriculum_outcomes.py**
```sql
CREATE TABLE curriculum_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    framework_id UUID REFERENCES curriculum_frameworks(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    outcome_code VARCHAR(30) NOT NULL,
    stage VARCHAR(20) NOT NULL,
    grade_range INTEGER[] NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    pathway VARCHAR(20),
    strand VARCHAR(100),
    sub_strand VARCHAR(100),
    content JSONB DEFAULT '{}',
    keywords TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(framework_id, outcome_code)
);

CREATE INDEX idx_curriculum_framework ON curriculum_outcomes(framework_id);
CREATE INDEX idx_curriculum_subject ON curriculum_outcomes(subject_id);
CREATE INDEX idx_curriculum_stage ON curriculum_outcomes(stage);
CREATE INDEX idx_curriculum_strand ON curriculum_outcomes(strand);
```

**007_senior_courses.py**
```sql
CREATE TABLE senior_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    framework_id UUID REFERENCES curriculum_frameworks(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    code VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    units INTEGER CHECK (units BETWEEN 1 AND 4),
    level VARCHAR(30),
    is_extension BOOLEAN DEFAULT FALSE,
    extension_of UUID REFERENCES senior_courses(id),
    tertiary_eligible BOOLEAN DEFAULT TRUE,
    structure JSONB DEFAULT '{}',
    prerequisites TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(framework_id, code)
);

CREATE INDEX idx_senior_courses_framework ON senior_courses(framework_id);
CREATE INDEX idx_senior_courses_subject ON senior_courses(subject_id);
```

### 2.2 NSW Subject Seeding

```python
NSW_SUBJECTS = [
    {"code": "MATH", "name": "Mathematics", "kla": "Mathematics",
     "icon": "calculator", "color": "#3B82F6",
     "available_stages": ["stage2", "stage3", "stage4", "stage5", "stage6"],
     "config": {"hasPathways": True, "pathways": [{"stage": "stage5", "options": ["5.1", "5.2", "5.3"]}],
                "tutorStyle": "socratic_stepwise"}},
    {"code": "ENG", "name": "English", "kla": "English",
     "icon": "book-open", "color": "#8B5CF6",
     "available_stages": ["stage2", "stage3", "stage4", "stage5", "stage6"],
     "config": {"hasPathways": True, "pathways": [{"stage": "stage5", "options": ["Standard", "Advanced"]}],
                "tutorStyle": "socratic_analytical"}},
    {"code": "SCI", "name": "Science", "kla": "Science",
     "icon": "flask-conical", "color": "#10B981",
     "available_stages": ["stage2", "stage3", "stage4", "stage5", "stage6"],
     "config": {"tutorStyle": "inquiry_based"}},
    {"code": "HSIE", "name": "History/Geography", "kla": "Human Society and Its Environment",
     "icon": "globe", "color": "#F59E0B",
     "available_stages": ["stage2", "stage3", "stage4", "stage5", "stage6"],
     "config": {"tutorStyle": "socratic_analytical"}},
    {"code": "PDHPE", "name": "PDHPE", "kla": "Personal Development, Health and Physical Education",
     "icon": "heart-pulse", "color": "#EF4444",
     "available_stages": ["stage2", "stage3", "stage4", "stage5", "stage6"],
     "config": {"tutorStyle": "discussion_based"}},
    {"code": "TAS", "name": "Technology", "kla": "Technology and Applied Studies",
     "icon": "wrench", "color": "#6366F1",
     "available_stages": ["stage4", "stage5", "stage6"],
     "config": {"tutorStyle": "project_based"}},
    {"code": "CA", "name": "Creative Arts", "kla": "Creative Arts",
     "icon": "palette", "color": "#EC4899",
     "available_stages": ["stage2", "stage3", "stage4", "stage5", "stage6"],
     "config": {"tutorStyle": "creative_mentoring"}},
    {"code": "LANG", "name": "Languages", "kla": "Languages",
     "icon": "languages", "color": "#14B8A6",
     "available_stages": ["stage4", "stage5", "stage6"],
     "config": {"tutorStyle": "immersive"}},
]
```

### 2.3 API Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/subjects` | GET | Yes | List subjects (filter by framework) |
| `/api/v1/subjects/{id}` | GET | Yes | Get subject details |
| `/api/v1/frameworks/{code}/subjects` | GET | Yes | Get subjects for framework |
| `/api/v1/outcomes` | GET | Yes | Query outcomes (filters) |
| `/api/v1/outcomes/{code}` | GET | Yes | Get outcome details |
| `/api/v1/subjects/{id}/outcomes` | GET | Yes | Get outcomes for subject |
| `/api/v1/senior-courses` | GET | Yes | List senior courses |
| `/api/v1/senior-courses/{id}` | GET | Yes | Get course details |

### 2.4 Frontend Components

```
frontend/src/
├── components/
│   ├── curriculum/
│   │   ├── OutcomeCard/
│   │   ├── StrandNavigator/
│   │   └── CurriculumBrowser/
│   └── subjects/
│       ├── SubjectCard/
│       ├── SubjectSelector/
│       ├── PathwaySelector/
│       └── HSCCourseSelector/
├── features/
│   └── curriculum/
│       ├── CurriculumDashboard.tsx
│       ├── SubjectView.tsx
│       └── OutcomeList.tsx
├── hooks/
│   ├── useCurriculum.ts
│   └── useSubjects.ts
└── types/
    ├── curriculum.types.ts
    └── subject.types.ts
```

### 2.5 Phase 2 Checklist

- [ ] Create subjects migration
- [ ] Create curriculum_outcomes migration
- [ ] Create senior_courses migration
- [ ] Seed NSW subjects with configs
- [ ] Implement subjects service
- [ ] Implement curriculum service
- [ ] Create subjects API endpoints
- [ ] Create outcomes API endpoints
- [ ] Create senior courses API endpoints
- [ ] Build SubjectCard component
- [ ] Build SubjectSelector component
- [ ] Build OutcomeCard component
- [ ] Build CurriculumBrowser component
- [ ] Build PathwaySelector (Stage 5)
- [ ] Build HSCCourseSelector (Stage 6)
- [ ] Create useSubjects hook
- [ ] Create useCurriculum hook
- [ ] Write curriculum service tests
- [ ] Run curriculum-validator skill

---

## Phase 3: User System

### 3.1 Database Migrations

**008_student_subjects.py**
```sql
CREATE TABLE student_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    pathway VARCHAR(20),
    senior_course_id UUID REFERENCES senior_courses(id),
    mastery_level DECIMAL(5,2) DEFAULT 0,
    current_focus_outcomes TEXT[],
    preferences JSONB DEFAULT '{}',
    subject_xp INTEGER DEFAULT 0,
    subject_level INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ,
    UNIQUE(student_id, subject_id)
);

CREATE INDEX idx_student_subjects_student ON student_subjects(student_id);
CREATE INDEX idx_student_subjects_subject ON student_subjects(subject_id);
```

### 3.2 API Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `POST /api/v1/users` | POST | Yes | Create user after Supabase signup |
| `GET /api/v1/users/me` | GET | Yes | Get current user |
| `PUT /api/v1/users/me` | PUT | Yes | Update profile |
| `GET /api/v1/students` | GET | Yes | List parent's students |
| `POST /api/v1/students` | POST | Yes | Add student |
| `GET /api/v1/students/{id}` | GET | Yes | Get student (ownership check) |
| `PUT /api/v1/students/{id}` | PUT | Yes | Update student |
| `DELETE /api/v1/students/{id}` | DELETE | Yes | Remove student |
| `GET /api/v1/students/{id}/subjects` | GET | Yes | Get enrolled subjects |
| `POST /api/v1/students/{id}/subjects` | POST | Yes | Enrol in subject |
| `DELETE /api/v1/students/{id}/subjects/{sid}` | DELETE | Yes | Unenrol |

### 3.3 Access Control

```python
async def verify_student_access(
    student_id: UUID,
    current_user: User,
    db: AsyncSession
) -> Student:
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(404, "Student not found")

    # Parent accessing child
    if student.parent_id == current_user.id:
        return student

    # Student accessing own data (if they have auth)
    if student.supabase_auth_id == current_user.supabase_auth_id:
        return student

    raise HTTPException(403, "Access denied")
```

### 3.4 Phase 3 Checklist

- [ ] Create student_subjects migration
- [ ] Implement user service
- [ ] Implement student service
- [ ] Implement student subject service
- [ ] Create user API endpoints
- [ ] Create student API endpoints
- [ ] Create student subject endpoints
- [ ] Implement access control middleware
- [ ] Build onboarding flow (frontend)
- [ ] Build SubjectSelection component
- [ ] Build PathwaySelection component
- [ ] Build student profile components
- [ ] Write access control tests
- [ ] Run student-data-privacy-audit skill

---

## Phase 4: AI Tutoring Foundation

### 4.1 Database Migrations

**009_sessions.py**
```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id),
    session_type VARCHAR(30) NOT NULL,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    outcomes_practiced TEXT[],
    xp_earned INTEGER DEFAULT 0,
    summary JSONB DEFAULT '{}'
);

CREATE INDEX idx_sessions_student ON sessions(student_id);
CREATE INDEX idx_sessions_start_time ON sessions(start_time);
```

**010_ai_interactions.py**
```sql
CREATE TABLE ai_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    subject_id UUID REFERENCES subjects(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    interaction_type VARCHAR(50) NOT NULL,
    model_used VARCHAR(50) NOT NULL,
    tutor_style VARCHAR(50),
    user_message TEXT,
    ai_response TEXT,
    curriculum_context JSONB DEFAULT '{}',
    tokens_input INTEGER,
    tokens_output INTEGER,
    latency_ms INTEGER,
    cost_estimate DECIMAL(10,6),
    flagged_for_review BOOLEAN DEFAULT FALSE,
    review_reason TEXT
);

CREATE INDEX idx_ai_interactions_student ON ai_interactions(student_id);
CREATE INDEX idx_ai_interactions_subject ON ai_interactions(subject_id);
CREATE INDEX idx_ai_interactions_flagged ON ai_interactions(flagged_for_review)
    WHERE flagged_for_review = TRUE;
```

### 4.2 Claude Service

```python
# backend/app/services/claude_service.py

SUBJECT_TUTOR_STYLES = {
    "MATH": {"style": "socratic_stepwise", "approach": "Step-by-step problem decomposition"},
    "ENG": {"style": "socratic_analytical", "approach": "Text analysis and evidence finding"},
    "SCI": {"style": "inquiry_based", "approach": "Hypothesis and experimental thinking"},
    "HSIE": {"style": "socratic_analytical", "approach": "Source analysis and perspectives"},
    "PDHPE": {"style": "discussion_based", "approach": "Personal reflection and application"},
    "TAS": {"style": "project_based", "approach": "Design thinking and problem solving"},
    "CA": {"style": "creative_mentoring", "approach": "Expression and technique development"},
    "LANG": {"style": "immersive", "approach": "Scaffolded target language use"},
}
```

### 4.3 API Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `POST /api/v1/tutor/chat` | POST | Yes | Send message to tutor |
| `GET /api/v1/tutor/history/{session_id}` | GET | Yes | Get conversation history |
| `POST /api/v1/tutor/flashcards` | POST | Yes | Generate flashcards |
| `POST /api/v1/tutor/summarise` | POST | Yes | Generate summary |
| `GET /api/v1/ai-interactions` | GET | Yes | Parent: view child's AI logs |

### 4.4 Phase 4 Checklist

- [ ] Create sessions migration
- [ ] Create ai_interactions migration
- [ ] Implement Claude service with model routing
- [ ] Implement subject-specific tutor prompts
- [ ] Implement age-appropriate language logic
- [ ] Implement safety/moderation system
- [ ] Implement AI interaction logging
- [ ] Create tutor API endpoints
- [ ] Build TutorChat component
- [ ] Build ChatMessage component
- [ ] Build conversation history view
- [ ] Write Socratic method tests
- [ ] Run ai-prompt-tester skill
- [ ] Run security-auditor on AI endpoints

---

## Phase 5-9: Outline

### Phase 5: Notes and OCR (2 weeks)
- Notes table with OCR processing status
- Google Cloud Vision integration
- Note upload component
- Curriculum alignment via AI

### Phase 6: Revision System (2 weeks)
- SM-2 spaced repetition algorithm
- Flashcard generation from notes
- Revision session interface
- Progress tracking per subject

### Phase 7: Parent Dashboard (2 weeks)
- Child progress overview
- Subject-by-subject analytics
- AI conversation review
- Weekly insight generation

### Phase 8: Gamification (1 week)
- XP calculation per subject
- Level progression system
- Achievement badges
- Study streaks

### Phase 9: PWA/Offline (2 weeks)
- Service worker setup
- IndexedDB for offline data
- Background sync
- Push notifications

---

## Security Requirements (All Phases)

### Children's Data Protection
1. **Australian Privacy Act**: Parental consent for under-15s
2. **Data Minimisation**: Only collect necessary data
3. **Right to Deletion**: Complete data removal on request
4. **No Third-Party Sharing**: Never sell student data

### Access Control
1. Students access only their own data
2. Parents access only their linked children
3. All AI interactions logged for parent oversight
4. Admin actions are audited

### Framework Isolation
```python
# CRITICAL: Every curriculum query must include framework_id
outcomes = await db.execute(
    select(CurriculumOutcome)
    .where(CurriculumOutcome.framework_id == student.framework_id)
    .where(CurriculumOutcome.subject_id == subject_id)
)
```

---

## Testing Requirements (All Phases)

| Type | Target | Tools |
|------|--------|-------|
| Unit Tests | 80%+ coverage | pytest, Vitest |
| Integration Tests | All API endpoints | pytest, httpx |
| E2E Tests | Critical flows | Playwright |
| Security Tests | Auth, injection | pytest |
| Curriculum Validation | Outcome codes | curriculum-validator skill |

---

## Quality Gates

Before each phase completion:
- [ ] All tests passing
- [ ] 80%+ code coverage
- [ ] Security audit passed
- [ ] Privacy compliance verified
- [ ] No TypeScript/Python type errors
- [ ] Code review completed
- [ ] Documentation updated
