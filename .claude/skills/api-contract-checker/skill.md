# API Contract Checker Skill

Validates API endpoint contracts between frontend and backend.

## Usage
```
/skill api-contract-checker [endpoint_path]
```

## Validation Checks

### Request Validation
- [ ] Pydantic schema exists for request body
- [ ] Path parameters typed
- [ ] Query parameters validated
- [ ] Required vs optional clear
- [ ] Authentication requirement documented

### Response Validation
- [ ] Response schema defined
- [ ] All fields typed
- [ ] Nullable fields marked
- [ ] Error responses documented

### Frontend Alignment
- [ ] TypeScript types match
- [ ] React Query hooks use correct types
- [ ] Error handling matches backend
- [ ] Loading states handled

### Curriculum-Specific
- [ ] Framework filtering works
- [ ] Subject-aware endpoints correct
- [ ] Stage/pathway params handled
- [ ] Outcome codes validated

### Contract Output
```markdown
# API Contract: [Endpoint]

## Endpoint Info
- Method: GET/POST/PUT/DELETE
- Path: /api/v1/...
- Auth Required: Yes/No
- Roles: [allowed roles]

## Request Schema

### Path Parameters
| Param | Type | Required | Validation |
|-------|------|----------|------------|

### Query Parameters
| Param | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|

### Request Body (if applicable)
```typescript
interface RequestBody {
  field: type;
}
```

## Response Schema

### Success (200)
```typescript
interface SuccessResponse {
  field: type;
}
```

### Error Responses
| Status | Condition | Body |
|--------|-----------|------|
| 400 | Validation error | `{detail: string}` |
| 401 | Unauthorized | `{detail: string}` |
| 404 | Not found | `{detail: string}` |

## Frontend Usage
```typescript
// React Query hook
const { data } = useQuery({
  queryKey: ['key'],
  queryFn: () => api.endpoint(params)
});
```

## Contract Violations
| Issue | Frontend | Backend | Fix Needed |
|-------|----------|---------|------------|

## Recommendations
1. [Type alignment fix]
2. [Missing validation]
```
