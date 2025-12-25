"""Create subjects table.

Revision ID: 005
Revises: 004
Create Date: 2024-01-01 00:00:05.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "subjects",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "framework_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("curriculum_frameworks.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("code", sa.String(20), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("kla", sa.String(100), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("icon", sa.String(50), nullable=True),
        sa.Column("color", sa.String(7), nullable=True),
        sa.Column(
            "available_stages",
            postgresql.ARRAY(sa.String),
            nullable=False,
        ),
        sa.Column(
            "config",
            postgresql.JSONB,
            server_default='{"hasPathways": false, "pathways": [], "seniorCourses": [], "assessmentTypes": [], "tutorStyle": "socratic"}',
            nullable=False,
        ),
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
        "uq_subjects_framework_code",
        "subjects",
        ["framework_id", "code"],
    )

    # Add indexes
    op.create_index("ix_subjects_framework_id", "subjects", ["framework_id"])
    op.create_index("ix_subjects_code", "subjects", ["code"])
    op.create_index("ix_subjects_is_active", "subjects", ["is_active"])

    # Add trigger for updated_at
    op.execute(
        """
        CREATE TRIGGER set_updated_at
            BEFORE UPDATE ON subjects
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS set_updated_at ON subjects")
    op.drop_index("ix_subjects_is_active")
    op.drop_index("ix_subjects_code")
    op.drop_index("ix_subjects_framework_id")
    op.drop_constraint("uq_subjects_framework_code", "subjects")
    op.drop_table("subjects")
