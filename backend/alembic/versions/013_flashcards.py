"""Create flashcards table.

Revision ID: 013
Revises: 012
Create Date: 2024-01-01 00:00:13.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "013"
down_revision: Union[str, None] = "012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "flashcards",
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
            sa.ForeignKey("subjects.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "curriculum_outcome_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("curriculum_outcomes.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "context_note_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("notes.id", ondelete="SET NULL"),
            nullable=True,
        ),
        # Content
        sa.Column("front", sa.Text, nullable=False),
        sa.Column("back", sa.Text, nullable=False),
        # Generation metadata
        sa.Column("generated_by", sa.String(20), nullable=True),  # 'user', 'ai', 'system'
        sa.Column("generation_model", sa.String(50), nullable=True),  # e.g., 'claude-3-5-haiku'
        # Review stats
        sa.Column("review_count", sa.Integer, server_default="0", nullable=False),
        sa.Column("correct_count", sa.Integer, server_default="0", nullable=False),
        sa.Column("mastery_percent", sa.Integer, server_default="0", nullable=False),
        # Spaced repetition state (SM-2 algorithm)
        sa.Column("sr_interval", sa.Integer, server_default="1", nullable=False),  # Days until next review
        sa.Column("sr_ease_factor", sa.Float, server_default="2.5", nullable=False),  # SM-2 ease factor (1.3-2.6+)
        sa.Column("sr_next_review", sa.DateTime(timezone=True), nullable=True),  # When to review next
        sa.Column("sr_repetition", sa.Integer, server_default="0", nullable=False),  # Times successfully reviewed
        # User-defined difficulty
        sa.Column("difficulty_level", sa.Integer, nullable=True),  # 1-5
        # Tags for organization
        sa.Column("tags", postgresql.ARRAY(sa.String), nullable=True),
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
        ),
    )

    # Add indexes for common query patterns
    op.create_index("ix_flashcards_student_id", "flashcards", ["student_id"])
    op.create_index("ix_flashcards_subject_id", "flashcards", ["subject_id"])
    op.create_index("ix_flashcards_outcome_id", "flashcards", ["curriculum_outcome_id"])
    op.create_index("ix_flashcards_note_id", "flashcards", ["context_note_id"])
    op.create_index("ix_flashcards_next_review", "flashcards", ["sr_next_review"])
    # Composite index for due cards query
    op.create_index(
        "ix_flashcards_student_due",
        "flashcards",
        ["student_id", "sr_next_review"],
    )

    # Add trigger for updated_at
    op.execute(
        """
        CREATE TRIGGER set_updated_at
            BEFORE UPDATE ON flashcards
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS set_updated_at ON flashcards")
    op.drop_index("ix_flashcards_student_due")
    op.drop_index("ix_flashcards_next_review")
    op.drop_index("ix_flashcards_note_id")
    op.drop_index("ix_flashcards_outcome_id")
    op.drop_index("ix_flashcards_subject_id")
    op.drop_index("ix_flashcards_student_id")
    op.drop_table("flashcards")
