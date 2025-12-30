# Implementation Plan: Timing-Safe Comparison Fix

## Overview

Apply timing-safe comparison for admin API key validation to prevent timing attacks. This is a single-line security fix following an existing pattern in the codebase.

---

## Prerequisites

- [x] Study completed (`md/study/recommendation-before-merge.md`)
- [x] Existing pattern identified (`middleware/security.py:285`)
- [x] Tests exist for admin endpoint

---

## Implementation (Single Phase)

### Step 1: Add Import
**File**: `backend/app/api/v1/endpoints/users.py`

- [ ] Check if `secrets` module is already imported
- [ ] Add `import secrets` if not present

### Step 2: Replace Comparison
**File**: `backend/app/api/v1/endpoints/users.py` (line 666)

- [ ] Replace:
  ```python
  if x_admin_key != settings.admin_api_key:
  ```
- [ ] With:
  ```python
  if not secrets.compare_digest(x_admin_key, settings.admin_api_key):
  ```

### Step 3: Verify Tests Pass
- [ ] Run `pytest tests/api/test_account_deletion.py -v`
- [ ] Ensure all 18 API tests still pass

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking change | None | `compare_digest` returns same bool as `!=` |
| Test failures | None | Tests check status codes, not timing |
| Performance | Negligible | Standard library, constant time |

---

## Privacy/Security Checklist

- [x] Prevents timing attacks on admin API key
- [x] Uses Python standard library (no dependencies)
- [x] Follows existing codebase pattern
- [x] Rate limiting remains as defense-in-depth

---

## Estimated Complexity

**Simple** - Single file, ~3 lines changed

---

## Files to Modify

| File | Change |
|------|--------|
| `backend/app/api/v1/endpoints/users.py` | Add import, replace comparison |

---

## Verification Commands

```bash
# Run tests
cd backend && pytest tests/api/test_account_deletion.py -v

# Verify import
grep -n "import secrets" backend/app/api/v1/endpoints/users.py
```

---

## No Changes Needed

- Database/migrations
- Frontend
- Other backend files
- Documentation (internal security fix)
