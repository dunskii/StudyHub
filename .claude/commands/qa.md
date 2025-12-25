# /qa <feature>

Perform comprehensive quality assurance review of a feature or code area.

## Instructions

Conduct a thorough review of the specified feature covering all quality dimensions.

### Review Checklist

#### 1. Code Quality
- [ ] TypeScript strict mode compliance (frontend)
- [ ] Python type hints present (backend)
- [ ] No `any` types without justification
- [ ] Proper error handling
- [ ] Consistent naming conventions
- [ ] No dead code or commented-out blocks

#### 2. Security Review (CRITICAL for student data)
- [ ] Authentication required on protected routes
- [ ] Authorization checks for user roles (student, parent, admin)
- [ ] No student PII exposed inappropriately
- [ ] AI interactions logged for parent oversight
- [ ] Framework/school data isolation (if multi-tenant)
- [ ] Input validation with Zod/Pydantic
- [ ] No SQL injection vulnerabilities
- [ ] XSS prevention in place

#### 3. Privacy Compliance
- [ ] COPPA considerations for under-13 students
- [ ] Australian Privacy Act compliance
- [ ] Parent consent flows where required
- [ ] Data minimization (only collect what's needed)
- [ ] Right to deletion supported

#### 4. Curriculum Alignment
- [ ] Correct outcome code formats used
- [ ] Framework-aware (not hardcoded to NSW)
- [ ] Subject-specific logic where appropriate
- [ ] Stage/pathway logic correct

#### 5. AI Integration Review
- [ ] Appropriate model used (Haiku vs Sonnet)
- [ ] Subject-specific tutor style applied
- [ ] Age-appropriate language in prompts
- [ ] Safety flags for concerning content
- [ ] Cost tracking implemented
- [ ] Socratic method followed (not giving direct answers)

#### 6. Frontend Quality
- [ ] Responsive design (mobile-first)
- [ ] Accessibility (ARIA labels, semantic HTML)
- [ ] Loading states present
- [ ] Error states handled gracefully
- [ ] React Query used correctly
- [ ] No unnecessary re-renders

#### 7. Backend Quality
- [ ] Async operations used correctly
- [ ] Database queries optimized
- [ ] Proper HTTP status codes
- [ ] Consistent error response format
- [ ] Rate limiting where appropriate

#### 8. Test Coverage
- [ ] Unit tests for business logic
- [ ] Integration tests for API endpoints
- [ ] Component tests for UI
- [ ] Edge cases covered
- [ ] Subject-specific test cases

#### 9. Documentation
- [ ] API endpoints documented
- [ ] Complex functions have docstrings
- [ ] README updated if needed

### Output Format

Create a review document at `md/review/$ARGUMENTS.md` with:

```markdown
# Code Review: [Feature]

## Summary
[Overall assessment: PASS / NEEDS WORK / CRITICAL ISSUES]

## Security Findings
| Issue | Severity | Location | Recommendation |
|-------|----------|----------|----------------|

## Code Quality Issues
| Issue | Location | Recommendation |
|-------|----------|----------------|

## Curriculum/AI Considerations
[Any subject-specific or tutoring concerns]

## Test Coverage
- Current: X%
- Recommended additions: [list]

## Performance Concerns
[Any identified performance issues]

## Accessibility Issues
[Any a11y problems found]

## Recommendations
1. [Priority recommendation]
2. [Secondary recommendation]

## Files Reviewed
- [file1.py]
- [file2.tsx]
```

### Severity Levels
- **CRITICAL**: Security vulnerability, data exposure, must fix before merge
- **HIGH**: Significant bug or pattern violation, fix soon
- **MEDIUM**: Code quality issue, should fix
- **LOW**: Style or minor improvement, nice to have
