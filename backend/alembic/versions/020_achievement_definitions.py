"""Create achievement_definitions table and seed initial achievements.

Revision ID: 020
Revises: 019
Create Date: 2025-01-01
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

# revision identifiers, used by Alembic.
revision = "020"
down_revision = "019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create achievement_definitions table and seed data."""
    # Create achievement_definitions table
    op.create_table(
        "achievement_definitions",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("code", sa.String(50), nullable=False, unique=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("subject_code", sa.String(10), nullable=True),
        sa.Column("requirements", JSONB, nullable=False),
        sa.Column("xp_reward", sa.Integer, nullable=False, server_default="0"),
        sa.Column("icon", sa.String(50), nullable=False, server_default="'star'"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    # Create indexes
    op.create_index(
        "ix_achievement_definitions_code",
        "achievement_definitions",
        ["code"],
    )
    op.create_index(
        "ix_achievement_definitions_category",
        "achievement_definitions",
        ["category"],
    )
    op.create_index(
        "ix_achievement_definitions_subject_code",
        "achievement_definitions",
        ["subject_code"],
    )

    # Seed initial achievements
    op.execute("""
        INSERT INTO achievement_definitions (code, name, description, category, subject_code, requirements, xp_reward, icon)
        VALUES
        -- Engagement achievements
        ('first_session', 'First Steps', 'Complete your first study session', 'engagement', NULL, '{"sessions_completed": 1}', 50, 'rocket'),
        ('streak_3', 'Getting Started', 'Study for 3 days in a row', 'engagement', NULL, '{"streak_days": 3}', 50, 'flame'),
        ('streak_7', 'Week Warrior', 'Study for 7 days in a row', 'engagement', NULL, '{"streak_days": 7}', 100, 'flame'),
        ('streak_30', 'Monthly Master', 'Study for 30 days in a row', 'engagement', NULL, '{"streak_days": 30}', 300, 'flame'),
        ('streak_100', 'Century Club', 'Study for 100 days in a row', 'engagement', NULL, '{"streak_days": 100}', 1000, 'trophy'),

        -- Milestone achievements
        ('level_5', 'Rising Scholar', 'Reach level 5', 'milestone', NULL, '{"level": 5}', 100, 'star'),
        ('level_10', 'Dedicated Learner', 'Reach level 10', 'milestone', NULL, '{"level": 10}', 250, 'star'),
        ('level_20', 'Supreme Scholar', 'Reach the maximum level', 'milestone', NULL, '{"level": 20}', 1000, 'crown'),
        ('xp_1000', 'XP Collector', 'Earn 1,000 total XP', 'milestone', NULL, '{"total_xp": 1000}', 50, 'zap'),
        ('xp_10000', 'XP Champion', 'Earn 10,000 total XP', 'milestone', NULL, '{"total_xp": 10000}', 250, 'zap'),

        -- Curriculum achievements
        ('first_outcome', 'First Mastery', 'Master your first curriculum outcome', 'curriculum', NULL, '{"outcomes_mastered": 1}', 100, 'check-circle'),
        ('outcomes_10', 'Outcome Explorer', 'Master 10 curriculum outcomes', 'curriculum', NULL, '{"outcomes_mastered": 10}', 250, 'check-circle'),
        ('outcomes_50', 'Curriculum Champion', 'Master 50 curriculum outcomes', 'curriculum', NULL, '{"outcomes_mastered": 50}', 500, 'award'),

        -- Challenge achievements
        ('perfect_session', 'Perfect Session', 'Get 100% correct in a revision session', 'challenge', NULL, '{"perfect_sessions": 1}', 75, 'target'),
        ('perfect_10', 'Perfectionist', 'Get 10 perfect revision sessions', 'challenge', NULL, '{"perfect_sessions": 10}', 200, 'target'),
        ('flashcards_100', 'Flashcard Enthusiast', 'Review 100 flashcards', 'challenge', NULL, '{"flashcards_reviewed": 100}', 100, 'layers'),
        ('flashcards_1000', 'Flashcard Master', 'Review 1,000 flashcards', 'challenge', NULL, '{"flashcards_reviewed": 1000}', 500, 'layers'),

        -- Subject-specific achievements
        ('math_explorer', 'Mathematics Explorer', 'Complete 10 Mathematics study sessions', 'subject', 'MATH', '{"subject_sessions": 10}', 150, 'calculator'),
        ('eng_explorer', 'Literary Explorer', 'Complete 10 English study sessions', 'subject', 'ENG', '{"subject_sessions": 10}', 150, 'book-open'),
        ('sci_explorer', 'Science Explorer', 'Complete 10 Science study sessions', 'subject', 'SCI', '{"subject_sessions": 10}', 150, 'flask-conical')
    """)


def downgrade() -> None:
    """Drop achievement_definitions table."""
    op.drop_index("ix_achievement_definitions_subject_code")
    op.drop_index("ix_achievement_definitions_category")
    op.drop_index("ix_achievement_definitions_code")
    op.drop_table("achievement_definitions")
