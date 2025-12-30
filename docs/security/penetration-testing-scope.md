# Penetration Testing Scope Document

## Overview

This document defines the scope and requirements for external penetration testing of the StudyHub platform. StudyHub is an AI-powered educational platform serving Australian students (including children under 13) and their parents.

## Platform Overview

- **Application Type**: Web-based SPA (React) with FastAPI backend
- **Hosting**: Digital Ocean App Platform
- **Database**: PostgreSQL (Digital Ocean Managed)
- **Authentication**: Supabase Auth (JWT-based)
- **AI Integration**: Anthropic Claude API
- **Storage**: Digital Ocean Spaces (S3-compatible)
- **Target Users**: Parents, students (including children under 13)

## Regulatory Compliance Context

- **COPPA (Children's Online Privacy Protection Act)**: Platform processes data of children under 13
- **Australian Privacy Act**: Australian users with specific privacy requirements
- **GDPR considerations**: Data processing and user rights

## In-Scope Testing Areas

### 1. Authentication & Authorization

| Area | Description | Priority |
|------|-------------|----------|
| Parent account authentication | Login, registration, password reset flows | Critical |
| JWT token handling | Token generation, validation, expiry, refresh | Critical |
| Session management | Session timeout, concurrent sessions | High |
| Multi-factor authentication | MFA bypass attempts | High |
| Authorization bypass | Accessing resources of other users | Critical |
| Parent-student relationship | Parent can only access their own children | Critical |

### 2. API Security

| Area | Description | Priority |
|------|-------------|----------|
| Input validation | SQL injection, command injection, XSS | Critical |
| Rate limiting | Authentication, AI endpoints, data export | High |
| API enumeration | User/student ID enumeration | High |
| File upload security | Note upload validation, malicious files | Critical |
| CORS configuration | Cross-origin request handling | Medium |
| Error handling | Information disclosure in error messages | Medium |

### 3. Data Security

| Area | Description | Priority |
|------|-------------|----------|
| Parent/student data isolation | Strict data boundary enforcement | Critical |
| AI conversation privacy | Parent access to child's AI conversations only | Critical |
| Data export security | Export only owned data | High |
| File storage security | Presigned URL security, access controls | High |
| Encryption at rest | Database, file storage encryption verification | High |
| Encryption in transit | TLS configuration, certificate validation | High |

### 4. AI-Specific Security

| Area | Description | Priority |
|------|-------------|----------|
| Prompt injection | Attempts to manipulate AI responses | High |
| Jailbreaking attempts | Bypassing educational constraints | High |
| Content safety | AI generating inappropriate content | High |
| Data exfiltration via AI | Extracting data through AI conversations | Critical |
| Token/cost manipulation | Bypassing AI usage limits | Medium |

### 5. Children's Data Protection

| Area | Description | Priority |
|------|-------------|----------|
| Age verification | Student age handling and restrictions | Critical |
| Parental consent flow | Consent capture and verification | Critical |
| Data minimization | Only necessary data collected | High |
| Right to deletion | Account deletion completeness | Critical |
| Data retention | Proper data lifecycle management | High |

### 6. Business Logic

| Area | Description | Priority |
|------|-------------|----------|
| Subscription bypass | Accessing premium features without payment | Medium |
| Gamification manipulation | XP/achievement system abuse | Low |
| Grade/stage manipulation | Student academic data integrity | Medium |
| Multi-tenancy violations | Cross-user data access | Critical |

## Out of Scope

- Denial of Service (DoS/DDoS) attacks
- Physical security testing
- Social engineering of staff
- Third-party services (Supabase, Anthropic, Google Cloud)
- Infrastructure-level attacks on Digital Ocean
- Supply chain attacks on dependencies

## Test Environment

### Staging Environment
- URL: `https://staging.studyhub.edu.au` (to be provisioned)
- Separate database with synthetic test data
- AI endpoints connected to development Claude instance

### Test Accounts
Will be provisioned for testing:
- 2x Parent accounts (one free tier, one premium)
- 4x Student profiles (various ages, grades)
- Admin account (limited access)

### Test Data
- Synthetic student data (no real student information)
- Sample curriculum content
- Pre-populated AI conversation history
- Test notes and flashcards

## Rules of Engagement

### Allowed Activities
- Automated vulnerability scanning (coordinated times)
- Manual penetration testing
- Brute force attempts on test accounts only
- API fuzzing and manipulation
- Attempting authorization bypasses
- AI prompt injection testing

### Prohibited Activities
- Testing against production environment
- DoS or resource exhaustion attacks
- Attacks on third-party infrastructure
- Data destruction or modification affecting other testers
- Social engineering against staff or real users
- Installing persistent backdoors

### Communication Protocol
- **Primary Contact**: Security Team (security@studyhub.edu.au)
- **Emergency Contact**: [CTO Phone Number]
- **Daily Check-ins**: Required during active testing
- **Critical Findings**: Immediate phone notification required

## Reporting Requirements

### Report Format
- Executive summary for stakeholders
- Technical findings with CVSS scores
- Proof-of-concept for each vulnerability
- Remediation recommendations
- Retest verification (included in scope)

### Severity Classification

| Severity | Response SLA | Examples |
|----------|-------------|----------|
| Critical | 24 hours | Auth bypass, data breach, child data exposure |
| High | 72 hours | Authorization issues, significant data leakage |
| Medium | 7 days | Information disclosure, rate limit bypass |
| Low | 30 days | Minor misconfigurations, best practice violations |

### Deliverables
1. Draft report within 5 business days of testing completion
2. Final report within 3 business days of feedback
3. Retest within 30 days of remediation
4. Certificate of assessment (upon successful retest)

## Timeline

| Phase | Duration | Description |
|-------|----------|-------------|
| Scoping call | 1 hour | Review scope, clarify requirements |
| Environment setup | 2 days | Provision test accounts and data |
| Testing | 5-7 days | Active penetration testing |
| Reporting | 5 days | Report preparation |
| Remediation | 14-21 days | Development team fixes |
| Retest | 2 days | Verification of fixes |

## Prerequisites Before Testing

- [ ] Staging environment provisioned and stable
- [ ] Test accounts created and credentials shared securely
- [ ] Test data populated (students, notes, AI history)
- [ ] Rate limiting configured for testing IP ranges
- [ ] Monitoring/alerting configured for test environment
- [ ] Incident response team notified of testing window
- [ ] Legal/contractual agreements signed

## Contact Information

| Role | Name | Contact |
|------|------|---------|
| Project Sponsor | [Name] | [Email] |
| Technical Lead | [Name] | [Email] |
| Security Contact | Security Team | security@studyhub.edu.au |
| Emergency | [Name] | [Phone] |

---

*Document Version: 1.0*
*Last Updated: [Date]*
*Next Review: Prior to testing engagement*
