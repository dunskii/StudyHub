# Study: Phase 10 - Testing & Launch

## Summary

Phase 10 is the **pre-production and launch preparation phase** for StudyHub. It validates that all 9 completed phases work together reliably, securely, and performantly before release to real users. This is especially critical given StudyHub handles children's educational data.

**Status**: NOT STARTED (0% complete)
**Dependencies**: All previous phases (1-9) must be complete ✅
**Estimated Duration**: 3-4 weeks

---

## Key Requirements

### 1. Testing (High Priority)
- **Unit Test Coverage**: Achieve and maintain > 80% code coverage
  - Backend: pytest with asyncio support (target 90%+ on business logic)
  - Frontend: Vitest + React Testing Library (target 80%+ on components)
  - Current: 523+ frontend tests, 600+ backend tests

- **Integration Tests**: All API endpoints
  - Request/response contract validation
  - Error handling verification
  - Data validation testing

- **E2E Tests**: Critical user paths via Playwright
  - Student onboarding flow
  - Subject selection and pathway assignment
  - Socratic tutor conversation
  - Note upload and OCR processing
  - Revision session workflow
  - Parent dashboard access and navigation
  - Gamification progress tracking
  - Offline content access
  - Push notification handling

### 2. Security Audit (Critical)
- Authentication tests (login, refresh, lockout)
- Authorization tests (access control, ownership verification)
- Injection attack prevention (SQL, XSS, CSRF)
- Rate limiting enforcement
- AI safety validation (Socratic method, content flagging)

### 3. Privacy Compliance (Critical)
- Australian Privacy Act compliance verification
- Parental consent flows for under-15s
- Data minimization audit
- Right to deletion implementation
- Data export functionality (GDPR/Privacy Act)

### 4. Performance Optimization (Medium Priority)
- Lighthouse score 90+ (desktop and mobile)
- API response times < 500ms (p95)
- Database query optimization
- PWA offline performance validation

### 5. Beta Testing (High Priority)
- 20-50 beta testers (diverse students Years 3-12, parents)
- Complete user journey testing
- Device/browser compatibility
- Accessibility testing
- Load testing (100+ concurrent users)

### 6. Production Deployment (High Priority)
- Digital Ocean App Platform setup
- CI/CD via GitHub Actions
- Monitoring & observability (Sentry, Plausible)
- Rollback procedures documented

---

## Existing Patterns

### Current Test Infrastructure

**Backend Testing Stack**:
```python
# pytest with asyncio support
# Located in: backend/tests/

# Fixtures pattern from Phase 8
@pytest_asyncio.fixture
async def test_student(db_session):
    """Create test student with gamification profile."""
    ...

# API testing with httpx
async def test_endpoint(client: AsyncClient, test_student):
    response = await client.get(f"/api/v1/endpoint/{id}")
    assert response.status_code == 200
```

**Frontend Testing Stack**:
```typescript
// Vitest + React Testing Library
// Located in: frontend/src/**/*.test.tsx

// Component testing pattern
describe('Component', () => {
  it('renders correctly', () => {
    render(<Component />);
    expect(screen.getByText('...')).toBeInTheDocument();
  });
});

// MSW for API mocking
import { setupServer } from 'msw/node';
```

**E2E Testing (To Be Implemented)**:
```typescript
// Playwright tests in: frontend/e2e/
import { test, expect } from '@playwright/test';

test('student onboarding flow', async ({ page }) => {
  await page.goto('/onboarding');
  // ...
});
```

### Test Count by Phase

| Phase | Backend Tests | Frontend Tests |
|-------|---------------|----------------|
| 1 | 24 | - |
| 2 | 118 | - |
| 3 | 236 | - |
| 6 | 300 | - |
| 7 | 76 | 83 |
| 8 | 88 | 57 |
| 9 | 36 | 74 |
| **Total** | **600+** | **523+** |

---

## Technical Considerations

### Testing Tools

| Purpose | Tool | Notes |
|---------|------|-------|
| Backend Unit/Integration | pytest, pytest-asyncio, pytest-cov | Already configured |
| Frontend Unit | Vitest, React Testing Library | Already configured |
| E2E | Playwright | Needs comprehensive test suite |
| Load Testing | k6 or Apache JMeter | Not yet configured |
| Security Scanning | OWASP ZAP, Snyk | Needs configuration |
| Performance | Lighthouse CI | Needs CI integration |

### Monitoring Stack

| Purpose | Tool | Notes |
|---------|------|-------|
| Error Tracking | Sentry | Frontend env var: VITE_SENTRY_DSN |
| Analytics | Plausible Analytics | Privacy-first, no cookies |
| Performance | Lighthouse, WebPageTest | On-demand |
| Availability | Uptime Robot | External monitoring |
| Logs | Digital Ocean Logs | Built-in |

### CI/CD Pipeline

```yaml
# .github/workflows/ci.yml (to be created/enhanced)
name: CI/CD Pipeline

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

jobs:
  test-backend:
    # pytest with coverage

  test-frontend:
    # vitest with coverage

  e2e-tests:
    # playwright tests

  security-scan:
    # dependency scanning, SAST

  lighthouse:
    # performance audit

  deploy:
    # Digital Ocean deployment
```

### Database Migrations

Current state: 21 migrations applied (001-021)
- All schema complete for Phases 1-9
- Phase 10 should not require new migrations
- Focus on index optimization and query tuning

---

## Curriculum Alignment

Phase 10 includes curriculum validation testing:

### Validation Checks
- **Outcome code format**: Verify NSW patterns (MA3-RN-01, EN4-VOCAB-01, etc.)
- **Framework isolation**: Ensure no cross-framework data leakage
- **Stage/pathway mapping**: Verify correct stage assignments
- **Subject tutor styles**: Validate configuration for all 8 subjects

### Use Curriculum Validator Skill
```bash
# Run curriculum validation
/skill curriculum-validator
```

---

## Security/Privacy Considerations

### Children's Data Protection (CRITICAL)

**Australian Privacy Act Requirements**:
- [ ] Verifiable parental consent for under-15s
- [ ] Privacy policy clear and accessible
- [ ] Data collection limited to necessary items
- [ ] Data retention policies documented
- [ ] Right to access implemented
- [ ] Right to deletion implemented
- [ ] Data portability (export endpoint)

**COPPA-like Best Practices**:
- [ ] No behavioural advertising
- [ ] Parental access to child's data
- [ ] Minimal tracking (Plausible, not GA)
- [ ] No third-party cookies
- [ ] Age-appropriate content only

### Security Audit Checklist

**Authentication & Authorization**:
- [ ] Strong password requirements
- [ ] Bcrypt with 12+ rounds
- [ ] JWT expiry and refresh working
- [ ] Rate limiting (5 attempts/min, 5-min lockout)
- [ ] RBAC enforced
- [ ] Students only access own data
- [ ] Parents only access linked children

**Data Protection**:
- [ ] PII encrypted at rest
- [ ] TLS 1.3 in transit
- [ ] No secrets in code
- [ ] Environment variables secured

**API Security**:
- [ ] Input validation (Zod/Pydantic)
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Rate limiting all endpoints
- [ ] CORS properly configured

**AI Safety**:
- [ ] All interactions logged
- [ ] Concerning content flagged
- [ ] No unnecessary PII to Claude
- [ ] Cost limits per student/day
- [ ] Socratic method verified

---

## Dependencies

### Completed Prerequisites ✅
- Phase 1: Foundation & Infrastructure
- Phase 2: Core Curriculum System
- Phase 3: User System & Auth
- Phase 4: AI Tutoring
- Phase 5: Notes & OCR
- Phase 6: Revision & Spaced Repetition
- Phase 7: Parent Dashboard
- Phase 8: Gamification & Engagement
- Phase 9: PWA & Offline

### External Services Required
- Supabase Auth (configured)
- Anthropic Claude API (configured)
- Google Cloud Vision API (configured)
- Digital Ocean App Platform (needs production setup)
- Cloudflare CDN (needs configuration)
- Sentry (needs project setup)
- Plausible Analytics (needs configuration)

---

## Open Questions

1. **Beta Tester Recruitment**: How will we recruit 20-50 beta testers? Schools, community groups, social media?

2. **Load Testing Scale**: Should we test for 100, 500, or 1000+ concurrent users initially?

3. **Monitoring Budget**: What's the budget for Sentry, Plausible, and monitoring tools?

4. **Launch Timeline**: What's the target launch date after Phase 10 completion?

5. **Support Process**: Who handles user support tickets post-launch?

6. **Penetration Testing**: Will we use internal testing or hire external security auditors?

7. **Accessibility Standards**: Target WCAG 2.1 AA or AAA compliance?

---

## Success Criteria

Phase 10 complete when:

| Category | Criteria |
|----------|----------|
| Testing | Unit coverage > 80%, all E2E tests passing |
| Security | No CRITICAL/HIGH vulnerabilities, audit passed |
| Privacy | Australian Privacy Act compliance verified |
| Performance | Lighthouse 90+, API < 500ms (p95) |
| Beta | 20-50 testers active, critical issues resolved |
| Deployment | Production configured, CI/CD working |
| Monitoring | Sentry, Plausible, alerting active |

---

## Recommended Approach

### Week 1-1.5: Testing & Security
1. Run existing test suites, fix any failures
2. Add missing unit tests to reach 80% coverage
3. Implement Playwright E2E tests for critical flows
4. Run security audit with security-auditor agent
5. Run privacy compliance check with student-data-privacy-audit skill

### Week 2: Performance & Beta Prep
1. Lighthouse audit and optimizations
2. Database query optimization
3. Load testing setup and execution
4. Beta tester recruitment
5. Beta feedback system setup

### Week 2.5-3: Beta Testing
1. Beta release to testers
2. Bug triage and fixes
3. Usability feedback collection
4. Critical issue resolution

### Week 3.5-4: Production & Launch
1. Production environment setup
2. CI/CD pipeline finalization
3. Monitoring configuration
4. Documentation and runbooks
5. Launch checklist completion

---

## Sources Referenced

- `PROGRESS.md` - Phase tracking and status
- `TASKLIST.md` - Phase 10 task outline
- `Complete_Development_Plan.md` - Technical specifications
- `CLAUDE.md` - Project configuration and agents
- `.claude/agents/testing-qa-specialist.md` - QA strategy
- `.claude/agents/security-auditor.md` - Security requirements
- `backend/tests/` - Existing test patterns
- `frontend/src/**/*.test.tsx` - Frontend test patterns
