import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.database import SessionLocal
from backend.app.models import AuthSession, Organization, Role, RoleName, User

pwd_context = CryptContext(schemes=['pbkdf2_sha256'], deprecated='auto')


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def get_db() -> Session:
    db = SessionLocal()
    try:
        return db
    finally:
        pass


def generate_session_token() -> str:
    return 'terra_' + secrets.token_urlsafe(32)


def get_session_token_hash(token: str) -> str:
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


def create_session(db: Session, user: User) -> str:
    token = generate_session_token()
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    db.add(AuthSession(user_id=user.id, token_hash=get_session_token_hash(token), expires_at=expires_at))
    db.commit()
    return token


def get_user_by_session(db: Session, token: Optional[str]) -> Optional[User]:
    if not token:
        return None
    token_hash = get_session_token_hash(token)
    session_record = db.execute(
        select(AuthSession).where(AuthSession.token_hash == token_hash)
    ).scalar_one_or_none()
    if session_record is None:
        return None
    exp = session_record.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        db.delete(session_record)
        db.commit()
        return None
    return db.get(User, session_record.user_id)


def get_role_by_name(db: Session, name: RoleName) -> Optional[Role]:
    return db.execute(select(Role).where(Role.name == name.value)).scalar_one_or_none()


def get_user_for_email(db: Session, email: str) -> Optional[User]:
    return db.execute(select(User).where(User.email == email)).scalar_one_or_none()


def organization_context_for_user(db: Session, user: User) -> Tuple[Optional[Organization], Optional[str]]:
    if not user:
        return None, None
    organization = db.get(Organization, user.organization_id)
    return organization, user.role_ref.name if user.role_ref else None
