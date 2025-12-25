# Framework Migration Validator Skill

Validates a new curriculum framework migration for completeness and correctness.

## Usage
```
/skill framework-migration-validator [framework_code]
```

## Validation Checks

### Framework Table Entry
- `code` - Unique framework identifier
- `name` - Full name (e.g., "Victoria")
- `country` - Country code
- `region_type` - state/national/international
- `syllabus_authority` - e.g., "VCAA", "NESA"
- `structure` - JSONB with stages, grade mapping, senior secondary

### Required Structure Fields
```json
{
  "stages": ["stage1", "stage2", ...],
  "gradeMapping": {
    "1": "stage1",
    "2": "stage1",
    ...
  },
  "pathwaySystem": {},
  "seniorSecondary": {
    "name": "VCE",
    "fullName": "Victorian Certificate of Education",
    "years": [11, 12]
  }
}
```

### Subject Completeness
- All core KLAs have subjects defined
- Subject configs have valid tutor styles
- Senior courses linked where applicable

### Outcome Migration
- Outcome codes follow framework conventions
- All stages have outcomes
- Prerequisites reference valid outcome codes

### Validation Output
```markdown
# Framework Migration Validation: [Code]

## Framework Info
- Code: [code]
- Name: [name]
- Authority: [authority]
- Active: [true/false]

## Structure Validation
- [x] Stages defined
- [x] Grade mapping complete
- [x] Senior secondary configured
- [ ] Issues: [list]

## Subject Coverage
| KLA | Subject | Config Valid | Outcomes |
|-----|---------|--------------|----------|
| Mathematics | MATH | Yes | 45 |
| English | ENG | Yes | 38 |
| ... | | | |

## Missing Components
- [ ] [Missing item 1]
- [ ] [Missing item 2]

## Cross-Reference Check
- [ ] All outcome prerequisites exist
- [ ] All senior courses reference valid subjects
- [ ] No orphaned records

## Ready for Production?
[YES / NO - with reasons]
```
