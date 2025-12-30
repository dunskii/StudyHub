# Implementation Plan: Phase 10 Minor Recommendations

## Overview

Implementation of three minor recommendations from the Phase 10 QA review:
1. **Token Expiry Check** - Add 24-hour time limit on deletion confirmation tokens (Security)
2. **Query Optimization** - Combine 5 DB queries into 1 using JOINs (Performance)
3. **Email Reminder** - Send reminder 1 day before scheduled deletion (UX/Compliance)

**Total Effort**: ~2.5 hours
**Priority Order**: Token Expiry → Query Optimization → Email Reminder

---

## Prerequisites

- [x] Phase 10 QA recommendations review completed
- [x] Study document created (`md/study/minor-recommendations.md`)
- [x] Account deletion flow already implemented
- [x] Email service (Resend API) already configured
- [ ] No blocking dependencies for any recommendation

---

## Phase 1: Database Changes

### 1.1 Token Expiry Field

**Migration**: `backend/alembic/versions/024_deletion_token_expiry.py`

```python
"""Add token_expires_at and reminder_sent_at to deletion_requests.

Revision ID: 024
"""
from alembic import op
import sqlalchemy as sa

def upgrade() -> None:
    # Token expiry for security (24 hours from request)
    op.add_column(
        'deletion_requests',
        sa.Column('token_expires_at', sa.DateTime(timezone=True), nullable=True)
    )

    # Reminder tracking for email notifications
    op.add_column(
        'deletion_requests',
        sa.Column('reminder_sent_at', sa.DateTime(timezone=True), nullable=True)
    )

    # Index for finding expired tokens during cleanup
    op.create_index(
        'ix_deletion_requests_token_expires_at',
        'deletion_requests',
        ['token_expires_at']
    )

def downgrade() -> None:
    op.drop_index('ix_deletion_requests_token_expires_at')
    op.drop_column('deletion_requests', 'reminder_sent_at')
    op.drop_column('deletion_requests', 'token_expires_at')
```

### 1.2 Model Updates

**File**: `backend/app/models/deletion_request.py`

Add fields:
- [ ] `token_expires_at: Mapped[datetime]` - 24 hours from request creation
- [ ] `reminder_sent_at: Mapped[datetime | None]` - When reminder email was sent

---

## Phase 2: Backend API

### 2.1 Token Expiry Validation

**File**: `backend/app/services/account_deletion_service.py`

**Changes to `request_deletion()`**:
- [ ] Set `token_expires_at` to `now + timedelta(hours=24)`

**Changes to `confirm_deletion()`**:
- [ ] Add expiry check before processing
- [ ] Return clear error message if expired
- [ ] Suggest user request new deletion

```python
# Add to confirm_deletion() after finding the request:
now = datetime.now(timezone.utc)
if deletion_request.token_expires_at and deletion_request.token_expires_at < now:
    raise ValueError(
        "Confirmation token has expired. Please cancel this request and submit a new one."
    )
```

### 2.2 Query Optimization

**File**: `backend/app/services/account_deletion_service.py`

**Replace `_count_user_data()` with optimized single query**:
- [ ] Use LEFT JOINs from User → Student → child tables
- [ ] Use `func.count(func.distinct(...))` for accurate counts
- [ ] Handle NULL cases with `or 0`

```python
async def _count_user_data(self, user_id: uuid.UUID) -> DeletionSummary:
    """Count all user data in a single optimized query."""
    result = await self.db.execute(
        select(
            func.count(func.distinct(Student.id)).label("students"),
            func.count(func.distinct(Note.id)).label("notes"),
            func.count(func.distinct(Flashcard.id)).label("flashcards"),
            func.count(func.distinct(Session.id)).label("sessions"),
            func.count(func.distinct(AIInteraction.id)).label("ai_interactions"),
        )
        .select_from(User)
        .outerjoin(Student, Student.parent_id == User.id)
        .outerjoin(Note, Note.student_id == Student.id)
        .outerjoin(Flashcard, Flashcard.student_id == Student.id)
        .outerjoin(Session, Session.student_id == Student.id)
        .outerjoin(AIInteraction, AIInteraction.student_id == Student.id)
        .where(User.id == user_id)
    )
    row = result.first()
    # ... build DeletionSummary from row
```

### 2.3 Email Reminder Service

**File**: `backend/app/services/account_deletion_service.py`

**New method `send_deletion_reminder()`**:
- [ ] Accept `DeletionRequest` as parameter
- [ ] Load user email from relationship
- [ ] Generate HTML email template (match existing style)
- [ ] Use `EmailService.send_email()`
- [ ] Update `reminder_sent_at` timestamp
- [ ] Return success boolean

### 2.4 Scheduled Task Endpoint

**File**: `backend/app/api/v1/endpoints/users.py`

**New endpoint for cron job**:
- [ ] `POST /admin/scheduled-tasks/deletion-reminders`
- [ ] Require admin authentication or API key
- [ ] Find confirmed deletions due in ~1 day
- [ ] Filter out already-reminded requests
- [ ] Send reminders and update timestamps
- [ ] Return count of reminders sent

```python
@router.post("/admin/scheduled-tasks/deletion-reminders")
async def trigger_deletion_reminders(
    db: AsyncSession = Depends(get_db),
    api_key: str = Header(..., alias="X-Admin-Key"),
) -> dict[str, int]:
    """Trigger deletion reminder emails (called by external cron)."""
    # Validate API key
    if api_key != settings.admin_api_key:
        raise HTTPException(status_code=403, detail="Invalid API key")

    # ... implementation
```

---

## Phase 3: AI Integration

**Not applicable** - These recommendations don't involve AI features.

---

## Phase 4: Frontend Components

**Minimal frontend changes required**:

### 4.1 Token Expiry Error Handling

**File**: `frontend/src/features/auth/components/DeleteAccountModal.tsx`

- [ ] Handle "token expired" error response
- [ ] Show user-friendly message with option to re-request
- [ ] Clear stale state and reset modal

### 4.2 No UI for Email Reminder

The email reminder is backend-only. Users will receive emails automatically.

---

## Phase 5: Integration

### 5.1 External Cron Setup

**Option A: GitHub Actions Scheduler**

**File**: `.github/workflows/scheduled-tasks.yml`

```yaml
name: Scheduled Tasks

on:
  schedule:
    - cron: '0 9 * * *'  # 9 AM UTC daily
  workflow_dispatch:  # Manual trigger

jobs:
  deletion-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger deletion reminders
        run: |
          curl -X POST "${{ secrets.API_URL }}/admin/scheduled-tasks/deletion-reminders" \
            -H "X-Admin-Key: ${{ secrets.ADMIN_API_KEY }}"
```

**Option B: Digital Ocean Functions (Future)**

- Create serverless function
- Configure daily trigger
- More integrated with existing DO infrastructure

### 5.2 Configuration

**File**: `backend/app/core/config.py`

- [ ] Add `admin_api_key: str` for scheduled task authentication
- [ ] Add to `.env.example` documentation

---

## Phase 6: Testing

### 6.1 Token Expiry Tests

**File**: `backend/tests/services/test_account_deletion_service.py`

- [ ] Test token expires after 24 hours
- [ ] Test valid token (within 24 hours) works
- [ ] Test expired token returns clear error
- [ ] Test edge case at exactly 24 hours
- [ ] Test `token_expires_at` is set on request creation

### 6.2 Query Optimization Tests

**File**: `backend/tests/services/test_account_deletion_service.py`

- [ ] Test counts match previous implementation
- [ ] Test user with no students returns zeros
- [ ] Test user with multiple students counts correctly
- [ ] Test user with notes/flashcards/sessions/AI interactions
- [ ] Performance assertion (single query vs multiple)

### 6.3 Email Reminder Tests

**File**: `backend/tests/services/test_account_deletion_service.py`

- [ ] Test `send_deletion_reminder()` returns True on success
- [ ] Test `reminder_sent_at` is updated
- [ ] Test user without email fails gracefully
- [ ] Test reminder content includes correct date
- [ ] Mock `EmailService` to avoid actual email sending

### 6.4 API Endpoint Tests

**File**: `backend/tests/api/test_account_deletion.py`

- [ ] Test scheduled endpoint requires admin key
- [ ] Test invalid key returns 403
- [ ] Test returns correct count of reminders sent
- [ ] Test already-reminded requests are skipped

---

## Phase 7: Documentation

### 7.1 API Documentation

- [ ] Document new scheduled task endpoint
- [ ] Document X-Admin-Key header requirement
- [ ] Update deletion flow documentation

### 7.2 Runbook Updates

**File**: `docs/runbooks/monitoring.md`

- [ ] Add section for scheduled tasks
- [ ] Document how to manually trigger reminders
- [ ] Add troubleshooting for failed reminders

### 7.3 Environment Variables

**File**: `.env.example`

```bash
# Admin API key for scheduled tasks
ADMIN_API_KEY=your-secure-random-key-here
```

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Token expiry breaks existing pending requests | Medium | Low | Make field nullable, only enforce on new requests |
| Query optimization returns different counts | Medium | Low | Thorough testing with real data patterns |
| Email service fails silently | Low | Medium | Log errors, monitor reminder sent counts |
| Cron job doesn't run | Medium | Low | Add manual trigger option, monitoring alert |
| Rate limiting on email service | Low | Low | Batch emails, respect Resend rate limits |

---

## Curriculum Considerations

**Not applicable** - These recommendations are infrastructure improvements that don't affect curriculum features.

---

## Privacy/Security Checklist

- [x] **Token expiry**: Prevents stale token exploitation
- [x] **No new PII collected**: Only tracking timestamps
- [x] **Email to registered address only**: No new data exposure
- [x] **Audit trail**: `reminder_sent_at` provides compliance evidence
- [x] **Admin endpoint protected**: Requires API key authentication
- [ ] **API key rotation**: Document key rotation procedure

---

## Estimated Complexity

**Overall: Simple to Medium**

| Recommendation | Complexity | Confidence |
|----------------|------------|------------|
| Token Expiry | Simple | High |
| Query Optimization | Medium | High |
| Email Reminder | Medium | High |

---

## Dependencies on Other Features

| Feature | Dependency Type | Status |
|---------|-----------------|--------|
| Account Deletion Flow | Required | ✅ Complete |
| Email Service (Resend) | Required | ✅ Complete |
| User Model | Required | ✅ Complete |
| DeletionRequest Model | Required | ✅ Complete |

---

## Implementation Checklist

### Recommendation 1: Token Expiry (45 min)

- [ ] Add `token_expires_at` field to DeletionRequest model
- [ ] Create migration for new column
- [ ] Update `request_deletion()` to set expiry
- [ ] Update `confirm_deletion()` to check expiry
- [ ] Add tests for expiry validation
- [ ] Run migration locally and verify

### Recommendation 2: Query Optimization (45 min)

- [ ] Rewrite `_count_user_data()` with single query
- [ ] Add JOIN imports if needed
- [ ] Test with various user data scenarios
- [ ] Verify counts match previous implementation
- [ ] Benchmark performance improvement

### Recommendation 3: Email Reminder (70 min)

- [ ] Add `reminder_sent_at` field to model (in same migration)
- [ ] Create `send_deletion_reminder()` method
- [ ] Create email HTML template
- [ ] Create admin endpoint for cron trigger
- [ ] Add `admin_api_key` to config
- [ ] Create GitHub Actions workflow
- [ ] Add tests for reminder functionality
- [ ] Update documentation

---

## Rollback Plan

If issues arise after deployment:

1. **Token Expiry**: Remove expiry check from `confirm_deletion()` - column can remain
2. **Query Optimization**: Revert to previous `_count_user_data()` implementation
3. **Email Reminder**: Disable cron job - no user-facing impact

All changes are backwards compatible and can be individually reverted.

---

## Success Criteria

- [ ] All tests pass (existing + new)
- [ ] No performance regression (query should be faster)
- [ ] Token expiry enforced on new requests
- [ ] Email reminders sent successfully in staging
- [ ] Cron job runs on schedule
- [ ] No increase in error rate after deployment
