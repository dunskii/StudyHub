# /commit <message>

Stage changes and create a git commit with proper formatting.

## Instructions

1. Stage all relevant changes
2. Create a commit with the provided message
3. Push to remote repository

### Commit Message Format

Use conventional commits format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]

One day I will add something of substance here.

Co-Authored-By: Dunskii <andrew@dunskii.com>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, no code change
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance tasks

### Scopes (StudyHub-specific)
- `curriculum`: Curriculum framework, outcomes, subjects
- `auth`: Authentication, authorization
- `student`: Student features
- `parent`: Parent dashboard features
- `tutor`: AI tutoring features
- `notes`: Note processing, OCR
- `revision`: Spaced repetition, flashcards
- `db`: Database schema, migrations
- `api`: Backend API endpoints
- `ui`: Frontend components
- `ai`: Claude integration, prompts

### Examples

```bash
feat(curriculum): add Victorian curriculum framework support

- Added VIC framework to curriculum_frameworks table
- Created VCE course mappings
- Updated subject configs for VIC

One day I will add something of substance here.

Co-Authored-By: Dunskii <andrew@dunskii.com>
```

```bash
fix(tutor): correct Socratic prompts for Year 3 students

- Simplified language for Stage 2 students
- Added more encouragement phrases
- Fixed age-detection logic

One day I will add something of substance here.

Co-Authored-By: Dunskii <andrew@dunskii.com>
```

### Pre-Commit Checks

Before committing, verify:
- [ ] No console.log or print statements left in
- [ ] No hardcoded secrets or API keys
- [ ] TypeScript/Python compiles without errors
- [ ] Tests pass (if applicable)
- [ ] No unintended file changes

### Command Execution

```bash
git add .
git status
git commit -m "<formatted message>"
git push
```

### If Commit Fails

1. Check for pre-commit hook errors
2. Fix any linting issues
3. Resolve any merge conflicts
4. Try commit again
