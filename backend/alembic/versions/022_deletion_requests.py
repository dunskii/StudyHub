"""Deletion requests table for account deletion flow.

Tracks account deletion requests with 7-day grace period for COPPA/Privacy Act compliance.

Revision ID: 022_deletion_requests
Revises: 021_push_subscriptions
Create Date: 2025-12-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "022_deletion_requests"
down_revision: Union[str, None] = "021_push_subscriptions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create deletion_requests table."""
    op.create_table(
        "deletion_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "requested_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "scheduled_deletion_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "confirmation_token",
            postgresql.UUID(as_uuid=True),
            unique=True,
            nullable=True,
        ),
        sa.Column(
            "confirmed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "executed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "cancelled_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "status",
            sa.String(20),
            nullable=False,
            server_default="pending",
        ),
        sa.Column(
            "ip_address",
            sa.String(45),  # IPv6 support
            nullable=True,
        ),
        sa.Column(
            "reason",
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            "data_export_requested",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        # Check constraint for valid status values
        sa.CheckConstraint(
            "status IN ('pending', 'confirmed', 'executed', 'cancelled')",
            name="valid_deletion_status",
        ),
    )

    # Index for finding pending deletions that are due
    op.create_index(
        "ix_deletion_requests_pending_scheduled",
        "deletion_requests",
        ["scheduled_deletion_at"],
        postgresql_where=sa.text("status = 'confirmed'"),
    )

    # Index for finding a user's active deletion request
    op.create_index(
        "ix_deletion_requests_user_status",
        "deletion_requests",
        ["user_id", "status"],
    )

    # Add updated_at trigger
    op.execute(
        """
        CREATE TRIGGER update_deletion_requests_updated_at
            BEFORE UPDATE ON deletion_requests
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        """
    )


def downgrade() -> None:
    """Drop deletion_requests table."""
    op.execute("DROP TRIGGER IF EXISTS update_deletion_requests_updated_at ON deletion_requests")
    op.drop_index("ix_deletion_requests_user_status", table_name="deletion_requests")
    op.drop_index("ix_deletion_requests_pending_scheduled", table_name="deletion_requests")
    op.drop_table("deletion_requests")
