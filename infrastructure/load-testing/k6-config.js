/**
 * k6 Load Testing Configuration for StudyHub
 *
 * Run with: k6 run k6-config.js
 * Or: k6 run --vus 50 --duration 60s k6-config.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const successfulLogins = new Counter('successful_logins');
const failedLogins = new Counter('failed_logins');
const apiErrors = new Rate('api_errors');
const noteLoadTime = new Trend('note_load_time');
const flashcardLoadTime = new Trend('flashcard_load_time');

// Configuration
export const options = {
  stages: [
    // Ramp up
    { duration: '1m', target: 10 },   // Ramp up to 10 users over 1 minute
    { duration: '2m', target: 25 },   // Ramp up to 25 users over 2 minutes
    { duration: '5m', target: 50 },   // Ramp up to 50 users over 5 minutes
    // Sustained load
    { duration: '10m', target: 50 },  // Stay at 50 users for 10 minutes
    // Peak load
    { duration: '2m', target: 100 },  // Ramp up to 100 users (peak)
    { duration: '5m', target: 100 },  // Stay at peak for 5 minutes
    // Ramp down
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],      // 95% of requests should be under 2s
    http_req_failed: ['rate<0.01'],         // Less than 1% request failure
    api_errors: ['rate<0.05'],              // Less than 5% API errors
    successful_logins: ['count>100'],       // At least 100 successful logins
    note_load_time: ['p(95)<1500'],         // 95% of note loads under 1.5s
    flashcard_load_time: ['p(95)<1000'],    // 95% of flashcard loads under 1s
  },
};

// Environment configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:5173';

// Test data
const testUsers = [
  { email: 'loadtest1@example.com', password: 'LoadTest123!' },
  { email: 'loadtest2@example.com', password: 'LoadTest123!' },
  { email: 'loadtest3@example.com', password: 'LoadTest123!' },
  { email: 'loadtest4@example.com', password: 'LoadTest123!' },
  { email: 'loadtest5@example.com', password: 'LoadTest123!' },
];

// Helper function to get random test user
function getRandomUser() {
  return testUsers[Math.floor(Math.random() * testUsers.length)];
}

// Setup: Create test users if needed
export function setup() {
  console.log('Starting load test against:', BASE_URL);
  return { baseUrl: BASE_URL, frontendUrl: FRONTEND_URL };
}

// Main test scenario
export default function(data) {
  const user = getRandomUser();
  let authToken = null;
  let studentId = null;

  group('Authentication', () => {
    // Login
    const loginRes = http.post(`${data.baseUrl}/api/v1/auth/login`, JSON.stringify({
      email: user.email,
      password: user.password,
    }), {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'login' },
    });

    const loginSuccess = check(loginRes, {
      'login status is 200': (r) => r.status === 200,
      'login has access token': (r) => {
        const body = JSON.parse(r.body || '{}');
        return body.access_token !== undefined;
      },
    });

    if (loginSuccess && loginRes.status === 200) {
      successfulLogins.add(1);
      const body = JSON.parse(loginRes.body);
      authToken = body.access_token;

      // Get user profile
      const profileRes = http.get(`${data.baseUrl}/api/v1/users/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        tags: { name: 'get_profile' },
      });

      if (profileRes.status === 200) {
        const profile = JSON.parse(profileRes.body);
        if (profile.students && profile.students.length > 0) {
          studentId = profile.students[0].id;
        }
      }
    } else {
      failedLogins.add(1);
      apiErrors.add(1);
    }
  });

  if (!authToken || !studentId) {
    sleep(1);
    return;
  }

  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json',
  };

  group('Dashboard', () => {
    // Load student subjects
    const subjectsRes = http.get(`${data.baseUrl}/api/v1/students/${studentId}/subjects`, {
      headers,
      tags: { name: 'get_subjects' },
    });

    check(subjectsRes, {
      'subjects load successfully': (r) => r.status === 200,
    }) || apiErrors.add(1);

    // Load gamification stats
    const statsRes = http.get(`${data.baseUrl}/api/v1/students/${studentId}/gamification/stats`, {
      headers,
      tags: { name: 'get_gamification_stats' },
    });

    check(statsRes, {
      'gamification stats load successfully': (r) => r.status === 200,
    }) || apiErrors.add(1);
  });

  sleep(1);

  group('Notes', () => {
    // Load notes list
    const startTime = new Date();
    const notesRes = http.get(`${data.baseUrl}/api/v1/students/${studentId}/notes`, {
      headers,
      tags: { name: 'get_notes' },
    });
    noteLoadTime.add(new Date() - startTime);

    check(notesRes, {
      'notes load successfully': (r) => r.status === 200,
    }) || apiErrors.add(1);
  });

  sleep(1);

  group('Flashcards', () => {
    // Load flashcards
    const startTime = new Date();
    const flashcardsRes = http.get(`${data.baseUrl}/api/v1/students/${studentId}/flashcards`, {
      headers,
      tags: { name: 'get_flashcards' },
    });
    flashcardLoadTime.add(new Date() - startTime);

    check(flashcardsRes, {
      'flashcards load successfully': (r) => r.status === 200,
    }) || apiErrors.add(1);

    // Get due flashcards
    const dueRes = http.get(`${data.baseUrl}/api/v1/students/${studentId}/flashcards/due`, {
      headers,
      tags: { name: 'get_due_flashcards' },
    });

    check(dueRes, {
      'due flashcards load successfully': (r) => r.status === 200,
    }) || apiErrors.add(1);
  });

  sleep(1);

  group('Revision Session', () => {
    // Simulate a revision session
    const sessionRes = http.post(`${data.baseUrl}/api/v1/sessions`, JSON.stringify({
      student_id: studentId,
      session_type: 'revision',
    }), {
      headers,
      tags: { name: 'create_session' },
    });

    if (sessionRes.status === 201 || sessionRes.status === 200) {
      const session = JSON.parse(sessionRes.body);

      // Simulate answering a few flashcards
      sleep(2); // Simulate thinking time

      // End session
      http.post(`${data.baseUrl}/api/v1/sessions/${session.id}/complete`, JSON.stringify({
        xp_earned: 50,
      }), {
        headers,
        tags: { name: 'complete_session' },
      });
    }
  });

  sleep(1);

  group('AI Tutor', () => {
    // Simulate a tutor conversation (if available)
    const tutorRes = http.post(`${data.baseUrl}/api/v1/tutor/chat`, JSON.stringify({
      student_id: studentId,
      subject_id: 'math-1',
      message: 'Help me understand fractions',
    }), {
      headers,
      tags: { name: 'tutor_chat' },
      timeout: '30s', // AI responses can take longer
    });

    check(tutorRes, {
      'tutor responds successfully': (r) => r.status === 200 || r.status === 202,
    }) || apiErrors.add(1);
  });

  sleep(2);
}

// Teardown
export function teardown(data) {
  console.log('Load test completed');
}
