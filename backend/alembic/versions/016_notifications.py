"""Create notifications table for parent alerts.

Revision ID: 016
Revises: 015
Create Date: 2024-01-01 00:00:16.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "016"
down_revision: Union[str, None] = "015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        # Notification content
        sa.Column(
            "type",
            sa.String(30),
            nullable=False,
        ),  # achievement, concern, insight, reminder, goal_achieved
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column(
            "priority",
            sa.String(20),
            default="normal",
            nullable=False,
        ),  # low, normal, high
        # Related entities (optional)
        sa.Column(
            "related_student_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("students.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "related_subject_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("subjects.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "related_goal_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("goals.id", ondelete="CASCADE"),
            nullable=True,
        ),
        # Delivery tracking
        sa.Column(
            "delivery_method",
            sa.String(20),
            default="in_app",
            nullable=False,
        ),  # in_app, email, both
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        # Extra data for rich notifications
        sa.Column("data", postgresql.JSONB, nullable=True),
        # Check constraints
        sa.CheckConstraint(
            "type IN ('achievement', 'concern', 'insight', 'reminder', 'goal_achieved', 'weekly_summary')",
            name="notifications_type_check",
        ),
        sa.CheckConstraint(
            "priority IN ('low', 'normal', 'high')",
            name="notifications_priority_check",
        ),
        sa.CheckConstraint(
            "delivery_method IN ('in_app', 'email', 'both')",
            name="notifications_delivery_check",
        ),
    )

    # Indexes for common query patterns
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index(
        "ix_notifications_unread",
        "notifications",
        ["user_id", "read_at"],
        postgresql_where=sa.text("read_at IS NULL"),
    )
    op.create_index(
        "ix_notifications_created",
        "notifications",
        ["created_at"],
        postgresql_ops={"created_at": "DESC"},
    )
    op.create_index(
        "ix_notifications_type",
        "notifications",
        ["user_id", "type"],
    )
    op.create_index(
        "ix_notifications_student",
        "notifications",
        ["related_student_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_notifications_student")
    op.drop_index("ix_notifications_type")
    op.drop_index("ix_notifications_created")
    op.drop_index("ix_notifications_unread")
    op.drop_index("ix_notifications_user_id")
    op.drop_table("notifications")
