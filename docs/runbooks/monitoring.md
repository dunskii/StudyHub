# Monitoring Runbook

## Overview

This runbook covers the monitoring setup for StudyHub, including health checks, metrics, alerts, and incident response procedures.

## Monitoring Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Application   │────▶│   Prometheus    │────▶│   Grafana       │
│   /metrics      │     │   (scraping)    │     │   (dashboards)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │ AlertManager    │────▶ Slack/Email
                        └─────────────────┘
```

## Health Check Endpoints

### Basic Health Check
- **Endpoint**: `GET /health`
- **Purpose**: Quick liveness check
- **Expected Response**: `200 OK` with `{"status": "healthy"}`
- **Timeout**: 5 seconds

### Detailed Health Check
- **Endpoint**: `GET /api/v1/metrics/health/detailed`
- **Purpose**: Component-level health status
- **Expected Response**: JSON with status of all components
- **Use Case**: Debugging, detailed monitoring

### Prometheus Metrics
- **Endpoint**: `GET /api/v1/metrics`
- **Purpose**: Prometheus-compatible metrics scraping
- **Format**: Prometheus text format
- **Scrape Interval**: 15 seconds recommended

## Key Metrics

### Application Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `studyhub_users_total` | Gauge | Total registered users |
| `studyhub_students_total` | Gauge | Total student profiles |
| `studyhub_sessions_today` | Gauge | Sessions started today |
| `studyhub_ai_interactions_today` | Gauge | AI tutor interactions today |

### Request Metrics (via middleware)

| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | Total HTTP requests by status/method |
| `http_request_duration_seconds` | Histogram | Request latency distribution |

### Database Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `db_pool_size` | Gauge | Current connection pool size |
| `db_slow_queries_total` | Counter | Queries exceeding threshold |

## Alert Response Procedures

### Critical: StudyHubDown

**Symptoms**: Health check failing for >2 minutes

**Steps**:
1. Check Digital Ocean App Platform status
2. Verify database connectivity
3. Check application logs: `doctl apps logs <app-id>`
4. If database issue, see Database Operations runbook
5. If application issue, attempt restart: `doctl apps create-deployment <app-id>`
6. Escalate if not resolved within 15 minutes

### Critical: HighErrorRate

**Symptoms**: 5xx errors >5% of traffic

**Steps**:
1. Check application logs for error patterns
2. Identify affected endpoints
3. Check recent deployments (possible regression)
4. Check database health
5. Check external service status (Supabase, Anthropic)
6. Consider rollback if recent deployment caused issue

### Warning: AIHighCost

**Symptoms**: AI API costs exceeding $10/hour

**Steps**:
1. Check AI usage metrics for anomalies
2. Identify students with unusually high usage
3. Review for potential abuse or bug
4. Consider temporarily enabling stricter limits
5. Contact affected users if needed

### Warning: AuthFailuresSpike

**Symptoms**: >10 auth failures per minute

**Steps**:
1. Check for common IP addresses in failures
2. Verify not a legitimate issue (API key rotation, etc.)
3. Consider blocking suspicious IPs
4. Review Supabase Auth logs
5. If attack confirmed, enable additional rate limiting

## Dashboard Setup

### Recommended Grafana Dashboards

1. **Overview Dashboard**
   - Total users/students
   - Active sessions
   - Request rate and latency
   - Error rate

2. **AI Usage Dashboard**
   - AI interactions per hour
   - Token usage by model
   - Cost tracking
   - Limit breach count

3. **Performance Dashboard**
   - Response time percentiles
   - Database query times
   - External service latency

### Sample Dashboard JSON

```json
{
  "title": "StudyHub Overview",
  "panels": [
    {
      "title": "Total Users",
      "type": "stat",
      "targets": [{"expr": "studyhub_users_total"}]
    },
    {
      "title": "Sessions Today",
      "type": "stat",
      "targets": [{"expr": "studyhub_sessions_today"}]
    },
    {
      "title": "Request Rate",
      "type": "graph",
      "targets": [{"expr": "rate(http_requests_total[5m])"}]
    }
  ]
}
```

## Log Analysis

### Key Log Patterns

```bash
# Find errors in last hour
grep "ERROR" /var/log/studyhub/app.log | tail -100

# Find slow requests
grep "request_time" /var/log/studyhub/access.log | awk '$NF > 2000'

# Find authentication failures
grep "authentication failed" /var/log/studyhub/app.log

# AI-related errors
grep "anthropic" /var/log/studyhub/app.log | grep -i error
```

### Digital Ocean Logs

```bash
# Stream live logs
doctl apps logs <app-id> --follow

# Get recent logs
doctl apps logs <app-id> --deployment <deployment-id>
```

## Maintenance Windows

### Scheduled Maintenance

1. Announce 24 hours in advance (in-app banner)
2. Set maintenance mode
3. Disable alerting for expected downtime
4. Perform maintenance
5. Verify health checks pass
6. Re-enable alerting
7. Remove maintenance banner

### Emergency Maintenance

1. Acknowledge incident
2. Post status update
3. Implement fix
4. Verify health
5. Post resolution update

## Escalation Path

| Level | Contact | Response Time |
|-------|---------|---------------|
| L1 | On-call engineer | 15 minutes |
| L2 | Tech lead | 30 minutes |
| L3 | CTO | 1 hour |

## External Service Dependencies

| Service | Health URL | Status Page |
|---------|------------|-------------|
| Supabase | Dashboard | status.supabase.com |
| Anthropic | - | status.anthropic.com |
| Digital Ocean | - | status.digitalocean.com |
| Google Cloud | - | status.cloud.google.com |

## Recovery Procedures

### Database Recovery
See: `docs/runbooks/database-operations.md`

### Application Rollback
```bash
# List deployments
doctl apps list-deployments <app-id>

# Rollback to previous deployment
doctl apps create-deployment <app-id> --force-rebuild
```

### Secret Rotation
1. Generate new secret
2. Add to Digital Ocean environment
3. Deploy with new secret
4. Verify functionality
5. Revoke old secret
