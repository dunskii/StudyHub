"""Create revision_history table.

Revision ID: 014
Revises: 013
Create Date: 2024-01-01 00:00:14.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "014"
down_revision: Union[str, None] = "013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "revision_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "student_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("students.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "flashcard_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("flashcards.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "session_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("sessions.id", ondelete="SET NULL"),
            nullable=True,
        ),
        # Review result
        sa.Column("was_correct", sa.Boolean, nullable=False),
        sa.Column("quality_rating", sa.Integer, nullable=False),  # 0-5, used for SM-2 calculation
        sa.Column("response_time_seconds", sa.Integer, nullable=True),
        # SM-2 state before and after this review
        sa.Column("sr_interval_before", sa.Integer, nullable=False),
        sa.Column("sr_interval_after", sa.Integer, nullable=False),
        sa.Column("sr_ease_before", sa.Float, nullable=False),
        sa.Column("sr_ease_after", sa.Float, nullable=False),
        sa.Column("sr_repetition_before", sa.Integer, nullable=False),
        sa.Column("sr_repetition_after", sa.Integer, nullable=False),
        # Timestamps
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    # Add indexes for common query patterns
    op.create_index("ix_revision_history_student_id", "revision_history", ["student_id"])
    op.create_index("ix_revision_history_flashcard_id", "revision_history", ["flashcard_id"])
    op.create_index("ix_revision_history_session_id", "revision_history", ["session_id"])
    op.create_index("ix_revision_history_created_at", "revision_history", ["created_at"])
    # Composite index for student history queries
    op.create_index(
        "ix_revision_history_student_created",
        "revision_history",
        ["student_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_revision_history_student_created")
    op.drop_index("ix_revision_history_created_at")
    op.drop_index("ix_revision_history_session_id")
    op.drop_index("ix_revision_history_flashcard_id")
    op.drop_index("ix_revision_history_student_id")
    op.drop_table("revision_history")
