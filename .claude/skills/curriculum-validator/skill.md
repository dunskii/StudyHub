# Curriculum Validator Skill

Validates curriculum outcome codes, stage mappings, and framework configurations.

## Usage
```
/skill curriculum-validator [framework_code]
```

## Validation Checks

### Outcome Code Formats (NSW)
| Subject | Pattern | Example |
|---------|---------|---------|
| Mathematics | `MA{stage}-{strand}-{number}` | MA3-RN-01 |
| English | `EN{stage}-{strand}-{number}` | EN4-VOCAB-01 |
| Science | `SC{stage}-{strand}-{number}` | SC5-WS-02 |
| History | `HT{stage}-{number}` | HT3-1 |
| Geography | `GE{stage}-{number}` | GE4-1 |
| PDHPE | `PD{stage}-{number}` | PD5-9 |

### Stage Mappings
```
ES1 → Kindergarten
Stage 1 → Years 1-2
Stage 2 → Years 3-4
Stage 3 → Years 5-6
Stage 4 → Years 7-8
Stage 5 → Years 9-10
Stage 6 → Years 11-12
```

### Validation Output
```markdown
# Curriculum Validation Report: [Framework]

## Summary
- Total outcomes checked: X
- Valid: X
- Invalid: X

## Invalid Outcome Codes
| Code | Issue | Suggestion |
|------|-------|------------|

## Stage Mapping Issues
| Outcome | Expected Stage | Found Stage |
|---------|----------------|-------------|

## Missing Required Fields
| Outcome | Missing Fields |
|---------|----------------|

## Recommendations
1. [Fix needed]
```
