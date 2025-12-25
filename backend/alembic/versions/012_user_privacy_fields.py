"""Add privacy and consent fields to users table.

Revision ID: 012
Revises: 011
Create Date: 2024-01-01 00:00:12.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "012"
down_revision: Union[str, None] = "011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add privacy and consent columns to users table
    op.add_column(
        "users",
        sa.Column("privacy_policy_accepted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("terms_accepted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("marketing_consent", sa.Boolean, server_default="false", nullable=False),
    )
    op.add_column(
        "users",
        sa.Column("data_processing_consent", sa.Boolean, server_default="true", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("users", "data_processing_consent")
    op.drop_column("users", "marketing_consent")
    op.drop_column("users", "terms_accepted_at")
    op.drop_column("users", "privacy_policy_accepted_at")
