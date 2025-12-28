# Study: Stage 7

## Summary

Research reveals that **"Stage 7" does NOT exist** in the NSW curriculum system. The query appears to be based on a misunderstanding - the NSW curriculum only has **6 stages** (Early Stage 1 through Stage 6). However, there are two possible interpretations:

1. **Development Phase 7**: The StudyHub project uses a 10-phase implementation plan, where Phase 7 is the "Parent Dashboard" feature
2. **Stage Confusion**: Students in Years 1-12 map to 6 curriculum stages, not 7

## Key Requirements

### NSW Curriculum Stage Structure (Actual)

| Stage | Years | Age Range | Notes |
|-------|-------|-----------|-------|
| Early Stage 1 | Kindergarten | 5-6 | Foundation |
| Stage 1 | Years 1-2 | 6-8 | Initial learning |
| Stage 2 | Years 3-4 | 8-10 | Elementary |
| Stage 3 | Years 5-6 | 10-12 | Middle years |
| Stage 4 | Years 7-8 | 12-14 | Junior secondary |
| Stage 5 | Years 9-10 | 14-16 | Senior secondary (with pathways 5.1, 5.2, 5.3) |
| Stage 6 | Years 11-12 | 16-18 | HSC (Higher School Certificate) |

### Year 13 Reference

The CLAUDE.md mentions "Years 1-13" but this appears to reference:
- **Year 13**: Post-HSC gap year or university bridge programs (not a formal curriculum stage)
- Could also refer to international frameworks (UK has Year 13 in A-Levels/KS5)

## Existing Patterns

### Stage Enum (Backend)

**File**: `backend/app/services/tutor_prompts/base_tutor.py`

```python
class Stage(str, Enum):
    """NSW curriculum stages."""
    EARLY_STAGE_1 = "early_stage_1"  # Kindergarten
    STAGE_1 = "stage_1"              # Years 1-2
    STAGE_2 = "stage_2"              # Years 3-4
    STAGE_3 = "stage_3"              # Years 5-6
    STAGE_4 = "stage_4"              # Years 7-8
    STAGE_5 = "stage_5"              # Years 9-10
    STAGE_6 = "stage_6"              # Years 11-12 (HSC)
```

### Grade-to-Stage Mapping

**File**: `Complete_Development_Plan.md`

```javascript
const GRADE_STAGE_MAP = {
  0: { stage: 'ES1' },        // Kindergarten
  1: { stage: 'stage1' },     // Year 1
  2: { stage: 'stage1' },     // Year 2
  3: { stage: 'stage2' },     // Year 3
  4: { stage: 'stage2' },     // Year 4
  5: { stage: 'stage3' },     // Year 5
  6: { stage: 'stage3' },     // Year 6
  7: { stage: 'stage4' },     // Year 7
  8: { stage: 'stage4' },     // Year 8
  9: { stage: 'stage5' },     // Year 9 (pathways)
  10: { stage: 'stage5' },    // Year 10 (pathways)
  11: { stage: 'stage6' },    // Year 11 (HSC)
  12: { stage: 'stage6' },    // Year 12 (HSC)
}
```

### Framework Configuration

```javascript
// NSW framework stages (from Complete_Development_Plan.md)
"stages": ["ES1", "stage1", "stage2", "stage3", "stage4", "stage5", "stage6"]
```

## Technical Considerations

### If Extending Beyond Stage 6

If StudyHub needs to support post-secondary or Year 13 content:

1. **Database**: Add new stage enum value (e.g., `POST_HSC` or `YEAR_13`)
2. **Grade mapping**: Extend GRADE_STAGE_MAP to include grade 13
3. **Curriculum outcomes**: Define learning outcomes for post-HSC
4. **Tutor prompts**: Create age-appropriate language guidelines
5. **Framework isolation**: Ensure this only applies to relevant frameworks

### Multi-Framework Considerations

Other curricula supported by StudyHub have different stage structures:

| Framework | Stages |
|-----------|--------|
| VIC | foundation, 1-2, 3-4, 5-6, 7-8, 9-10, VCE |
| QLD | foundation, 1-2, 3-4, 5-6, 7-8, 9-10, ATAR |
| UK GCSE | KS1, KS2, KS3, KS4, KS5 (Year 13 exists here) |
| IB | PYP, MYP, DP |

**UK KS5 includes Year 13** - A-Level students typically span Years 12-13.

## Curriculum Alignment

### Stage 6 (HSC) - The Highest NSW Stage

Stage 6 is the pinnacle of NSW secondary education:

- **Course types**: Standard, Advanced, Extension 1, Extension 2
- **Assessment**: HSC examinations
- **ATAR**: Australian Tertiary Admission Rank calculation
- **Band levels**: 1-6 for Standard, 2-6 for Advanced

### Stage 5 Pathways

Stage 5 has differentiated pathways for Mathematics:

| Pathway | Description |
|---------|-------------|
| 5.1 | Core/Foundation - extra scaffolding |
| 5.2 | Standard - balanced approach |
| 5.3 | Advanced - extension activities |

## Security/Privacy Considerations

- Student stage information is PII when combined with other data
- Stage transitions (e.g., primary to secondary) should be tracked carefully
- Age-appropriate content filtering must match curriculum stage
- Parental consent requirements may differ by stage/age

## Dependencies

For any Stage 7 implementation:

1. ✅ Stage enum defined in backend
2. ✅ Grade-to-stage mapping exists
3. ✅ Framework configuration supports stage lists
4. ❓ No Stage 7 curriculum outcomes exist
5. ❓ No Stage 7 tutor prompt guidelines exist

## Open Questions

1. **Is "Stage 7" a typo for "Phase 7"?** (Parent Dashboard development phase)
2. **Is Year 13 support needed?** (Post-HSC or international frameworks)
3. **Should UK KS5/Year 13 be prioritized?** (UK framework has Year 13)
4. **Is there a university bridge program to support?** (Gap year content)

## Sources Referenced

- `C:\Users\dunsk\code\StudyHub\CLAUDE.md` - Project configuration mentioning Years 1-13
- `C:\Users\dunsk\code\StudyHub\Complete_Development_Plan.md` - Technical specifications
- `C:\Users\dunsk\code\StudyHub\PROGRESS.md` - Development phases (Phase 7 = Parent Dashboard)
- `C:\Users\dunsk\code\StudyHub\TASKLIST.md` - Sprint tasks for Phase 7
- `C:\Users\dunsk\code\StudyHub\studyhub_overview.md` - Product overview
- `C:\Users\dunsk\code\StudyHub\backend\app\services\tutor_prompts\base_tutor.py` - Stage enum

## Recommendations

1. **Clarify intent**: Determine if the request refers to:
   - Development Phase 7 (Parent Dashboard) - Ready to implement
   - Curriculum Stage 7 - Does not exist in NSW
   - Year 13 support - Consider for UK framework

2. **If Year 13 is needed**: Create a new study document: `/study year-13-support`

3. **If Phase 7 is intended**: Use `/plan parent-dashboard` to begin implementation

---

*Study completed: 2025-12-28*
