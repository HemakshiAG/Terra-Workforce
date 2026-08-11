import enum
from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


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


class RegisterOrganizationRequest(BaseModel):
    organization_name: str
    admin_name: str
    email: EmailStr
    password: str
    confirm_password: str
    phone: Optional[str] = None

    @field_validator('confirm_password')
    @classmethod
    def confirm_password_matches(cls, value: str, info):
        if info.data.get('password') and value != info.data['password']:
            raise ValueError('Passwords do not match.')
        return value

    @field_validator('organization_name', 'admin_name')
    @classmethod
    def min_len_two(cls, value: str):
        if value and len(value) < 2:
            raise ValueError('Must be at least 2 characters.')
        return value

    @field_validator('password', 'confirm_password')
    @classmethod
    def min_len_eight(cls, value: str):
        if value and len(value) < 8:
            raise ValueError('Must be at least 8 characters.')
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator('password')
    @classmethod
    def min_len_eight(cls, value: str):
        if value and len(value) < 8:
            raise ValueError('Must be at least 8 characters.')
        return value


class UserPublic(BaseModel):
    id: int
    name: str
    email: str
    role: str
    organization_id: int
    organization_name: Optional[str] = None


class AccessTokenResponse(BaseModel):
    token: str
    user: UserPublic


class CreateSupervisorRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    worksite_ids: List[int] = Field(default_factory=list)

    @field_validator('full_name')
    @classmethod
    def min_len_two(cls, value: str):
        if value and len(value) < 2:
            raise ValueError('Must be at least 2 characters.')
        return value

    @field_validator('password')
    @classmethod
    def min_len_eight(cls, value: str):
        if value and len(value) < 8:
            raise ValueError('Must be at least 8 characters.')
        return value


class WorksiteBase(BaseModel):
    name: str
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geofence_radius_meters: float = 100.0
    active: bool = True

    @field_validator('name')
    @classmethod
    def min_len_two(cls, value: str):
        if value and len(value) < 2:
            raise ValueError('Must be at least 2 characters.')
        return value


class WorksiteCreate(WorksiteBase):
    pass


class WorksiteUpdate(WorksiteBase):
    pass


class WorksitePublic(WorksiteBase):
    id: int
    organization_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {'from_attributes': True}


class DashboardSnapshot(BaseModel):
    organization_name: Optional[str] = None
    supervisors: int = 0
    worksites: int = 0
    users: int = 0
    role: str = 'ADMIN'
    empty_state: Optional[str] = None


class ErrorResponse(BaseModel):
    detail: str


class WorkerCreateRequest(BaseModel):
    full_name: str
    worker_code: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[Gender] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    worksite_id: int
    role: str = 'WORKER'

    @field_validator('full_name')
    @classmethod
    def min_len_two(cls, value: str):
        if value and len(value.strip()) < 2:
            raise ValueError('Must be at least 2 characters.')
        return value

    @field_validator('worker_code')
    @classmethod
    def code_trim(cls, value: Optional[str]):
        return value.strip() if isinstance(value, str) else value


class WorkerUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    worksite_id: Optional[int] = None
    role: Optional[str] = None
    status: Optional[WorkerStatus] = None


class WorkerIdentityRequest(BaseModel):
    identity_type: IdentityType
    identity_number: str
    verification_status: IdentityVerificationStatus = IdentityVerificationStatus.PENDING
    manual_review_reason: Optional[str] = None


class WorkerConsentRequest(BaseModel):
    consent_given: bool
    consent_version: str = 'v1'


class BiometricEnrollmentStartRequest(BaseModel):
    consent_version: Optional[str] = None


class BiometricSampleCreateRequest(BaseModel):
    capture_type: CaptureType
    image_data: str
    quality_status: QualityStatus = QualityStatus.PASS


class WorkerSummary(BaseModel):
    id: int
    organization_id: int
    worksite_id: Optional[int] = None
    worker_code: str
    full_name: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    role: str
    status: str
    identity_type: Optional[str] = None
    identity_number_masked: Optional[str] = None
    identity_verification_status: str
    consent_given: bool
    consent_timestamp: Optional[datetime] = None
    consent_version: Optional[str] = None
    biometric_enrollment_status: str
    worksite_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class WorkerListResponse(BaseModel):
    workers: List[WorkerSummary]
    stats: dict


class BiometricSampleResponse(BaseModel):
    id: int
    capture_type: str
    quality_status: str
    created_at: datetime


class BiometricEnrollmentResponse(BaseModel):
    id: int
    worker_id: int
    organization_id: int
    status: str
    consent_version: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    samples: List[BiometricSampleResponse] = Field(default_factory=list)


class WorkerDetailResponse(WorkerSummary):
    enrollment: Optional[BiometricEnrollmentResponse] = None
    samples_count: int = 0


class AuditEventResponse(BaseModel):
    id: int
    organization_id: int
    actor_user_id: int
    action: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    metadata_json: Optional[str] = None
    created_at: datetime
