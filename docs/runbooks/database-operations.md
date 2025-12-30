# Database Operations Runbook - StudyHub

## Overview

StudyHub uses PostgreSQL hosted on Digital Ocean Managed Database.

## Connection Information

### Production

```
Host: db-studyhub-prod.xxx.db.ondigitalocean.com
Port: 25060
Database: studyhub_prod
User: studyhub_app
SSL Mode: require
```

### Staging

```
Host: db-studyhub-staging.xxx.db.ondigitalocean.com
Port: 25060
Database: studyhub_staging
User: studyhub_app
SSL Mode: require
```

## Routine Operations

### Running Migrations

```bash
# Via doctl console
doctl apps console <app-id>
cd backend
alembic upgrade head

# Check current migration
alembic current

# View migration history
alembic history
```

### Creating a New Migration

```bash
cd backend

# Auto-generate from model changes
alembic revision --autogenerate -m "Description of changes"

# Review the generated migration
cat alembic/versions/<new_migration>.py

# Test migration locally
alembic upgrade head
alembic downgrade -1
alembic upgrade head
```

### Rollback Migration

```bash
# Rollback one version
alembic downgrade -1

# Rollback to specific revision
alembic downgrade abc123

# Rollback all migrations (DANGER!)
alembic downgrade base
```

## Backup and Restore

### Digital Ocean Automated Backups

- Daily backups retained for 7 days
- Point-in-time recovery available (last 7 days)

### Manual Backup

```bash
# Using pg_dump (from allowed IP)
pg_dump "postgres://user:pass@host:port/db?sslmode=require" > backup.sql

# Compressed backup
pg_dump "postgres://user:pass@host:port/db?sslmode=require" | gzip > backup.sql.gz
```

### Restore from Backup

```bash
# Restore from SQL file
psql "postgres://user:pass@host:port/db?sslmode=require" < backup.sql

# Restore from compressed backup
gunzip -c backup.sql.gz | psql "postgres://user:pass@host:port/db?sslmode=require"
```

### Point-in-Time Recovery

1. Go to Digital Ocean Database dashboard
2. Select database cluster
3. Click "Backups" tab
4. Select backup or PITR time
5. Fork to new cluster or restore

## Performance Optimization

### Checking Slow Queries

```sql
-- Enable pg_stat_statements extension (once)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slowest queries
SELECT
  query,
  calls,
  total_exec_time / 1000 as total_time_sec,
  mean_exec_time as mean_time_ms,
  rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
```

### Index Analysis

```sql
-- Find missing indexes (sequential scans on large tables)
SELECT
  schemaname,
  relname,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_tup_read DESC
LIMIT 20;

-- Find unused indexes
SELECT
  schemaname,
  relname,
  indexrelname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Adding Indexes

```sql
-- Create index concurrently (no lock)
CREATE INDEX CONCURRENTLY idx_notes_student_id
ON notes(student_id);

-- Verify index is valid
SELECT indexrelid::regclass, indisvalid, indisready
FROM pg_index
WHERE indexrelid = 'idx_notes_student_id'::regclass;
```

### Connection Pool Monitoring

```sql
-- Check active connections
SELECT
  state,
  count(*) as count
FROM pg_stat_activity
GROUP BY state;

-- Check connection details
SELECT
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query_start,
  query
FROM pg_stat_activity
WHERE datname = 'studyhub_prod'
ORDER BY query_start;
```

## Emergency Procedures

### Kill Runaway Queries

```sql
-- Find long-running queries
SELECT
  pid,
  now() - query_start as duration,
  query,
  state
FROM pg_stat_activity
WHERE state != 'idle'
  AND query_start < now() - interval '5 minutes'
ORDER BY query_start;

-- Cancel query (graceful)
SELECT pg_cancel_backend(<pid>);

-- Terminate connection (force)
SELECT pg_terminate_backend(<pid>);
```

### Kill All Connections (for maintenance)

```sql
-- Kill all connections except your own
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'studyhub_prod'
  AND pid <> pg_backend_pid();
```

### Lock Monitoring

```sql
-- Find blocked queries
SELECT
  blocked.pid AS blocked_pid,
  blocked.query AS blocked_query,
  blocking.pid AS blocking_pid,
  blocking.query AS blocking_query
FROM pg_stat_activity blocked
JOIN pg_stat_activity blocking ON blocking.pid = ANY(pg_blocking_pids(blocked.pid))
WHERE blocked.state = 'active';
```

## Data Operations

### Export User Data (GDPR/Privacy Request)

```sql
-- Export all data for a specific student
\copy (
  SELECT * FROM students WHERE id = '<student_id>'
) TO '/tmp/student_data.csv' CSV HEADER;

\copy (
  SELECT * FROM notes WHERE student_id = '<student_id>'
) TO '/tmp/student_notes.csv' CSV HEADER;

\copy (
  SELECT * FROM flashcards WHERE student_id = '<student_id>'
) TO '/tmp/student_flashcards.csv' CSV HEADER;

\copy (
  SELECT * FROM ai_interactions WHERE student_id = '<student_id>'
) TO '/tmp/student_ai_interactions.csv' CSV HEADER;
```

### Delete User Data (Right to Erasure)

```sql
BEGIN;

-- Delete in order of foreign key dependencies
DELETE FROM ai_interactions WHERE student_id = '<student_id>';
DELETE FROM revision_sessions WHERE student_id = '<student_id>';
DELETE FROM flashcard_reviews WHERE flashcard_id IN (
  SELECT id FROM flashcards WHERE student_id = '<student_id>'
);
DELETE FROM flashcards WHERE student_id = '<student_id>';
DELETE FROM notes WHERE student_id = '<student_id>';
DELETE FROM student_subjects WHERE student_id = '<student_id>';
DELETE FROM students WHERE id = '<student_id>';

-- Verify deletions
SELECT COUNT(*) FROM students WHERE id = '<student_id>';

COMMIT;
```

### Data Anonymization (for analytics)

```sql
-- Create anonymized export
\copy (
  SELECT
    id,
    md5(email) as email_hash,
    created_at,
    -- other non-PII fields
  FROM users
) TO '/tmp/anonymized_users.csv' CSV HEADER;
```

## Scaling

### Vertical Scaling (Upgrade Size)

1. Go to DO Database dashboard
2. Select cluster
3. Click "Resize"
4. Select new size
5. Apply (brief downtime may occur)

### Read Replicas

```bash
# Add read replica via DO console or doctl
doctl databases replica create <cluster-id> <replica-name> --size db-s-1vcpu-1gb
```

Configure app to use replica for reads:
```python
# In SQLAlchemy config
SQLALCHEMY_BINDS = {
    'reader': 'postgresql+asyncpg://user:pass@replica-host:port/db'
}
```

### Connection Pooling

Consider PgBouncer for high-connection scenarios:

```bash
# Digital Ocean provides built-in connection pooling
# Enable in database cluster settings
# Use pooler connection string for application
```

## Monitoring Queries

### Database Size

```sql
SELECT
  pg_database.datname,
  pg_size_pretty(pg_database_size(pg_database.datname)) as size
FROM pg_database
ORDER BY pg_database_size(pg_database.datname) DESC;
```

### Table Sizes

```sql
SELECT
  schemaname,
  relname,
  pg_size_pretty(pg_total_relation_size(relid)) as total_size,
  pg_size_pretty(pg_relation_size(relid)) as data_size,
  pg_size_pretty(pg_indexes_size(relid)) as index_size
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 20;
```

### Replication Lag (if using replicas)

```sql
SELECT
  client_addr,
  state,
  sent_lsn,
  write_lsn,
  flush_lsn,
  replay_lsn,
  pg_size_pretty(pg_wal_lsn_diff(sent_lsn, replay_lsn)) as replication_lag
FROM pg_stat_replication;
```
