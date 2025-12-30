# Deployment Runbook - StudyHub

## Overview

This runbook covers deployment procedures for StudyHub to Digital Ocean App Platform.

## Pre-Deployment Checklist

### Code Quality Gates

- [ ] All tests passing (backend: pytest, frontend: vitest)
- [ ] No TypeScript/Python type errors
- [ ] ESLint/Ruff checks passing
- [ ] Security scan passing (pip-audit, npm audit)
- [ ] Code review approved
- [ ] Branch merged to main

### Environment Variables

Verify all required environment variables are set in Digital Ocean:

#### Backend
```
DATABASE_URL=postgresql+asyncpg://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
RESEND_API_KEY=re_...
DO_SPACES_KEY=...
DO_SPACES_SECRET=...
DO_SPACES_BUCKET=studyhub-assets
APP_ENV=production
APP_SECRET_KEY=...
```

#### Frontend
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=https://api.studyhub.example.com
VITE_SENTRY_DSN=https://...
VITE_APP_ENV=production
```

## Deployment Steps

### 1. Database Migration (if needed)

```bash
# SSH into backend or use doctl
doctl apps console <app-id>

# Run migrations
cd backend
alembic upgrade head

# Verify migration
alembic current
```

### 2. Backend Deployment

```bash
# Push to main branch triggers automatic deployment
git push origin main

# Or manual deployment via doctl
doctl apps create-deployment <app-id>
```

#### Verify Backend Health

```bash
# Health check endpoint
curl https://api.studyhub.example.com/health

# Expected response
# {"status": "healthy", "version": "1.0.0"}
```

### 3. Frontend Deployment

```bash
# Frontend auto-deploys from main branch
# Or force redeploy
doctl apps create-deployment <app-id> --component frontend
```

#### Verify Frontend

1. Visit https://studyhub.example.com
2. Check browser console for errors
3. Verify login flow works
4. Verify API calls succeed

### 4. Post-Deployment Verification

Run smoke tests:

```bash
# Backend smoke tests
curl -X POST https://api.studyhub.example.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass"}'

# Check API health
curl https://api.studyhub.example.com/api/v1/health
```

## Rollback Procedures

### Immediate Rollback

```bash
# List recent deployments
doctl apps list-deployments <app-id>

# Rollback to previous deployment
doctl apps create-deployment <app-id> --from-deployment <previous-deployment-id>
```

### Database Rollback

```bash
# Downgrade to previous migration
cd backend
alembic downgrade -1

# Or downgrade to specific revision
alembic downgrade <revision-id>
```

### Emergency Procedures

1. **Total outage**: Rollback both frontend and backend
2. **Database corruption**: Restore from backup
3. **Authentication failure**: Check Supabase service status
4. **AI service failure**: Enable fallback mode (disable AI features)

## Monitoring

### Key Metrics to Watch

- Response time p95 < 2s
- Error rate < 1%
- Database connection pool usage < 80%
- Memory usage < 80%
- CPU usage < 80%

### Alerts

Configure alerts for:
- 5xx error rate > 5%
- Response time p95 > 5s
- Health check failures
- Certificate expiration (30 days)

### Log Access

```bash
# View backend logs
doctl apps logs <app-id> --component backend

# View frontend build logs
doctl apps logs <app-id> --component frontend --type BUILD
```

## Blue-Green Deployment (Future)

For zero-downtime deployments:

1. Deploy to staging slot
2. Run smoke tests on staging
3. Switch production traffic to staging
4. Keep old production as rollback target

## Maintenance Windows

Recommended maintenance windows:
- **Primary**: Sunday 2:00 AM - 6:00 AM AEST
- **Secondary**: Wednesday 2:00 AM - 4:00 AM AEST

Notify users 24 hours in advance for planned maintenance.

## Contact Information

- **On-call**: [TBD]
- **Digital Ocean Support**: support.digitalocean.com
- **Supabase Support**: support.supabase.com
- **Anthropic Support**: support.anthropic.com
