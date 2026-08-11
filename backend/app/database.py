from pathlib import Path
import sqlite3

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DB_DIR = Path(__file__).resolve().parents[1] / 'data'
DB_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DB_DIR / 'terra_workforce.db'
PRIVATE_STORAGE_DIR = DB_DIR / 'private'
BIOMETRIC_STORAGE_DIR = PRIVATE_STORAGE_DIR / 'biometrics'
BIOMETRIC_STORAGE_DIR.mkdir(parents=True, exist_ok=True)

SQLALCHEMY_DATABASE_URL = f'sqlite:///{DB_PATH}'


class Base(DeclarativeBase):
    pass


engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={'check_same_thread': False},
    future=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _table_columns(connection: sqlite3.Connection, table_name: str) -> set[str]:
    rows = connection.execute(f'PRAGMA table_info({table_name})').fetchall()
    return {row[1] for row in rows}


def _ensure_column(connection: sqlite3.Connection, table_name: str, column_sql: str, column_name: str) -> None:
    if column_name not in _table_columns(connection, table_name):
        connection.execute(f'ALTER TABLE {table_name} ADD COLUMN {column_sql}')


def _ensure_worker_schema() -> None:
    with sqlite3.connect(DB_PATH) as connection:
        connection.execute('PRAGMA foreign_keys = ON')

        _ensure_column(connection, 'workers', 'organization_id INTEGER NOT NULL DEFAULT 1', 'organization_id')
        _ensure_column(connection, 'workers', 'worksite_id INTEGER', 'worksite_id')
        _ensure_column(connection, 'workers', 'worker_code VARCHAR(50)', 'worker_code')
        _ensure_column(connection, 'workers', 'full_name VARCHAR(255)', 'full_name')
        _ensure_column(connection, 'workers', 'date_of_birth DATETIME', 'date_of_birth')
        _ensure_column(connection, 'workers', 'gender VARCHAR(20)', 'gender')
        _ensure_column(connection, 'workers', 'phone VARCHAR(50)', 'phone')
        _ensure_column(connection, 'workers', 'address TEXT', 'address')
        _ensure_column(connection, 'workers', 'emergency_contact VARCHAR(255)', 'emergency_contact')
        _ensure_column(connection, 'workers', 'role VARCHAR(50) NOT NULL DEFAULT "WORKER"', 'role')
        _ensure_column(connection, 'workers', 'status VARCHAR(50) NOT NULL DEFAULT "PENDING_ENROLLMENT"', 'status')
        _ensure_column(connection, 'workers', 'identity_type VARCHAR(50)', 'identity_type')
        _ensure_column(connection, 'workers', 'identity_number VARCHAR(100)', 'identity_number')
        _ensure_column(connection, 'workers', 'identity_verification_status VARCHAR(50) NOT NULL DEFAULT "PENDING"', 'identity_verification_status')
        _ensure_column(connection, 'workers', 'consent_given BOOLEAN NOT NULL DEFAULT 0', 'consent_given')
        _ensure_column(connection, 'workers', 'consent_timestamp DATETIME', 'consent_timestamp')
        _ensure_column(connection, 'workers', 'consent_version VARCHAR(50)', 'consent_version')
        _ensure_column(connection, 'workers', 'biometric_enrollment_status VARCHAR(50) NOT NULL DEFAULT "NOT_STARTED"', 'biometric_enrollment_status')

        _ensure_column(connection, 'audit_logs', 'target_type VARCHAR(100)', 'target_type')
        _ensure_column(connection, 'audit_logs', 'target_id VARCHAR(100)', 'target_id')
        _ensure_column(connection, 'audit_logs', 'metadata_json TEXT', 'metadata_json')
        _ensure_column(connection, 'audit_logs', 'worker_id INTEGER', 'worker_id')

        connection.commit()


def init_db() -> None:
    from backend.app.models import Role  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _ensure_worker_schema()

    from backend.app.models import RoleName
    from sqlalchemy import select

    with SessionLocal() as session:
        for role_name in (RoleName.ADMIN, RoleName.SUPERVISOR, RoleName.WORKER):
            exists = session.execute(select(Role).where(Role.name == role_name.value)).scalar_one_or_none()
            if not exists:
                session.add(Role(name=role_name.value))
        session.commit()
