"""Create sessions table.

Revision ID: 010
Revises: 009
Create Date: 2024-01-01 00:00:10.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "010"
down_revision: Union[str, None] = "009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "sessions",
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
            sa.ForeignKey("subjects.id"),
            nullable=True,
        ),
        sa.Column("session_type", sa.String(50), nullable=False),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_minutes", sa.Integer, nullable=True),
        sa.Column("xp_earned", sa.Integer, server_default="0"),
        sa.Column(
            "data",
            postgresql.JSONB,
            server_default='{"outcomesWorkedOn": [], "questionsAttempted": 0, "questionsCorrect": 0, "flashcardsReviewed": 0}',
            nullable=False,
        ),
    )

    # Add indexes
    op.create_index("ix_sessions_student_id", "sessions", ["student_id"])
    op.create_index("ix_sessions_subject_id", "sessions", ["subject_id"])
    op.create_index("ix_sessions_started_at", "sessions", ["started_at"])
    op.create_index("ix_sessions_session_type", "sessions", ["session_type"])


def downgrade() -> None:
    op.drop_index("ix_sessions_session_type")
    op.drop_index("ix_sessions_started_at")
    op.drop_index("ix_sessions_subject_id")
    op.drop_index("ix_sessions_student_id")
    op.drop_table("sessions")
