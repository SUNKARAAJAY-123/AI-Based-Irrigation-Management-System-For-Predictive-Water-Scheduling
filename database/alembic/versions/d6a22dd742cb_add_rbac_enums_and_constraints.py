"""add_rbac_enums_and_constraints

Revision ID: d6a22dd742cb
Revises: f6351c86edad
Create Date: 2026-08-06 17:27:32.300413

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd6a22dd742cb'
down_revision: Union[str, Sequence[str], None] = 'f6351c86edad'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Update existing data to uppercase
    op.execute("UPDATE users SET role = 'FARMER' WHERE role = 'farmer'")
    op.execute("UPDATE users SET role = 'ADMIN' WHERE role = 'admin'")
    op.execute("UPDATE users SET status = 'ACTIVE' WHERE status IS NULL OR status = ''")

    # 2. Alter columns
    op.alter_column('users', 'role',
               existing_type=sa.VARCHAR(length=50),
               nullable=False)
    op.alter_column('users', 'status',
               existing_type=sa.VARCHAR(length=50),
               nullable=False,
               existing_server_default=sa.text("'ACTIVE'::character varying"))
    op.create_index(op.f('ix_users_role'), 'users', ['role'], unique=False)
    op.create_index(op.f('ix_users_status'), 'users', ['status'], unique=False)

    # 3. Add CHECK constraints
    op.create_check_constraint("check_user_role", "users", "role IN ('SUPER_ADMIN', 'ADMIN', 'ADMIN_PENDING', 'FARMER')")
    op.create_check_constraint("check_user_status", "users", "status IN ('ACTIVE', 'PENDING', 'REJECTED', 'SUSPENDED')")


def downgrade() -> None:
    """Downgrade schema."""
    # 1. Drop CHECK constraints
    op.drop_constraint("check_user_role", "users", type_="check")
    op.drop_constraint("check_user_status", "users", type_="check")

    # 2. Drop indexes and revert columns
    op.drop_index(op.f('ix_users_status'), table_name='users')
    op.drop_index(op.f('ix_users_role'), table_name='users')
    op.alter_column('users', 'status',
               existing_type=sa.VARCHAR(length=50),
               nullable=True,
               existing_server_default=sa.text("'ACTIVE'::character varying"))
    op.alter_column('users', 'role',
               existing_type=sa.VARCHAR(length=50),
               nullable=True)

    # 3. Revert data to lowercase
    op.execute("UPDATE users SET role = 'farmer' WHERE role = 'FARMER'")
    op.execute("UPDATE users SET role = 'admin' WHERE role = 'ADMIN'")
