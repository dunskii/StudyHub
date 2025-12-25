"""Create student_subjects table.

Revision ID: 008
Revises: 007
Create Date: 2024-01-01 00:00:08.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "student_subjects",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "student_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("students.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "subject_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("subjects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("pathway", sa.String(10), nullable=True),
        sa.Column(
            "senior_course_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("senior_courses.id"),
            nullable=True,
        ),
        sa.Column(
            "enrolled_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "progress",
            postgresql.JSONB,
            server_default='{"outcomesCompleted": [], "outcomesInProgress": [], "overallPercentage": 0, "lastActivity": null, "xpEarned": 0}',
            nullable=False,
        ),
    )

    # Add unique constraint on student_id + subject_id
    op.create_unique_constraint(
        "uq_student_subjects_student_subject",
        "student_subjects",
        ["student_id", "subject_id"],
    )

    # Add indexes
    op.create_index("ix_student_subjects_student_id", "student_subjects", ["student_id"])
    op.create_index("ix_student_subjects_subject_id", "student_subjects", ["subject_id"])


def downgrade() -> None:
    op.drop_index("ix_student_subjects_subject_id")
    op.drop_index("ix_student_subjects_student_id")
    op.drop_constraint("uq_student_subjects_student_subject", "student_subjects")
    op.drop_table("student_subjects")
