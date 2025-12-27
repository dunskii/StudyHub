# Study: Phase 6 - Revision & Spaced Repetition

## Summary

Phase 6 implements a scientifically-backed spaced repetition system with AI-powered flashcard generation. This phase builds on the Notes & OCR system from Phase 5 to enable adaptive revision scheduling based on the SM-2 algorithm, allowing students to efficiently retain curriculum knowledge over time.

**Status**: Not Started (0% complete)
**Position**: Next phase after Phase 5 (Notes & OCR) - currently complete
**Dependencies**: Phases 1-5 must be complete
**Estimated Duration**: 2 weeks

## Key Requirements

### Core Features
1. **Flashcard Generation from Notes**
   - Auto-generate flashcards from OCR-extracted text and curriculum content
   - Support manual flashcard creation
   - Link flashcards to curriculum outcomes

2. **SM-2 Algorithm Implementation**
   - Spaced repetition scheduling with adaptive intervals
   - Ease factor adjustments based on performance (1.3-2.6 range)
   - Difficulty tracking and adjustment

3. **Revision Session UI**
   - Flashcard viewing with flip animation
   - Answer submission and correctness marking
   - Difficulty rating (1-5 scale)
   - Session timer and progress tracking

4. **Progress Tracking**
   - Track mastery of individual flashcards
   - Subject-based revision statistics
   - Cumulative learning progress with mastery percentages

5. **Subject-Based Revision**
   - Organize flashcards by subject and curriculum outcome
   - Filter by due date, difficulty, mastery level
   - Cross-subject review capabilities

## Existing Patterns

### Backend Patterns (from Phase 1-5)
- **Service Layer**: Business logic in service classes with dependency injection
- **Schema Validation**: Pydantic v2 models inheriting from BaseSchema
- **API Endpoints**: FastAPI routers with authentication via `get_current_user`
- **Async Operations**: Async/await throughout for database operations

### Frontend Patterns (from existing features)
- **React Query Hooks**: useQuery for GET, useMutation for POST/PUT/DELETE
- **Zustand State Management**: Feature-specific stores
- **Component Structure**: Feature folders with co-located tests

### AI Integration Patterns (from Phase 4)
- **Model Routing**: Claude Haiku 3.5 for simple tasks (flashcard generation)
- **Subject-Aware Responses**: tutor_prompts/ directory structure
- **AI Interaction Logging**: All AI responses logged for parent review

## Technical Considerations

### Database Schema

#### New Table: `flashcards`
```sql
CREATE TABLE flashcards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    curriculum_outcome_id UUID REFERENCES curriculum_outcomes(id),
    subject_id UUID REFERENCES subjects(id),
    front TEXT NOT NULL,              -- Question/prompt
    back TEXT NOT NULL,               -- Answer
    context_note_id UUID REFERENCES notes(id),
    generated_by VARCHAR(20),         -- 'user', 'ai', 'system'
    generation_model VARCHAR(50),     -- e.g., 'claude-haiku'
    review_count INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    mastery_percent INTEGER DEFAULT 0,
    tags VARCHAR[],
    difficulty_level INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### New Table: `revision_history`
```sql
CREATE TABLE revision_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    flashcard_id UUID REFERENCES flashcards(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    item_type VARCHAR(20),            -- 'flashcard', 'quiz', 'practice'
    sr_interval INTEGER DEFAULT 1,     -- Days until next review
    sr_ease_factor FLOAT DEFAULT 2.5,  -- SM-2 ease factor
    sr_next_review TIMESTAMPTZ,
    sr_previous_interval INTEGER DEFAULT 0,
    was_correct BOOLEAN NOT NULL,
    score_percent INTEGER,
    response_time_seconds INTEGER,
    difficulty_rating INTEGER,         -- 1-5 user rating
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/flashcards` | Create new flashcard |
| GET | `/api/v1/flashcards` | List flashcards (with filters) |
| GET | `/api/v1/flashcards/{id}` | Get single flashcard |
| PUT | `/api/v1/flashcards/{id}` | Update flashcard content |
| DELETE | `/api/v1/flashcards/{id}` | Delete flashcard |
| POST | `/api/v1/flashcards/generate` | Generate from note/outcome |
| POST | `/api/v1/revision/session` | Start new revision session |
| GET | `/api/v1/revision/session/{id}` | Get session details |
| POST | `/api/v1/revision/answer` | Submit flashcard answer |
| PUT | `/api/v1/revision/session/{id}/complete` | End session |
| GET | `/api/v1/revision/due` | Get due-for-review flashcards |
| GET | `/api/v1/revision/progress` | Overall revision progress |
| GET | `/api/v1/revision/progress/by-subject` | Progress per subject |
| GET | `/api/v1/revision/stats` | Mastery statistics |

### Backend Services

1. **RevisionService** (`backend/app/services/revision_service.py`)
   - CRUD operations for flashcards
   - Session lifecycle management
   - Query for due cards
   - Progress calculation

2. **SpacedRepetitionService** (`backend/app/services/spaced_repetition.py`)
   - SM-2 algorithm implementation
   - Calculate next review interval based on performance
   - Determine ease factor adjustments

3. **FlashcardGenerationService** (`backend/app/services/flashcard_generation.py`)
   - AI-powered flashcard generation using Claude Haiku
   - Extract key concepts from notes
   - Link to curriculum outcomes

### Frontend Components

| Component | Purpose |
|-----------|---------|
| `RevisionSession.tsx` | Main revision session container |
| `FlashcardView.tsx` | Flashcard display with flip animation |
| `FlashcardList.tsx` | Grid/list of flashcards with filters |
| `FlashcardCreator.tsx` | Manual flashcard creation form |
| `GenerateFromNote.tsx` | AI flashcard generation UI |
| `RevisionProgress.tsx` | Overall progress dashboard |
| `RevisionStats.tsx` | Historical statistics and charts |

### State Management

**revisionStore.ts** (Zustand):
- Current session and card tracking
- Session answers and score
- UI state (showAnswer, isLoading)
- Actions for session lifecycle

**useRevision.ts** (React Query hooks):
- useFlashcardsDue, useRevisionProgress
- useGenerateFlashcards, useFlashcardMastery
- useStartRevisionSession

## Curriculum Alignment

- Flashcards link to `curriculum_outcomes` table
- Subject-specific organization matches existing subject structure
- Outcome codes (e.g., MA3-RN-01) displayed on flashcards
- Progress tracking per curriculum outcome enables:
  - Gap analysis for parent dashboard
  - Targeted revision recommendations
  - Alignment with NSW syllabus requirements

## Security/Privacy Considerations

### Ownership Verification
- Students can only access their own flashcards
- All endpoints verify `student_id` ownership
- Parents can view (but not modify) their children's flashcards

### Data Minimization
- Store only correctness and score, not response text
- No keystroke logging or detailed interaction tracking
- Aggregate statistics only for analytics

### Parent Visibility
- Parent dashboard shows revision progress per subject
- Review history visible for parent oversight
- AI-generated content flagged and reviewable by parents

### AI Content Safety
- AI-generated flashcards flagged as such (`generated_by: 'ai'`)
- Quality validation before presentation to students
- Parent option to review AI-generated content

## Dependencies

### Prerequisites (All Complete)
- Phase 1: Production-ready foundation ✓
- Phase 2: Core Curriculum System ✓
- Phase 3: User System & Authentication ✓
- Phase 4: AI Tutoring ✓
- Phase 5: Notes & OCR ✓

### Technical Dependencies
- No new Python packages required
- Claude API already integrated
- All required frontend packages already installed

## Cost Considerations

| Service | Cost | Notes |
|---------|------|-------|
| Claude Haiku (flashcard generation) | $0.80/$4.00 per 1M tokens | Budget ~$10/month for 100 users |
| Database storage (flashcard tables) | Included in DO managed PostgreSQL | ~$1-2/month additional |
| **Total Additional Cost** | **~$10-12/month** | Minimal impact |

## Files to Create

### Backend
- `backend/app/models/flashcard.py`
- `backend/app/models/revision_history.py`
- `backend/app/schemas/flashcard.py`
- `backend/app/schemas/revision.py`
- `backend/app/services/revision_service.py`
- `backend/app/services/spaced_repetition.py`
- `backend/app/services/flashcard_generation.py`
- `backend/app/api/v1/endpoints/revision.py`
- `backend/alembic/versions/013_flashcards.py`
- `backend/tests/services/test_spaced_repetition.py`
- `backend/tests/services/test_flashcard_generation.py`

### Frontend
- `frontend/src/features/revision/` (new feature folder)
  - `RevisionSession.tsx`
  - `FlashcardView.tsx`
  - `FlashcardList.tsx`
  - `FlashcardCreator.tsx`
  - `GenerateFromNote.tsx`
  - `RevisionProgress.tsx`
  - `RevisionStats.tsx`
- `frontend/src/stores/revisionStore.ts`
- `frontend/src/hooks/useRevision.ts`
- `frontend/src/lib/api/revision.ts`
- `frontend/src/pages/RevisionPage.tsx`

## SM-2 Algorithm Reference

```python
# On successful review (grade >= 3):
EF' = EF + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
EF' = max(1.3, EF')  # Minimum ease factor
interval = previous_interval * EF

# On failed review (grade < 3):
interval = 1  # Reset to 1 day
EF' = EF + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
EF' = max(1.3, EF')

# Where:
# - grade: 0-5 (0-2 = fail, 3-5 = pass)
# - EF: ease factor (starting at 2.5, minimum 1.3)
# - interval: days until next review
```

## Success Criteria

Phase 6 is complete when:

1. ✅ Students can create flashcards (manual and AI-generated)
2. ✅ Spaced repetition schedule calculates correctly per SM-2
3. ✅ Revision sessions work end-to-end
4. ✅ Progress tracking shows mastery percentages
5. ✅ Parent dashboard shows revision progress per subject
6. ✅ Due-for-review flashcards surface correctly
7. ✅ All flashcard queries filter by student ownership
8. ✅ 80%+ test coverage on new code
9. ✅ Zero TypeScript/Python type errors
10. ✅ AI-generated flashcards are high quality and curriculum-aligned

## Open Questions

1. **Flashcard Limits**: Should there be a maximum number of flashcards per student/subject?
2. **AI Generation Limits**: Rate limiting for AI-generated flashcards to control costs?
3. **Review Reminders**: Push notifications for due flashcards (future phase)?
4. **Gamification**: Integration with rewards system (Phase 7)?
5. **Collaborative Flashcards**: Shared flashcard decks between students (future consideration)?

## Sources Referenced

- `PROGRESS.md` - Current project status
- `TASKLIST.md` - Sprint tasks
- `CLAUDE.md` - Project configuration and patterns
- `Complete_Development_Plan.md` - Technical specifications
- `studyhub_overview.md` - Feature requirements
- `backend/app/services/claude_service.py` - Existing AI integration
- `backend/app/models/` - Existing database models
- `frontend/src/features/` - Existing feature patterns
