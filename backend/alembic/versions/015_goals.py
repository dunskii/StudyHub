"""Create goals table for family goal setting.

Revision ID: 015
Revises: 014
Create Date: 2024-01-01 00:00:15.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "015"
down_revision: Union[str, None] = "014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "goals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "parent_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "student_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("students.id", ondelete="CASCADE"),
            nullable=False,
        ),
        # Goal details
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column(
            "target_outcomes",
            postgresql.ARRAY(sa.String),
            nullable=True,
        ),  # Curriculum outcome codes
        sa.Column(
            "target_mastery",
            sa.Numeric(5, 2),
            nullable=True,
        ),  # Target percentage (e.g., 80.00)
        sa.Column("target_date", sa.Date, nullable=True),
        sa.Column("reward", sa.String(255), nullable=True),  # Family reward
        # Status
        sa.Column("is_active", sa.Boolean, default=True, nullable=False),
        # Timestamps
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
        sa.Column("achieved_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Indexes for common query patterns
    op.create_index("ix_goals_parent_id", "goals", ["parent_id"])
    op.create_index("ix_goals_student_id", "goals", ["student_id"])
    op.create_index(
        "ix_goals_active",
        "goals",
        ["is_active"],
        postgresql_where=sa.text("is_active = true"),
    )
    # Composite index for parent viewing student goals
    op.create_index(
        "ix_goals_parent_student",
        "goals",
        ["parent_id", "student_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_goals_parent_student")
    op.drop_index("ix_goals_active")
    op.drop_index("ix_goals_student_id")
    op.drop_index("ix_goals_parent_id")
    op.drop_table("goals")
