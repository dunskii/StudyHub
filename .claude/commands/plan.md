# /plan <task>

Generate a detailed implementation plan with actionable todos for a feature or task.

## Instructions

Before creating the plan, use `/study` findings if available, or quickly research the task requirements.

### Plan Structure

Create a comprehensive implementation plan at `md/plan/$ARGUMENTS.md` with:

```markdown
# Implementation Plan: [Task]

## Overview
[Brief description of what we're building]

## Prerequisites
- [ ] [What must be done/exist first]

## Phase 1: Database
- [ ] Schema changes needed
- [ ] Migrations to create
- [ ] Seed data requirements
- [ ] Multi-framework considerations (curriculum_frameworks table)

## Phase 2: Backend API
- [ ] Endpoints to create/modify
- [ ] Pydantic schemas needed
- [ ] Service layer functions
- [ ] Authentication/authorization requirements

## Phase 3: AI Integration (if applicable)
- [ ] Claude prompts needed
- [ ] Subject-specific tutor configurations
- [ ] Model routing (Haiku vs Sonnet)
- [ ] Safety/moderation requirements

## Phase 4: Frontend Components
- [ ] Pages to create
- [ ] Components needed
- [ ] State management (Zustand stores)
- [ ] React Query hooks

## Phase 5: Integration
- [ ] API connections
- [ ] Error handling
- [ ] Loading states
- [ ] Offline support considerations

## Phase 6: Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Subject-specific test cases

## Phase 7: Documentation
- [ ] API documentation
- [ ] Component documentation
- [ ] User-facing help text

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| [Risk 1] | High/Med/Low | [How to handle] |

## Curriculum Considerations
[How this affects curriculum alignment, outcomes, subjects]

## Privacy/Security Checklist
- [ ] Student data protected
- [ ] Age-appropriate content
- [ ] Parent visibility without surveillance
- [ ] Framework-level data isolation

## Estimated Complexity
[Simple / Medium / Complex]

## Dependencies on Other Features
[What else needs to exist]
```

### Guidelines

1. **Always consider multi-framework**: NSW first, but design for VIC, QLD, etc.
2. **Subject awareness**: Does this feature behave differently per subject?
3. **Student safety**: Flag any AI interaction or data exposure
4. **Parent dashboard**: Does parent need visibility into this?
5. **Offline support**: Can this work offline via PWA?

### After Planning

1. Use TodoWrite to create actionable task list
2. Identify which specialized agent should handle implementation
3. Note any blockers or questions for the user
