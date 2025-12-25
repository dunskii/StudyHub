# Subject Config Checker Skill

Validates subject configurations including tutor styles, pathways, and senior courses.

## Usage
```
/skill subject-config-checker [subject_code]
```

## Validation Checks

### Required Subject Fields
- `code` - Unique subject identifier
- `name` - Display name
- `kla` - Key Learning Area
- `framework_id` - Reference to curriculum framework
- `available_stages` - Array of applicable stages
- `config` - JSONB configuration

### Config Structure Validation
```json
{
  "hasPathways": boolean,
  "pathways": [
    {"stage": "stage5", "options": ["5.1", "5.2", "5.3"]}
  ],
  "seniorCourses": ["Course 1", "Course 2"],
  "assessmentTypes": ["type1", "type2"],
  "tutorStyle": "socratic_stepwise"
}
```

### Valid Tutor Styles
- `socratic_stepwise` - Mathematics
- `socratic_analytical` - English, HSIE
- `inquiry_based` - Science
- `discussion_based` - PDHPE
- `project_based` - Technology
- `creative_mentoring` - Creative Arts
- `immersive` - Languages

### Validation Output
```markdown
# Subject Config Validation: [Subject]

## Basic Info
- Code: [code]
- Name: [name]
- KLA: [kla]
- Tutor Style: [style]

## Config Validation
- [x] hasPathways matches pathway data
- [x] seniorCourses populated for Stage 6
- [x] tutorStyle is valid
- [x] assessmentTypes defined

## Issues Found
| Field | Issue | Recommendation |
|-------|-------|----------------|

## Pathway Validation
| Stage | Pathways | Valid |
|-------|----------|-------|

## Senior Courses Check
| Course | Valid | Notes |
|--------|-------|-------|
```
