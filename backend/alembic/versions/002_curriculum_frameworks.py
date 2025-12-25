"""Create curriculum_frameworks table.

Revision ID: 002
Revises: 001
Create Date: 2025-12-25
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create curriculum_frameworks table and seed NSW."""
    op.create_table(
        "curriculum_frameworks",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("code", sa.String(20), unique=True, nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("country", sa.String(50), nullable=False, server_default="Australia"),
        sa.Column("region_type", sa.String(20), nullable=False),
        sa.Column("structure", postgresql.JSONB, server_default="{}"),
        sa.Column("syllabus_authority", sa.String(100), nullable=True),
        sa.Column("syllabus_url", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("is_default", sa.Boolean, server_default="false"),
        sa.Column("display_order", sa.Integer, server_default="0"),
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
    )

    # Create updated_at trigger
    op.execute("""
        CREATE TRIGGER update_curriculum_frameworks_updated_at
        BEFORE UPDATE ON curriculum_frameworks
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    """)

    # Seed NSW as default framework
    op.execute("""
        INSERT INTO curriculum_frameworks (code, name, country, region_type, syllabus_authority, syllabus_url, is_active, is_default, display_order, structure)
        VALUES (
            'NSW',
            'New South Wales',
            'Australia',
            'state',
            'NESA',
            'https://curriculum.nsw.edu.au/',
            true,
            true,
            1,
            '{
                "stages": {
                    "ES1": {"name": "Early Stage 1", "years": ["K"]},
                    "S1": {"name": "Stage 1", "years": ["1", "2"]},
                    "S2": {"name": "Stage 2", "years": ["3", "4"]},
                    "S3": {"name": "Stage 3", "years": ["5", "6"]},
                    "S4": {"name": "Stage 4", "years": ["7", "8"]},
                    "S5": {"name": "Stage 5", "years": ["9", "10"]},
                    "S6": {"name": "Stage 6", "years": ["11", "12"]}
                },
                "pathways": {
                    "S5": ["5.1", "5.2", "5.3"]
                },
                "senior_structure": "HSC"
            }'::jsonb
        )
    """)


def downgrade() -> None:
    """Drop curriculum_frameworks table."""
    op.execute("DROP TRIGGER IF EXISTS update_curriculum_frameworks_updated_at ON curriculum_frameworks")
    op.drop_table("curriculum_frameworks")
