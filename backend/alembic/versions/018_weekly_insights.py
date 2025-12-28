"""Create weekly_insights table for caching AI-generated insights.

Revision ID: 018
Revises: 017
Create Date: 2024-01-01 00:00:18.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "018"
down_revision: Union[str, None] = "017"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "weekly_insights",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "student_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("students.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("week_start", sa.Date, nullable=False),  # Monday of the week
        # AI-generated insights (cached)
        sa.Column(
            "insights",
            postgresql.JSONB,
            nullable=False,
        ),  # {wins: [], areas_to_watch: [], recommendations: [], etc.}
        # Generation metadata
        sa.Column(
            "model_used",
            sa.String(50),
            default="claude-3-5-haiku",
            nullable=False,
        ),
        sa.Column("tokens_used", sa.Integer, nullable=True),
        sa.Column(
            "cost_estimate",
            sa.Numeric(10, 6),
            nullable=True,
        ),  # USD cost
        # Timestamps
        sa.Column(
            "generated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "sent_to_parent_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),  # When email was sent
        # Unique constraint: one insight per student per week
        sa.UniqueConstraint(
            "student_id",
            "week_start",
            name="uq_weekly_insights_student_week",
        ),
    )

    # Indexes for common query patterns
    op.create_index(
        "ix_weekly_insights_student_id",
        "weekly_insights",
        ["student_id"],
    )
    op.create_index(
        "ix_weekly_insights_week_start",
        "weekly_insights",
        ["week_start"],
        postgresql_ops={"week_start": "DESC"},
    )
    # Composite index for looking up specific week for student
    op.create_index(
        "ix_weekly_insights_student_week",
        "weekly_insights",
        ["student_id", "week_start"],
    )


def downgrade() -> None:
    op.drop_index("ix_weekly_insights_student_week")
    op.drop_index("ix_weekly_insights_week_start")
    op.drop_index("ix_weekly_insights_student_id")
    op.drop_table("weekly_insights")
