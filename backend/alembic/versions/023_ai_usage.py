"""AI usage tracking table.

Revision ID: 023
Revises: 022
Create Date: 2025-01-01

Tracks daily AI token usage per student for cost monitoring and limit enforcement.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '023'
down_revision = '022'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create ai_usage table."""
    op.create_table(
        'ai_usage',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            'student_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('students.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('tokens_haiku', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('tokens_sonnet', sa.Integer(), nullable=False, server_default='0'),
        sa.Column(
            'total_cost_usd',
            sa.Numeric(precision=10, scale=6),
            nullable=False,
            server_default='0',
        ),
        sa.Column('request_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text('now()'),
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text('now()'),
        ),
        # Unique constraint: one record per student per day
        sa.UniqueConstraint('student_id', 'date', name='uq_ai_usage_student_date'),
    )

    # Index for efficient lookup by student and date range
    op.create_index(
        'ix_ai_usage_student_date',
        'ai_usage',
        ['student_id', 'date'],
    )

    # Index for finding high-usage entries (for monitoring)
    op.create_index(
        'ix_ai_usage_total_cost',
        'ai_usage',
        ['date', 'total_cost_usd'],
    )


def downgrade() -> None:
    """Drop ai_usage table."""
    op.drop_index('ix_ai_usage_total_cost', table_name='ai_usage')
    op.drop_index('ix_ai_usage_student_date', table_name='ai_usage')
    op.drop_table('ai_usage')
