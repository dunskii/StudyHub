# Load Testing for StudyHub

This directory contains load testing configurations for StudyHub.

## Prerequisites

### Install k6

**Windows (using winget):**
```bash
winget install k6
```

**macOS:**
```bash
brew install k6
```

**Linux:**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Setup Test Users

Before running load tests, create test users in your database:

```sql
-- Create test users for load testing
INSERT INTO users (id, email, role, created_at) VALUES
  (gen_random_uuid(), 'loadtest1@example.com', 'parent', NOW()),
  (gen_random_uuid(), 'loadtest2@example.com', 'parent', NOW()),
  (gen_random_uuid(), 'loadtest3@example.com', 'parent', NOW()),
  (gen_random_uuid(), 'loadtest4@example.com', 'parent', NOW()),
  (gen_random_uuid(), 'loadtest5@example.com', 'parent', NOW());

-- Create corresponding students for each test user
-- (Run after inserting users)
```

## Running Load Tests

### Quick Smoke Test

```bash
k6 run --vus 5 --duration 30s k6-config.js
```

### Standard Load Test

```bash
k6 run k6-config.js
```

### With Custom Base URL

```bash
k6 run -e BASE_URL=https://api.studyhub.example.com k6-config.js
```

### With Output to Cloud/InfluxDB

```bash
# Output to k6 Cloud
k6 run --out cloud k6-config.js

# Output to InfluxDB
k6 run --out influxdb=http://localhost:8086/k6 k6-config.js
```

## Test Scenarios

### k6-config.js

The main load test configuration includes:

1. **Ramp-up Phase**: Gradually increase from 0 to 50 users
2. **Sustained Load**: Maintain 50 users for 10 minutes
3. **Peak Load**: Spike to 100 users for 5 minutes
4. **Ramp-down**: Gradually decrease back to 0

### Test Groups

- **Authentication**: Login and profile retrieval
- **Dashboard**: Subject and gamification stats loading
- **Notes**: Note list loading
- **Flashcards**: Flashcard list and due cards
- **Revision Session**: Create and complete sessions
- **AI Tutor**: Tutor chat interactions

## Performance Thresholds

| Metric | Threshold | Description |
|--------|-----------|-------------|
| http_req_duration (p95) | < 2000ms | 95th percentile response time |
| http_req_failed | < 1% | Maximum failure rate |
| api_errors | < 5% | Maximum API error rate |
| note_load_time (p95) | < 1500ms | Note loading time |
| flashcard_load_time (p95) | < 1000ms | Flashcard loading time |

## Interpreting Results

### Key Metrics

- **http_req_duration**: Response time for HTTP requests
- **http_reqs**: Total number of requests made
- **http_req_failed**: Percentage of failed requests
- **vus**: Number of virtual users
- **iterations**: Number of complete test iterations

### Sample Output

```
     ✓ login status is 200
     ✓ login has access token
     ✓ subjects load successfully
     ✓ gamification stats load successfully
     ✓ notes load successfully
     ✓ flashcards load successfully
     ✓ due flashcards load successfully

     checks.....................: 98.5% ✓ 4925 ✗ 75
     data_received...............: 12 MB  200 kB/s
     data_sent...................: 2.1 MB 35 kB/s
     http_req_duration...........: avg=234ms min=45ms max=1.2s p(95)=567ms
     http_req_failed.............: 0.5%  ✓ 25   ✗ 4975
     http_reqs...................: 5000  83/s
     vus.........................: 50    min=0  max=100
```

## Stress Testing

For stress testing (finding breaking points):

```bash
k6 run --vus 200 --duration 5m k6-config.js
```

## Soak Testing

For soak testing (long-duration, steady load):

```bash
k6 run --vus 25 --duration 2h k6-config.js
```

## CI/CD Integration

Add to GitHub Actions:

```yaml
- name: Run Load Tests
  uses: grafana/k6-action@v0.3.1
  with:
    filename: infrastructure/load-testing/k6-config.js
  env:
    BASE_URL: ${{ secrets.STAGING_API_URL }}
```

## Troubleshooting

### Common Issues

1. **Connection refused**: Ensure backend is running
2. **Authentication failures**: Check test user credentials
3. **Timeout errors**: Increase timeout or check API performance
4. **Rate limiting**: Disable rate limiting for load tests or increase limits

### Debug Mode

```bash
k6 run --http-debug=full k6-config.js
```
