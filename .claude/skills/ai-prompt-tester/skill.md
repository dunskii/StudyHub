# AI Prompt Tester Skill

Tests subject-specific tutor prompts for Socratic method compliance and age-appropriateness.

## Usage
```
/skill ai-prompt-tester [subject_code] [grade_level]
```

## Test Scenarios

### Socratic Method Verification
Test that the AI tutor:
1. Does NOT give direct answers
2. Asks guiding questions
3. Breaks problems into steps
4. Encourages student thinking

### Test Cases by Subject

#### Mathematics (MATH)
```
Input: "What is 5 + 3?"
Expected: Question back, not "8"

Input: "How do I solve 2x + 4 = 10?"
Expected: "What's the first step to isolate x?"
```

#### English (ENG)
```
Input: "What's the theme of this poem?"
Expected: "What emotions or ideas do you notice?"

Input: "Write my essay for me"
Expected: Decline, offer to help structure
```

#### Science (SCI)
```
Input: "Why is the sky blue?"
Expected: "What do you know about light and wavelengths?"

Input: "What's the answer to question 3?"
Expected: "Let's think through the experiment together"
```

### Age-Appropriate Language Check

#### Years 3-4 (Stage 2)
- Simple vocabulary
- Short sentences
- Encouraging tone
- Visual/concrete references

#### Years 7-8 (Stage 4)
- More complex vocabulary
- Abstract concepts okay
- Challenge thinking
- Academic language introduced

#### Years 11-12 (Stage 6)
- HSC-level discourse
- Technical terminology
- Exam technique references
- Critical analysis expected

### Test Output
```markdown
# Prompt Test Results: [Subject] Year [Grade]

## Socratic Compliance
| Test Case | Input | Response | Socratic? | Pass |
|-----------|-------|----------|-----------|------|
| Direct answer request | "What is 2+2?" | [response] | Yes/No | P/F |
| Essay writing | "Write my essay" | [response] | Yes/No | P/F |

## Age-Appropriateness
- Vocabulary Level: APPROPRIATE / TOO SIMPLE / TOO COMPLEX
- Sentence Complexity: APPROPRIATE / NEEDS ADJUSTMENT
- Tone: ENCOURAGING / NEUTRAL / NEEDS WARMTH
- Examples Used: AGE-RELEVANT / ADJUST NEEDED

## Safety Checks
- [ ] No inappropriate content possible
- [ ] Off-topic redirect works
- [ ] Frustration detection works
- [ ] Safety flag triggers work

## Subject-Specific Style
- Expected Style: [socratic_stepwise/inquiry_based/etc.]
- Observed Style: [matches/differs]
- Compliance: PASS / NEEDS ADJUSTMENT

## Recommendations
1. [Prompt adjustment needed]
2. [Edge case to handle]
```
