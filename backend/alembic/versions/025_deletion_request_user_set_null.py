"""Change deletion_requests user_id FK to SET NULL.

Revision ID: 025
Revises: 024
Create Date: 2025-01-01

Changes the foreign key constraint on deletion_requests.user_id from CASCADE
to SET NULL, so that deletion request records are preserved for audit purposes
after the user account is deleted.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '025'
down_revision = '024'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Change user_id FK to SET NULL and make nullable."""
    # Drop the existing foreign key constraint
    op.drop_constraint(
        'deletion_requests_user_id_fkey',
        'deletion_requests',
        type_='foreignkey',
    )

    # Make the column nullable
    op.alter_column(
        'deletion_requests',
        'user_id',
        nullable=True,
    )

    # Re-create the foreign key with SET NULL behavior
    op.create_foreign_key(
        'deletion_requests_user_id_fkey',
        'deletion_requests',
        'users',
        ['user_id'],
        ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    """Revert to CASCADE and NOT NULL."""
    # Drop the SET NULL foreign key
    op.drop_constraint(
        'deletion_requests_user_id_fkey',
        'deletion_requests',
        type_='foreignkey',
    )

    # Note: This will fail if there are any NULL user_id values
    # You may need to delete such records first
    op.alter_column(
        'deletion_requests',
        'user_id',
        nullable=False,
    )

    # Re-create with CASCADE behavior
    op.create_foreign_key(
        'deletion_requests_user_id_fkey',
        'deletion_requests',
        'users',
        ['user_id'],
        ['id'],
        ondelete='CASCADE',
    )
