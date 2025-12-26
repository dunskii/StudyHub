# Study: Phase 2 - Core Curriculum System

## Summary

Phase 2 is the **Core Curriculum System** phase of StudyHub, focused on establishing the curriculum foundation that all subsequent features will build upon. This phase creates the database schema, backend services, and frontend components for managing NSW curriculum subjects, outcomes, and senior courses.

**Status:** NOT STARTED (0% complete)
**Duration:** 2 weeks (per Implementation Plan)
**Prerequisites:** Phase 1 complete ✅ (completed 2025-12-26), Database provisioned, Supabase Auth configured

## Key Requirements

### Database (3 New Tables)

1. **subjects** - Core subject definitions (8 NSW KLAs)
   - Framework-specific subject definitions
   - Subject configuration including tutor styles and pathways
   - Icons and colors for UI theming

2. **curriculum_outcomes** - Learning outcomes per subject/stage
   - Outcome codes following NSW patterns (MA3-RN-01, EN4-VOCAB-01)
   - Stage, strand, and pathway mappings
   - Full content and keywords for search

3. **senior_courses** - HSC courses for Stage 6
   - Course categories (Standard, Advanced, Extension)
   - Unit counts and prerequisites
   - Extension course relationships

### Backend API Endpoints (8 Endpoints)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/subjects` | List subjects with framework filtering |
| `GET /api/v1/subjects/{id}` | Get subject details |
| `GET /api/v1/frameworks/{code}/subjects` | Get all subjects for a framework |
| `GET /api/v1/outcomes` | Query outcomes with filters |
| `GET /api/v1/outcomes/{code}` | Get single outcome by code |
| `GET /api/v1/subjects/{id}/outcomes` | Get outcomes for a subject |
| `GET /api/v1/senior-courses` | List HSC courses |
| `GET /api/v1/senior-courses/{id}` | Get course details |

### Frontend Components

**Curriculum Components:**
- `OutcomeCard` - Display single curriculum outcome
- `StrandNavigator` - Navigate strands within subjects
- `CurriculumBrowser` - Main browsing interface

**Subject Components:**
- `SubjectCard` - Subject display with icon/color
- `SubjectSelector` - Multi-select for enrollment
- `PathwaySelector` - Stage 5 pathway selection (Math: 5.1/5.2/5.3)
- `HSCCourseSelector` - Stage 6 course selection

## Existing Patterns

### Database Patterns from Phase 1
- UUID primary keys throughout
- `created_at`/`updated_at` timestamps on all tables
- JSONB for flexible configuration (see `config` column on subjects)
- Framework isolation via `framework_id` foreign key

### API Patterns from Phase 1
- FastAPI async endpoints
- Pydantic v2 schemas for request/response
- Dependency injection for database sessions
- Consistent error handling

## Technical Considerations

### Database

**Migration Files to Create:**
```
005_subjects.py
006_curriculum_outcomes.py
007_senior_courses.py
```

**Key Indexes Required:**
- `idx_subjects_framework` on (framework_id)
- `idx_subjects_code` on (code)
- `idx_curriculum_framework` on (framework_id)
- `idx_curriculum_subject` on (subject_id)
- `idx_curriculum_stage` on (stage)
- `idx_curriculum_strand` on (strand)
- `idx_senior_courses_framework` on (framework_id)
- `idx_senior_courses_subject` on (subject_id)

**Unique Constraints:**
- `(framework_id, code)` on subjects
- `(framework_id, outcome_code)` on curriculum_outcomes
- `(framework_id, code)` on senior_courses

### API

**Query Parameters for Outcome Filtering:**
- `framework_id` (required) - **CRITICAL: Framework isolation**
- `subject_id` (optional)
- `stage` (optional)
- `strand` (optional)
- `pathway` (optional)
- `search` (optional) - Keyword search

### Frontend

**New Types Needed:**
```typescript
// types/curriculum.types.ts
interface OutcomeSchema {
  id: string;
  framework_id: string;
  subject_id: string;
  outcome_code: string;
  stage: string;
  grade_range: number[];
  title: string;
  description: string;
  pathway?: string;
  strand: string;
  sub_strand?: string;
  content: Record<string, unknown>;
  keywords: string[];
  created_at: string;
  updated_at: string;
}

// types/subject.types.ts
interface SubjectSchema {
  id: string;
  framework_id: string;
  code: string;
  name: string;
  kla: string;
  icon: string;
  color: string;
  available_stages: string[];
  config: {
    hasPathways: boolean;
    pathways?: string[];
    tutorStyle: string;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

## Curriculum Alignment

### NSW Subjects to Seed (8 KLAs)

| Code | Name | KLA | Tutor Style | Color | Has Pathways |
|------|------|-----|-------------|-------|--------------|
| MATH | Mathematics | Mathematics | socratic_stepwise | #3B82F6 | YES (5.1, 5.2, 5.3) |
| ENG | English | English | socratic_analytical | #8B5CF6 | YES (Standard, Advanced) |
| SCI | Science | Science | inquiry_based | #10B981 | NO |
| HSIE | History/Geography | Human Society and Its Environment | socratic_analytical | #F59E0B | NO |
| PDHPE | PDHPE | Personal Development, Health and Physical Education | discussion_based | #EF4444 | NO |
| TAS | Technology | Technology and Applied Studies | project_based | #6366F1 | NO |
| CA | Creative Arts | Creative Arts | creative_mentoring | #EC4899 | NO |
| LANG | Languages | Languages | immersive | #14B8A6 | NO |

### Stage/Pathway System

```
Stage 2 → Years 3-4
Stage 3 → Years 5-6
Stage 4 → Years 7-8
Stage 5 → Years 9-10 (with pathways for Math/English)
Stage 6 → Years 11-12 (HSC - use senior_courses)
```

### Outcome Code Patterns

| Subject | Pattern | Example |
|---------|---------|---------|
| Mathematics | MA{stage}-{strand}-{num} | MA3-RN-01 |
| English | EN{stage}-{strand}-{num} | EN4-VOCAB-01 |
| Science | SC{stage}-{strand}-{num} | SC5-WS-02 |
| History | HT{stage}-{num} | HT3-1 |
| Geography | GE{stage}-{num} | GE4-1 |
| PDHPE | PD{stage}-{num} | PD5-9 |

## Security/Privacy Considerations

### Framework Isolation (CRITICAL)

**Every curriculum query MUST filter by `framework_id`:**

```python
# CORRECT - Always include framework_id
outcomes = await db.execute(
    select(CurriculumOutcome)
    .where(CurriculumOutcome.framework_id == student.framework_id)
    .where(CurriculumOutcome.subject_id == subject_id)
)

# WRONG - Never query without framework_id
outcomes = await db.execute(
    select(CurriculumOutcome)
    .where(CurriculumOutcome.subject_id == subject_id)  # Missing framework filter!
)
```

### Data Access Rules
- Curriculum data is read-only for students/parents
- Only system admins can modify curriculum data
- No student-specific data in curriculum tables (those are in student_subjects, notes, etc.)

## Dependencies

### Blocking Prerequisites (Before Phase 2)
1. ✅ Phase 1 infrastructure complete
2. 🔲 PostgreSQL database provisioned (local or Supabase)
3. 🔲 Database migrations 001-004 run successfully
4. 🔲 Supabase Auth project created with API keys

### Phase 2 Unlocks
- **Phase 3 (User System)** - Student subject enrollment depends on subjects table
- **Phase 4 (AI Tutoring)** - Subject-aware tutoring needs subject config/tutor styles
- **Phase 5 (Notes & OCR)** - Curriculum-aligned note organization

## Open Questions

1. **Sample Outcomes Scope:** How many sample outcomes should be seeded for Stage 3 Math/English? (Suggested: 10-15 per subject as representative sample)

2. **HSC Courses:** Should we seed full HSC course list or just representative samples in Phase 2?

3. **Curriculum API Authentication:** Should curriculum endpoints be public (read-only) or require authentication? (Suggested: Require auth but allow any authenticated user to read)

4. **Strand Hierarchy:** Should we create a separate `strands` table or embed strand info in outcomes? (Current design: Embedded in outcomes)

## Task Breakdown

### 2.1 Database Tasks
- [ ] Create subjects migration (005_subjects.py)
- [ ] Create curriculum_outcomes migration (006_curriculum_outcomes.py)
- [ ] Create senior_courses migration (007_senior_courses.py)
- [ ] Seed NSW subjects (8 KLAs)
- [ ] Seed NSW Mathematics outcomes (Stage 3 sample)
- [ ] Seed NSW English outcomes (Stage 3 sample)

### 2.2 Backend Tasks
- [ ] Create Subject model and schema
- [ ] Create CurriculumOutcome model and schema
- [ ] Create SeniorCourse model and schema
- [ ] Implement SubjectService
- [ ] Implement CurriculumService
- [ ] Create subjects endpoints (list, detail, by framework)
- [ ] Create outcomes endpoints (query, detail, by subject)
- [ ] Create senior-courses endpoints (list, detail)
- [ ] Write comprehensive tests (80%+ coverage)

### 2.3 Frontend Tasks
- [ ] Create curriculum types
- [ ] Create subject types
- [ ] Implement SubjectCard component
- [ ] Implement SubjectSelector component
- [ ] Implement PathwaySelector component
- [ ] Implement HSCCourseSelector component
- [ ] Implement OutcomeCard component
- [ ] Implement StrandNavigator component
- [ ] Implement CurriculumBrowser component
- [ ] Create useSubjects hook
- [ ] Create useCurriculum hook
- [ ] Create CurriculumDashboard page
- [ ] Write tests (aim for 132+ tests total)

### 2.4 Quality & Validation
- [ ] Run curriculum-validator skill
- [ ] Run subject-config-checker skill
- [ ] Verify outcome codes against NESA patterns
- [ ] Zero TypeScript errors
- [ ] Zero mypy errors
- [ ] 80%+ test coverage

## Success Criteria

- All 3 migrations run successfully
- All 8 NSW subjects seeded with correct configuration
- Sample outcomes seeded for Stage 3 Math & English
- All 8 API endpoints working with proper filtering
- Backend tests: 80%+ coverage
- Frontend tests: 132+ tests passing
- Zero TypeScript errors
- Zero mypy/Python type errors
- curriculum-validator skill passes
- subject-config-checker skill passes
- Framework isolation verified on all queries

## Sources Referenced

- `C:\Users\dunsk\code\StudyHub\TASKLIST.md` - Current sprint tasks
- `C:\Users\dunsk\code\StudyHub\PROGRESS.md` - Phase overview and status
- `C:\Users\dunsk\code\StudyHub\Planning\roadmaps\Implementation_Plan.md` - Detailed specifications
- `C:\Users\dunsk\code\StudyHub\Complete_Development_Plan.md` - Database schema
- `C:\Users\dunsk\code\StudyHub\studyhub_overview.md` - Feature descriptions
- `C:\Users\dunsk\code\StudyHub\CLAUDE.md` - Project conventions and guidelines
