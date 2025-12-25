"""Create notes table.

Revision ID: 009
Revises: 008
Create Date: 2024-01-01 00:00:09.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "009"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "notes",
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
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("content_type", sa.String(50), nullable=False),
        sa.Column("storage_url", sa.Text, nullable=True),
        sa.Column("ocr_text", sa.Text, nullable=True),
        sa.Column("ocr_status", sa.String(20), server_default="pending"),
        sa.Column("curriculum_outcomes", postgresql.ARRAY(postgresql.UUID(as_uuid=True)), nullable=True),
        sa.Column("tags", postgresql.ARRAY(sa.String), nullable=True),
        sa.Column("note_metadata", postgresql.JSONB, server_default="{}", nullable=False),
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

    # Add indexes
    op.create_index("ix_notes_student_id", "notes", ["student_id"])
    op.create_index("ix_notes_subject_id", "notes", ["subject_id"])
    op.create_index("ix_notes_ocr_status", "notes", ["ocr_status"])
    op.create_index("ix_notes_created_at", "notes", ["created_at"])

    # Add trigger for updated_at
    op.execute(
        """
        CREATE TRIGGER set_updated_at
            BEFORE UPDATE ON notes
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS set_updated_at ON notes")
    op.drop_index("ix_notes_created_at")
    op.drop_index("ix_notes_ocr_status")
    op.drop_index("ix_notes_subject_id")
    op.drop_index("ix_notes_student_id")
    op.drop_table("notes")
