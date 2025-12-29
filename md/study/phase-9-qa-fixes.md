# Study: Phase 9 QA Priority 1 & 2 Fixes

## Summary

This document outlines the research findings for implementing the Priority 1 and Priority 2 fixes identified in the Phase 9 PWA & Offline QA review. The fixes address security, code quality, and test coverage gaps.

---

## Priority 1 Fixes (High - Before Launch)

### 1.1 Add Rate Limiting to Push Notification Endpoints

**Requirement**: Prevent subscription spam and abuse of push endpoints.

**Existing Patterns Found**:

The codebase has three established rate limiting patterns:

| Type | Location | Mechanism | Limit |
|------|----------|-----------|-------|
| Global API | `middleware/rate_limit.py` | IP-based sliding window | 60 req/min |
| Auth | `core/security.py` | IP-based + lockout | 5 attempts/min + 5-min lockout |
| Chat | `socratic.py` | Student-ID based | 30 msgs/min |

**Recommended Approach**: Use the `AuthRateLimiter` pattern from `core/security.py` since it's the simplest for endpoint-specific rate limiting.

**Implementation**:
```python
# In backend/app/core/security.py - add new limiter
push_rate_limiter = AuthRateLimiter(
    max_attempts=10,     # 10 subscriptions per minute
    window_seconds=60,
    lockout_seconds=300, # 5 minute lockout if exceeded
)

# In push.py endpoints - add dependency
from app.core.security import push_rate_limiter

@router.post("/subscribe")
async def subscribe_push(
    subscription: PushSubscriptionCreate,
    current_user: AuthenticatedUser,
    db: Database,
    request: Request,  # Add request for IP tracking
):
    push_rate_limiter.check_rate_limit(request)
    # ... existing logic
```

**Files to Modify**:
- `backend/app/core/security.py` - Add `push_rate_limiter` instance
- `backend/app/api/v1/endpoints/push.py` - Add rate limit dependency

---

### 1.2 Add Backend Tests for Push Endpoints and Service

**Requirement**: Full test coverage for push notification functionality.

**Existing Test Patterns**:

1. **Fixtures** (`conftest.py`):
   - `db_session` - Real database session
   - `authenticated_client` - HTTP client with JWT auth
   - `sample_user` - Test user in database

2. **Endpoint Test Pattern** (from `test_users.py`, `test_students.py`):
```python
@pytest.mark.asyncio
async def test_endpoint_requires_auth(client: AsyncClient):
    response = await client.post("/api/v1/push/subscribe", json={...})
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_endpoint_success(authenticated_client: AsyncClient):
    response = await authenticated_client.post("/api/v1/push/subscribe", json={...})
    assert response.status_code == 201
```

3. **Service Test Pattern** (from `test_notification_service.py`):
```python
@pytest.fixture
def mock_db():
    return AsyncMock()

@pytest.fixture
def push_service(mock_db):
    return PushService(db=mock_db)

@pytest.mark.asyncio
async def test_create_subscription(push_service, mock_db):
    mock_db.execute.return_value = MagicMock(scalar_one_or_none=lambda: None)
    # ... test logic
```

**Test Files to Create**:
- `backend/tests/api/test_push.py` - Endpoint tests
- `backend/tests/services/test_push_service.py` - Service unit tests

**Test Cases Required**:

| Endpoint | Test Cases |
|----------|------------|
| POST /subscribe | Auth required, success, duplicate handling, rate limit |
| DELETE /unsubscribe | Auth required, success, not found |
| DELETE /subscriptions/{id} | Auth required, success, not found, ownership |
| GET /subscriptions | Auth required, returns user's subs only |
| POST /test | Auth required, success, no subs error |

---

### 1.3 Validate Push Endpoint URL Format

**Requirement**: Prevent potential injection by validating endpoint URLs.

**Existing Patterns**:

1. **Pydantic HttpUrl** (recommended):
```python
from pydantic import HttpUrl, Field

class PushSubscriptionCreate(BaseModel):
    endpoint: HttpUrl = Field(..., description="Push service endpoint URL")
```

2. **Custom Validator** (for more control):
```python
from pydantic import field_validator
import re

@field_validator("endpoint")
@classmethod
def validate_endpoint(cls, v: str) -> str:
    """Validate push service endpoint URL."""
    if not v.startswith(("https://", "http://")):
        raise ValueError("Endpoint must be a valid HTTP(S) URL")
    # Optional: validate known push services
    valid_domains = [
        "fcm.googleapis.com",
        "updates.push.services.mozilla.com",
        "notify.windows.com",
        "push.apple.com",
    ]
    # Just validate URL format, don't restrict domains
    return v
```

**Files to Modify**:
- `backend/app/schemas/push.py` - Add URL validation

---

### 1.4 Replace datetime.utcnow() with datetime.now(timezone.utc)

**Requirement**: Fix deprecated datetime usage.

**Locations to Fix**:
- `backend/app/models/push_subscription.py` lines 47, 48, 51
- `backend/app/services/push_service.py` lines 48, 120, 121

**Pattern**:
```python
# Before (deprecated)
from datetime import datetime
created_at = Column(DateTime, default=datetime.utcnow)

# After (correct)
from datetime import datetime, timezone
created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
```

---

## Priority 2 Fixes (Medium - Soon)

### 2.1 Add Tests for SyncStatus and NotificationPrompt Components

**Requirement**: Frontend component test coverage.

**Existing Test Patterns** (from `OfflineIndicator.test.tsx`):
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock hooks
vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(),
}));

describe('Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    mockHook.mockReturnValue({ isOnline: true });
    render(<Component />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
```

**Test Files to Create**:
- `frontend/src/components/ui/__tests__/SyncStatus.test.tsx`
- `frontend/src/components/ui/__tests__/NotificationPrompt.test.tsx`

---

### 2.2 Remove Unused JSONB Import

**Requirement**: Code cleanup.

**File**: `backend/app/models/push_subscription.py` line 6

**Fix**: Remove `JSONB` from import:
```python
# Before
from sqlalchemy.dialects.postgresql import UUID, JSONB

# After
from sqlalchemy.dialects.postgresql import UUID
```

---

### 2.3 Add Proper TypeScript Typing for pushsubscriptionchange Event

**Requirement**: Type safety in service worker.

**File**: `frontend/src/sw.ts` line 186

**Current Issue**:
```typescript
applicationServerKey: (event as any).oldSubscription?.options?.applicationServerKey,
```

**Fix**:
```typescript
interface PushSubscriptionChangeEvent extends ExtendableEvent {
  oldSubscription?: PushSubscription;
  newSubscription?: PushSubscription;
}

self.addEventListener('pushsubscriptionchange', (event) => {
  const pushEvent = event as PushSubscriptionChangeEvent;
  // ... use pushEvent.oldSubscription
});
```

---

### 2.4 Implement Actual Push Notification Sending

**Requirement**: Enable real push notifications (currently placeholder).

**Dependencies Required**:
- `pywebpush` library
- VAPID key pair generation
- Environment variables for VAPID keys

**Implementation Pattern**:
```python
from pywebpush import webpush, WebPushException

async def send_notification(
    self,
    subscription: PushSubscription,
    payload: PushNotificationPayload,
) -> bool:
    try:
        webpush(
            subscription_info={
                "endpoint": subscription.endpoint,
                "keys": {
                    "p256dh": subscription.p256dh_key,
                    "auth": subscription.auth_key,
                },
            },
            data=payload.model_dump_json(),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": f"mailto:{settings.VAPID_EMAIL}"},
        )
        await self.mark_subscription_used(subscription.id)
        return True
    except WebPushException as e:
        if e.response and e.response.status_code in (404, 410):
            subscription.is_active = False
            await self.db.commit()
        else:
            await self.mark_subscription_failed(subscription.id)
        return False
```

**Environment Variables Needed**:
- `VAPID_PRIVATE_KEY` - Base64 encoded private key
- `VAPID_PUBLIC_KEY` - Base64 encoded public key
- `VAPID_EMAIL` - Contact email for VAPID

---

## Technical Considerations

### Database
- No schema changes required for Priority 1/2 fixes
- datetime changes are backwards compatible

### API
- Rate limiting adds new 429 response possibility
- URL validation adds new 422 validation error possibility

### Frontend
- No breaking changes
- New tests only

---

## Dependencies

### Priority 1
- None - all patterns exist in codebase

### Priority 2
- `pywebpush` library for actual push sending
- VAPID key generation tool

---

## Implementation Order

1. **datetime.utcnow() fix** - Simple, no dependencies
2. **URL validation** - Simple schema change
3. **Rate limiting** - Follow existing pattern
4. **Remove JSONB import** - Trivial cleanup
5. **Backend tests** - Critical for coverage
6. **Frontend tests** - Component coverage
7. **TypeScript typing** - Type safety
8. **Push implementation** - Requires pywebpush setup

---

## Sources Referenced

- `backend/app/core/security.py` - AuthRateLimiter pattern
- `backend/app/middleware/rate_limit.py` - Middleware pattern
- `backend/tests/conftest.py` - Test fixtures
- `backend/tests/api/test_users.py` - Endpoint test patterns
- `backend/tests/services/test_notification_service.py` - Service test patterns
- `frontend/src/components/ui/__tests__/OfflineIndicator.test.tsx` - Component test patterns
- `backend/app/schemas/user.py` - EmailStr validation pattern
- `backend/app/schemas/notification.py` - Custom validator pattern
