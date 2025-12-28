# Phase 8 QA Recommendations - Research Study

## Overview

This document analyses the medium and low priority recommendations from the Phase 8 QA review, providing implementation guidance for each issue.

---

## Medium Priority Recommendations

### 1. Update Test Assertions for Level Titles

**File**: `backend/tests/services/test_gamification_services.py`

**Issue Summary**:
The test assertions for level titles at levels 10, 15, and 20 do not match the current configuration in `gamification.py`.

**Current Implementation Analysis**:

In `test_gamification_services.py` (lines 163-169):
```python
def test_get_level_title(self):
    """Test level title lookup."""
    assert get_level_title(1) == "Beginner"
    assert get_level_title(5) == "Explorer"      # WRONG
    assert get_level_title(10) == "Scholar"      # WRONG
    assert get_level_title(15) == "Expert"       # WRONG
    assert get_level_title(20) == "Master"       # WRONG
```

In `gamification.py` (lines 131-152), the actual `LEVEL_TITLES` are:
```python
LEVEL_TITLES: dict[int, str] = {
    1: "Beginner",
    2: "Learner",
    3: "Student",
    4: "Apprentice",
    5: "Scholar",           # Test expects "Explorer"
    6: "Dedicated Scholar",
    7: "Keen Scholar",
    8: "Junior Researcher",
    9: "Researcher",
    10: "Senior Researcher", # Test expects "Scholar"
    11: "Junior Expert",
    12: "Expert",
    13: "Senior Expert",
    14: "Master",
    15: "Senior Master",     # Test expects "Expert"
    16: "Distinguished Scholar",
    17: "Academic",
    18: "Senior Academic",
    19: "Learning Legend",
    20: "Supreme Scholar",   # Test expects "Master"
}
```

**Recommended Fix**:

Update the test assertions to match the actual configuration:

```python
def test_get_level_title(self):
    """Test level title lookup."""
    assert get_level_title(1) == "Beginner"
    assert get_level_title(5) == "Scholar"
    assert get_level_title(10) == "Senior Researcher"
    assert get_level_title(15) == "Senior Master"
    assert get_level_title(20) == "Supreme Scholar"
```

**Dependencies**: None

**Effort**: Low (simple string changes)

---

### 2. Implement `_calculate_progress` Method

**File**: `backend/app/services/achievement_service.py`

**Issue Summary**:
The `_calculate_progress` method currently returns placeholder values and does not properly calculate progress towards achievements.

**Current Implementation Analysis** (lines 429-453):

```python
def _calculate_progress(
    self,
    defn: AchievementDefinitionResponse,
    stats: dict[str, Any],
    is_unlocked: bool,
) -> tuple[Decimal, str | None]:
    """Calculate progress towards an achievement."""
    if is_unlocked:
        return Decimal("100"), "Completed!"

    # Get first requirement (simplified)
    # In production, might have multiple requirements
    definitions_result = None  # Would fetch from DB

    # Default progress for now
    return Decimal("0"), None
```

The method has access to `defn` (which includes the code, category, etc.) but does not use the actual requirements. Looking at how achievements are defined in `gamification.py`, requirements are stored as a dict like:
- `{"sessions_completed": 1}`
- `{"streak_days": 7}`
- `{"level": 10}`
- `{"outcomes_mastered": 10}`
- `{"perfect_sessions": 1}`

The `stats` dict (from `_get_student_stats`) contains:
- `total_xp`
- `level`
- `streak_days`
- `sessions_completed`
- `perfect_sessions`
- `flashcards_reviewed`
- `outcomes_mastered`
- `subject_sessions`

**Recommended Fix**:

The `_calculate_progress` method needs to access the actual requirements. Since `AchievementDefinitionResponse` only has display fields (no requirements), we need to either:

1. **Option A**: Add `requirements` to `AchievementDefinitionResponse` schema
2. **Option B**: Pass requirements separately or fetch from DB
3. **Option C**: Use a different parameter type that includes requirements

Best approach - modify the method signature and implementation:

```python
def _calculate_progress(
    self,
    defn: AchievementDefinitionResponse,
    requirements: dict[str, Any],  # Add requirements parameter
    stats: dict[str, Any],
    is_unlocked: bool,
) -> tuple[Decimal, str | None]:
    """Calculate progress towards an achievement."""
    if is_unlocked:
        return Decimal("100"), "Completed!"

    if not requirements:
        return Decimal("0"), None

    # Handle each requirement type
    for key, target in requirements.items():
        if key == "sessions_completed":
            current = stats.get("sessions_completed", 0)
            progress = min(100, (current / target) * 100)
            return Decimal(str(progress)).quantize(Decimal("0.1")), f"{current}/{target} sessions"
        elif key == "streak_days":
            current = stats.get("streak_days", 0)
            progress = min(100, (current / target) * 100)
            return Decimal(str(progress)).quantize(Decimal("0.1")), f"{current}/{target} days"
        elif key == "level":
            current = stats.get("level", 1)
            progress = min(100, (current / target) * 100)
            return Decimal(str(progress)).quantize(Decimal("0.1")), f"Level {current}/{target}"
        elif key == "total_xp":
            current = stats.get("total_xp", 0)
            progress = min(100, (current / target) * 100)
            return Decimal(str(progress)).quantize(Decimal("0.1")), f"{current:,}/{target:,} XP"
        elif key == "outcomes_mastered":
            current = stats.get("outcomes_mastered", 0)
            progress = min(100, (current / target) * 100)
            return Decimal(str(progress)).quantize(Decimal("0.1")), f"{current}/{target} outcomes"
        elif key == "perfect_sessions":
            current = stats.get("perfect_sessions", 0)
            progress = min(100, (current / target) * 100)
            return Decimal(str(progress)).quantize(Decimal("0.1")), f"{current}/{target} perfect"
        elif key == "flashcards_reviewed":
            current = stats.get("flashcards_reviewed", 0)
            progress = min(100, (current / target) * 100)
            return Decimal(str(progress)).quantize(Decimal("0.1")), f"{current:,}/{target:,} cards"
        elif key == "subject_sessions":
            # Need subject code from defn
            if defn.subject_code:
                current = stats.get("subject_sessions", {}).get(defn.subject_code, 0)
                progress = min(100, (current / target) * 100)
                return Decimal(str(progress)).quantize(Decimal("0.1")), f"{current}/{target} sessions"

    return Decimal("0"), None
```

**Changes Required**:
1. Update `get_all_definitions()` to also return requirements, or create a new internal method
2. Modify `get_achievements_with_progress()` to pass requirements to `_calculate_progress()`

**Dependencies**: May need schema changes to `AchievementDefinitionResponse`

**Effort**: Medium

---

### 3. Implement `perfect_sessions` and `outcomes_mastered` Tracking

**File**: `backend/app/services/achievement_service.py`

**Issue Summary**:
The `_get_student_stats` method has placeholder implementations for `perfect_sessions` and `outcomes_mastered`.

**Current Implementation Analysis** (lines 321-388):

```python
# Perfect sessions calculation (lines 343-351)
perfect_result = await self.db.execute(
    select(func.count(Session.id))
    .where(Session.student_id == student_id)
    .where(Session.ended_at.isnot(None))
    .where(Session.session_type == "revision")
)
# Simplified: would need to check data JSONB for questionsCorrect == questionsAttempted
perfect_sessions = 0  # Placeholder

# Outcomes mastered (line 386)
"outcomes_mastered": 0,  # Placeholder - would need outcome tracking
```

**Recommended Fix for `perfect_sessions`**:

The Session model has a `data` JSONB field with `questionsCorrect` and `questionsAttempted`. We need to query sessions where these values are equal and > 0:

```python
# Option 1: Use PostgreSQL JSONB operators (preferred - done in DB)
from sqlalchemy import and_, cast, Integer
from sqlalchemy.dialects.postgresql import JSONB

# Count perfect revision sessions
# A perfect session has questionsCorrect == questionsAttempted AND questionsAttempted > 0
perfect_result = await self.db.execute(
    select(func.count(Session.id))
    .where(Session.student_id == student_id)
    .where(Session.ended_at.isnot(None))
    .where(Session.session_type == "revision")
    .where(
        Session.data["questionsAttempted"].astext.cast(Integer) > 0
    )
    .where(
        Session.data["questionsCorrect"].astext ==
        Session.data["questionsAttempted"].astext
    )
)
perfect_sessions = perfect_result.scalar() or 0
```

**Recommended Fix for `outcomes_mastered`**:

Looking at the data model, curriculum outcomes completion should be tracked in:
1. `StudentSubject.progress["outcomesCompleted"]` - list of completed outcome codes
2. Or a separate outcome tracking table (not currently implemented)

Current approach using existing data:
```python
# Count unique mastered outcomes across all subjects
result = await self.db.execute(
    select(StudentSubject.progress)
    .where(StudentSubject.student_id == student_id)
)
rows = result.scalars().all()

mastered_outcomes = set()
for progress in rows:
    if progress and "outcomesCompleted" in progress:
        mastered_outcomes.update(progress["outcomesCompleted"])

outcomes_mastered = len(mastered_outcomes)
```

**Dependencies**: None for perfect_sessions. For outcomes_mastered, relies on `StudentSubject.progress["outcomesCompleted"]` being properly populated elsewhere.

**Effort**: Low-Medium

---

### 4. Implement `_apply_daily_cap` Method

**File**: `backend/app/services/xp_service.py`

**Issue Summary**:
The `_apply_daily_cap` method does not properly enforce daily XP caps per activity type. It currently just applies a simple `min()` without tracking actual daily usage.

**Current Implementation Analysis** (lines 291-311):

```python
async def _apply_daily_cap(
    self, student_id: UUID, activity_type: ActivityType, amount: int
) -> int:
    """Apply daily cap to XP if applicable."""
    rule = XP_RULES.get(activity_type)
    if not rule or rule.max_per_day is None:
        return amount

    # For now, simplified: just allow the amount
    # In production, track daily XP per activity type
    # This would require an xp_events table or daily counter
    return min(amount, rule.max_per_day)
```

The current implementation just caps a single award at the daily max, but doesn't track cumulative daily XP.

**Recommended Fix (Partial - Without XP Events Table)**:

Without a proper XP events table, we can use the student's gamification JSONB field to track daily XP:

```python
async def _apply_daily_cap(
    self, student_id: UUID, activity_type: ActivityType, amount: int
) -> int:
    """Apply daily cap to XP if applicable."""
    rule = XP_RULES.get(activity_type)
    if not rule or rule.max_per_day is None:
        return amount

    # Get student to check daily tracking
    result = await self.db.execute(
        select(Student).where(Student.id == student_id)
    )
    student = result.scalar_one_or_none()
    if not student:
        return amount

    today = date.today().isoformat()
    gamification = student.gamification
    daily_xp = gamification.get("dailyXPEarned", {})

    # Reset if different day
    if daily_xp.get("date") != today:
        daily_xp = {"date": today}

    # Get XP already earned for this activity today
    activity_key = activity_type.value
    earned_today = daily_xp.get(activity_key, 0)
    remaining = rule.max_per_day - earned_today

    if remaining <= 0:
        return 0

    allowed = min(amount, remaining)

    # Update tracking (will be persisted in award_xp)
    daily_xp[activity_key] = earned_today + allowed
    gamification["dailyXPEarned"] = daily_xp
    student.gamification = gamification

    return allowed
```

**Note**: This approach modifies the student in `_apply_daily_cap` which is then committed in `award_xp`. This works but couples the methods. A cleaner approach would be the XP events table (see Low Priority section).

**Dependencies**: None for basic implementation. Full solution requires XP events table.

**Effort**: Medium (partial), High (full with XP events)

---

## Low Priority Recommendations

### 1. Use `.is_(True)` Instead of `== True` in SQLAlchemy Queries

**Files Affected**:
- `backend/app/services/achievement_service.py` (lines 60, 206, 481)
- `backend/app/services/framework_service.py` (line 100)
- `backend/app/services/goal_service.py` (lines 130, 139, 167, 501)

**Issue Summary**:
SQLAlchemy recommends using `.is_(True)` instead of `== True` for boolean comparisons to avoid Python's identity comparison issues and make the intent clearer.

**Current Implementation**:
```python
query = query.where(AchievementDefinition.is_active == True)  # noqa: E712
```

**Recommended Fix**:
```python
query = query.where(AchievementDefinition.is_active.is_(True))
```

The `# noqa: E712` comments acknowledge this is intentional but non-standard. Using `.is_(True)` removes the need for the noqa comment and follows SQLAlchemy best practices.

**All Locations to Update**:

1. `achievement_service.py:60`:
   ```python
   # From:
   query = query.where(AchievementDefinition.is_active == True)  # noqa: E712
   # To:
   query = query.where(AchievementDefinition.is_active.is_(True))
   ```

2. `achievement_service.py:206`:
   ```python
   # From:
   .where(AchievementDefinition.is_active == True)  # noqa: E712
   # To:
   .where(AchievementDefinition.is_active.is_(True))
   ```

3. `achievement_service.py:481`:
   ```python
   # From:
   .where(AchievementDefinition.is_active == True)  # noqa: E712
   # To:
   .where(AchievementDefinition.is_active.is_(True))
   ```

4. `framework_service.py:100`:
   ```python
   # From:
   select(CurriculumFramework).where(CurriculumFramework.is_default == True)  # noqa: E712
   # To:
   select(CurriculumFramework).where(CurriculumFramework.is_default.is_(True))
   ```

5. `goal_service.py:130`:
   ```python
   # From:
   query = query.where(Goal.is_active == True)  # noqa: E712
   # To:
   query = query.where(Goal.is_active.is_(True))
   ```

6. `goal_service.py:139`:
   ```python
   # From:
   count_query = count_query.where(Goal.is_active == True)  # noqa: E712
   # To:
   count_query = count_query.where(Goal.is_active.is_(True))
   ```

7. `goal_service.py:167`:
   ```python
   # From:
   query = query.where(Goal.is_active == True)  # noqa: E712
   # To:
   query = query.where(Goal.is_active.is_(True))
   ```

8. `goal_service.py:501`:
   ```python
   # From:
   .where(Goal.is_active == True)  # noqa: E712
   # To:
   .where(Goal.is_active.is_(True))
   ```

**Dependencies**: None

**Effort**: Very Low (8 simple line changes)

---

### 2. Optimize N+1 Query in `_get_student_stats` for Subject Codes

**File**: `backend/app/services/achievement_service.py`

**Issue Summary**:
The `_get_student_stats` method has an N+1 query problem when fetching subject codes. For each subject_id in the result, it makes a separate database query.

**Current Implementation Analysis** (lines 361-377):

```python
# Count sessions by subject
subject_sessions: dict[str, int] = {}
subject_result = await self.db.execute(
    select(Session.subject_id, func.count(Session.id))
    .where(Session.student_id == student_id)
    .where(Session.ended_at.isnot(None))
    .where(Session.subject_id.isnot(None))
    .group_by(Session.subject_id)
)
from app.models.subject import Subject
for subject_id, count in subject_result.all():
    # Get subject code - THIS IS N+1!
    subj_result = await self.db.execute(
        select(Subject.code).where(Subject.id == subject_id)
    )
    code = subj_result.scalar()
    if code:
        subject_sessions[code] = count
```

This executes 1 + N queries where N is the number of distinct subjects the student has sessions in.

**Recommended Fix**:

Use a JOIN to get subject codes in a single query:

```python
# Count sessions by subject with subject code in one query
from app.models.subject import Subject

subject_sessions: dict[str, int] = {}
subject_result = await self.db.execute(
    select(Subject.code, func.count(Session.id))
    .join(Subject, Session.subject_id == Subject.id)
    .where(Session.student_id == student_id)
    .where(Session.ended_at.isnot(None))
    .where(Session.subject_id.isnot(None))
    .group_by(Subject.code)
)
for code, count in subject_result.all():
    subject_sessions[code] = count
```

This reduces the query count from 1+N to just 1.

**Dependencies**: None

**Effort**: Very Low (simple refactor)

---

### 3. Implement XP Events Table for Full Daily Cap Enforcement

**Issue Summary**:
To properly enforce daily XP caps and provide accurate daily XP summaries, we need a dedicated table to track XP events.

**Current Problem**:
- `_apply_daily_cap` cannot accurately track daily XP without persistent event records
- `get_daily_xp_summary` returns empty results
- Historical XP data is lost after the day ends

**Recommended Model Design**:

Following existing patterns in the codebase (e.g., `RevisionHistory`, `Session`):

```python
# backend/app/models/xp_event.py
"""XP Event model for tracking experience point awards."""
from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.session import Session
    from app.models.student import Student
    from app.models.subject import Subject


class XPEvent(Base):
    """Record of a single XP award event."""

    __tablename__ = "xp_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), index=True
    )
    session_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="SET NULL")
    )
    subject_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="SET NULL")
    )

    # XP details
    activity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    base_amount: Mapped[int] = mapped_column(Integer, nullable=False)
    multiplier: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    final_amount: Mapped[int] = mapped_column(Integer, nullable=False)

    # Date for daily cap queries (indexed for performance)
    earned_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    student: Mapped[Student] = relationship("Student", back_populates="xp_events")
    session: Mapped[Session | None] = relationship("Session")
    subject: Mapped[Subject | None] = relationship("Subject")
```

**Required Changes**:

1. **Create the model file**: `backend/app/models/xp_event.py`

2. **Update Student model** to add relationship:
   ```python
   xp_events: Mapped[list[XPEvent]] = relationship(
       "XPEvent", back_populates="student", cascade="all, delete-orphan"
   )
   ```

3. **Update models `__init__.py`**:
   ```python
   from app.models.xp_event import XPEvent
   ```

4. **Create Alembic migration**:
   ```bash
   alembic revision --autogenerate -m "Add xp_events table"
   ```

5. **Update XPService.award_xp()** to create XP event records:
   ```python
   from app.models.xp_event import XPEvent

   # In award_xp method, after calculating final_xp:
   xp_event = XPEvent(
       student_id=student_id,
       session_id=session_id,
       subject_id=subject_id,
       activity_type=source.value,
       base_amount=amount,
       multiplier=multiplier,
       final_amount=final_xp,
       earned_date=date.today(),
   )
   self.db.add(xp_event)
   ```

6. **Update `_apply_daily_cap`** to query XP events:
   ```python
   async def _apply_daily_cap(
       self, student_id: UUID, activity_type: ActivityType, amount: int
   ) -> int:
       rule = XP_RULES.get(activity_type)
       if not rule or rule.max_per_day is None:
           return amount

       today = date.today()

       # Sum XP earned today for this activity type
       result = await self.db.execute(
           select(func.coalesce(func.sum(XPEvent.final_amount), 0))
           .where(XPEvent.student_id == student_id)
           .where(XPEvent.activity_type == activity_type.value)
           .where(XPEvent.earned_date == today)
       )
       earned_today = result.scalar() or 0

       remaining = rule.max_per_day - earned_today
       if remaining <= 0:
           return 0

       return min(amount, remaining)
   ```

7. **Implement `get_daily_xp_summary`**:
   ```python
   async def get_daily_xp_summary(self, student_id: UUID) -> dict[str, int]:
       today = date.today()
       result = await self.db.execute(
           select(XPEvent.activity_type, func.sum(XPEvent.final_amount))
           .where(XPEvent.student_id == student_id)
           .where(XPEvent.earned_date == today)
           .group_by(XPEvent.activity_type)
       )
       return {activity: total for activity, total in result.all()}
   ```

**Database Indexes Recommended**:
- `(student_id, earned_date)` - for daily cap queries
- `(student_id, activity_type, earned_date)` - for activity-specific caps
- `(earned_date)` - for cleanup/archival

**Migration Example**:
```python
"""Add xp_events table

Revision ID: xxxx
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

def upgrade() -> None:
    op.create_table(
        "xp_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("students.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("subject_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True),
        sa.Column("activity_type", sa.String(50), nullable=False),
        sa.Column("base_amount", sa.Integer(), nullable=False),
        sa.Column("multiplier", sa.Float(), default=1.0, nullable=False),
        sa.Column("final_amount", sa.Integer(), nullable=False),
        sa.Column("earned_date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    # Create indexes
    op.create_index("ix_xp_events_student_id", "xp_events", ["student_id"])
    op.create_index("ix_xp_events_activity_type", "xp_events", ["activity_type"])
    op.create_index("ix_xp_events_earned_date", "xp_events", ["earned_date"])
    op.create_index("ix_xp_events_student_date", "xp_events", ["student_id", "earned_date"])

def downgrade() -> None:
    op.drop_table("xp_events")
```

**Dependencies**:
- Alembic migration
- Model registration in `__init__.py`
- Student model relationship update

**Effort**: High (new table, migration, service updates)

---

## Summary

| Priority | Item | Effort | Files Affected |
|----------|------|--------|----------------|
| Medium | Fix level title test assertions | Low | test_gamification_services.py |
| Medium | Implement `_calculate_progress` | Medium | achievement_service.py |
| Medium | Implement `perfect_sessions` tracking | Low-Medium | achievement_service.py |
| Medium | Implement `outcomes_mastered` tracking | Low-Medium | achievement_service.py |
| Medium | Implement `_apply_daily_cap` (partial) | Medium | xp_service.py |
| Low | Use `.is_(True)` syntax | Very Low | 3 service files (8 lines) |
| Low | Fix N+1 query in `_get_student_stats` | Very Low | achievement_service.py |
| Low | XP events table | High | New model, migration, services |

## Recommended Implementation Order

1. **Quick wins first**:
   - Fix test assertions (5 min)
   - Use `.is_(True)` syntax (10 min)
   - Fix N+1 query (15 min)

2. **Medium complexity**:
   - Implement `perfect_sessions` tracking (30 min)
   - Implement `outcomes_mastered` tracking (30 min)
   - Implement `_calculate_progress` (45 min)
   - Implement partial `_apply_daily_cap` (30 min)

3. **Deferred (requires more planning)**:
   - XP events table (2-3 hours including migration and testing)
