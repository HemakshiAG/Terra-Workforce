import enum
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from backend.app.database import Base


class RoleName(str, enum.Enum):
    ADMIN = 'ADMIN'
    SUPERVISOR = 'SUPERVISOR'
    WORKER = 'WORKER'


class Organization(Base):
    __tablename__ = 'organizations'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)
    phone = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    users = relationship('User', back_populates='organization', cascade='all, delete-orphan')
    worksites = relationship('Worksite', back_populates='organization', cascade='all, delete-orphan')


class Role(Base):
    __tablename__ = 'roles'

    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)

    users = relationship('User', back_populates='role_ref')


class User(Base):
    __tablename__ = 'users'
    __table_args__ = (UniqueConstraint('organization_id', 'email', name='uq_org_email'),)

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey('organizations.id'), nullable=False, index=True)
    role_id = Column(Integer, ForeignKey('roles.id'), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    organization = relationship('Organization', back_populates='users')
    role_ref = relationship('Role', back_populates='users')
    sessions = relationship('AuthSession', back_populates='user', cascade='all, delete-orphan')


class AuthSession(Base):
    __tablename__ = 'auth_sessions'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    token_hash = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship('User', back_populates='sessions')


class Worksite(Base):
    __tablename__ = 'worksites'

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey('organizations.id'), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    geofence_radius_meters = Column(Float, default=100.0, nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    organization = relationship('Organization', back_populates='worksites')


class SupervisorWorksiteAssignment(Base):
    __tablename__ = 'supervisor_worksite_assignments'
    __table_args__ = (UniqueConstraint('user_id', 'worksite_id', name='uq_supervisor_worksite'),)

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    worksite_id = Column(Integer, ForeignKey('worksites.id'), nullable=False, index=True)
    organization_id = Column(Integer, ForeignKey('organizations.id'), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


# Future Schema Prepared Tables (Worker, Attendance, BiometricTemplate, IntegrityAlert, AuditLog, WageRecord, SyncQueue)
class WorkerModel(Base):
    __tablename__ = 'workers'

    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    organization_id = Column(Integer, ForeignKey('organizations.id'), nullable=True, index=True)
    worksite_id = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    face_template = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


class AttendanceModel(Base):
    __tablename__ = 'attendance_records'

    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(String(100), index=True, nullable=False)
    worksite_id = Column(String(100), index=True, nullable=False)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    event_type = Column(String(50), default='CHECK_IN', nullable=False)
    confidence = Column(Float, default=1.0, nullable=False)
    liveness = Column(String(50), default='passed', nullable=False)
    gps_status = Column(String(50), default='on_site', nullable=False)
    status = Column(String(50), default='accepted', nullable=False)
    sync_status = Column(String(50), default='SYNCED', nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class SyncQueueModel(Base):
    __tablename__ = 'sync_queue'

    id = Column(Integer, primary_key=True, index=True)
    idempotency_key = Column(String(255), unique=True, index=True, nullable=False)
    event_type = Column(String(100), nullable=False)
    payload_json = Column(Text, nullable=False)
    status = Column(String(50), default='PENDING', nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class IntegrityAlertModel(Base):
    __tablename__ = 'integrity_alerts'

    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(String(100), index=True, nullable=False)
    alert_type = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String(50), default='MEDIUM', nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class AuditLogModel(Base):
    __tablename__ = 'audit_logs'

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey('organizations.id'), nullable=False, index=True)
    actor_user_id = Column(Integer, nullable=False)
    action = Column(String(100), nullable=False)
    details_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class WageRecordModel(Base):
    __tablename__ = 'wage_records'

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey('organizations.id'), nullable=False, index=True)
    worker_id = Column(String(100), nullable=False)
    payable_days = Column(Float, default=0.0, nullable=False)
    daily_rate = Column(Float, default=0.0, nullable=False)
    estimated_wage = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
