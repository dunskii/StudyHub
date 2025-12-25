# StudyHub Deployment Guide

This document describes how to deploy StudyHub to production on Digital Ocean App Platform.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Redis Setup](#redis-setup)
7. [Health Checks](#health-checks)
8. [Monitoring](#monitoring)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Services

- **Digital Ocean Account** with App Platform access
- **PostgreSQL Database** (Digital Ocean Managed Database recommended)
- **Redis** (Digital Ocean Managed Redis or Redis Cloud for multi-server deployments)
- **Supabase Project** for authentication
- **Anthropic API Key** for Claude AI integration
- **Domain Name** (optional, for custom domain)

### Required Tools

- Python 3.11+
- Node.js 18+
- Git
- Docker (optional, for local testing)

---

## Environment Setup

### Generating Secure Keys

Generate a secure secret key for production:

```bash
# Python method
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Or using OpenSSL
openssl rand -base64 32
```

**Important**: The secret key must be:
- At least 32 characters long
- Not contain words like "dev", "test", "change", or "secret"
- Unique per environment (staging vs production)

### Backend Environment Variables

Create these environment variables in your deployment platform:

```bash
# Required
DATABASE_URL=postgresql+asyncpg://user:password@host:port/database
SECRET_KEY=<your-generated-secret-key-min-32-chars>
ENVIRONMENT=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_KEY=<your-supabase-service-key>
ANTHROPIC_API_KEY=sk-ant-api03-...

# Recommended
REDIS_URL=redis://user:password@host:port/0
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Optional
RATE_LIMIT_PER_MINUTE=60
LOG_LEVEL=INFO
DEBUG=false
```

### Frontend Environment Variables

```bash
VITE_API_URL=https://api.yourdomain.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
VITE_APP_ENV=production
```

---

## Database Setup

### 1. Create PostgreSQL Database

Using Digital Ocean Managed Database:

1. Create a new PostgreSQL 15+ cluster
2. Create a database named `studyhub`
3. Create a user with appropriate permissions
4. Note the connection string

### 2. Run Migrations

```bash
# Set DATABASE_URL
export DATABASE_URL="postgresql+asyncpg://user:password@host:port/studyhub"

# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head
```

### 3. Seed Curriculum Data

```bash
# Set DATABASE_URL (if not already set)
export DATABASE_URL="postgresql+asyncpg://user:password@host:port/studyhub"

# Run the seeding script
python scripts/seed_nsw_curriculum.py
```

To reset and re-seed:

```bash
python scripts/seed_nsw_curriculum.py --clear
```

### 4. Verify Database

```bash
# Connect to database and verify tables
psql $DATABASE_URL -c "\dt"

# Verify curriculum data
psql $DATABASE_URL -c "SELECT code, name FROM curriculum_frameworks;"
psql $DATABASE_URL -c "SELECT code, name FROM subjects;"
```

---

## Backend Deployment

### Digital Ocean App Platform

1. **Create App**
   - Connect your GitHub repository
   - Select the `backend` directory as the source

2. **Configure Build**
   ```yaml
   # app.yaml
   name: studyhub-api
   services:
     - name: api
       source_dir: /backend
       environment_slug: python
       build_command: pip install -r requirements.txt
       run_command: uvicorn app.main:app --host 0.0.0.0 --port 8080
       http_port: 8080
       instance_count: 2
       instance_size_slug: professional-xs
       health_check:
         http_path: /health
         timeout_seconds: 10
   ```

3. **Set Environment Variables**
   - Add all required environment variables in the App Platform console
   - Mark sensitive values as "Encrypt"

4. **Deploy**
   - Trigger deployment
   - Monitor build logs for errors

### Docker Deployment (Alternative)

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
# Build and run
docker build -t studyhub-api ./backend
docker run -p 8000:8000 --env-file .env studyhub-api
```

---

## Frontend Deployment

### Digital Ocean App Platform

1. **Create Static Site**
   - Connect your GitHub repository
   - Select the `frontend` directory as the source

2. **Configure Build**
   ```yaml
   # app.yaml (add to existing)
   static_sites:
     - name: frontend
       source_dir: /frontend
       build_command: npm ci && npm run build
       output_dir: dist
       environment_slug: node-js
       catchall_document: index.html
   ```

3. **Set Environment Variables**
   - Add frontend environment variables
   - These are embedded at build time

4. **Configure CDN**
   - Enable Cloudflare or Digital Ocean CDN
   - Configure caching headers

### Build Commands

```bash
cd frontend

# Install dependencies
npm ci

# Type check
npm run typecheck

# Build for production
npm run build

# Preview build locally
npm run preview
```

---

## Redis Setup

### Why Redis?

Redis is required for production multi-server deployments to share:
- Rate limiting counters
- CSRF tokens
- Session data (future)
- Caching (future)

### Digital Ocean Managed Redis

1. Create a Redis cluster in Digital Ocean
2. Note the connection string
3. Set `REDIS_URL` environment variable

### Redis Cloud (Alternative)

1. Create a free Redis Cloud account
2. Create a database
3. Copy the connection string

### Connection String Format

```
redis://[[username]:[password]@]host[:port][/database]

# Examples
redis://localhost:6379/0
redis://default:password@redis-12345.c1.us-east-1-2.ec2.cloud.redislabs.com:12345/0
rediss://user:password@host:port/0  # TLS connection
```

### Verify Redis Connection

```python
import redis

r = redis.from_url("redis://localhost:6379/0")
r.ping()  # Should return True
```

---

## Health Checks

### Backend Health Endpoint

The backend exposes a health check endpoint:

```
GET /health
```

Response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "environment": "production"
}
```

### Configuring Health Checks

Digital Ocean App Platform:
```yaml
health_check:
  http_path: /health
  timeout_seconds: 10
  period_seconds: 30
  failure_threshold: 3
```

### Monitoring Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Basic health check |
| `GET /api/v1/frameworks` | Verify database connection |

---

## Monitoring

### Recommended Setup

1. **Error Tracking**: Sentry
   ```bash
   # Add to requirements.txt
   sentry-sdk[fastapi]>=1.0.0

   # Configure in app
   import sentry_sdk
   sentry_sdk.init(dsn="your-sentry-dsn")
   ```

2. **Logging**: Digital Ocean provides built-in logging
   - Access via App Platform console
   - Configure log retention

3. **Metrics**: Consider adding
   - Prometheus metrics endpoint
   - Grafana dashboards

### Log Levels

Set `LOG_LEVEL` environment variable:
- `DEBUG`: Detailed debugging (development only)
- `INFO`: General operational messages (recommended for production)
- `WARNING`: Warning messages
- `ERROR`: Error messages only

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors

**Symptom**: `Connection refused` or `timeout`

**Solutions**:
- Verify DATABASE_URL format includes `+asyncpg`
- Check database firewall allows App Platform IPs
- Verify database credentials

```bash
# Test connection
python -c "from sqlalchemy import create_engine; e = create_engine('$DATABASE_URL'); e.connect()"
```

#### 2. Production Validation Errors

**Symptom**: App fails to start with configuration errors

**Solutions**:
- Ensure SECRET_KEY is at least 32 characters
- Ensure SECRET_KEY doesn't contain "dev", "test", "change"
- Set ENVIRONMENT=production

#### 3. CORS Errors

**Symptom**: Frontend requests blocked by CORS

**Solutions**:
- Add frontend domain to ALLOWED_ORIGINS
- Include both www and non-www versions
- Include protocol (https://)

```bash
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

#### 4. Rate Limiting Issues

**Symptom**: Users getting 429 errors unexpectedly

**Solutions**:
- Check X-Forwarded-For header is passed correctly
- Verify RATE_LIMIT_PER_MINUTE setting
- For multi-server, ensure REDIS_URL is configured

#### 5. Redis Connection Issues

**Symptom**: Warnings about Redis not available

**Solutions**:
- Verify REDIS_URL format
- Check Redis firewall settings
- Test connection separately
- App will fall back to in-memory (single-server only)

### Viewing Logs

Digital Ocean App Platform:
1. Go to App > Components > api
2. Click "Runtime Logs"
3. Use log filters for specific time ranges

### Rolling Back

If a deployment causes issues:

1. Go to App > Activity
2. Find the last working deployment
3. Click "..." > "Rollback to this deployment"

---

## Security Checklist

Before going live, verify:

- [ ] SECRET_KEY is unique and secure (32+ characters)
- [ ] DATABASE_URL uses SSL connection
- [ ] REDIS_URL uses TLS if available (rediss://)
- [ ] ALLOWED_ORIGINS is set correctly
- [ ] DEBUG=false in production
- [ ] ENVIRONMENT=production
- [ ] Supabase RLS policies are configured
- [ ] API rate limiting is enabled
- [ ] HTTPS is enforced (HSTS enabled)
- [ ] Error responses don't leak sensitive info

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests pass locally
- [ ] Environment variables documented
- [ ] Database migrations ready
- [ ] Seed data prepared

### Deployment

- [ ] Run database migrations
- [ ] Seed curriculum data
- [ ] Deploy backend
- [ ] Verify health check
- [ ] Deploy frontend
- [ ] Test end-to-end flow

### Post-Deployment

- [ ] Monitor error logs
- [ ] Verify all features work
- [ ] Check performance metrics
- [ ] Document any issues

---

## Support

For deployment issues:
1. Check this documentation
2. Review application logs
3. Check GitHub Issues
4. Contact the development team

---

*Last Updated: December 2025*
