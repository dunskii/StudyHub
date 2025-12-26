# Privacy Audit: Phase 3 - User System & Authentication

**Date:** 2025-12-26
**Scope:** Phase 3 Implementation - User accounts, student profiles, and subject enrolments
**Auditor:** Claude Code (AI Privacy Auditor)

---

## Executive Summary

**Risk Level:** **LOW-MEDIUM**
**Compliance Status:** **PASS with Recommendations**

The Phase 3 implementation demonstrates strong privacy-first architecture with comprehensive access controls. The system properly implements parent ownership verification, minimal data collection, and framework isolation. However, there are several areas requiring attention before production launch, particularly around consent verification enforcement and logging sanitisation.

### Key Strengths
✅ Parent ownership verification enforced at service and endpoint layers
✅ Minimal data collection - no unnecessary PII
✅ Framework isolation prevents cross-curriculum data leakage
✅ Secure token handling with Supabase integration
✅ Proper cascade deletion for right to erasure

### Areas for Improvement
⚠️ Consent enforcement not strictly required at signup
⚠️ Console logging in production may expose errors with PII
⚠️ Student email field is optional but could be misused
⚠️ No explicit retention policy enforcement in code

---

## 1. Data Collection Minimization

### User (Parent) Data Fields

| Data Field | Necessary? | Purpose | Privacy Risk | Compliant |
|------------|-----------|---------|--------------|-----------|
| `id` (UUID) | ✅ Yes | Primary key | Low | ✅ |
| `supabase_auth_id` | ✅ Yes | Authentication linkage | Low | ✅ |
| `email` | ✅ Yes | Account identification, communication | Medium | ✅ |
| `display_name` | ✅ Yes | UI personalisation | Low | ✅ |
| `phone_number` | ⚠️ Optional | Emergency contact, 2FA | Low | ✅ |
| `privacy_policy_accepted_at` | ✅ Yes | Consent tracking | Low | ✅ |
| `terms_accepted_at` | ✅ Yes | Legal compliance | Low | ✅ |
| `marketing_consent` | ✅ Yes | SPAM Act compliance | Low | ✅ |
| `data_processing_consent` | ✅ Yes | Privacy Act compliance | Low | ✅ |
| `subscription_tier` | ✅ Yes | Feature access control | Low | ✅ |
| `subscription_expires_at` | ✅ Yes | Billing management | Low | ✅ |
| `stripe_customer_id` | ✅ Yes | Payment processing | Medium | ✅ |
| `preferences` (JSONB) | ✅ Yes | UX personalisation | Low | ✅ |
| `user_metadata` (JSONB) | ⚠️ Unused | Future extensibility | Low | ✅ |
| `last_login_at` | ✅ Yes | Security auditing | Low | ✅ |

**Finding:** User data collection is minimal and purpose-driven. All fields serve clear business functions. The `user_metadata` field is currently empty but could become a risk if misused.

**Recommendation:** Document allowed uses for `user_metadata` to prevent PII creep.

---

### Student Data Fields

| Data Field | Necessary? | Purpose | Privacy Risk | Compliant |
|------------|-----------|---------|--------------|-----------|
| `id` (UUID) | ✅ Yes | Primary key | Low | ✅ |
| `parent_id` | ✅ Yes | Ownership linkage | Low | ✅ |
| `supabase_auth_id` | ⚠️ Optional | Student login (future) | Medium | ⚠️ |
| `email` | ⚠️ Optional | Student account (future) | **HIGH** | ⚠️ |
| `display_name` | ✅ Yes | UI personalisation | Low | ✅ |
| `grade_level` | ✅ Yes | Curriculum matching | Low | ✅ |
| `school_stage` | ✅ Yes | Outcome filtering | Low | ✅ |
| `school` | ⚠️ Optional | Context (unused) | Medium | ⚠️ |
| `framework_id` | ✅ Yes | Curriculum framework | Low | ✅ |
| `preferences` (JSONB) | ✅ Yes | UX personalisation | Low | ✅ |
| `gamification` (JSONB) | ✅ Yes | Engagement tracking | Low | ✅ |
| `onboarding_completed` | ✅ Yes | User flow control | Low | ✅ |
| `last_active_at` | ✅ Yes | Engagement metrics | Low | ✅ |

**Critical Finding:** The `email` field on students is optional and nullable. While this is good for privacy (most students don't need accounts), there's no enforcement preventing collection of student emails unnecessarily.

**Student Email Risk:**
- Under Australian Privacy Act, collecting email from under-15s requires parental consent
- Current schema allows `student.email` to be set without explicit consent check
- No validation that collected emails are actually needed

**Recommendation:**
1. Add comment in schema documenting that student emails require explicit parental consent
2. If student login is implemented, add consent field: `student_login_consent_at`
3. Consider moving student auth fields to separate table to make consent explicit

---

### Student Subject Enrolment Data

| Data Field | Necessary? | Purpose | Privacy Risk | Compliant |
|------------|-----------|---------|--------------|-----------|
| `student_id` | ✅ Yes | Ownership linkage | Low | ✅ |
| `subject_id` | ✅ Yes | Curriculum tracking | Low | ✅ |
| `pathway` | ✅ Yes | Stage 5 differentiation | Low | ✅ |
| `senior_course_id` | ✅ Yes | HSC course tracking | Low | ✅ |
| `enrolled_at` | ✅ Yes | Timeline tracking | Low | ✅ |
| `progress.outcomesCompleted` | ✅ Yes | Learning tracking | Low | ✅ |
| `progress.outcomesInProgress` | ✅ Yes | Learning tracking | Low | ✅ |
| `progress.overallPercentage` | ✅ Yes | Progress reporting | Low | ✅ |
| `progress.lastActivity` | ✅ Yes | Engagement tracking | Low | ✅ |
| `progress.xpEarned` | ✅ Yes | Gamification | Low | ✅ |

**Finding:** Enrolment data is minimal and educational in purpose. No sensitive PII collected beyond what's necessary for tracking curriculum outcomes.

---

## 2. Consent Verification

### Consent Tracking Fields

The User model includes proper consent tracking:
```python
privacy_policy_accepted_at: datetime | None
terms_accepted_at: datetime | None
marketing_consent: bool = False
data_processing_consent: bool = True
```

### Consent Endpoints
```
POST /api/v1/users/me/accept-privacy-policy
POST /api/v1/users/me/accept-terms
```

**Critical Gap:** Consent acceptance is tracked but **not enforced** during signup flow.

**Current Signup Flow Analysis:**
```python
# frontend/src/features/auth/AuthProvider.tsx (lines 134-166)
async signUp(email: string, password: string, displayName: string) {
  // Creates Supabase user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } }
  });

  // Creates backend user
  await usersApi.create({
    supabase_auth_id: data.user.id,
    email,
    display_name: displayName,
  });
  // ❌ No consent verification required!
}
```

**Backend User Creation:**
```python
# backend/app/api/v1/endpoints/users.py (lines 18-51)
@router.post("", response_model=UserResponse, status_code=201)
async def create_user(data: UserCreate, db: AsyncSession):
    user = await service.create(data)
    # ❌ Accepts creation without consent timestamps
```

**Risk:** Users can create accounts without accepting privacy policy or terms.

**Recommendations:**
1. **CRITICAL:** Add consent validation to `UserCreate` schema:
   ```python
   class UserCreate(UserBase):
       privacy_policy_accepted: bool  # Must be True
       terms_accepted: bool          # Must be True
   ```

2. Update signup flow to require checkboxes:
   ```typescript
   await usersApi.create({
     supabase_auth_id: data.user.id,
     email,
     display_name: displayName,
     privacy_policy_accepted: true,
     terms_accepted: true,
   });
   ```

3. Set timestamps in service layer when `True` is passed

---

## 3. Data Access Controls

### Parent Ownership Verification

**Service Layer Protection:**

```python
# backend/app/services/user_service.py (lines 125-142)
async def verify_owns_student(user_id: UUID, student_id: UUID) -> bool:
    """CRITICAL: Primary access control check for student data."""
    result = await self.db.execute(
        select(Student.id)
        .where(Student.id == student_id)
        .where(Student.parent_id == user_id)
    )
    return result.scalar_one_or_none() is not None
```

✅ **Excellent:** Dedicated ownership verification method with clear documentation.

**Service Methods with Ownership Checks:**

```python
# backend/app/services/student_service.py
async def get_by_id_for_user(student_id: UUID, user_id: UUID) -> Student | None
async def update(student_id: UUID, data: StudentUpdate, requesting_user_id: UUID)
async def delete(student_id: UUID, requesting_user_id: UUID)
async def get_with_subjects(student_id: UUID, requesting_user_id: UUID)
```

✅ **Excellent:** All sensitive operations require `requesting_user_id` parameter.

**Endpoint Layer Protection:**

All student endpoints properly verify ownership:

```python
# backend/app/api/v1/endpoints/students.py (lines 90-124)
@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(student_id: UUID, current_user: AuthenticatedUser, db: AsyncSession):
    # Ownership verification
    student = await service.get_by_id_for_user(student_id, current_user.id)

    if not student:
        # Check if exists to differentiate 404 vs 403
        exists = await service.get_by_id(student_id)
        if exists:
            raise ForbiddenError("You do not have access to this student")
        raise NotFoundError("Student")
```

✅ **Excellent:** Proper 403 vs 404 differentiation prevents information leakage.

**Enrolment Access Control:**

```python
# backend/app/api/v1/endpoints/student_subjects.py (lines 33-52)
async def verify_student_ownership(student_id: UUID, current_user: AuthenticatedUser, db: AsyncSession):
    """Verify the current user owns the student."""
    user_service = UserService(db)
    student_service = StudentService(db)

    if not await user_service.verify_owns_student(current_user.id, student_id):
        exists = await student_service.get_by_id(student_id)
        if exists:
            raise ForbiddenError("You do not have access to this student")
        raise NotFoundError("Student")
```

✅ **Excellent:** Reusable verification function for all enrolment endpoints.

### Access Control Audit

| Endpoint | Ownership Check | Method | Compliant |
|----------|----------------|--------|-----------|
| `GET /api/v1/users/me` | ✅ Self only | Token auth | ✅ |
| `PUT /api/v1/users/me` | ✅ Self only | Token auth | ✅ |
| `GET /api/v1/users/me/students` | ✅ Own children | Token auth | ✅ |
| `POST /api/v1/students` | ✅ Parent ID verified | Request validation | ✅ |
| `GET /api/v1/students/{id}` | ✅ Parent ownership | `get_by_id_for_user` | ✅ |
| `PUT /api/v1/students/{id}` | ✅ Parent ownership | Service method | ✅ |
| `DELETE /api/v1/students/{id}` | ✅ Parent ownership | Service method | ✅ |
| `GET /api/v1/students/{id}/subjects` | ✅ Parent ownership | `verify_student_ownership` | ✅ |
| `POST /api/v1/students/{id}/subjects` | ✅ Parent ownership | `verify_student_ownership` | ✅ |
| `PUT /api/v1/students/{id}/subjects/{sid}` | ✅ Parent ownership | `verify_student_ownership` | ✅ |
| `DELETE /api/v1/students/{id}/subjects/{sid}` | ✅ Parent ownership | `verify_student_ownership` | ✅ |

**Finding:** Access controls are **exemplary**. All endpoints properly verify ownership with defense-in-depth (endpoint + service layer).

---

## 4. Framework Isolation

**Critical Rule:** Students can only access curriculum content from their assigned framework.

### Framework Isolation Implementation

```python
# backend/app/services/student_subject_service.py (lines 56-81)
async def validate_enrolment(student: Student, subject: Subject, ...):
    """CRITICAL: Enforces framework isolation and pathway/course requirements."""

    # Rule 1: Framework isolation
    if student.framework_id != subject.framework_id:
        raise EnrolmentValidationError(
            "Cannot enrol in a subject from a different curriculum framework.",
            "FRAMEWORK_MISMATCH",
        )
```

✅ **Excellent:** Framework mismatch blocks enrolment at validation layer.

**Additional Validation Rules:**
- ✅ Stage availability check (lines 83-88)
- ✅ Stage 5 pathway requirement (lines 90-104)
- ✅ Stage 6 senior course validation (lines 106-128)

### Framework Isolation Audit

| Scenario | Protection | Method | Compliant |
|----------|-----------|--------|-----------|
| Enrol in wrong framework subject | ✅ Blocked | `validate_enrolment` | ✅ |
| Access wrong framework outcomes | ⚠️ Not yet implemented | Future: curriculum queries | ⚠️ |
| Cross-framework data exposure | ✅ Prevented | Foreign key constraints | ✅ |

**Recommendation:** When implementing curriculum outcome browsing (Phase 4), ensure all queries filter by `framework_id`:

```python
# Future curriculum queries MUST include:
outcomes = await db.execute(
    select(CurriculumOutcome)
    .where(CurriculumOutcome.framework_id == student.framework_id)  # CRITICAL
    .where(CurriculumOutcome.subject_id == subject_id)
)
```

---

## 5. Frontend Data Handling

### Token Storage

```typescript
// frontend/src/lib/api/client.ts (lines 61-72)
api.setTokenProvider(async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
});
```

✅ **Excellent:** Tokens retrieved from Supabase session (secure storage), not localStorage.

### State Persistence

```typescript
// frontend/src/stores/authStore.ts (lines 16-46)
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({ /* state */ }),
    {
      name: 'studyhub-auth',
      partialize: (state) => ({
        user: state.user,
        activeStudent: state.activeStudent,
      }),
    }
  )
)
```

⚠️ **Risk:** User and student data persisted to localStorage via Zustand persist middleware.

**Data Exposed in localStorage:**
- User: email, displayName, subscriptionTier
- Student: displayName, gradeLevel, schoolStage, frameworkId, gamification data

**Assessment:**
- ✅ No highly sensitive PII (no passwords, payment info)
- ✅ Required for offline functionality
- ⚠️ Student data persists across sessions

**Recommendation:**
1. Document localStorage usage in privacy policy
2. Add expiry/invalidation on logout
3. Consider encrypting localStorage data in future (low priority)

### Error Logging

```typescript
// frontend/src/features/auth/AuthProvider.tsx
console.error('Failed to load user profile:', error);  // Line 51
console.error('Failed to initialize auth:', error);     // Line 89
console.error('Failed to create backend user:', apiError); // Line 164
console.error('Sign out error:', error);                // Line 176
```

⚠️ **Risk:** Error objects may contain PII if API returns detailed validation errors.

**Example Risk Scenario:**
```typescript
// If API returns validation error with email:
{
  error: "User with email john.doe@example.com already exists"
}
// This would be logged to console, exposing PII in production
```

**Recommendations:**
1. Sanitize error messages before logging:
   ```typescript
   console.error('Failed to create backend user', {
     errorCode: apiError.errorCode,
     // Don't log message or details in production
   });
   ```

2. Use environment-based logging:
   ```typescript
   if (import.meta.env.DEV) {
     console.error('Full error:', apiError);
   }
   ```

3. Implement proper error reporting service (Sentry) with PII scrubbing

---

## 6. API Response Filtering

### Sensitive Fields Excluded from Responses

```python
# backend/app/schemas/user.py (lines 35-45)
class UserResponse(UserBase, IDMixin, TimestampMixin):
    """Schema for user response."""
    # ✅ No stripe_customer_id
    # ✅ No user_metadata
    # ✅ Consent timestamps exposed (needed for UI)
```

✅ **Excellent:** Response schemas exclude internal fields like `stripe_customer_id`.

### Student Response

```python
# backend/app/schemas/student.py (lines 55-64)
class StudentResponse(StudentBase, IDMixin, TimestampMixin):
    parent_id: UUID           # ⚠️ Exposed (needed for validation)
    supabase_auth_id: UUID | None  # ⚠️ Exposed
    # ✅ Email not exposed (nullable, handled separately)
```

⚠️ **Minor Risk:** `parent_id` and `supabase_auth_id` exposed in responses.

**Assessment:**
- `parent_id`: Low risk - only used for validation, not PII
- `supabase_auth_id`: Low risk - UUID, needed for auth coordination

**Recommendation:** No immediate action required, but consider omitting from public endpoints if added in future.

---

## 7. AI Interaction Safety

**Note:** AI interaction logging not yet implemented (Phase 5).

**Requirements for Phase 5:**
- [ ] All AI conversations must be logged to `ai_interactions` table
- [ ] Concerning content must be flagged for parent review
- [ ] Minimal student PII sent to Claude API (outcomes, not personal details)
- [ ] Parent dashboard must allow reviewing AI logs

**Pre-emptive Recommendation:**
When implementing AI tutor, ensure prompts don't include student email or school:
```python
# GOOD
context = {
  "grade_level": student.grade_level,
  "subject": subject.name,
  "outcomes": outcomes_list,
}

# BAD - Don't send unnecessary PII
context = {
  "student_email": student.email,  # ❌
  "school": student.school,        # ❌
}
```

---

## 8. Data Deletion & Right to Erasure

### Cascade Deletion Implementation

```python
# backend/app/models/user.py (lines 67-69)
students: Mapped[list[Student]] = relationship(
    "Student", back_populates="parent", cascade="all, delete-orphan"
)
```

```python
# backend/app/models/student.py (lines 82-90)
subjects: Mapped[list[StudentSubject]] = relationship(
    "Student Subject", back_populates="student", cascade="all, delete-orphan"
)
notes: Mapped[list[Note]] = relationship(
    "Note", back_populates="student", cascade="all, delete-orphan"
)
sessions: Mapped[list[Session]] = relationship(
    "Session", back_populates="student", cascade="all, delete-orphan"
)
```

✅ **Excellent:** Deleting a user cascades to all children and their data.

### Deletion Endpoints

```python
# backend/app/services/user_service.py (lines 160-177)
async def delete(self, user_id: UUID) -> bool:
    """Delete a user account.

    WARNING: This cascades to delete all students and their data.
    """
    # ✅ Proper cascade warning in docstring
```

```python
# backend/app/services/student_service.py (lines 208-230)
async def delete(self, student_id: UUID, requesting_user_id: UUID) -> bool:
    """Delete a student with ownership verification.

    WARNING: This cascades to delete all student data (subjects, notes, sessions).
    """
    # ✅ Ownership verification before deletion
```

### Deletion Audit

| Deletion Type | Cascades To | Ownership Check | Compliant |
|--------------|-------------|-----------------|-----------|
| User account | Students, enrolments, notes, sessions | ✅ Self only | ✅ |
| Student profile | Enrolments, notes, sessions | ✅ Parent ownership | ✅ |
| Subject enrolment | None (leaf node) | ✅ Parent ownership | ✅ |

**Missing Implementation:**
- ❌ No soft-delete option
- ❌ No grace period before permanent deletion
- ❌ No deletion confirmation workflow
- ❌ No data export before deletion

**Recommendations:**
1. Add soft delete with grace period:
   ```python
   deleted_at: datetime | None
   deletion_requested_at: datetime | None
   ```

2. Implement data export endpoint:
   ```
   GET /api/v1/users/me/export → JSON file with all user data
   ```

3. Add deletion confirmation workflow:
   ```
   POST /api/v1/users/me/request-deletion  # Sets deletion_requested_at
   POST /api/v1/users/me/confirm-deletion  # Actually deletes after 30 days
   POST /api/v1/users/me/cancel-deletion   # Cancels request
   ```

---

## 9. Third-Party Data Sharing

### Current Third-Party Services

| Service | Data Shared | Purpose | Documented |
|---------|------------|---------|-----------|
| Supabase Auth | Email, password hash | Authentication | ✅ |
| Anthropic Claude | (Future) Curriculum content, student responses | AI tutoring | ⚠️ Not yet |
| Google Cloud Vision | (Future) Uploaded images | OCR for notes | ⚠️ Not yet |
| Digital Ocean | Database, file storage | Infrastructure | ✅ |
| Stripe | (Future) Email, payment info | Billing | ⚠️ Not yet |
| Resend | (Future) Email, display name | Transactional emails | ⚠️ Not yet |

**Finding:** No third-party sharing implemented yet beyond authentication.

**Requirements Before Launch:**
- [ ] Privacy policy must list all third-party services
- [ ] Data Processing Agreements (DPAs) with all vendors
- [ ] Minimal data sent to each service
- [ ] No student data sold or shared for marketing

**Anthropic Claude Specific Recommendations:**
1. Send only de-identified learning data:
   ```python
   # Don't send student names or emails to Claude
   prompt = f"""You are tutoring a Year {student.grade_level} student
   studying {subject.name} under {framework.name}.
   Student response: {sanitized_response}"""
   ```

2. Log all AI interactions for transparency:
   ```python
   ai_interaction = AIInteraction(
       student_id=student_id,
       subject_id=subject_id,
       prompt_template=template_name,
       user_input=student_response,
       ai_response=claude_response,
       flagged=safety_check(claude_response),
   )
   ```

---

## 10. Security Considerations

### Authentication

```python
# backend/app/core/security.py (lines 91-138)
async def get_current_user(credentials: HTTPAuthorizationCredentials, db: AsyncSession):
    """Get the current authenticated user."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    token_data = verify_token(credentials.credentials)
    # ✅ Token expiry checked
    # ✅ User looked up by Supabase ID
```

✅ **Excellent:** JWT token validation with expiry checking.

### HTTPS Enforcement

⚠️ **Gap:** No HTTPS enforcement in middleware (relies on infrastructure).

**Recommendation:** Add HTTPS redirect middleware for production:
```python
@app.middleware("http")
async def https_redirect_middleware(request: Request, call_next):
    if not request.url.scheme == "https" and app_env == "production":
        url = request.url.replace(scheme="https")
        return RedirectResponse(url=url, status_code=301)
    return await call_next(request)
```

### Rate Limiting

✅ Rate limiting middleware implemented (not audited in this review).

### CSRF Protection

✅ CSRF middleware implemented (not audited in this review).

---

## Critical Issues (Must Fix Before Production)

### 1. Consent Verification Not Enforced ⚠️ HIGH PRIORITY

**Issue:** Users can create accounts without accepting privacy policy or terms.

**Impact:** Legal non-compliance with Australian Privacy Act APP 5 (notification) and APP 1.3 (consent).

**Fix:**
```python
# backend/app/schemas/user.py
class UserCreate(UserBase):
    supabase_auth_id: UUID
    subscription_tier: str = "free"
    preferences: dict[str, Any] = Field(default_factory=dict)
    privacy_policy_accepted: bool  # NEW
    terms_accepted: bool          # NEW

    @field_validator('privacy_policy_accepted', 'terms_accepted')
    @classmethod
    def must_be_true(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Must accept to proceed")
        return v
```

**Frontend:**
```typescript
// Add checkboxes to signup form
<Checkbox required>I accept the Privacy Policy</Checkbox>
<Checkbox required>I accept the Terms of Service</Checkbox>
```

---

### 2. Production Logging May Expose PII ⚠️ MEDIUM PRIORITY

**Issue:** Console logs in frontend may expose email addresses or other PII in production.

**Impact:** PII visible in browser console for users and potentially logged to external services.

**Fix:**
```typescript
// Create logging utility
// frontend/src/lib/logger.ts
export const logger = {
  error: (message: string, context?: Record<string, unknown>) => {
    if (import.meta.env.DEV) {
      console.error(message, context);
    } else {
      // Production: log to error tracking service with PII scrubbing
      // or log error codes only
      console.error(message, { code: context?.errorCode });
    }
  }
};

// Usage:
logger.error('Failed to create user', { errorCode: 'VALIDATION_ERROR' });
```

---

## High Priority Recommendations

### 3. Student Email Field Needs Consent Guard ⚠️ HIGH PRIORITY

**Issue:** Student email field exists but no explicit consent mechanism for collection.

**Impact:** Could violate APP 3.4 (collection from individuals under 18).

**Fix:**
```python
# Add to Student model
student_account_consent_at: datetime | None  # Parental consent for student login

# Validation
if student.email and not student.student_account_consent_at:
    raise ValueError("Student email requires parental consent")
```

**Alternative:** Remove student email field entirely until student login is implemented.

---

### 4. Add Soft Delete with Grace Period ⚠️ MEDIUM PRIORITY

**Issue:** Account deletion is immediate and irreversible.

**Impact:** User error could lead to data loss and customer complaints.

**Fix:**
```python
# Add to User and Student models
deletion_requested_at: datetime | None
deletion_scheduled_for: datetime | None  # requested_at + 30 days

# Implement workflow
POST /api/v1/users/me/request-deletion     # Mark for deletion
GET /api/v1/users/me/export                # Download data before deletion
POST /api/v1/users/me/cancel-deletion      # Cancel deletion
# Cron job: permanently delete accounts where deletion_scheduled_for < now
```

---

### 5. Implement Data Export for GDPR/Privacy Act Compliance ⚠️ MEDIUM PRIORITY

**Issue:** No mechanism for users to export their data.

**Impact:** Non-compliance with APP 12 (access) and potential GDPR Article 20 (portability).

**Fix:**
```python
@router.get("/me/export", response_class=JSONResponse)
async def export_user_data(current_user: AuthenticatedUser, db: AsyncSession):
    """Export all user data in machine-readable format."""
    user_service = UserService(db)
    user = await user_service.get_with_students(current_user.id)

    export_data = {
        "user": {...},
        "students": [...],
        "enrolments": [...],
        # Include all related data
    }

    return JSONResponse(
        content=export_data,
        headers={
            "Content-Disposition": f"attachment; filename=studyhub-data-{current_user.id}.json"
        }
    )
```

---

## Medium Priority Recommendations

### 6. Document localStorage Usage in Privacy Policy

**Issue:** User and student data persisted to localStorage via Zustand without explicit disclosure.

**Fix:** Add to privacy policy:
> We store your account information locally in your browser to improve performance and enable offline access. This data is encrypted in transit but stored unencrypted on your device. Clear your browser data to remove it.

---

### 7. Add Retention Policy Enforcement

**Issue:** No automatic deletion of old data.

**Fix:**
```python
# Cron job to anonymize old sessions/interactions
async def cleanup_old_data():
    # After 2 years, delete detailed session data
    old_sessions = await db.execute(
        select(Session).where(Session.created_at < two_years_ago)
    )
    # Keep anonymized aggregates for analytics
```

---

### 8. Add Parent Email Verification

**Issue:** Parent emails not verified during signup.

**Fix:** Require email verification via Supabase before allowing student creation.

```typescript
// Check email verification status
const { data: { user } } = await supabase.auth.getUser();
if (!user?.email_confirmed_at) {
  throw new Error("Please verify your email before creating student profiles");
}
```

---

## Low Priority Recommendations

### 9. Encrypt localStorage Data

**Issue:** Student data in localStorage is unencrypted.

**Priority:** Low (data is not highly sensitive, requires physical device access).

**Fix:** Use browser crypto API to encrypt before storing.

---

### 10. Add Admin Audit Logging

**Issue:** No audit trail for admin actions (when implemented).

**Fix:** Create `admin_actions` table logging all privileged operations.

---

## Required Actions Before Production Launch

### Legal/Compliance
- [ ] **Privacy policy published** with all third-party services listed
- [ ] **Terms of service published** with parental consent provisions
- [ ] **DPAs signed** with Supabase, Anthropic, Google Cloud, Stripe, Resend
- [ ] **Cookie consent banner** (if using analytics cookies)
- [ ] **Consent enforcement** implemented in signup flow

### Technical
- [ ] **Fix: Add consent validation** to UserCreate schema
- [ ] **Fix: Add student email consent guard** or remove field
- [ ] **Fix: Sanitize production logs** to remove PII
- [ ] **Implement: Data export endpoint**
- [ ] **Implement: Soft delete with grace period**
- [ ] **Implement: Email verification requirement**
- [ ] **Test: Cascade deletion** thoroughly
- [ ] **Test: Framework isolation** with multiple frameworks
- [ ] **Review: All error messages** for PII leakage
- [ ] **Enable: HTTPS enforcement** in production

### Documentation
- [ ] **Privacy policy:** Document localStorage usage
- [ ] **Privacy policy:** Document retention periods
- [ ] **Developer docs:** Document consent requirements
- [ ] **Developer docs:** Document framework isolation rules
- [ ] **Developer docs:** Document PII handling guidelines

---

## Positive Findings (Keep Doing This)

1. ✅ **Exemplary access control architecture** with ownership verification at multiple layers
2. ✅ **Minimal data collection** - only essential fields
3. ✅ **Framework isolation** properly enforced in enrolment validation
4. ✅ **Cascade deletion** enables right to erasure
5. ✅ **Proper 403 vs 404 handling** prevents information leakage
6. ✅ **Consent tracking fields** implemented (just need enforcement)
7. ✅ **No plaintext passwords** - Supabase handles auth
8. ✅ **JWT with expiry** for session management
9. ✅ **Type safety** with Pydantic validation
10. ✅ **Clear separation** between user and student contexts

---

## Privacy-by-Design Assessment

| Principle | Implementation | Rating |
|-----------|---------------|--------|
| **Proactive not Reactive** | Access controls built-in from start | ✅ Excellent |
| **Privacy as Default** | Minimal data collection by default | ✅ Excellent |
| **Privacy Embedded in Design** | Framework isolation in data model | ✅ Excellent |
| **Full Functionality** | Privacy doesn't compromise features | ✅ Excellent |
| **End-to-End Security** | Token security, cascade deletion | ✅ Good |
| **Visibility and Transparency** | Consent tracking, future export | ⚠️ Needs work |
| **User-Centric** | Parent control over student data | ✅ Excellent |

**Overall Privacy-by-Design Score: 8.5/10**

---

## Conclusion

The Phase 3 implementation demonstrates a **strong privacy-first foundation** with excellent access control architecture and minimal data collection. The ownership verification system is particularly well-designed with defense-in-depth at both service and endpoint layers.

The identified issues are **all addressable** before production launch and primarily involve:
1. Enforcing the consent tracking that's already implemented
2. Sanitizing logs to prevent PII exposure
3. Adding data export for user rights compliance
4. Implementing soft-delete to prevent data loss

With these fixes implemented, the system will be **fully compliant** with Australian Privacy Act requirements for educational platforms serving children.

### Overall Assessment
- **Current Status:** Ready for development/testing, NOT ready for production
- **Estimated Effort to Compliance:** 3-5 days of development
- **Risk Level After Fixes:** LOW
- **Recommended Next Steps:**
  1. Implement consent enforcement (4 hours)
  2. Sanitize production logging (2 hours)
  3. Add student email consent guard (2 hours)
  4. Implement data export (8 hours)
  5. Implement soft delete (8 hours)
  6. Legal review of privacy policy (external)
  7. Full privacy testing with test accounts

---

**Auditor:** Claude Code (AI Privacy Auditor)
**Next Audit:** After Phase 4 (Curriculum System) implementation
**Focus Areas for Next Audit:** Curriculum outcome queries, framework isolation in practice, AI interaction logging
