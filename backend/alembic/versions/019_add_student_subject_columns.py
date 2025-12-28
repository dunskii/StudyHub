"""Add current_focus_outcomes and last_activity_at to student_subjects.

Revision ID: 019
Revises: 018_weekly_insights
Create Date: 2025-01-01
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

# revision identifiers, used by Alembic.
revision = "019"
down_revision = "018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add new columns to student_subjects table."""
    op.add_column(
        "student_subjects",
        sa.Column(
            "current_focus_outcomes",
            JSONB,
            nullable=True,
            comment="Current outcomes being focused on",
        ),
    )
    op.add_column(
        "student_subjects",
        sa.Column(
            "last_activity_at",
            sa.DateTime(timezone=True),
            nullable=True,
            comment="Last activity timestamp for this subject",
        ),
    )


def downgrade() -> None:
    """Remove added columns."""
    op.drop_column("student_subjects", "last_activity_at")
    op.drop_column("student_subjects", "current_focus_outcomes")
