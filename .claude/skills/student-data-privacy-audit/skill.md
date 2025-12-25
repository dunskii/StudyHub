# Student Data Privacy Audit Skill

Audits code and data handling for children's privacy compliance.

## Usage
```
/skill student-data-privacy-audit [feature_or_file]
```

## Compliance Frameworks
- Australian Privacy Act 1988
- APP Guidelines for children
- COPPA (best practice reference)
- GDPR Article 8 (children's consent)

## Audit Checklist

### Data Collection Minimization
- [ ] Only necessary data collected
- [ ] No excessive personal information
- [ ] Clear purpose for each data field
- [ ] Age-appropriate data requests

### Consent Verification
- [ ] Parental consent required for under-15s
- [ ] Consent mechanism documented
- [ ] Consent can be withdrawn
- [ ] Re-consent for new uses

### Data Access Controls
- [ ] Students access only own data
- [ ] Parents access only linked children
- [ ] No public exposure of student PII
- [ ] Admin access logged

### AI Interaction Safety
- [ ] All AI conversations logged
- [ ] Concerning content flagged
- [ ] No PII sent to AI unnecessarily
- [ ] Parent can review AI logs

### Data Retention
- [ ] Retention period defined
- [ ] Deletion on request supported
- [ ] Inactive account handling
- [ ] Backup data included in deletion

### Third-Party Sharing
- [ ] No selling of student data
- [ ] Third parties documented
- [ ] Minimal data shared
- [ ] Contracts in place

### Audit Output
```markdown
# Privacy Audit: [Feature/File]

## Summary
- Risk Level: LOW / MEDIUM / HIGH / CRITICAL
- Compliance Status: PASS / NEEDS WORK / FAIL

## Data Collection
| Data Field | Necessary? | Purpose | Compliant |
|------------|-----------|---------|-----------|

## Access Control Review
| Endpoint/Feature | Access Check | Compliant |
|-----------------|--------------|-----------|

## AI Interaction Review
| Feature | Logged | Flagging | PII Risk |
|---------|--------|----------|----------|

## Findings

### Critical Issues
- [Issue requiring immediate fix]

### High Priority
- [Issue to fix soon]

### Recommendations
1. [Recommendation 1]
2. [Recommendation 2]

## Required Actions Before Launch
- [ ] [Action 1]
- [ ] [Action 2]
```
