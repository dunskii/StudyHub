# Study: Phase 4 - AI Tutoring Foundation

## Summary

Phase 4 is the next critical development phase for StudyHub, focusing on integrating Claude AI as the Socratic tutor. This phase builds the foundation for intelligent, subject-specific AI tutoring aligned with the NSW curriculum. It includes the Claude service with model routing, 8 subject-specific tutor prompts, safety/moderation features, and the frontend chat interface.

**Status**: NOT STARTED (0% complete)
**Dependencies**: Phases 1, 2, 3 all COMPLETE
**Estimated Scope**: Significant (backend service, 8 prompt files, API endpoints, frontend chat UI)

---

## Key Requirements

### Core Features
- **Claude Service & Model Routing**: Route between Sonnet 4 (complex) and Haiku 3.5 (simple tasks)
- **Subject-Specific Tutor Styles**: 8 unique teaching approaches for each NSW subject
- **Socratic Method Enforcement**: NEVER give direct answers - always guide through questions
- **Age-Appropriate Language**: Adapt responses based on student's stage (Years K-12)
- **Safety & Moderation**: Flag concerning content, log all interactions for parent review
- **Cost Tracking**: Track token usage and estimate costs per interaction

### Tutor Styles by Subject

| Subject | Code | Tutor Style | Teaching Approach |
|---------|------|-------------|-------------------|
| Mathematics | MATH | `socratic_stepwise` | "What do we know? What are we finding? What method helps?" |
| English | ENG | `socratic_analytical` | "What is the author conveying? What evidence supports this?" |
| Science | SCI | `inquiry_based` | "What do you predict? How could we test this?" |
| HSIE | HSIE | `socratic_analytical` | "What bias might this source have? What perspectives are missing?" |
| PDHPE | PDHPE | `discussion_based` | "How might this apply to your life? What factors influence this?" |
| Technology | TAS | `project_based` | "What problem are you solving? What constraints exist?" |
| Creative Arts | CA | `creative_mentoring` | "What mood are you creating? What techniques enhance this?" |
| Languages | LANG | `immersive` | Scaffolded target language use with gentle correction |

### Age-Appropriate Language Adaptation

| Stage | Years | Response Style |
|-------|-------|----------------|
| Stage 2 | 3-4 | Simple words, short sentences, lots of encouragement |
| Stage 3 | 5-6 | Clear explanations, real-world examples |
| Stage 4 | 7-8 | More sophisticated vocabulary, challenge thinking |
| Stage 5 | 9-10 | Academic language, independent thinking |
| Stage 6 | 11-12 | HSC-level discourse, exam technique |

---

## Existing Patterns

### Database Schema (Already Created)

**Sessions Table** (Migration 010):
```python
sessions
├── id (UUID, PK)
├── student_id (FK → students, CASCADE)
├── subject_id (FK → subjects)
├── session_type (String) - "tutor_chat", "revision", "homework_help"
├── started_at (DateTime)
├── ended_at (DateTime, nullable)
├── duration_minutes (Integer)
├── xp_earned (Integer, default 0)
└── data (JSONB) - outcomes, questions attempted/correct
```

**AI Interactions Table** (Migration 011):
```python
ai_interactions
├── id (UUID, PK)
├── session_id (FK → sessions, CASCADE)
├── student_id (FK → students, CASCADE)
├── subject_id (FK → subjects)
├── user_message (Text)
├── ai_response (Text)
├── model_used (String) - "haiku-3.5" or "sonnet-4"
├── task_type (String) - "tutor_chat", "flashcard", "summary"
├── input_tokens, output_tokens (Integer)
├── estimated_cost_usd (Float)
├── curriculum_context (JSONB) - outcome code, stage, strand
├── created_at (DateTime)
├── flagged (Boolean), flag_reason (String)
└── reviewed_by (UUID, nullable)
```

### Existing Stubs
- `/backend/app/api/v1/endpoints/socratic.py` - Endpoints stubbed but not implemented
- `/backend/app/services/tutor_prompts/__init__.py` - Prompt directory exists
- `/backend/app/models/session.py` - Session model exists
- `/backend/app/models/ai_interaction.py` - AIInteraction model exists

### Framework Isolation Pattern
```python
# CRITICAL: Every curriculum query must include framework_id
outcomes = await db.execute(
    select(CurriculumOutcome)
    .where(CurriculumOutcome.framework_id == student.framework_id)
    .where(CurriculumOutcome.subject_id == subject_id)
)
```

---

## Technical Considerations

### Backend Requirements

**Claude Service** (`backend/app/services/claude_service.py`):
- Model Selection: Route based on task complexity
  - Haiku 3.5: Flashcards, summaries, simple Q&A
  - Sonnet 4: Socratic tutoring, curriculum alignment, essay feedback
- Token counting and cost estimation
- Safety checks and content flagging
- Curriculum context injection (NSW outcome codes)

**Cost Structure**:
| Model | Input Cost | Output Cost |
|-------|------------|-------------|
| Haiku 3.5 | $0.80/1M tokens | $4.00/1M tokens |
| Sonnet 4 | $3.00/1M tokens | $15.00/1M tokens |

**API Endpoints**:
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/tutor/chat` | POST | Send message to tutor |
| `/api/v1/tutor/history/{session_id}` | GET | Get conversation history |
| `/api/v1/tutor/flashcards` | POST | Generate flashcards |
| `/api/v1/tutor/summarise` | POST | Generate summary |
| `/api/v1/ai-interactions` | GET | Parent: view child's AI logs |

**Subject-Specific Prompt Files** (to create):
- `base_tutor.py` - Base system prompt template
- `maths_tutor.py` - Mathematics socratic_stepwise
- `english_tutor.py` - English socratic_analytical
- `science_tutor.py` - Science inquiry_based
- `hsie_tutor.py` - HSIE socratic_analytical
- `pdhpe_tutor.py` - PDHPE discussion_based
- `creative_arts_tutor.py` - Creative Arts creative_mentoring
- `languages_tutor.py` - Languages immersive

### Frontend Requirements

**Components** (`frontend/src/features/socratic-tutor/`):
- `TutorChat.tsx` - Main chat interface
- `ChatMessage.tsx` - Individual message component
- `ChatInput.tsx` - Input with subject/outcome context
- `SubjectContext.tsx` - Show current subject, outcome, stage
- `ConversationHistory.tsx` - View past conversations
- `TypingIndicator.tsx` - Loading state during AI response

**Hooks**:
- `useTutorChat()` - Manage chat state, send messages
- `useSessionManager()` - Create/manage tutoring sessions
- `useSubjectContext()` - Get current subject/stage info

**Routes**:
- `/tutor/:subjectCode` - Main tutor chat interface
- `/tutor/:subjectCode/history/:sessionId` - View past session
- `/tutor/dashboard` - All conversations overview

---

## Curriculum Alignment

### NSW Curriculum Integration
- Each subject has a unique tutor style aligned with pedagogical best practices
- Curriculum outcome codes (e.g., MA5.2-NA-01) passed to Claude for context
- Stage information used to adapt language complexity
- Pathway support for Stage 5 (5.1, 5.2, 5.3 for Mathematics)

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

## Security/Privacy Considerations

### Critical Requirements
1. **Socratic Method Enforcement**: AI must NEVER give direct answers
2. **All Interactions Logged**: Every message stored in `ai_interactions` table
3. **Parent Visibility**: Parents can view all their child's AI conversations
4. **Safety Flagging**: System flags concerning content for review:
   - Off-topic discussions
   - Concerning emotional content
   - Potential academic dishonesty
   - Self-harm or safety concerns
5. **Age-Appropriate Content**: Claude's built-in safety + custom system prompts
6. **Access Control**: Verify student ownership before creating sessions
7. **Input Validation**: Sanitize all user input before sending to Claude
8. **Rate Limiting**: Prevent abuse of AI endpoints

### Logging Requirements
```python
# Every AI interaction must log:
ai_interaction = AIInteraction(
    session_id=session.id,
    student_id=student.id,
    subject_id=subject.id,
    user_message=message,
    ai_response=response,
    model_used="sonnet-4",
    task_type="tutor_chat",
    input_tokens=usage.input_tokens,
    output_tokens=usage.output_tokens,
    estimated_cost_usd=cost,
    curriculum_context={"outcomeCode": "MA5.2-NA-01", "stage": "stage5"},
    flagged=is_flagged,
    flag_reason=flag_reason
)
```

---

## Dependencies

### Completed Prerequisites
- ✅ Phase 1: Foundation & Infrastructure (DB, auth, API structure)
- ✅ Phase 2: Core Curriculum System (NSW subjects, outcomes, stages)
- ✅ Phase 3: User System (users, students, student-subject enrolments)
- ✅ Sessions table migration (010)
- ✅ AI Interactions table migration (011)
- ✅ Socratic endpoints stubbed

### External Dependencies to Configure
1. **Anthropic API Key**: `ANTHROPIC_API_KEY` environment variable
2. **Anthropic SDK**: `pip install anthropic` in backend
3. Rate limiting already configured in Phase 1

---

## Open Questions

1. **Streaming vs. Full Response**: Should we implement streaming responses for the chat UI, or wait for full response? (Streaming provides better UX but more complex)

2. **Session Management**: When does a session end? Time-based, explicit end button, or inactivity timeout?

3. **Cost Limits**: Should there be daily/monthly token limits per student to prevent cost overruns?

4. **Conversation Context Window**: How many previous messages should be sent to Claude for context? (More context = better responses but higher cost)

5. **Fallback Handling**: What happens if Anthropic API is unavailable? Graceful error message or offline mode?

6. **Flashcard Storage**: Are generated flashcards stored for later review, or generated on-demand each time?

7. **Parent Notification**: Should parents be notified immediately when content is flagged, or via daily digest?

---

## Implementation Priorities

### Priority 1: Claude Service Setup
1. Install Anthropic SDK
2. Create `ClaudeService` with model routing logic
3. Implement cost tracking per interaction
4. Add AI interaction logging to database
5. Implement token counting

### Priority 2: Subject-Specific Prompts
1. Create base tutor prompt template
2. Implement 8 subject-specific prompt files
3. Dynamic prompt generation based on student context

### Priority 3: Safety & Moderation
1. Implement age-appropriate language filter
2. Add content moderation for concerning messages
3. Create parent visibility endpoints
4. Enforce Socratic method (no direct answers)

### Priority 4: Frontend Chat UI
1. Build TutorChat component
2. Build ChatMessage component
3. Build ChatInput component
4. Implement conversation history view
5. Add typing indicator

### Priority 5: Testing & QA
1. Run `ai-prompt-tester` skill
2. Run `subject-config-checker` skill
3. Security audit on AI endpoints
4. E2E test for chat flow

---

## Sources Referenced

- `CLAUDE.md` - Project configuration and standards
- `PROGRESS.md` - Development progress tracker (Phases 1-3 complete)
- `TASKLIST.md` - Phase 4 task breakdown
- `Complete_Development_Plan.md` - Technical specifications
- `studyhub_overview.md` - Product requirements
- `backend/app/models/session.py` - Session model
- `backend/app/models/ai_interaction.py` - AIInteraction model
- `backend/alembic/versions/010_sessions.py` - Sessions migration
- `backend/alembic/versions/011_ai_interactions.py` - AI interactions migration
- `backend/app/api/v1/endpoints/socratic.py` - Stubbed endpoints
- `backend/app/services/tutor_prompts/__init__.py` - Prompt directory

---

## Quality Assurance Checklist

Before Phase 4 is considered complete:

- [ ] Claude service with model routing working
- [ ] All 8 subject-specific prompts implemented
- [ ] Socratic method verified (never gives direct answers)
- [ ] Age-appropriate responses verified for all grade levels
- [ ] All AI interactions logged to database
- [ ] Cost tracking working (token counts accurate)
- [ ] Parent visibility endpoints working
- [ ] Safety flagging implemented
- [ ] Run `ai-prompt-tester` skill
- [ ] Run `subject-config-checker` skill
- [ ] Security audit on AI endpoints
- [ ] Backend tests passing (80%+ coverage)
- [ ] Frontend chat UI complete
- [ ] E2E test for chat flow
- [ ] Zero TypeScript/Python type errors
