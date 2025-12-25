"""Create ai_interactions table.

Revision ID: 011
Revises: 010
Create Date: 2024-01-01 00:00:11.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "011"
down_revision: Union[str, None] = "010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_interactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "session_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("sessions.id", ondelete="CASCADE"),
            nullable=False,
        ),
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
        sa.Column("user_message", sa.Text, nullable=False),
        sa.Column("ai_response", sa.Text, nullable=False),
        sa.Column("model_used", sa.String(100), nullable=False),
        sa.Column("task_type", sa.String(50), nullable=False),
        sa.Column("input_tokens", sa.Integer, server_default="0"),
        sa.Column("output_tokens", sa.Integer, server_default="0"),
        sa.Column("estimated_cost_usd", sa.Float, server_default="0.0"),
        sa.Column("curriculum_context", postgresql.JSONB, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column("flagged", sa.Boolean, server_default="false"),
        sa.Column("flag_reason", sa.String(255), nullable=True),
        sa.Column("reviewed_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Add indexes
    op.create_index("ix_ai_interactions_session_id", "ai_interactions", ["session_id"])
    op.create_index("ix_ai_interactions_student_id", "ai_interactions", ["student_id"])
    op.create_index("ix_ai_interactions_created_at", "ai_interactions", ["created_at"])
    op.create_index("ix_ai_interactions_flagged", "ai_interactions", ["flagged"])

    # Partial index for flagged=true (for moderation queries)
    op.execute(
        """
        CREATE INDEX ix_ai_interactions_flagged_true
        ON ai_interactions (flagged)
        WHERE flagged = true;
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_ai_interactions_flagged_true")
    op.drop_index("ix_ai_interactions_flagged")
    op.drop_index("ix_ai_interactions_created_at")
    op.drop_index("ix_ai_interactions_student_id")
    op.drop_index("ix_ai_interactions_session_id")
    op.drop_table("ai_interactions")
