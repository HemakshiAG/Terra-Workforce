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


class WorkerStatus(str, enum.Enum):
    ACTIVE = 'ACTIVE'
    INACTIVE = 'INACTIVE'
    PENDING_ENROLLMENT = 'PENDING_ENROLLMENT'


class IdentityVerificationStatus(str, enum.Enum):
    PENDING = 'PENDING'
    VERIFIED = 'VERIFIED'
    MANUAL_REVIEW = 'MANUAL_REVIEW'
    REJECTED = 'REJECTED'


class BiometricEnrollmentStatus(str, enum.Enum):
    NOT_STARTED = 'NOT_STARTED'
    IN_PROGRESS = 'IN_PROGRESS'
    COMPLETED = 'COMPLETED'
    FAILED = 'FAILED'


class IdentityType(str, enum.Enum):
    AADHAAR = 'AADHAAR'
    VOTER_ID = 'VOTER_ID'
    OTHER = 'OTHER'


class Gender(str, enum.Enum):
    MALE = 'MALE'
    FEMALE = 'FEMALE'
    OTHER = 'OTHER'
    UNSPECIFIED = 'UNSPECIFIED'


class WorkerRole(str, enum.Enum):
    WORKER = 'WORKER'
    HELPER = 'HELPER'
    SUPERVISOR_ASSISTANT = 'SUPERVISOR_ASSISTANT'
    OTHER = 'OTHER'


class CaptureType(str, enum.Enum):
    CENTER = 'CENTER'
    LEFT = 'LEFT'
    RIGHT = 'RIGHT'
    NEUTRAL = 'NEUTRAL'
    SMILE = 'SMILE'
    LIVENESS = 'LIVENESS'


class QualityStatus(str, enum.Enum):
    PASS = 'PASS'
    FACE_NOT_DETECTED = 'FACE_NOT_DETECTED'
    MULTIPLE_FACES = 'MULTIPLE_FACES'
    IMAGE_TOO_DARK = 'IMAGE_TOO_DARK'
    IMAGE_TOO_BLURRY = 'IMAGE_TOO_BLURRY'
    IMAGE_TOO_SMALL = 'IMAGE_TOO_SMALL'
    NO_CAMERA = 'NO_CAMERA'


class SessionType(str, enum.Enum):
    MORNING = 'MORNING'
    AFTERNOON = 'AFTERNOON'
    FULL_DAY = 'FULL_DAY'
    CUSTOM = 'CUSTOM'


class SessionStatus(str, enum.Enum):
    SCHEDULED = 'SCHEDULED'
    OPEN = 'OPEN'
    CLOSED = 'CLOSED'
    CANCELLED = 'CANCELLED'


class AttendanceStatus(str, enum.Enum):
    PRESENT = 'PRESENT'
    ABSENT = 'ABSENT'
    PENDING_REVIEW = 'PENDING_REVIEW'
    REJECTED = 'REJECTED'
    CORRECTED = 'CORRECTED'


class VerificationMethod(str, enum.Enum):
    FACE = 'FACE'
    QR = 'QR'
    MANUAL = 'MANUAL'


class FaceMatchStatus(str, enum.Enum):
    NOT_ATTEMPTED = 'NOT_ATTEMPTED'
    MATCHED = 'MATCHED'
    NO_MATCH = 'NO_MATCH'
    LOW_CONFIDENCE = 'LOW_CONFIDENCE'
    UNAVAILABLE = 'UNAVAILABLE'


class LivenessStatus(str, enum.Enum):
    NOT_ATTEMPTED = 'NOT_ATTEMPTED'
    PASSED = 'PASSED'
    FAILED = 'FAILED'
    UNAVAILABLE = 'UNAVAILABLE'


class LocationStatus(str, enum.Enum):
    NOT_ATTEMPTED = 'NOT_ATTEMPTED'
    WITHIN_GEOFENCE = 'WITHIN_GEOFENCE'
    OUTSIDE_GEOFENCE = 'OUTSIDE_GEOFENCE'
    UNAVAILABLE = 'UNAVAILABLE'


class AttemptResult(str, enum.Enum):
    SUCCESS = 'SUCCESS'
    FAILED = 'FAILED'
    PENDING_REVIEW = 'PENDING_REVIEW'


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


class WorkerModel(Base):
    __tablename__ = 'workers'

    __table_args__ = (
        UniqueConstraint('organization_id', 'worker_code', name='uq_worker_org_code'),
    )

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey('organizations.id'), nullable=False, index=True)
    worksite_id = Column(Integer, ForeignKey('worksites.id'), nullable=True, index=True)
    worker_id = Column(String(100), unique=True, index=True, nullable=False)
    worker_code = Column(String(50), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    date_of_birth = Column(DateTime(timezone=False), nullable=True)
    gender = Column(String(20), nullable=True)
    phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    emergency_contact = Column(String(255), nullable=True)
    role = Column(String(50), nullable=False, default=WorkerRole.WORKER.value)
    status = Column(String(50), nullable=False, default=WorkerStatus.PENDING_ENROLLMENT.value)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    face_template = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    identity_type = Column(String(50), nullable=True)
    identity_number = Column(String(100), nullable=True)
    identity_verification_status = Column(String(50), nullable=False, default=IdentityVerificationStatus.PENDING.value)
    consent_given = Column(Boolean, default=False, nullable=False)
    consent_timestamp = Column(DateTime(timezone=True), nullable=True)
    consent_version = Column(String(50), nullable=True)
    biometric_enrollment_status = Column(String(50), nullable=False, default=BiometricEnrollmentStatus.NOT_STARTED.value)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    organization = relationship('Organization')
    worksite = relationship('Worksite')
    enrollments = relationship('BiometricEnrollment', back_populates='worker', cascade='all, delete-orphan')
    audit_logs = relationship('AuditLogModel', back_populates='worker', cascade='all, delete-orphan')


class BiometricEnrollment(Base):
    __tablename__ = 'biometric_enrollments'

    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(Integer, ForeignKey('workers.id'), nullable=False, index=True)
    organization_id = Column(Integer, ForeignKey('organizations.id'), nullable=False, index=True)
    status = Column(String(50), nullable=False, default=BiometricEnrollmentStatus.IN_PROGRESS.value)
    consent_version = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    worker = relationship('WorkerModel', back_populates='enrollments')
    samples = relationship('BiometricSample', back_populates='enrollment', cascade='all, delete-orphan')


class BiometricSample(Base):
    __tablename__ = 'biometric_samples'

    id = Column(Integer, primary_key=True, index=True)
    enrollment_id = Column(Integer, ForeignKey('biometric_enrollments.id'), nullable=False, index=True)
    capture_type = Column(String(50), nullable=False)
    image_reference = Column(String(500), nullable=False)
    quality_status = Column(String(50), nullable=False, default=QualityStatus.PASS.value)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    enrollment = relationship('BiometricEnrollment', back_populates='samples')


class AttendanceSession(Base):
    __tablename__ = 'attendance_sessions'

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey('organizations.id'), nullable=False, index=True)
    worksite_id = Column(Integer, ForeignKey('worksites.id'), nullable=False, index=True)
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    session_type = Column(String(50), nullable=False)
    date = Column(DateTime(timezone=False), nullable=False)
    scheduled_start = Column(DateTime(timezone=True), nullable=False)
    scheduled_end = Column(DateTime(timezone=True), nullable=False)
    actual_start = Column(DateTime(timezone=True), nullable=True)
    actual_end = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(50), default=SessionStatus.SCHEDULED.value, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    organization = relationship('Organization')
    worksite = relationship('Worksite')
    creator = relationship('User')
    attendances = relationship('Attendance', back_populates='session', cascade='all, delete-orphan')
    verification_attempts = relationship('VerificationAttempt', back_populates='session', cascade='all, delete-orphan')


class Attendance(Base):
    __tablename__ = 'attendances'
    __table_args__ = (UniqueConstraint('session_id', 'worker_id', name='uq_attendance_session_worker'),)

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey('organizations.id'), nullable=False, index=True)
    session_id = Column(Integer, ForeignKey('attendance_sessions.id'), nullable=False, index=True)
    worker_id = Column(Integer, ForeignKey('workers.id'), nullable=False, index=True)

    status = Column(String(50), nullable=False, default=AttendanceStatus.PRESENT.value)
    verification_method = Column(String(50), nullable=False)

    check_in_at = Column(DateTime(timezone=True), nullable=True)
    check_out_at = Column(DateTime(timezone=True), nullable=True)

    break_start = Column(DateTime(timezone=True), nullable=True)
    break_end = Column(DateTime(timezone=True), nullable=True)

    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    distance_from_worksite = Column(Float, nullable=True)

    face_match_status = Column(String(50), nullable=False, default=FaceMatchStatus.NOT_ATTEMPTED.value)
    liveness_status = Column(String(50), nullable=False, default=LivenessStatus.NOT_ATTEMPTED.value)
    location_status = Column(String(50), nullable=False, default=LocationStatus.NOT_ATTEMPTED.value)

    verification_attempt_id = Column(Integer, ForeignKey('verification_attempts.id'), nullable=True)

    sync_status = Column(String(50), default='PENDING', nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    organization = relationship('Organization')
    session = relationship('AttendanceSession', back_populates='attendances')
    worker = relationship('WorkerModel')
    verification_attempt = relationship('VerificationAttempt', foreign_keys=[verification_attempt_id])


class VerificationAttempt(Base):
    __tablename__ = 'verification_attempts'

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey('organizations.id'), nullable=False, index=True)
    session_id = Column(Integer, ForeignKey('attendance_sessions.id'), nullable=False, index=True)
    worker_id = Column(Integer, ForeignKey('workers.id'), nullable=True, index=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    verification_method = Column(String(50), nullable=False)

    face_match_status = Column(String(50), nullable=False, default=FaceMatchStatus.NOT_ATTEMPTED.value)
    liveness_status = Column(String(50), nullable=False, default=LivenessStatus.NOT_ATTEMPTED.value)
    location_status = Column(String(50), nullable=False, default=LocationStatus.NOT_ATTEMPTED.value)

    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    distance_from_worksite = Column(Float, nullable=True)

    result = Column(String(50), nullable=False)
    failure_reason = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    organization = relationship('Organization')
    session = relationship('AttendanceSession', back_populates='verification_attempts')
    worker = relationship('WorkerModel')


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
    status = Column(String(50), default='OPEN', nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class AuditLogModel(Base):
    __tablename__ = 'audit_logs'

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey('organizations.id'), nullable=False, index=True)
    actor_user_id = Column(Integer, nullable=False)
    action = Column(String(100), nullable=False)
    target_type = Column(String(100), nullable=True)
    target_id = Column(String(100), nullable=True)
    metadata_json = Column(Text, nullable=True)
    details_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    worker_id = Column(Integer, ForeignKey('workers.id'), nullable=True)
    worker = relationship('WorkerModel', back_populates='audit_logs')


class WageRecordModel(Base):
    __tablename__ = 'wage_records'

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey('organizations.id'), nullable=False, index=True)
    worker_id = Column(String(100), nullable=False)
    payable_days = Column(Float, default=0.0, nullable=False)
    daily_rate = Column(Float, default=0.0, nullable=False)
    estimated_wage = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
