# Study: Phase 10 Minor Recommendations

## Summary

Research into the three minor recommendations identified in the Phase 10 QA review:
1. **Confirmation token expiry check** - Add 24-hour time limit on deletion confirmation tokens
2. **Count queries optimization** - Combine 5 DB queries into 1 using JOINs
3. **Email reminder before deletion** - Send reminder 1 day before scheduled deletion

All three are implementable with moderate effort and provide security, performance, and UX improvements.

---

## Key Requirements

### 1. Token Expiry Check (Security)
- Confirmation tokens should expire after 24 hours
- Prevents stale tokens from being used days after email was sent
- Aligns with `cleanup_expired_pending_requests()` which cancels after 24 hours

### 2. Query Optimization (Performance)
- Current `_count_user_data` uses 5 sequential queries
- Adds 200-500ms latency during deletion
- Should be combined into single query with JOINs

### 3. Email Reminder (Compliance/UX)
- Send email 1 day before scheduled deletion
- Helps users who may have forgotten about pending deletion
- Reinforces 7-day grace period for COPPA compliance

---

## Existing Patterns

### Account Deletion Service
```python
# backend/app/services/account_deletion_service.py

# Current cleanup method (24-hour expiry pattern already exists)
async def cleanup_expired_pending_requests(self) -> int:
    expiry_threshold = datetime.now(timezone.utc) - timedelta(hours=24)
    # Cancels pending requests older than 24 hours
```

### Single Query Pattern (AI Usage Service)
```python
# backend/app/services/ai_usage_service.py:282-297
# Already uses optimized single-query with aggregation
result = await self.db.execute(
    select(
        func.sum(AIUsage.tokens_haiku).label("haiku"),
        func.sum(AIUsage.tokens_sonnet).label("sonnet"),
        func.sum(AIUsage.total_cost_usd).label("cost"),
    ).where(...)
)
```

### Email Service
```python
# backend/app/services/email_service.py
# Full Resend API integration exists with:
# - send_email() - Generic email sending
# - send_weekly_summary() - Template example
# - HTML templates with responsive design
```

---

## Technical Considerations

### 1. Token Expiry

**Model Change** (`deletion_request.py`):
```python
token_expires_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True),
    default=lambda: datetime.now(timezone.utc) + timedelta(hours=24),
)
```

**Service Update** (`account_deletion_service.py`):
```python
async def confirm_deletion(...):
    # Existing checks...
    if deletion_request.token_expires_at < datetime.now(timezone.utc):
        raise ValueError("Confirmation token has expired. Please request a new deletion.")
```

**Migration Required**: Add `token_expires_at` column

### 2. Query Optimization

**Current**: 5 sequential queries
```python
# Query 1: Get student IDs
# Query 2: Count notes
# Query 3: Count flashcards
# Query 4: Count sessions
# Query 5: Count AI interactions
```

**Optimized**: Single query with JOINs
```python
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
```

**Benefits**: 80-90% latency reduction

### 3. Email Reminder

**Two Implementation Approaches**:

**Approach A (Simple - External Cron)**:
- Add `reminder_sent_at` field to DeletionRequest
- Create `send_deletion_reminder()` method
- Create HTTP endpoint for external cron to call
- Use GitHub Actions scheduler or Digital Ocean functions

**Approach B (APScheduler)**:
- Add `apscheduler>=3.10.0` to requirements.txt
- Create `app/core/scheduler.py`
- Register scheduled jobs in lifespan event
- Self-contained, no external dependencies

**Recommendation**: Start with Approach A, migrate to B post-launch

---

## Database Changes

| Change | Migration | Impact |
|--------|-----------|--------|
| `token_expires_at` column | New migration | No data loss, nullable default |
| `reminder_sent_at` column | New migration | No data loss, nullable |
| Query optimization | No migration | Code only |

---

## Security/Privacy Considerations

### Token Expiry
- **Security**: Prevents stale tokens from being exploited
- **Privacy**: Aligns with COPPA requirement for clear consent windows
- **Risk**: Tokens could theoretically be used days later without this

### Email Reminder
- **Compliance**: Supports "right to deletion" by reminding users
- **Privacy**: Email only to registered address
- **Audit**: `reminder_sent_at` tracks notification delivery

---

## Dependencies

### Token Expiry
- None (uses existing datetime utilities)

### Query Optimization
- None (uses existing SQLAlchemy patterns)

### Email Reminder
| Approach | Dependencies |
|----------|--------------|
| A (External Cron) | None - uses existing email_service |
| B (APScheduler) | `apscheduler>=3.10.0` |

---

## Effort Estimates

| Recommendation | Complexity | Effort | Priority |
|----------------|------------|--------|----------|
| Token Expiry | Low | 45 min | High (security) |
| Query Optimization | Medium | 45 min | Medium (performance) |
| Email Reminder (A) | Medium | 70 min | Medium (UX) |
| Email Reminder (B) | Medium | +65 min | Future |

**Total for all three (Approach A)**: ~2.5 hours

---

## Implementation Order

1. **Token Expiry** - Quick security win
2. **Query Optimization** - Performance improvement
3. **Email Reminder** - UX enhancement (can be deferred)

---

## Open Questions

1. Should token expiry trigger automatic cancellation or just rejection?
   - **Recommendation**: Rejection with error message asking user to re-request

2. Should email reminder respect notification preferences?
   - **Recommendation**: No - deletion reminder is critical, always send

3. What time should daily reminder job run?
   - **Recommendation**: 9 AM in user's timezone (or UTC if not set)

---

## Files Affected

### All Recommendations
- `backend/app/models/deletion_request.py`
- `backend/app/services/account_deletion_service.py`
- `backend/tests/services/test_account_deletion_service.py`

### Token Expiry Only
- `backend/alembic/versions/024_token_expiry.py` (new)

### Email Reminder Only
- `backend/app/api/v1/endpoints/users.py`
- `backend/app/core/scheduler.py` (new, for Approach B)

---

## Sources Referenced

- `backend/app/services/account_deletion_service.py`
- `backend/app/models/deletion_request.py`
- `backend/app/services/email_service.py`
- `backend/app/services/notification_service.py`
- `backend/app/services/ai_usage_service.py` (optimized query pattern)
- `md/review/phase-10-recommendations.md` (QA findings)
