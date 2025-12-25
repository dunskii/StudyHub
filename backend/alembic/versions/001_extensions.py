"""Enable PostgreSQL extensions and create utility functions.

Revision ID: 001
Revises:
Create Date: 2025-12-25
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Enable extensions and create utility functions."""
    # Enable UUID extension
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    # Create updated_at trigger function
    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
    """)


def downgrade() -> None:
    """Remove extensions and utility functions."""
    op.execute("DROP FUNCTION IF EXISTS update_updated_at_column()")
    op.execute('DROP EXTENSION IF EXISTS "uuid-ossp"')
