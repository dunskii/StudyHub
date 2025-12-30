# Study: Phase 10 QA Recommendations

**Date**: 2025-12-30
**Status**: Research Complete (No Implementation)

---

## Summary

Phase 10 (Testing & Launch) is marked complete with 521 backend tests, 528 frontend tests, comprehensive E2E test coverage, and security infrastructure in place. However, the QA review and security audit identified **4 critical issues** and **10 high/medium-priority recommendations** that should be addressed before production launch.

These fall into three categories:
1. **Security & Privacy Compliance** (4 critical)
2. **Operational Infrastructure** (2 high-priority)
3. **Code Quality & Maintainability** (4 medium-priority)

**Key Finding**: The application is feature-complete but requires security hardening and privacy compliance implementation before users can interact with student data.

---

## Key Requirements

### Critical (Must Fix Before Launch)

#### 1. Account Deletion Flow
**Compliance Impact**: COPPA (16 CFR § 312.3(c)(3)), Australian Privacy Act § 17

**What's Missing**:
- No `/api/v1/users/{id}/delete-account` endpoint
- No account deletion workflow (verification, grace period, confirmation)
- No cascading deletion of related data
- No deletion audit trail

**Data Cascade on Delete**:
```
User
  ├─ Student[] → StudentSubject, Notes, Sessions, AIInteractions, Flashcards, RevisionHistory, Achievements, Goals
  ├─ Notifications[]
  ├─ NotificationPreferences[]
  └─ PushSubscriptions[]
```

#### 2. Content Security Policy (CSP) Headers
**Risk**: XSS attacks, malicious script injection

**Current Issues**:
- `'unsafe-inline'` in style-src (reduces XSS protection)
- Missing: `frame-ancestors`, `base-uri`, `form-action`, `upgrade-insecure-requests`
- No report-uri for violation monitoring

**Required CSP**:
```python
response.headers["Content-Security-Policy"] = (
    "default-src 'self'; "
    "script-src 'self'; "
    "style-src 'self' https://cdn.tailwindcss.com; "
    "img-src 'self' data: https: blob:; "
    "font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; "
    "connect-src 'self' https://api.studyhub.example.com https://*.supabase.co; "
    "frame-ancestors 'none'; "
    "base-uri 'self'; "
    "form-action 'self'; "
    "upgrade-insecure-requests; "
)
```

#### 3. Penetration Testing
**Scope Required**:
- Authentication bypass
- Authorization bypass (parent/student data isolation)
- API security (injection, rate limits)
- AI-specific security (prompt injection, cost attacks)
- Data protection (PII in logs, error responses)

**Timeline**: 1-2 weeks, external pentester recommended

#### 4. Privacy Policy Document
**Required Sections**:
- Data collection (what, from whom, why)
- Children's privacy (COPPA compliance statement)
- Data retention periods
- Parent rights (access, correct, delete)
- Third-party sharing (Anthropic, Google Vision, Supabase)
- Security measures
- Contact information

---

### High Priority (Complete Before Day 1)

#### 5. AI Usage Limits
**Current State**: Cost tracking exists but no enforcement

**Required**:
```python
# Per-student daily limits
DAILY_TOKENS = 150,000  # ~$0.45/day
MONTHLY_SOFT = 2,000,000  # $6/month
MONTHLY_HARD = 3,000,000  # $9/month - requires parental override
```

**Implementation Points**:
- Before Claude API call in socratic.py
- Before flashcard generation in revision.py
- New `ai_usage` table for tracking

#### 6. Dependabot Configuration
**Create `.github/dependabot.yml`**:
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/frontend"
    schedule:
      interval: "weekly"
      day: "monday"
  - package-ecosystem: "pip"
    directory: "/backend"
    schedule:
      interval: "weekly"
      day: "monday"
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

---

### Medium Priority (Complete Week 1)

#### 7. Production Monitoring & Alerting
**Required Metrics**:
- HTTP request latency (p50, p95, p99)
- Error rate (5xx > 5% → alert)
- Database connection pool (> 80% → alert)
- CPU/Memory (> 80% → alert)
- Failed login attempts (spike → alert)

#### 8. E2E Test Improvements
**Gaps Identified**:
- Error scenarios (network timeout, API 500, rate limits)
- Concurrent user testing
- Session timeout/token refresh
- Cross-feature workflows
- axe-core accessibility integration

#### 9. Extract E2E Fixtures
**Problem**: Data hardcoded in tests
**Solution**: Create `frontend/e2e/fixtures/` with reusable test data

#### 10. Log PII Audit
**Check All Log Statements**:
- No passwords logged
- Emails logged cautiously (masked)
- No AI conversation content in logs

---

## Existing Patterns

### Backend Patterns to Leverage

1. **Rate Limiting** (`app/core/security.py`)
   - `AuthRateLimiter` class can be extended for AI limits
   - Redis-backed for distributed deployments

2. **Service Layer** (established pattern)
   - All services follow async pattern
   - Dependency injection via FastAPI

3. **Data Export** (`services/data_export_service.py`)
   - Already exports user data for privacy compliance
   - Can be extended for deletion verification

4. **Email Service** (`services/email_service.py`)
   - Resend API integration
   - Can send deletion confirmations

### Frontend Patterns to Leverage

1. **Modal Dialogs** (`components/ui/Modal.tsx`)
   - Radix UI-based, accessible
   - Confirmation pattern established

2. **Auth Guards** (`features/auth/AuthGuard.tsx`)
   - Route protection in place
   - Can wrap account settings

3. **Zod Validation** (all API schemas)
   - Type-safe request/response
   - Runtime validation

---

## Technical Considerations

### Backend Implementation

**Account Deletion Service** (new file):
```python
# backend/app/services/account_deletion_service.py
class AccountDeletionService:
    async def request_deletion(self, user_id: UUID) -> DeletionRequest:
        # Create deletion request with 7-day grace period
        # Send confirmation email
        # Log audit trail

    async def confirm_deletion(self, request_id: UUID, password: str) -> bool:
        # Verify password
        # Mark for deletion

    async def execute_deletion(self, user_id: UUID) -> None:
        # Cascade delete all related data
        # Remove files from DO Spaces
        # Log final audit entry
```

**AI Usage Limiter** (new file):
```python
# backend/app/services/ai_usage_service.py
class AIUsageService:
    async def check_limit(self, student_id: UUID, tokens: int) -> bool:
        # Check daily and monthly limits

    async def record_usage(self, student_id: UUID, tokens: int) -> None:
        # Store in ai_usage table

    async def get_usage_stats(self, student_id: UUID) -> UsageStats:
        # Return current usage for dashboard
```

### Frontend Implementation

**Account Settings Page** (enhance existing):
```tsx
// features/auth/pages/AccountSettingsPage.tsx
export function AccountSettingsPage() {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  return (
    <>
      {/* Existing settings */}
      <DangerZone>
        <Button variant="destructive" onClick={() => setShowDeleteModal(true)}>
          Delete Account
        </Button>
      </DangerZone>

      <DeleteAccountModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
      />
    </>
  );
}
```

### Database Changes

**New Table: ai_usage**
```sql
CREATE TABLE ai_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    tokens_haiku INTEGER NOT NULL DEFAULT 0,
    tokens_sonnet INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, date)
);

CREATE INDEX idx_ai_usage_student_date ON ai_usage(student_id, date);
```

**New Table: deletion_requests**
```sql
CREATE TABLE deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scheduled_deletion_at TIMESTAMPTZ NOT NULL,
    confirmed_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    ip_address INET,
    reason TEXT
);
```

---

## Security/Privacy Considerations

### Australian Privacy Act § 14 (Parental Rights)
| Requirement | Status |
|-------------|--------|
| Parental consent | ✅ Parent creates account |
| Data minimization | ✅ Only necessary data collected |
| Right to access | ✅ Data export exists |
| Right to correct | ⚠️ No UI for parent edits |
| Right to delete | ❌ Not implemented |
| Privacy policy | ❌ Not published |

### COPPA (Children Under 13)
| Requirement | Status |
|-------------|--------|
| Parental consent | ✅ Required |
| Direct notice to parent | ✅ Email on signup |
| Parental access | ⚠️ Dashboard incomplete |
| Right to delete | ❌ Not implemented |
| Security measures | ⚠️ CSP incomplete |
| Disclosure of practices | ❌ Privacy policy needed |

### AI Safety for Children
- ✅ All AI interactions logged for parent review
- ✅ Content moderation with distress detection
- ✅ Socratic method (never gives direct answers)
- ⚠️ AI conversations sent to Anthropic (disclosed in privacy policy)

---

## Dependencies and Implementation Order

### Phase 1: Critical (Days 1-5)
1. **Account Deletion Flow** (3-5 days)
   - Backend service + endpoints
   - Frontend confirmation flow
   - Database cascade deletes
   - E2E tests

2. **CSP Headers** (1-2 days)
   - Update security middleware
   - Test in all browsers
   - Add violation reporting endpoint

3. **Privacy Policy** (2-3 days)
   - Draft content
   - Legal review (recommended)
   - Publish on `/privacy`

### Phase 2: High Priority (Days 6-10)
4. **AI Usage Limits** (2-3 days)
   - AIUsageService
   - Database schema
   - Dashboard integration

5. **Dependabot** (1 day)
   - Enable on GitHub
   - Create config file
   - Test auto-merge

6. **Production Monitoring** (2-3 days)
   - Configure DO alerts
   - Set up Sentry
   - Update runbooks

### Phase 3: Medium Priority (Days 11-15)
7-10. E2E improvements, fixtures, logging audit

### Phase 4: Validation (Days 16-25)
- Internal penetration testing
- External penetration testing
- Fix any findings

---

## Open Questions

1. **Account Deletion Timeline**
   - Immediate or 30-day grace period?
   - Can students age 13+ delete self?

2. **AI Usage Limits**
   - Should parents see daily breakdown?
   - Premium tier with higher limits?

3. **Privacy Policy**
   - Who's the legal data controller?
   - Legal review required before publishing?

4. **Penetration Testing**
   - Full stack or auth/API only?
   - Budget allocated?
   - Timeline before launch?

5. **Monitoring**
   - 24/7 on-call rotation?
   - SLA for incident response?

---

## Risk Assessment

| Recommendation | Risk if Skipped | Severity |
|----------------|-----------------|----------|
| Account deletion | Legal liability (Privacy Act) | CRITICAL |
| CSP headers | XSS vulnerability | CRITICAL |
| Privacy policy | Regulatory violation | CRITICAL |
| Penetration test | Unknown security gaps | CRITICAL |
| AI limits | Cost overrun, abuse | HIGH |
| Dependabot | Unpatched vulnerabilities | HIGH |
| Monitoring | Operational blindness | MEDIUM |

---

## Sources Referenced

- `md/review/phase-10-qa-review.md` - QA review findings
- `md/review/security-audit.md` - Security audit checklist
- `docs/runbooks/deployment.md` - Deployment procedures
- `docs/runbooks/incident-response.md` - Incident handling
- `backend/app/middleware/security.py` - Current CSP implementation
- `backend/app/core/security.py` - Rate limiting patterns
- `backend/app/services/data_export_service.py` - Privacy patterns
- `PROGRESS.md` - Current phase status
- `CLAUDE.md` - Project security requirements
- `.github/workflows/backend-ci.yml` - CI security scanning
- `.github/workflows/frontend-ci.yml` - CI security scanning
