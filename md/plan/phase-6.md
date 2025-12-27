# Implementation Plan: Phase 6 - Revision & Spaced Repetition

## Overview

Phase 6 implements a scientifically-backed spaced repetition system with AI-powered flashcard generation. Students can create flashcards manually or generate them from notes using Claude Haiku. The system uses the SM-2 algorithm to schedule optimal review times, tracking mastery at both individual flashcard and curriculum outcome levels.

**Estimated Complexity**: Complex (2-week implementation)

---

## Prerequisites

- [x] Phase 1: Foundation & Infrastructure complete
- [x] Phase 2: Core Curriculum System complete
- [x] Phase 3: User System & Authentication complete
- [x] Phase 4: AI Tutoring complete (Claude integration)
- [x] Phase 5: Notes & OCR complete (flashcard generation source)

---

## Phase 1: Database Schema & Migrations

### Task 1.1: Create Flashcards Table Migration (013_flashcards.py)
- [ ] Create `flashcards` table with:
  - `id` (UUID, PK)
  - `student_id` (UUID, FK to students, CASCADE DELETE)
  - `subject_id` (UUID, FK to subjects, nullable)
  - `curriculum_outcome_id` (UUID, FK to curriculum_outcomes, nullable)
  - `context_note_id` (UUID, FK to notes, nullable, SET NULL on delete)
  - `front` (TEXT, NOT NULL) - question/prompt
  - `back` (TEXT, NOT NULL) - answer
  - `generated_by` (VARCHAR(20)) - 'user', 'ai', 'system'
  - `generation_model` (VARCHAR(50)) - e.g., 'claude-3-5-haiku'
  - `review_count` (INTEGER, default 0)
  - `correct_count` (INTEGER, default 0)
  - `mastery_percent` (INTEGER, default 0)
  - `sr_interval` (INTEGER, default 1) - days until next review
  - `sr_ease_factor` (FLOAT, default 2.5) - SM-2 ease factor
  - `sr_next_review` (TIMESTAMPTZ) - next review date
  - `difficulty_level` (INTEGER, 1-5)
  - `tags` (ARRAY of VARCHAR)
  - `created_at`, `updated_at` (TIMESTAMPTZ)
- [ ] Create indexes:
  - `ix_flashcards_student_id`
  - `ix_flashcards_subject_id`
  - `ix_flashcards_outcome_id`
  - `ix_flashcards_next_review`
  - `ix_flashcards_note_id`
- [ ] Add updated_at trigger

### Task 1.2: Create Revision History Table Migration (014_revision_history.py)
- [ ] Create `revision_history` table with:
  - `id` (UUID, PK)
  - `student_id` (UUID, FK to students, CASCADE DELETE)
  - `flashcard_id` (UUID, FK to flashcards, CASCADE DELETE)
  - `session_id` (UUID, FK to sessions, SET NULL on delete)
  - `was_correct` (BOOLEAN, NOT NULL)
  - `score_percent` (INTEGER, 0-100)
  - `response_time_seconds` (INTEGER)
  - `difficulty_rating` (INTEGER, 1-5, user feedback)
  - `sr_interval_before` (INTEGER) - interval before this review
  - `sr_interval_after` (INTEGER) - interval after this review
  - `sr_ease_before` (FLOAT) - ease factor before
  - `sr_ease_after` (FLOAT) - ease factor after
  - `created_at` (TIMESTAMPTZ)
- [ ] Create indexes:
  - `ix_revision_history_student_id`
  - `ix_revision_history_flashcard_id`
  - `ix_revision_history_session_id`
  - `ix_revision_history_created_at`

### Task 1.3: Create SQLAlchemy Models
- [ ] `backend/app/models/flashcard.py` - Flashcard model
- [ ] `backend/app/models/revision_history.py` - RevisionHistory model
- [ ] Update `backend/app/models/__init__.py` to export new models
- [ ] Add relationships to Student model (flashcards, revision_history)

---

## Phase 2: Backend Services

### Task 2.1: Spaced Repetition Service
- [ ] Create `backend/app/services/spaced_repetition.py`
- [ ] Implement SM-2 algorithm:
  ```python
  def calculate_next_review(
      quality: int,  # 0-5 rating
      ease_factor: float,  # current EF
      interval: int,  # current interval in days
      repetition: int  # number of times reviewed
  ) -> tuple[int, float, datetime]:  # (new_interval, new_ef, next_review_date)
  ```
- [ ] Quality grading: 0-2 = fail (reset interval), 3-5 = pass (increase interval)
- [ ] Ease factor adjustment formula:
  ```
  EF' = EF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  EF' = max(1.3, EF')
  ```
- [ ] Interval calculation:
  - First review: 1 day
  - Second review: 6 days
  - Subsequent: interval * ease_factor
- [ ] Unit tests for all algorithm edge cases

### Task 2.2: Revision Service
- [ ] Create `backend/app/services/revision_service.py`
- [ ] CRUD operations:
  - `create_flashcard()` - with ownership to student
  - `get_flashcard()` - with ownership verification
  - `get_student_flashcards()` - with filters (subject, outcome, due, search)
  - `update_flashcard()` - with ownership verification
  - `delete_flashcard()` - with ownership verification
- [ ] Revision operations:
  - `get_due_flashcards()` - cards where sr_next_review <= now
  - `record_review()` - record answer, update SR state
  - `get_revision_progress()` - overall stats
  - `get_progress_by_subject()` - per-subject mastery
  - `get_progress_by_outcome()` - per-outcome mastery
- [ ] Session management:
  - `start_revision_session()` - create session, get cards
  - `end_revision_session()` - finalize stats

### Task 2.3: Flashcard Generation Service
- [ ] Create `backend/app/services/flashcard_generation.py`
- [ ] `generate_from_note()`:
  - Extract key concepts from note OCR text
  - Use Claude Haiku for cost efficiency
  - Generate question-answer pairs
  - Link to note and curriculum outcomes
  - Return list of flashcard drafts for user approval
- [ ] `generate_from_outcome()`:
  - Generate flashcards for a specific curriculum outcome
  - Age-appropriate language based on student stage
  - Subject-aware question styles
- [ ] Prompt template with:
  - NSW curriculum context
  - Subject-specific terminology
  - Age/stage appropriate language
  - Quality guidelines (clear questions, concise answers)
- [ ] Rate limiting: max 20 generated cards per note
- [ ] Quality validation before saving

---

## Phase 3: Pydantic Schemas

### Task 3.1: Flashcard Schemas
- [ ] Create `backend/app/schemas/flashcard.py`:
  ```python
  class FlashcardCreate(BaseSchema):
      front: str
      back: str
      subject_id: UUID | None
      curriculum_outcome_id: UUID | None
      context_note_id: UUID | None
      difficulty_level: int = 3  # 1-5
      tags: list[str] | None

  class FlashcardUpdate(BaseSchema):
      front: str | None
      back: str | None
      difficulty_level: int | None
      tags: list[str] | None

  class FlashcardResponse(BaseSchema):
      id: UUID
      student_id: UUID
      subject_id: UUID | None
      curriculum_outcome_id: UUID | None
      context_note_id: UUID | None
      front: str
      back: str
      generated_by: str | None
      review_count: int
      correct_count: int
      mastery_percent: int
      sr_interval: int
      sr_next_review: datetime | None
      difficulty_level: int | None
      tags: list[str] | None
      created_at: datetime
      updated_at: datetime

  class FlashcardListResponse(BaseSchema):
      flashcards: list[FlashcardResponse]
      total: int
  ```

### Task 3.2: Revision Schemas
- [ ] Create `backend/app/schemas/revision.py`:
  ```python
  class RevisionAnswer(BaseSchema):
      flashcard_id: UUID
      was_correct: bool
      difficulty_rating: int  # 1-5
      response_time_seconds: int | None

  class RevisionSessionStart(BaseSchema):
      subject_id: UUID | None  # None = all subjects
      card_count: int = 10  # max cards in session
      include_new: bool = True  # include unreviewed cards

  class RevisionSessionResponse(BaseSchema):
      session_id: UUID
      flashcards: list[FlashcardResponse]
      total_cards: int

  class RevisionProgressResponse(BaseSchema):
      total_flashcards: int
      cards_due: int
      cards_mastered: int  # >= 80% mastery
      overall_mastery_percent: float
      review_streak: int  # consecutive days reviewed
      last_review_date: datetime | None

  class SubjectProgressResponse(BaseSchema):
      subject_id: UUID
      subject_name: str
      subject_code: str
      total_cards: int
      cards_due: int
      mastery_percent: float

  class FlashcardGenerateRequest(BaseSchema):
      note_id: UUID | None
      outcome_id: UUID | None
      count: int = 5  # number of cards to generate

  class FlashcardGenerateResponse(BaseSchema):
      drafts: list[FlashcardCreate]  # pending approval
      source_type: str  # 'note' or 'outcome'
  ```

---

## Phase 4: API Endpoints

### Task 4.1: Flashcard Endpoints
- [ ] Create `backend/app/api/v1/endpoints/flashcards.py`:
  - `POST /api/v1/flashcards` - create flashcard
  - `GET /api/v1/flashcards` - list with filters (subject_id, outcome_id, due_only, search)
  - `GET /api/v1/flashcards/{id}` - get single flashcard
  - `PUT /api/v1/flashcards/{id}` - update flashcard
  - `DELETE /api/v1/flashcards/{id}` - delete flashcard
  - `POST /api/v1/flashcards/generate` - AI generation from note/outcome
  - `POST /api/v1/flashcards/bulk` - create multiple (for generation approval)

### Task 4.2: Revision Endpoints
- [ ] Create `backend/app/api/v1/endpoints/revision.py`:
  - `POST /api/v1/revision/session` - start revision session
  - `GET /api/v1/revision/session/{id}` - get session details
  - `POST /api/v1/revision/answer` - submit answer, update SR
  - `PUT /api/v1/revision/session/{id}/complete` - end session
  - `GET /api/v1/revision/due` - get due-for-review cards
  - `GET /api/v1/revision/progress` - overall progress stats
  - `GET /api/v1/revision/progress/by-subject` - per-subject stats
  - `GET /api/v1/revision/stats` - detailed mastery stats

### Task 4.3: Parent Visibility Endpoints
- [ ] Add to existing parent endpoints:
  - `GET /api/v1/parent/children/{id}/revision/progress` - child's revision progress
  - `GET /api/v1/parent/children/{id}/revision/history` - review history summary

---

## Phase 5: Frontend State Management

### Task 5.1: Revision Store (Zustand)
- [ ] Create `frontend/src/stores/revisionStore.ts`:
  ```typescript
  interface RevisionStore {
    // Session state
    currentSession: RevisionSession | null
    sessionCards: Flashcard[]
    currentCardIndex: number
    showAnswer: boolean

    // Session results
    sessionAnswers: RevisionAnswer[]
    correctCount: number

    // UI state
    isLoading: boolean
    error: string | null

    // Actions
    startSession: (cards: Flashcard[]) => void
    flipCard: () => void
    nextCard: () => void
    previousCard: () => void
    recordAnswer: (answer: RevisionAnswer) => void
    endSession: () => void
    reset: () => void
  }
  ```

### Task 5.2: API Client Functions
- [ ] Create `frontend/src/lib/api/revision.ts`:
  - Flashcard CRUD functions
  - Revision session functions
  - Progress/stats functions
  - Generate flashcards function
  - Type definitions for all request/response shapes

### Task 5.3: React Query Hooks
- [ ] Create `frontend/src/hooks/useRevision.ts`:
  ```typescript
  // Query hooks
  useFlashcards(params: FlashcardListParams)
  useFlashcard(id: string)
  useDueFlashcards(subjectId?: string)
  useRevisionProgress()
  useProgressBySubject()

  // Mutation hooks
  useCreateFlashcard()
  useUpdateFlashcard()
  useDeleteFlashcard()
  useGenerateFlashcards()
  useRecordAnswer()
  useStartRevisionSession()
  useEndRevisionSession()

  // Combined manager hook
  useRevisionManager(studentId: string)
  ```

---

## Phase 6: Frontend Components

### Task 6.1: Core Flashcard Components
- [ ] Create `frontend/src/features/revision/` directory
- [ ] `FlashcardView.tsx`:
  - Card with flip animation (CSS 3D transform)
  - Front/back display
  - Show/hide answer toggle
  - Difficulty rating buttons (1-5)
  - Correct/Incorrect buttons
  - Next review date display
- [ ] `FlashcardCreator.tsx`:
  - Form for front/back content
  - Subject selector
  - Curriculum outcome selector
  - Tag input
  - Preview mode
- [ ] `FlashcardList.tsx`:
  - Grid/list toggle
  - Filter by subject, due status, mastery
  - Search by content
  - Sort by due date, created date, mastery
  - Bulk delete

### Task 6.2: Revision Session Components
- [ ] `RevisionSession.tsx`:
  - Session container
  - Progress bar (X of Y cards)
  - Session timer
  - Card navigation
  - End session button
  - Session summary on complete
- [ ] `SessionSummary.tsx`:
  - Cards reviewed count
  - Correct/incorrect breakdown
  - Time spent
  - Continue or finish options

### Task 6.3: AI Generation Components
- [ ] `GenerateFromNote.tsx`:
  - Note selector dropdown
  - Number of cards slider
  - Generate button with loading state
  - Preview generated cards
  - Approve/reject each card
  - Bulk approve/reject
- [ ] `GenerateFromOutcome.tsx`:
  - Outcome selector
  - Similar generation flow

### Task 6.4: Progress Components
- [ ] `RevisionProgress.tsx`:
  - Overall mastery donut chart
  - Cards due badge
  - Review streak display
  - Last reviewed date
- [ ] `SubjectMastery.tsx`:
  - Per-subject progress bars
  - Click to start subject-specific revision
- [ ] `RevisionStats.tsx`:
  - Historical review chart (last 30 days)
  - Mastery trend over time
  - Cards learned/reviewed counts

### Task 6.5: Page Components
- [ ] `frontend/src/pages/RevisionPage.tsx`:
  - Tab navigation: Due Cards, All Cards, Create, Stats
  - Subject filter sidebar
  - Start session button
  - Progress overview
- [ ] Add route to app router: `/revision`
- [ ] Add navigation link to main nav

---

## Phase 7: Integration & Polish

### Task 7.1: Notes Integration
- [ ] Add "Generate Flashcards" button to NoteViewer
- [ ] Show linked flashcards on note detail
- [ ] Link from flashcard back to source note

### Task 7.2: Session Integration
- [ ] Update session data to track flashcards reviewed
- [ ] Record revision sessions for analytics

### Task 7.3: Parent Dashboard Integration
- [ ] Add revision progress widget to parent dashboard
- [ ] Per-child revision stats
- [ ] Review history visibility

---

## Phase 8: Testing

### Task 8.1: Backend Unit Tests
- [ ] `tests/services/test_spaced_repetition.py`:
  - SM-2 algorithm edge cases
  - Ease factor bounds
  - Interval calculations
  - Date calculations
- [ ] `tests/services/test_revision_service.py`:
  - CRUD operations
  - Ownership verification
  - Due card queries
  - Progress calculations
- [ ] `tests/services/test_flashcard_generation.py`:
  - Generation from note
  - Generation from outcome
  - Rate limiting
  - Quality validation

### Task 8.2: Backend Integration Tests
- [ ] `tests/api/test_flashcards.py`:
  - All CRUD endpoints
  - Authorization checks
  - Pagination
  - Filters
- [ ] `tests/api/test_revision.py`:
  - Session lifecycle
  - Answer submission
  - Progress endpoints

### Task 8.3: Frontend Unit Tests
- [ ] Flashcard component tests
- [ ] Session component tests
- [ ] Progress component tests
- [ ] Store action tests
- [ ] Hook tests

### Task 8.4: E2E Tests (Playwright)
- [ ] Complete revision flow:
  - Create flashcard manually
  - Generate flashcard from note
  - Start revision session
  - Answer cards
  - Complete session
  - View progress

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| SM-2 algorithm bugs | High | Comprehensive unit tests, reference implementation comparison |
| AI generation quality | Medium | Prompt engineering, quality validation, user approval step |
| Performance with many cards | Medium | Proper indexing, pagination, efficient queries |
| Cost of AI generation | Low | Use Haiku model, rate limiting, caching prompts |
| Parent data access | Medium | Ownership verification at service layer |

---

## Curriculum Considerations

- Flashcards link to `curriculum_outcomes` for gap analysis
- Subject-specific question styles in AI generation prompts:
  - Mathematics: step-by-step problem solving
  - English: text analysis, vocabulary
  - Science: hypothesis/observation format
  - HSIE: cause/effect, source analysis
- NSW outcome codes displayed on cards for reference
- Progress tracking per outcome enables targeted revision recommendations

---

## Privacy/Security Checklist

- [x] All flashcard queries filtered by student_id
- [x] Ownership verified on GET, PUT, DELETE operations
- [x] Parents can view but not modify children's flashcards
- [x] AI-generated content flagged (generated_by field)
- [x] No PII in AI prompts beyond necessary context
- [x] Session data minimised (no keystroke logging)
- [x] Review history retains only aggregate performance data

---

## Multi-Framework Considerations

- Subject IDs are framework-scoped (no cross-framework flashcards)
- Curriculum outcome IDs are framework-specific
- AI prompts should be parameterised for future frameworks:
  - NSW: "NSW curriculum outcome"
  - VIC: "Victorian curriculum achievement standard"
- Stage/pathway terminology in prompts should be configurable

---

## Offline Support Considerations (Future Phase 9)

- Flashcard data suitable for IndexedDB caching
- Offline review sessions possible with local SR state
- Sync review results when back online
- Prepare data model for offline-first architecture

---

## Implementation Order

1. **Database migrations** (013, 014) and models
2. **Spaced Repetition Service** (core algorithm)
3. **Revision Service** (CRUD, session management)
4. **Flashcard Generation Service** (AI integration)
5. **Pydantic schemas** (all request/response types)
6. **API endpoints** (flashcards, revision)
7. **Frontend store and hooks** (state management)
8. **FlashcardView component** (core UI)
9. **RevisionSession component** (session flow)
10. **FlashcardCreator component** (manual creation)
11. **GenerateFromNote component** (AI generation)
12. **Progress components** (stats display)
13. **RevisionPage** (main page)
14. **Integration** (notes, sessions, parent dashboard)
15. **Testing** (unit, integration, E2E)

---

## Agent Recommendations

| Task Area | Recommended Agent |
|-----------|-------------------|
| Database migrations | `database-architect` |
| SM-2 algorithm | `backend-architect` |
| Services | `backend-architect` |
| API endpoints | `backend-architect` |
| Frontend components | `frontend-developer` |
| AI prompts | `ai-tutor-engineer` |
| Testing | `testing-qa-specialist` |
| Security review | `security-auditor` |
| Full feature | `full-stack-developer` |

---

## Success Criteria

Phase 6 is complete when:

1. Students can create flashcards manually
2. Students can generate flashcards from notes using AI
3. SM-2 spaced repetition scheduling works correctly
4. Revision sessions function end-to-end
5. Progress tracking shows accurate mastery percentages
6. Due-for-review flashcards surface correctly
7. Parent dashboard shows revision progress per subject
8. All queries filter by student ownership
9. 80%+ test coverage on new code
10. Zero TypeScript/Python type errors
