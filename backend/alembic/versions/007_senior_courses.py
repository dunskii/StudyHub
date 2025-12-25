"""Create senior_courses table.

Revision ID: 007
Revises: 006
Create Date: 2024-01-01 00:00:07.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "senior_courses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "framework_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("curriculum_frameworks.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "subject_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("subjects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("code", sa.String(30), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("course_type", sa.String(50), nullable=False),
        sa.Column("units", sa.Float, server_default="2.0"),
        sa.Column("is_atar", sa.Boolean, server_default="true"),
        sa.Column("prerequisites", postgresql.ARRAY(sa.String), nullable=True),
        sa.Column("exclusions", postgresql.ARRAY(sa.String), nullable=True),
        sa.Column("modules", postgresql.JSONB, nullable=True),
        sa.Column("assessment_components", postgresql.JSONB, nullable=True),
        sa.Column("display_order", sa.Integer, server_default="0"),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    # Add unique constraint on framework_id + code
    op.create_unique_constraint(
        "uq_senior_courses_framework_code",
        "senior_courses",
        ["framework_id", "code"],
    )

    # Add indexes
    op.create_index("ix_senior_courses_framework_id", "senior_courses", ["framework_id"])
    op.create_index("ix_senior_courses_subject_id", "senior_courses", ["subject_id"])
    op.create_index("ix_senior_courses_is_active", "senior_courses", ["is_active"])

    # Add trigger for updated_at
    op.execute(
        """
        CREATE TRIGGER set_updated_at
            BEFORE UPDATE ON senior_courses
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS set_updated_at ON senior_courses")
    op.drop_index("ix_senior_courses_is_active")
    op.drop_index("ix_senior_courses_subject_id")
    op.drop_index("ix_senior_courses_framework_id")
    op.drop_constraint("uq_senior_courses_framework_code", "senior_courses")
    op.drop_table("senior_courses")
