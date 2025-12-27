# Implementation Plan: Phase 4 - AI Tutoring Foundation

## Overview

Build the AI tutoring foundation using Claude as the Socratic tutor. This phase integrates Anthropic's Claude API with subject-specific teaching approaches, safety/moderation features, and a chat interface. The tutor will guide students through questions rather than giving direct answers, adapting to each subject's pedagogical approach and the student's age level.

**Key Deliverables:**
1. Claude service with model routing (Sonnet 4 / Haiku 3.5)
2. 8 subject-specific tutor prompts
3. Safety & moderation system with parent visibility
4. Backend API endpoints for tutoring
5. Frontend chat interface

---

## Prerequisites

- [x] Phase 1: Foundation & Infrastructure complete
- [x] Phase 2: Core Curriculum System complete (subjects, outcomes, stages)
- [x] Phase 3: User System complete (users, students, enrolments)
- [x] Sessions table migration (010) exists
- [x] AI Interactions table migration (011) exists
- [x] Session and AIInteraction models exist
- [x] Socratic endpoint stubs exist
- [ ] **ACTION REQUIRED**: Configure `ANTHROPIC_API_KEY` environment variable
- [ ] **ACTION REQUIRED**: Install `anthropic` Python package

---

## Phase 4.1: Backend - Claude Service Setup

### 4.1.1 Install Dependencies
- [ ] Add `anthropic` to `requirements.txt`
- [ ] Add `tiktoken` for token counting (optional, or use Anthropic's built-in)

### 4.1.2 Create Claude Service (`backend/app/services/claude_service.py`)
- [ ] Create `ClaudeService` class with async methods
- [ ] Implement model routing logic:
  ```python
  # Simple tasks → Haiku 3.5 (flashcards, summaries, simple Q&A)
  # Complex tasks → Sonnet 4 (tutoring, curriculum alignment, essay feedback)
  ```
- [ ] Implement `chat()` method for Socratic tutoring
- [ ] Implement `generate_flashcards()` method
- [ ] Implement `summarise_text()` method
- [ ] Add token counting for input/output
- [ ] Implement cost estimation:
  - Haiku: $0.80 input / $4.00 output per 1M tokens
  - Sonnet: $3.00 input / $15.00 output per 1M tokens
- [ ] Add retry logic with exponential backoff
- [ ] Handle API errors gracefully

### 4.1.3 Create Session Service (`backend/app/services/session_service.py`)
- [ ] Create `SessionService` class
- [ ] Implement `create_session()` - start new tutoring session
- [ ] Implement `end_session()` - close session, calculate duration
- [ ] Implement `get_session()` - retrieve session by ID
- [ ] Implement `get_student_sessions()` - list sessions for student
- [ ] Implement `update_session_data()` - update XP, outcomes, etc.
- [ ] Verify student ownership on all operations

### 4.1.4 Create AI Interaction Service (`backend/app/services/ai_interaction_service.py`)
- [ ] Create `AIInteractionService` class
- [ ] Implement `log_interaction()` - save every AI exchange
- [ ] Implement `get_session_interactions()` - get chat history
- [ ] Implement `get_student_interactions()` - for parent review
- [ ] Implement `flag_interaction()` - mark concerning content
- [ ] Implement `get_flagged_interactions()` - for parent/admin review

---

## Phase 4.2: Backend - Subject-Specific Tutor Prompts

### 4.2.1 Create Base Tutor Prompt (`backend/app/services/tutor_prompts/base_tutor.py`)
- [ ] Define base system prompt template with:
  - Socratic method enforcement (NEVER give direct answers)
  - Age-appropriate language guidelines per stage
  - Safety boundaries (no violence, self-harm, inappropriate content)
  - Curriculum context injection point
  - Australian English and context

### 4.2.2 Subject-Specific Prompts
Each file in `backend/app/services/tutor_prompts/`:

- [ ] **`maths_tutor.py`** - `socratic_stepwise` style
  - "What do we know? What are we finding? What method helps?"
  - Step-by-step problem decomposition
  - Never calculate for students

- [ ] **`english_tutor.py`** - `socratic_analytical` style
  - "What is the author conveying? What evidence supports this?"
  - Text analysis through questioning
  - Guide essay structure, don't write for them

- [ ] **`science_tutor.py`** - `inquiry_based` style
  - "What do you predict? How could we test this?"
  - Hypothesis-driven exploration
  - Scientific method reinforcement

- [ ] **`hsie_tutor.py`** - `socratic_analytical` style
  - "What bias might this source have? What perspectives are missing?"
  - Source analysis and critical thinking
  - Multiple perspectives exploration

- [ ] **`pdhpe_tutor.py`** - `discussion_based` style
  - "How might this apply to your life? What factors influence this?"
  - Personal reflection prompts
  - Health and wellbeing sensitivity

- [ ] **`tas_tutor.py`** - `project_based` style
  - "What problem are you solving? What constraints exist?"
  - Design thinking approach
  - Iterative improvement guidance

- [ ] **`creative_arts_tutor.py`** - `creative_mentoring` style
  - "What mood are you creating? What techniques enhance this?"
  - Encourage experimentation
  - Constructive feedback framing

- [ ] **`languages_tutor.py`** - `immersive` style
  - Scaffolded target language use
  - Gentle correction with encouragement
  - Cultural context integration

### 4.2.3 Prompt Factory (`backend/app/services/tutor_prompts/prompt_factory.py`)
- [ ] Create `TutorPromptFactory` class
- [ ] Implement `get_prompt_for_subject()` - returns appropriate prompt
- [ ] Implement `build_system_prompt()` - combines base + subject + context
- [ ] Accept student stage, subject, outcome code as parameters
- [ ] Inject curriculum context (outcome description, strand)

---

## Phase 4.3: Backend - Safety & Moderation

### 4.3.1 Content Moderation (`backend/app/services/moderation_service.py`)
- [ ] Create `ModerationService` class
- [ ] Implement `check_student_message()` - pre-check student input
- [ ] Implement `check_ai_response()` - verify AI response safety
- [ ] Implement `should_flag()` - detect concerning patterns:
  - Off-topic conversations
  - Emotional distress signals
  - Requests to cheat/plagiarise
  - Self-harm or safety concerns
- [ ] Implement `get_flag_reason()` - categorise flag type
- [ ] Log all flagged interactions for parent/admin review

### 4.3.2 Age-Appropriate Filter
- [ ] Implement stage-based vocabulary checking (in base prompt)
- [ ] Validate response complexity matches student stage
- [ ] Ensure encouragement level appropriate for age

### 4.3.3 Socratic Method Validator
- [ ] Create heuristic to detect if Claude gave a direct answer
- [ ] Re-prompt if direct answer detected (with instruction to guide instead)
- [ ] Log instances for prompt improvement

---

## Phase 4.4: Backend - Pydantic Schemas

### 4.4.1 Session Schemas (`backend/app/schemas/session.py`)
- [ ] `SessionCreate` - start session request
- [ ] `SessionUpdate` - update session data
- [ ] `SessionResponse` - session details
- [ ] `SessionListResponse` - paginated session list

### 4.4.2 AI Interaction Schemas (`backend/app/schemas/ai_interaction.py`)
- [ ] `ChatRequest` - send message to tutor
- [ ] `ChatResponse` - tutor response with metadata
- [ ] `FlashcardRequest` - generate flashcards
- [ ] `FlashcardResponse` - list of flashcards
- [ ] `SummariseRequest` - summarise text
- [ ] `SummariseResponse` - summary result
- [ ] `AIInteractionResponse` - single interaction
- [ ] `AIInteractionListResponse` - paginated list (for parent view)

---

## Phase 4.5: Backend - API Endpoints

### 4.5.1 Session Endpoints (`backend/app/api/v1/endpoints/sessions.py`)
- [ ] `POST /api/v1/sessions` - start new session
- [ ] `GET /api/v1/sessions/{id}` - get session details
- [ ] `PUT /api/v1/sessions/{id}` - update session (end, add XP)
- [ ] `GET /api/v1/students/{student_id}/sessions` - list student sessions
- [ ] Add ownership verification on all endpoints

### 4.5.2 Tutor Endpoints (`backend/app/api/v1/endpoints/socratic.py`)
- [ ] `POST /api/v1/tutor/chat` - send message, get Socratic response
  - Validate session ownership
  - Build subject-specific prompt
  - Call Claude API
  - Log interaction
  - Track tokens and cost
  - Return response with metadata
- [ ] `GET /api/v1/tutor/history/{session_id}` - get conversation history
- [ ] `POST /api/v1/tutor/flashcards` - generate flashcards from text
  - Use Haiku for cost efficiency
- [ ] `POST /api/v1/tutor/summarise` - summarise provided text
  - Use Haiku for cost efficiency

### 4.5.3 Parent Endpoints (`backend/app/api/v1/endpoints/parent.py`)
- [ ] `GET /api/v1/parent/children/{id}/ai-interactions` - view child's AI logs
  - Verify parent-child relationship
  - Include flagged_count in response
- [ ] `GET /api/v1/parent/children/{id}/ai-interactions/flagged` - view only flagged
- [ ] `POST /api/v1/parent/children/{id}/ai-interactions/{interaction_id}/review` - mark as reviewed

---

## Phase 4.6: Frontend - State Management

### 4.6.1 Tutor Store (`frontend/src/stores/tutorStore.ts`)
- [ ] Create Zustand store for tutor state
- [ ] Track current session ID
- [ ] Track current subject/outcome context
- [ ] Store message history (for optimistic updates)
- [ ] Track loading/error states

### 4.6.2 API Hooks (`frontend/src/hooks/useTutor.ts`)
- [ ] `useTutorChat()` - send message mutation
- [ ] `useChatHistory()` - fetch conversation history
- [ ] `useSession()` - manage session lifecycle
- [ ] `useFlashcards()` - generate flashcards mutation
- [ ] `useSummarise()` - summarise text mutation

---

## Phase 4.7: Frontend - Chat Components

### 4.7.1 Core Chat Components (`frontend/src/features/socratic-tutor/`)
- [ ] **`TutorChat.tsx`** - Main chat container
  - Message list display
  - Input area
  - Subject context header
  - Session management
  - Auto-scroll to latest message

- [ ] **`ChatMessage.tsx`** - Individual message bubble
  - User vs AI styling
  - Timestamp display
  - Loading state for AI responses
  - Markdown rendering for AI responses

- [ ] **`ChatInput.tsx`** - Message input area
  - Text input with character limit
  - Send button with loading state
  - Disabled when waiting for AI response
  - Enter to send, Shift+Enter for newline

- [ ] **`SubjectContext.tsx`** - Context display header
  - Current subject icon and name
  - Current outcome code (if selected)
  - Stage indicator
  - Session timer

- [ ] **`TypingIndicator.tsx`** - AI "thinking" animation
  - Animated dots or similar
  - "Tutor is thinking..." text

- [ ] **`ConversationHistory.tsx`** - Past sessions list
  - Session cards with date, subject, duration
  - Click to view full conversation
  - Filter by subject

### 4.7.2 Error & Empty States
- [ ] **`TutorError.tsx`** - Error state for API failures
  - Friendly error message
  - Retry button
  - Contact support option

- [ ] **`EmptyChat.tsx`** - Empty state for new sessions
  - Welcome message
  - Suggested prompts per subject
  - How to use tips

---

## Phase 4.8: Frontend - Routes & Pages

### 4.8.1 Tutor Routes (`frontend/src/routes/tutor.tsx`)
- [ ] `/tutor` - Subject selection (redirect or grid)
- [ ] `/tutor/:subjectCode` - Main chat interface
- [ ] `/tutor/:subjectCode/history` - Session history list
- [ ] `/tutor/:subjectCode/history/:sessionId` - View past session
- [ ] Add route guards (AuthGuard)

### 4.8.2 Navigation Integration
- [ ] Add "Tutor" link to main navigation
- [ ] Add tutor shortcut on subject cards
- [ ] Deep link from curriculum outcomes to tutor with context

---

## Phase 4.9: Testing

### 4.9.1 Backend Tests
- [ ] `test_claude_service.py`
  - Mock Anthropic API responses
  - Test model routing logic
  - Test cost calculation
  - Test error handling
- [ ] `test_session_service.py`
  - Test session CRUD
  - Test ownership verification
  - Test duration calculation
- [ ] `test_ai_interaction_service.py`
  - Test interaction logging
  - Test flagging logic
- [ ] `test_moderation_service.py`
  - Test concerning content detection
  - Test flag categorisation
- [ ] `test_tutor_prompts.py`
  - Test prompt generation for each subject
  - Test age-appropriate language adaptation
- [ ] `test_socratic_endpoints.py`
  - Test chat endpoint
  - Test history endpoint
  - Test flashcard generation
  - Test authorization

### 4.9.2 Frontend Tests
- [ ] `TutorChat.test.tsx`
- [ ] `ChatMessage.test.tsx`
- [ ] `ChatInput.test.tsx`
- [ ] `SubjectContext.test.tsx`
- [ ] `useTutor.test.ts` hooks tests
- [ ] `tutorStore.test.ts` store tests

### 4.9.3 E2E Tests (Playwright)
- [ ] Complete chat flow: select subject → send message → receive response
- [ ] Session history viewing
- [ ] Error handling for API failures

---

## Phase 4.10: Quality Assurance

### 4.10.1 Validation Skills
- [ ] Run `ai-prompt-tester` skill - verify Socratic method
- [ ] Run `subject-config-checker` skill - validate tutor styles

### 4.10.2 Security Checklist
- [ ] All endpoints require authentication
- [ ] Student can only access own sessions
- [ ] Parent can only access their children's data
- [ ] Input sanitized before sending to Claude
- [ ] Rate limiting on AI endpoints (prevent abuse)
- [ ] No sensitive data logged (beyond what's needed)

### 4.10.3 Privacy Checklist
- [ ] All AI interactions logged to database
- [ ] Parent visibility endpoint working
- [ ] Flagging system functional
- [ ] Data export includes AI interactions

### 4.10.4 Performance Checklist
- [ ] Response time < 5s for chat (acceptable for AI)
- [ ] Typing indicator shows immediately
- [ ] Chat history loads quickly (paginated)
- [ ] Token counts accurate for cost tracking

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Claude gives direct answers despite prompts | High | Medium | Socratic validator, prompt refinement, monitoring |
| API costs exceed budget | Medium | Medium | Model routing (use Haiku), token limits, cost alerts |
| Anthropic API downtime | High | Low | Graceful error handling, retry logic, user-friendly error messages |
| Inappropriate content in AI responses | High | Low | Claude's built-in safety, moderation layer, parent review |
| Slow response times | Medium | Medium | Use streaming (future), typing indicator, optimize prompts |
| Student bypass attempts (jailbreaking) | Medium | Medium | Strong system prompts, logging, pattern detection |

---

## Curriculum Considerations

- Each subject has a unique tutor style aligned with NSW curriculum pedagogy
- Curriculum outcome codes passed to Claude for contextual tutoring
- Stage information adapts language complexity
- Pathway support for Stage 5 (5.1, 5.2, 5.3)
- Framework isolation enforced (NSW first, extensible to others)
- Australian context and spelling in all responses

---

## Privacy/Security Checklist

- [x] Database schema supports logging (ai_interactions table exists)
- [ ] All AI conversations logged for parent review
- [ ] Parent can view their child's AI interactions (not surveillance, oversight)
- [ ] Flagged interactions highlighted for parent attention
- [ ] Student data protected (ownership verification)
- [ ] Age-appropriate content enforced
- [ ] Framework-level data isolation maintained
- [ ] No direct answers given (Socratic method)

---

## Estimated Complexity

**Complex** - This phase involves:
- External API integration (Anthropic Claude)
- 8 unique tutor prompt files
- Multiple services (Claude, Session, AIInteraction, Moderation)
- Full chat UI with real-time feel
- Safety and moderation systems
- Parent visibility features

---

## Dependencies on Other Features

**Required (Complete):**
- User authentication (Phase 3)
- Student management (Phase 3)
- Subject system (Phase 2)
- Curriculum outcomes (Phase 2)
- Session and AIInteraction database tables (Phase 1)

**Optional Enhancement:**
- Notes system (Phase 5) - could feed context to tutor
- Revision system (Phase 6) - flashcard generation ties in
- Parent dashboard (Phase 7) - AI interaction review

---

## Implementation Order

1. **Week 1: Backend Core**
   - Install dependencies
   - Claude service with model routing
   - Session service
   - AI interaction service
   - Base tutor prompt + all 8 subject prompts
   - Moderation service

2. **Week 2: Backend API + Frontend Start**
   - Pydantic schemas
   - API endpoints (sessions, tutor, parent)
   - Backend tests
   - Frontend store and hooks
   - Start chat components

3. **Week 3: Frontend Complete + QA**
   - Complete all chat components
   - Routes and navigation
   - Frontend tests
   - E2E tests
   - QA review with validation skills
   - Security audit
   - Documentation

---

## Open Questions (To Clarify)

1. **Streaming**: Should we implement streaming responses for better UX, or start with full responses?
   - *Recommendation*: Start with full responses, add streaming in future iteration

2. **Session timeout**: How long before a session auto-ends?
   - *Recommendation*: 30 minutes of inactivity

3. **Daily token limits**: Should we limit tokens per student per day?
   - *Recommendation*: Yes, configurable limit (e.g., 10,000 tokens/day)

4. **Conversation context**: How many previous messages to send to Claude?
   - *Recommendation*: Last 10 messages or 2,000 tokens, whichever is less

5. **Flashcard storage**: Save generated flashcards or regenerate each time?
   - *Recommendation*: Save to database (Phase 6 revision system will use them)

---

## Files to Create

### Backend (New Files)
```
backend/app/services/claude_service.py
backend/app/services/session_service.py
backend/app/services/ai_interaction_service.py
backend/app/services/moderation_service.py
backend/app/services/tutor_prompts/base_tutor.py
backend/app/services/tutor_prompts/maths_tutor.py
backend/app/services/tutor_prompts/english_tutor.py
backend/app/services/tutor_prompts/science_tutor.py
backend/app/services/tutor_prompts/hsie_tutor.py
backend/app/services/tutor_prompts/pdhpe_tutor.py
backend/app/services/tutor_prompts/tas_tutor.py
backend/app/services/tutor_prompts/creative_arts_tutor.py
backend/app/services/tutor_prompts/languages_tutor.py
backend/app/services/tutor_prompts/prompt_factory.py
backend/app/schemas/session.py
backend/app/schemas/ai_interaction.py
backend/app/api/v1/endpoints/sessions.py
backend/app/api/v1/endpoints/parent.py (or extend users.py)
backend/tests/services/test_claude_service.py
backend/tests/services/test_session_service.py
backend/tests/services/test_ai_interaction_service.py
backend/tests/services/test_moderation_service.py
backend/tests/services/test_tutor_prompts.py
backend/tests/api/test_socratic.py
backend/tests/api/test_sessions.py
```

### Frontend (New Files)
```
frontend/src/features/socratic-tutor/TutorChat.tsx
frontend/src/features/socratic-tutor/TutorChat.test.tsx
frontend/src/features/socratic-tutor/ChatMessage.tsx
frontend/src/features/socratic-tutor/ChatMessage.test.tsx
frontend/src/features/socratic-tutor/ChatInput.tsx
frontend/src/features/socratic-tutor/ChatInput.test.tsx
frontend/src/features/socratic-tutor/SubjectContext.tsx
frontend/src/features/socratic-tutor/SubjectContext.test.tsx
frontend/src/features/socratic-tutor/TypingIndicator.tsx
frontend/src/features/socratic-tutor/ConversationHistory.tsx
frontend/src/features/socratic-tutor/TutorError.tsx
frontend/src/features/socratic-tutor/EmptyChat.tsx
frontend/src/features/socratic-tutor/index.ts
frontend/src/stores/tutorStore.ts
frontend/src/stores/tutorStore.test.ts
frontend/src/hooks/useTutor.ts
frontend/src/hooks/useTutor.test.ts
frontend/src/routes/tutor.tsx
```

### Backend (Modify)
```
backend/requirements.txt (add anthropic)
backend/app/api/v1/endpoints/socratic.py (implement stubs)
backend/app/api/v1/router.py (add session routes)
backend/app/core/config.py (add ANTHROPIC_API_KEY)
backend/app/schemas/__init__.py (export new schemas)
```

### Frontend (Modify)
```
frontend/src/lib/api/endpoints.ts (add tutor endpoints)
frontend/src/routes/index.tsx (add tutor routes)
frontend/src/components/shared/Navigation.tsx (add tutor link)
```

---

## Success Criteria

Phase 4 is complete when:

1. ✅ Student can start a tutoring session for any subject
2. ✅ Student can send messages and receive Socratic responses
3. ✅ AI never gives direct answers (Socratic method verified)
4. ✅ Responses are age-appropriate for student's stage
5. ✅ All AI interactions logged to database
6. ✅ Parent can view their child's AI conversations
7. ✅ Flagged interactions visible to parents
8. ✅ Cost tracking working (tokens and USD)
9. ✅ 80%+ test coverage on new code
10. ✅ Zero TypeScript/Python type errors
11. ✅ Security audit passes
12. ✅ `ai-prompt-tester` skill passes
13. ✅ `subject-config-checker` skill passes
