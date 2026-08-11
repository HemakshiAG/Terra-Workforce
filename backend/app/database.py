from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DB_DIR = Path(__file__).resolve().parents[1] / 'data'
DB_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DB_DIR / 'terra_workforce.db'

SQLALCHEMY_DATABASE_URL = f'sqlite:///{DB_PATH}'


class Base(DeclarativeBase):
    pass


engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={'check_same_thread': False},
    future=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    from backend.app.models import Role  # noqa: F401

    Base.metadata.create_all(bind=engine)

    from backend.app.models import RoleName
    from sqlalchemy import select

    with SessionLocal() as session:
        for role_name in (RoleName.ADMIN, RoleName.SUPERVISOR, RoleName.WORKER):
            exists = session.execute(select(Role).where(Role.name == role_name.value)).scalar_one_or_none()
            if not exists:
                session.add(Role(name=role_name.value))
        session.commit()
