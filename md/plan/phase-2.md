# Implementation Plan: Phase 2 - Core Curriculum System

## Overview

Phase 2 establishes the curriculum foundation for StudyHub. This phase implements the backend services and API endpoints for subjects, curriculum outcomes, and senior courses, plus frontend components for browsing and selecting curriculum content.

**Current State Analysis:**
- ✅ Database migrations exist (005-007)
- ✅ SQLAlchemy models exist (Subject, CurriculumOutcome, SeniorCourse)
- ✅ Frontend types exist (subject.types.ts, curriculum.types.ts)
- ✅ Seed script exists with NSW data (scripts/seed_nsw_curriculum.py)
- ⚠️ API endpoints are stubs (subjects.py, curriculum.py have TODO placeholders)
- ❌ Backend services missing (SubjectService, CurriculumService)
- ❌ Pydantic schemas missing for subjects/outcomes
- ❌ Frontend components missing
- ❌ React Query hooks missing
- ❌ Tests missing

## Prerequisites

- [x] Phase 1 infrastructure complete
- [ ] PostgreSQL database provisioned (local Docker or Supabase)
- [ ] DATABASE_URL and TEST_DATABASE_URL configured in .env
- [ ] All migrations run (`alembic upgrade head`)
- [ ] NSW curriculum seeded (`python scripts/seed_nsw_curriculum.py`)

## Phase 1: Database Setup Verification

### 1.1 Verify Existing Migrations
- [ ] Confirm migrations 005, 006, 007 are correct
- [ ] Run `alembic upgrade head` to apply all migrations
- [ ] Verify tables created: subjects, curriculum_outcomes, senior_courses

### 1.2 Run Seed Script
- [ ] Execute `python scripts/seed_nsw_curriculum.py`
- [ ] Verify 8 NSW subjects created
- [ ] Verify sample outcomes created for MATH, ENG, SCI, HSIE, PDHPE

## Phase 2: Backend Pydantic Schemas

### 2.1 Create Subject Schemas
**File:** `backend/app/schemas/subject.py`

```python
# Required schemas:
- SubjectBase (code, name, kla, description, icon, color, available_stages, config)
- SubjectCreate (inherits SubjectBase + framework_id)
- SubjectUpdate (all fields optional)
- SubjectResponse (SubjectBase + id, framework_id, display_order, is_active, timestamps)
- SubjectListResponse (pagination wrapper)
- SubjectWithOutcomesResponse (SubjectResponse + outcomes list)
```

### 2.2 Create Curriculum Outcome Schemas
**File:** `backend/app/schemas/curriculum.py`

```python
# Required schemas:
- OutcomeBase (outcome_code, description, stage, strand, substrand, pathway)
- OutcomeCreate (inherits OutcomeBase + framework_id, subject_id)
- OutcomeResponse (OutcomeBase + id, framework_id, subject_id, content_descriptors, elaborations, prerequisites, display_order, created_at)
- OutcomeListResponse (pagination wrapper with total count)
- OutcomeQueryParams (framework_id required, subject_id, stage, strand, pathway, search optional)
```

### 2.3 Create Senior Course Schemas
**File:** `backend/app/schemas/senior_course.py`

```python
# Required schemas:
- SeniorCourseBase (code, name, description, course_type, units, is_atar)
- SeniorCourseCreate (inherits SeniorCourseBase + framework_id, subject_id)
- SeniorCourseResponse (full response with all fields)
- SeniorCourseListResponse (pagination wrapper)
```

## Phase 3: Backend Services

### 3.1 Create SubjectService
**File:** `backend/app/services/subject_service.py`

```python
class SubjectService:
    # Methods:
    - get_all(framework_id, active_only, offset, limit) -> List[Subject]
    - count(framework_id, active_only) -> int
    - get_by_id(subject_id) -> Subject | None
    - get_by_code(framework_id, code) -> Subject | None
    - get_with_outcomes(subject_id, stage?, strand?) -> Subject with outcomes
    - get_by_framework(framework_id, active_only) -> List[Subject]
```

### 3.2 Create CurriculumService
**File:** `backend/app/services/curriculum_service.py`

```python
class CurriculumService:
    # Methods:
    - query_outcomes(framework_id, subject_id?, stage?, strand?, pathway?, search?, offset, limit) -> List[CurriculumOutcome]
    - count_outcomes(framework_id, subject_id?, stage?, strand?, pathway?) -> int
    - get_by_code(framework_id, outcome_code) -> CurriculumOutcome | None
    - get_subject_outcomes(subject_id, stage?, strand?) -> List[CurriculumOutcome]
    - get_strands(framework_id, subject_id) -> List[str]  # Distinct strands
```

**CRITICAL:** All queries MUST filter by framework_id for framework isolation.

### 3.3 Create SeniorCourseService
**File:** `backend/app/services/senior_course_service.py`

```python
class SeniorCourseService:
    # Methods:
    - get_all(framework_id, subject_id?, active_only, offset, limit) -> List[SeniorCourse]
    - count(framework_id, subject_id?, active_only) -> int
    - get_by_id(course_id) -> SeniorCourse | None
    - get_by_code(framework_id, code) -> SeniorCourse | None
```

## Phase 4: Backend API Endpoints

### 4.1 Update Subject Endpoints
**File:** `backend/app/api/v1/endpoints/subjects.py`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/subjects` | GET | List subjects (query: framework_code, active_only) |
| `/subjects/{id}` | GET | Get subject by UUID |
| `/subjects/code/{code}` | GET | Get subject by code (query: framework_code) |
| `/subjects/{id}/outcomes` | GET | Get outcomes for subject (query: stage, strand) |

### 4.2 Update Curriculum Endpoints
**File:** `backend/app/api/v1/endpoints/curriculum.py`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/curriculum/outcomes` | GET | Query outcomes (query: framework_id required, subject_id, stage, strand, pathway, search) |
| `/curriculum/outcomes/{code}` | GET | Get outcome by code (query: framework_code) |
| `/curriculum/strands` | GET | Get distinct strands (query: framework_id, subject_id) |

### 4.3 Create Senior Course Endpoints
**File:** `backend/app/api/v1/endpoints/senior_courses.py`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/senior-courses` | GET | List senior courses (query: framework_code, subject_id) |
| `/senior-courses/{id}` | GET | Get course by UUID |
| `/senior-courses/code/{code}` | GET | Get course by code (query: framework_code) |

### 4.4 Update Router
**File:** `backend/app/api/v1/router.py`
- Add senior_courses router import and include

## Phase 5: Backend Tests

### 5.1 Service Tests
**Files:**
- `backend/tests/services/test_subject_service.py`
- `backend/tests/services/test_curriculum_service.py`
- `backend/tests/services/test_senior_course_service.py`

Test cases:
- List with pagination
- Filter by framework_id (CRITICAL)
- Filter by various parameters
- Get by ID/code
- Empty results handling
- Framework isolation verification

### 5.2 API Tests
**Files:**
- `backend/tests/api/test_subjects.py`
- `backend/tests/api/test_curriculum.py`
- `backend/tests/api/test_senior_courses.py`

Test cases:
- All endpoints return correct status codes
- Pagination works correctly
- Filtering works correctly
- 404 for non-existent resources
- Framework isolation verified

### 5.3 Test Fixtures
**File:** `backend/tests/conftest.py` (update)
- Add fixtures for test subjects
- Add fixtures for test outcomes
- Add fixtures for test senior courses

## Phase 6: Frontend API Client

### 6.1 Create API Functions
**File:** `frontend/src/lib/api/curriculum.ts`

```typescript
// Functions:
- getSubjects(frameworkCode?: string): Promise<Subject[]>
- getSubject(id: string): Promise<Subject>
- getSubjectByCode(code: string, frameworkCode?: string): Promise<Subject>
- getSubjectOutcomes(subjectId: string, params?: OutcomeQueryParams): Promise<CurriculumOutcome[]>
```

**File:** `frontend/src/lib/api/outcomes.ts`

```typescript
// Functions:
- queryOutcomes(params: OutcomeQueryParams): Promise<OutcomeListResponse>
- getOutcomeByCode(code: string, frameworkCode?: string): Promise<CurriculumOutcome>
- getStrands(frameworkId: string, subjectId?: string): Promise<string[]>
```

**File:** `frontend/src/lib/api/senior-courses.ts`

```typescript
// Functions:
- getSeniorCourses(params: { frameworkCode?: string; subjectId?: string }): Promise<SeniorCourse[]>
- getSeniorCourse(id: string): Promise<SeniorCourse>
```

## Phase 7: Frontend React Query Hooks

### 7.1 Create Subject Hooks
**File:** `frontend/src/hooks/useSubjects.ts`

```typescript
// Hooks:
- useSubjects(frameworkCode?: string)
- useSubject(id: string)
- useSubjectByCode(code: string, frameworkCode?: string)
- useSubjectOutcomes(subjectId: string, params?: OutcomeQueryParams)
```

### 7.2 Create Curriculum Hooks
**File:** `frontend/src/hooks/useCurriculum.ts`

```typescript
// Hooks:
- useOutcomes(params: OutcomeQueryParams)
- useOutcome(code: string, frameworkCode?: string)
- useStrands(frameworkId: string, subjectId?: string)
```

### 7.3 Create Senior Course Hooks
**File:** `frontend/src/hooks/useSeniorCourses.ts`

```typescript
// Hooks:
- useSeniorCourses(params)
- useSeniorCourse(id: string)
```

## Phase 8: Frontend Components

### 8.1 Subject Components
**Directory:** `frontend/src/components/subjects/`

| Component | Description |
|-----------|-------------|
| `SubjectCard/` | Display subject with icon, color, name |
| `SubjectSelector/` | Multi-select grid for subject enrollment |
| `PathwaySelector/` | Select Stage 5 pathway (5.1/5.2/5.3 for Math) |
| `HSCCourseSelector/` | Select Stage 6 HSC courses |
| `SubjectGrid/` | Grid layout for subject cards |

### 8.2 Curriculum Components
**Directory:** `frontend/src/components/curriculum/`

| Component | Description |
|-----------|-------------|
| `OutcomeCard/` | Display single outcome with code, description, strand |
| `OutcomeList/` | List of outcomes with filtering |
| `StrandNavigator/` | Navigate between strands (sidebar/tabs) |
| `StageSelector/` | Select stage to view outcomes |
| `CurriculumBrowser/` | Main browser combining all components |

### 8.3 Component Implementation Order
1. SubjectCard (simplest, foundational)
2. SubjectGrid (uses SubjectCard)
3. SubjectSelector (uses SubjectGrid + selection state)
4. OutcomeCard (simple display)
5. OutcomeList (uses OutcomeCard + filtering)
6. StageSelector (dropdown/tabs)
7. StrandNavigator (sidebar with strand list)
8. CurriculumBrowser (combines all)
9. PathwaySelector (specialized for Stage 5)
10. HSCCourseSelector (specialized for Stage 6)

## Phase 9: Frontend Pages

### 9.1 Curriculum Dashboard
**File:** `frontend/src/features/curriculum/CurriculumDashboard.tsx`

Main page for browsing curriculum:
- Subject selection
- Stage filtering
- Strand navigation
- Outcome browsing

### 9.2 Subject Detail View
**File:** `frontend/src/features/curriculum/SubjectView.tsx`

Detailed view of a single subject with outcomes.

## Phase 10: Frontend Tests

### 10.1 Component Tests
Each component needs tests for:
- Renders correctly with props
- Handles loading state
- Handles error state
- Handles empty data
- User interactions work correctly
- Accessibility (ARIA, keyboard navigation)

### 10.2 Hook Tests
Test React Query hooks:
- Returns correct data
- Handles loading state
- Handles errors
- Refetches on param change

## Phase 11: Integration & Validation

### 11.1 Run Validation Skills
- [ ] Run curriculum-validator skill
- [ ] Run subject-config-checker skill
- [ ] Verify outcome codes match NESA patterns

### 11.2 Quality Checks
- [ ] Zero TypeScript errors (`npm run typecheck`)
- [ ] Zero ESLint errors (`npm run lint`)
- [ ] Zero mypy errors (`mypy app`)
- [ ] Backend tests pass with 80%+ coverage
- [ ] Frontend tests pass

### 11.3 Framework Isolation Audit
- [ ] Verify ALL queries include framework_id filter
- [ ] Test that NSW data doesn't appear when querying other frameworks
- [ ] Review service methods for isolation compliance

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Framework isolation missed | High | Code review checklist, automated tests for isolation |
| Outcome codes don't match NESA | Medium | Run curriculum-validator, compare with official docs |
| Missing pathways for subjects | Medium | Verify config.pathways in seed data, test with Stage 5 Math |
| Performance with large curriculum | Low | Add pagination, indexes already exist |
| Frontend type mismatches | Low | Generate types from OpenAPI spec or validate manually |

## Curriculum Considerations

### Multi-Framework Architecture
- All endpoints accept `framework_code` parameter (default: "NSW")
- All services require `framework_id` for queries
- Subjects/outcomes are scoped to framework
- No cross-framework data leakage

### Subject-Specific Features
- **Mathematics:** Pathways at Stage 5 (5.1, 5.2, 5.3)
- **English:** Standard/Advanced pathways
- **All subjects:** Stage-based progression
- **Stage 6:** HSC course selection via senior_courses table

### Tutor Style Integration
Each subject's `config.tutorStyle` determines AI tutoring approach:
- `socratic_stepwise` (Math)
- `socratic_analytical` (English, HSIE)
- `inquiry_based` (Science)
- `discussion_based` (PDHPE)
- `project_based` (TAS)
- `creative_mentoring` (Creative Arts)
- `immersive` (Languages)

## Privacy/Security Checklist

- [x] Curriculum data is read-only for students/parents (by design)
- [x] No student-specific data in curriculum tables
- [ ] Framework isolation enforced on all queries
- [ ] API rate limiting applied to curriculum endpoints
- [ ] No sensitive data exposed in curriculum responses

## Implementation Order

### Week 1: Backend Foundation
1. Verify database setup and run seed script
2. Create Pydantic schemas (subject, curriculum, senior_course)
3. Implement SubjectService
4. Implement CurriculumService
5. Implement SeniorCourseService
6. Update subjects.py endpoints
7. Update curriculum.py endpoints
8. Create senior_courses.py endpoints
9. Write backend tests (aim for 80%+ coverage)

### Week 2: Frontend Implementation
1. Create API client functions
2. Create React Query hooks
3. Implement SubjectCard component
4. Implement SubjectGrid and SubjectSelector
5. Implement OutcomeCard and OutcomeList
6. Implement StageSelector and StrandNavigator
7. Implement CurriculumBrowser
8. Implement PathwaySelector and HSCCourseSelector
9. Create CurriculumDashboard page
10. Write frontend tests
11. Run validation skills and quality checks

## Estimated Complexity

**Medium-High**

- Backend: Straightforward CRUD with proper filtering
- Frontend: Multiple interconnected components
- Testing: Comprehensive coverage required
- Critical: Framework isolation must be verified

## Dependencies on Other Features

**This phase enables:**
- Phase 3 (User System): Student subject enrollment
- Phase 4 (AI Tutoring): Subject-aware tutoring with tutor styles
- Phase 5 (Notes & OCR): Curriculum-aligned note organisation
- Phase 6 (Revision): Outcome-based spaced repetition

**Required before:**
- Any feature that references subjects or curriculum outcomes
- Student onboarding (subject selection)
- Progress tracking (outcome completion)

## Success Criteria

- [ ] All 8 backend endpoints working with proper filtering
- [ ] Backend tests: 80%+ coverage
- [ ] All frontend components render correctly
- [ ] Frontend tests: 132+ tests passing
- [ ] Zero TypeScript/mypy errors
- [ ] curriculum-validator skill passes
- [ ] subject-config-checker skill passes
- [ ] Framework isolation verified

## Recommended Agent

Use **backend-architect** agent for Phase 2-5 (backend work)
Use **frontend-developer** agent for Phase 6-10 (frontend work)
Use **testing-qa-specialist** agent for comprehensive test coverage
