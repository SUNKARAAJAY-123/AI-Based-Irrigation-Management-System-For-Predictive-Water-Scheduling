"""add_status_to_users

Revision ID: f6351c86edad
Revises: 173e3a2985d7
Create Date: 2026-08-04 18:12:43.017554

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f6351c86edad'
down_revision: Union[str, Sequence[str], None] = '173e3a2985d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('status', sa.String(length=50), server_default='ACTIVE', nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'status')
