# Incident Response Runbook - StudyHub

## Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| SEV1 | Complete outage | 15 minutes | Site down, data loss |
| SEV2 | Major degradation | 1 hour | Auth broken, AI unusable |
| SEV3 | Minor degradation | 4 hours | Slow performance, feature broken |
| SEV4 | Cosmetic/minor | Next business day | UI glitch, minor bug |

## Incident Response Process

### 1. Detection

**Automated Alerts**:
- Uptime monitoring (Pingdom, UptimeRobot)
- Error rate spikes (Sentry)
- Performance degradation (DO Monitoring)
- Health check failures

**User Reports**:
- Support tickets
- Social media mentions
- Direct contact

### 2. Triage

1. Assess severity based on:
   - Number of users affected
   - Business impact
   - Data integrity risk
   - Duration

2. Assign incident commander

3. Create incident channel (if SEV1/SEV2)

### 3. Diagnosis

#### Check System Status

```bash
# API health
curl https://api.studyhub.example.com/health

# Database connectivity
doctl apps logs <app-id> --component backend | grep -i error

# Check external services
# - Supabase status: status.supabase.com
# - Anthropic status: status.anthropic.com
# - Digital Ocean status: status.digitalocean.com
```

#### Common Issues

**API Errors**:
```bash
# Check recent logs
doctl apps logs <app-id> --component backend --follow

# Check error patterns
doctl apps logs <app-id> --component backend | grep -E "ERROR|CRITICAL"
```

**Database Issues**:
```bash
# Check connection pool
# Look for "too many connections" or timeout errors

# Check slow queries
# Enable slow query logging if not already enabled
```

**Memory/CPU Issues**:
```bash
# Check resource usage in DO dashboard
# Scale up if needed
doctl apps update <app-id> --spec spec.yaml
```

### 4. Mitigation

#### Rollback

```bash
# List deployments
doctl apps list-deployments <app-id>

# Rollback to last known good
doctl apps create-deployment <app-id> --from-deployment <deployment-id>
```

#### Feature Flags

Disable problematic features:
1. Set `FEATURE_AI_TUTOR=false` for AI issues
2. Set `FEATURE_OCR=false` for OCR issues
3. Set `FEATURE_PUSH=false` for notification issues

#### Scale Up

```bash
# Increase instances
doctl apps update <app-id> --instance-count 3

# Or update spec
doctl apps update <app-id> --spec scaled-spec.yaml
```

#### Maintenance Mode

```bash
# Enable maintenance mode
# Set MAINTENANCE_MODE=true in environment

# Or deploy maintenance page
# Switch frontend to static maintenance page
```

### 5. Resolution

1. Confirm fix is working
2. Monitor for 30 minutes
3. Document root cause
4. Update incident channel

### 6. Post-Incident

1. **Timeline**: Document what happened and when
2. **Root Cause**: Identify underlying cause
3. **Impact**: Quantify user impact
4. **Action Items**: Preventive measures
5. **Review Meeting**: Schedule if SEV1/SEV2

## Common Scenarios

### Authentication Failures

**Symptoms**: Users can't log in, "Invalid token" errors

**Diagnosis**:
```bash
# Check Supabase status
# Check JWT configuration
# Verify SUPABASE_URL and keys
```

**Resolution**:
1. Verify Supabase service status
2. Check environment variables
3. Restart backend service
4. If key compromised: rotate keys immediately

### Database Connectivity

**Symptoms**: 500 errors, "connection refused" in logs

**Diagnosis**:
```bash
# Check database status in DO dashboard
# Check connection string
# Verify SSL settings
```

**Resolution**:
1. Check DO database cluster status
2. Verify DATABASE_URL
3. Check firewall/VPC settings
4. Restart backend pods
5. Scale database if connection limit hit

### AI Service Degradation

**Symptoms**: Tutor not responding, slow AI responses

**Diagnosis**:
```bash
# Check Anthropic API status
# Check rate limits
# Check API key validity
```

**Resolution**:
1. Check Anthropic status page
2. Verify API key
3. Check rate limit usage
4. Enable fallback mode (disable AI)
5. Queue requests if rate limited

### High Error Rate

**Symptoms**: 5xx errors spiking

**Diagnosis**:
```bash
# Check error logs
doctl apps logs <app-id> --component backend | grep -E "500|502|503"

# Check recent changes
git log --oneline -10
```

**Resolution**:
1. Identify error pattern
2. Check recent deployments
3. Rollback if deployment-related
4. Fix and redeploy if code issue

### Performance Degradation

**Symptoms**: Slow responses, timeouts

**Diagnosis**:
```bash
# Check resource usage
# Check database query performance
# Check external API latencies
```

**Resolution**:
1. Scale up instances
2. Optimize slow queries
3. Add caching
4. Enable CDN for static assets

## Communication Templates

### Status Page Update

```
[INVESTIGATING] StudyHub - Elevated Error Rates
We are investigating reports of elevated error rates affecting the StudyHub platform.
Users may experience slow loading or intermittent errors.
We will provide updates as we learn more.
```

### User Notification (Email)

```
Subject: StudyHub Service Update

Dear StudyHub Users,

We experienced a brief service interruption today between [TIME] and [TIME] AEST.
The issue has been resolved and all services are operating normally.

We apologize for any inconvenience this may have caused.

The StudyHub Team
```

## Escalation Contacts

| Role | Contact | When to Escalate |
|------|---------|------------------|
| On-call Engineer | [TBD] | All incidents |
| Tech Lead | [TBD] | SEV1/SEV2 |
| Product Manager | [TBD] | User-facing issues |
| Security | [TBD] | Security incidents |
| Legal | [TBD] | Data breaches |

## Security Incidents

For security-related incidents (data breach, unauthorized access):

1. **Contain**: Disable affected accounts/features
2. **Preserve Evidence**: Don't delete logs
3. **Notify**: Security team immediately
4. **Assess**: Determine data exposure
5. **Notify Authorities**: If required by law (72 hours for GDPR)
6. **User Notification**: As required by regulations
