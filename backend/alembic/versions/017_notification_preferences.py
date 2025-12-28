"""Create notification_preferences table.

Revision ID: 017
Revises: 016
Create Date: 2024-01-01 00:00:17.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "017"
down_revision: Union[str, None] = "016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "notification_preferences",
        # Primary key is user_id (one-to-one with users)
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        # Notification toggles
        sa.Column("weekly_reports", sa.Boolean, default=True, nullable=False),
        sa.Column("achievement_alerts", sa.Boolean, default=True, nullable=False),
        sa.Column("concern_alerts", sa.Boolean, default=True, nullable=False),
        sa.Column("goal_reminders", sa.Boolean, default=True, nullable=False),
        sa.Column("insight_notifications", sa.Boolean, default=True, nullable=False),
        # Email settings
        sa.Column(
            "email_frequency",
            sa.String(20),
            default="weekly",
            nullable=False,
        ),  # daily, weekly, monthly, never
        sa.Column(
            "preferred_time",
            sa.Time,
            default=sa.text("'18:00:00'"),
            nullable=False,
        ),  # Time to send emails
        sa.Column(
            "preferred_day",
            sa.String(20),
            default="sunday",
            nullable=False,
        ),  # Day of week for weekly reports
        sa.Column(
            "timezone",
            sa.String(50),
            default="Australia/Sydney",
            nullable=False,
        ),
        # Quiet hours (optional - don't send during these times)
        sa.Column("quiet_hours_start", sa.Time, nullable=True),
        sa.Column("quiet_hours_end", sa.Time, nullable=True),
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
            onupdate=sa.func.now(),
        ),
        # Check constraints
        sa.CheckConstraint(
            "email_frequency IN ('daily', 'weekly', 'monthly', 'never')",
            name="notification_prefs_frequency_check",
        ),
        sa.CheckConstraint(
            "preferred_day IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')",
            name="notification_prefs_day_check",
        ),
    )


def downgrade() -> None:
    op.drop_table("notification_preferences")
