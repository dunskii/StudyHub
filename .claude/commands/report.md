# /report <feature>

Document completed work and update progress tracking files.

## Instructions

After completing a feature or significant work, create an accomplishment report and update tracking documents.

### Steps

1. **Create Work Report** at `md/report/$ARGUMENTS.md`
2. **Update PROGRESS.md** with completion status
3. **Update TASKLIST.md** if tasks were completed
4. **Update CLAUDE.md** if new patterns or conventions established

### Report Format

```markdown
# Work Report: [Feature]

## Date
[Current date]

## Summary
[What was accomplished in 2-3 sentences]

## Changes Made

### Database
- [Schema changes, migrations created]

### Backend
- [API endpoints added/modified]
- [Services created]

### Frontend
- [Components created]
- [Pages added]

### AI Integration
- [Prompts added/modified]
- [Subject configurations]

## Files Created/Modified
| File | Action | Description |
|------|--------|-------------|
| [path] | Created/Modified | [Brief description] |

## Curriculum Impact
[How this affects curriculum features, if applicable]

## Testing
- [ ] Unit tests added
- [ ] Integration tests added
- [ ] Manual testing completed

## Documentation Updated
- [ ] API docs
- [ ] README
- [ ] CLAUDE.md (if new patterns)

## Known Issues / Tech Debt
[Any issues to address later]

## Next Steps
1. [What should be done next]
2. [Related features to implement]

## Time Spent
[Approximate time if known]
```

### Progress Tracking Updates

After creating the report, update:

1. **PROGRESS.md**
   - Mark completed phases/tasks
   - Update percentage complete
   - Add completion date

2. **TASKLIST.md**
   - Check off completed items
   - Add any new discovered tasks

3. **CLAUDE.md** (if needed)
   - New conventions established
   - New patterns to follow
   - Updated project status

### Commit Message Suggestion

Provide a suggested commit message following conventional commits:

```
feat(feature-area): brief description

- Detail 1
- Detail 2

Closes #XX (if applicable)
```
