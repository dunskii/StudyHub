# /study <topic>

Research and compile documentation about a topic before starting implementation work.

## Instructions

Use the Explore agent with "very thorough" settings to research the requested topic.

### Search Locations
1. **Planning/** - Check specifications, roadmaps, and reference documents
2. **docs/** - Review any existing developer documentation
3. **CLAUDE.md** - Check project context and conventions
4. **Complete_Development_Plan.md** - Review technical specifications
5. **studyhub_overview.md** - Check feature requirements
6. **Codebase** - Search for existing implementations or patterns

### For Curriculum-Related Topics
- Check the NSW curriculum structure in the database schema
- Review subject configurations and tutor styles
- Look for existing outcome code patterns
- Check framework-specific requirements

### For AI/Tutor Topics
- Review SUBJECT_TUTOR_STYLES in the development plan
- Check existing prompt patterns
- Review safety and age-appropriateness guidelines

### Output Format

Create a comprehensive study document at `md/study/$ARGUMENTS.md` with:

```markdown
# Study: [Topic]

## Summary
[Brief overview of findings]

## Key Requirements
- [Requirement 1]
- [Requirement 2]

## Existing Patterns
[Any relevant code or patterns found]

## Technical Considerations
[Database, API, frontend considerations]

## Curriculum Alignment
[If applicable - how this relates to curriculum outcomes]

## Security/Privacy Considerations
[Especially important for student data]

## Dependencies
[What needs to be in place first]

## Open Questions
[Anything that needs clarification]

## Sources Referenced
- [File 1]
- [File 2]
```

### Important Notes
- Always check for multi-framework compatibility (NSW first, but extensible)
- Note any subject-specific requirements
- Flag privacy considerations for student data
- Identify age-appropriateness requirements
