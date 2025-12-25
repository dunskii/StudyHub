"""Create curriculum_outcomes table.

Revision ID: 006
Revises: 005
Create Date: 2024-01-01 00:00:06.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "curriculum_outcomes",
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
        sa.Column("outcome_code", sa.String(30), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("stage", sa.String(20), nullable=False),
        sa.Column("strand", sa.String(100), nullable=True),
        sa.Column("substrand", sa.String(100), nullable=True),
        sa.Column("pathway", sa.String(10), nullable=True),
        sa.Column("content_descriptors", postgresql.ARRAY(sa.String), nullable=True),
        sa.Column("elaborations", postgresql.JSONB, nullable=True),
        sa.Column("prerequisites", postgresql.ARRAY(sa.String), nullable=True),
        sa.Column("display_order", sa.Integer, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    # Add unique constraint on framework_id + outcome_code
    op.create_unique_constraint(
        "uq_curriculum_outcomes_framework_code",
        "curriculum_outcomes",
        ["framework_id", "outcome_code"],
    )

    # Add indexes
    op.create_index("ix_curriculum_outcomes_framework_id", "curriculum_outcomes", ["framework_id"])
    op.create_index("ix_curriculum_outcomes_subject_id", "curriculum_outcomes", ["subject_id"])
    op.create_index("ix_curriculum_outcomes_stage", "curriculum_outcomes", ["stage"])
    op.create_index("ix_curriculum_outcomes_outcome_code", "curriculum_outcomes", ["outcome_code"])


def downgrade() -> None:
    op.drop_index("ix_curriculum_outcomes_outcome_code")
    op.drop_index("ix_curriculum_outcomes_stage")
    op.drop_index("ix_curriculum_outcomes_subject_id")
    op.drop_index("ix_curriculum_outcomes_framework_id")
    op.drop_constraint("uq_curriculum_outcomes_framework_code", "curriculum_outcomes")
    op.drop_table("curriculum_outcomes")
