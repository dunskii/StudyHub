"""Add token expiry and reminder tracking to deletion requests.

Revision ID: 024
Revises: 023
Create Date: 2025-01-01

Adds:
- token_expires_at: 24-hour expiry for confirmation tokens (security)
- reminder_sent_at: Track when deletion reminder email was sent (compliance)
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '024'
down_revision = '023'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add token_expires_at and reminder_sent_at columns."""
    # Token expiry for security (24 hours from request)
    op.add_column(
        'deletion_requests',
        sa.Column('token_expires_at', sa.DateTime(timezone=True), nullable=True),
    )

    # Reminder tracking for email notifications
    op.add_column(
        'deletion_requests',
        sa.Column('reminder_sent_at', sa.DateTime(timezone=True), nullable=True),
    )

    # Index for finding requests with expiring tokens (cleanup job)
    op.create_index(
        'ix_deletion_requests_token_expires_at',
        'deletion_requests',
        ['token_expires_at'],
    )

    # Index for finding requests needing reminders
    op.create_index(
        'ix_deletion_requests_scheduled_reminder',
        'deletion_requests',
        ['scheduled_deletion_at', 'reminder_sent_at'],
    )


def downgrade() -> None:
    """Remove token_expires_at and reminder_sent_at columns."""
    op.drop_index(
        'ix_deletion_requests_scheduled_reminder',
        table_name='deletion_requests',
    )
    op.drop_index(
        'ix_deletion_requests_token_expires_at',
        table_name='deletion_requests',
    )
    op.drop_column('deletion_requests', 'reminder_sent_at')
    op.drop_column('deletion_requests', 'token_expires_at')
