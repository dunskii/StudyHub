# Database Schema Review Skill

Reviews PostgreSQL/SQLAlchemy schema for best practices and curriculum requirements.

## Usage
```
/skill database-schema-review [table_or_model]
```

## Review Checklist

### Structural Requirements
- [ ] UUID primary keys used
- [ ] Proper foreign key relationships
- [ ] created_at/updated_at timestamps
- [ ] Appropriate indexes defined
- [ ] Unique constraints where needed

### Curriculum-Specific
- [ ] framework_id on curriculum tables
- [ ] subject_id references valid
- [ ] Stage/pathway fields present
- [ ] Outcome codes properly constrained

### Multi-Tenancy
- [ ] User ownership tracked
- [ ] Parent-student relationships
- [ ] Framework isolation possible
- [ ] No cross-user data leakage

### Performance
- [ ] Indexes on common query fields
- [ ] JSONB indexed where queried
- [ ] No unnecessary columns
- [ ] Appropriate column types

### JSONB Usage
- [ ] Structure documented
- [ ] Defaults defined
- [ ] GIN indexes for queries
- [ ] Not overused vs relations

### Review Output
```markdown
# Schema Review: [Table/Model]

## Table Info
- Name: [table_name]
- Rows (estimated): [count]
- Relationships: [list]

## Structure Analysis

### Columns
| Column | Type | Nullable | Default | Index | Notes |
|--------|------|----------|---------|-------|-------|

### Indexes
| Name | Columns | Type | Useful? |
|------|---------|------|---------|

### Foreign Keys
| Column | References | On Delete | Valid? |
|--------|------------|-----------|--------|

## Issues Found

### Critical
- [Issue requiring immediate fix]

### Performance
- [Missing index recommendation]
- [Query optimization opportunity]

### Best Practices
- [Convention violation]
- [Improvement suggestion]

## Recommendations
1. [Priority fix]
2. [Improvement]

## Migration Needed?
[YES/NO - with details]
```
