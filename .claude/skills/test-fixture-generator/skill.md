# Test Fixture Generator Skill

Generates test fixtures for curriculum, students, and learning data.

## Usage
```
/skill test-fixture-generator [fixture_type]
```

## Fixture Types

### curriculum-framework
Generate framework fixtures:
```python
@pytest.fixture
async def nsw_framework(db: AsyncSession):
    framework = CurriculumFramework(
        id=uuid4(),
        code="NSW",
        name="New South Wales",
        country="Australia",
        region_type="state",
        syllabus_authority="NESA",
        is_active=True,
        is_default=True,
        structure={
            "stages": ["ES1", "stage1", "stage2", "stage3", "stage4", "stage5", "stage6"],
            "gradeMapping": {"K": "ES1", "1": "stage1", ...},
            "seniorSecondary": {"name": "HSC", "years": [11, 12]}
        }
    )
    db.add(framework)
    await db.commit()
    return framework
```

### subjects
Generate subject fixtures:
```python
@pytest.fixture
async def math_subject(db: AsyncSession, nsw_framework):
    subject = Subject(
        id=uuid4(),
        framework_id=nsw_framework.id,
        code="MATH",
        name="Mathematics",
        kla="Mathematics",
        icon="calculator",
        color="#3B82F6",
        available_stages=["stage2", "stage3", "stage4", "stage5", "stage6"],
        config={
            "hasPathways": True,
            "pathways": [{"stage": "stage5", "options": ["5.1", "5.2", "5.3"]}],
            "tutorStyle": "socratic_stepwise"
        }
    )
    db.add(subject)
    await db.commit()
    return subject
```

### curriculum-outcomes
Generate outcome fixtures:
```python
@pytest.fixture
async def stage3_math_outcomes(db: AsyncSession, nsw_framework, math_subject):
    outcomes = [
        CurriculumOutcome(
            id=uuid4(),
            framework_id=nsw_framework.id,
            subject_id=math_subject.id,
            outcome_code="MA3-RN-01",
            stage="stage3",
            grade_range=[5, 6],
            title="Represents and uses numbers",
            description="...",
            strand="Number and Algebra",
            sub_strand="Whole Numbers"
        ),
        # More outcomes...
    ]
    db.add_all(outcomes)
    await db.commit()
    return outcomes
```

### student-with-progress
Generate student with learning progress:
```python
@pytest.fixture
async def student_with_progress(db, parent_user, nsw_framework, math_subject):
    student = Student(
        id=uuid4(),
        parent_id=parent_user.id,
        display_name="Test Student",
        grade_level=5,
        school_stage="stage3",
        framework_id=nsw_framework.id
    )
    db.add(student)

    enrolment = StudentSubject(
        student_id=student.id,
        subject_id=math_subject.id,
        mastery_level=45.5,
        subject_xp=1250
    )
    db.add(enrolment)

    await db.commit()
    return student
```

### Output
```markdown
# Generated Fixtures: [Type]

## Fixture Code
```python
[generated fixture code]
```

## Usage Example
```python
async def test_example(fixture_name):
    # Use fixture
    assert fixture_name.id is not None
```

## Related Fixtures Needed
- [Other fixtures this depends on]

## Factory Pattern (if complex)
```python
class StudentFactory:
    @staticmethod
    async def create(db, **overrides):
        defaults = {...}
        data = {**defaults, **overrides}
        # Create and return
```
```
