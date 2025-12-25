"""Create students table.

Revision ID: 004
Revises: 003
Create Date: 2025-12-25
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create students table."""
    op.create_table(
        "students",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "parent_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "supabase_auth_id",
            postgresql.UUID(as_uuid=True),
            unique=True,
            nullable=True,
        ),
        sa.Column("display_name", sa.String(255), nullable=False),
        sa.Column("avatar_url", sa.Text, nullable=True),
        sa.Column("grade_level", sa.Integer, nullable=False),
        sa.Column("school_stage", sa.String(20), nullable=False),
        sa.Column(
            "framework_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("curriculum_frameworks.id"),
            nullable=False,
        ),
        sa.Column("preferences", postgresql.JSONB, server_default="{}"),
        sa.Column(
            "gamification",
            postgresql.JSONB,
            server_default='{"xp": 0, "level": 1, "streak": 0}',
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
        ),
        sa.Column("last_active_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("onboarding_completed", sa.Boolean, server_default="false"),
        # Constraint for grade level (K=0, Years 1-12 = 1-12)
        sa.CheckConstraint("grade_level >= 0 AND grade_level <= 12", name="ck_students_grade_level"),
    )

    # Create indexes
    op.create_index("ix_students_parent_id", "students", ["parent_id"])
    op.create_index("ix_students_framework_id", "students", ["framework_id"])
    op.create_index("ix_students_grade_level", "students", ["grade_level"])

    # Create updated_at trigger
    op.execute("""
        CREATE TRIGGER update_students_updated_at
        BEFORE UPDATE ON students
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    """)


def downgrade() -> None:
    """Drop students table."""
    op.execute("DROP TRIGGER IF EXISTS update_students_updated_at ON students")
    op.drop_index("ix_students_grade_level")
    op.drop_index("ix_students_framework_id")
    op.drop_index("ix_students_parent_id")
    op.drop_table("students")
