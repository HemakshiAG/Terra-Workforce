from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field

from backend.app.models import SessionType, SessionStatus, AttendanceStatus, VerificationMethod, FaceMatchStatus, LivenessStatus, LocationStatus, AttemptResult


class AttendanceSessionCreate(BaseModel):
    worksite_id: int
    session_type: SessionType
    date: date
    scheduled_start: datetime
    scheduled_end: datetime


class AttendanceSessionPublic(BaseModel):
    id: int
    organization_id: int
    worksite_id: int
    created_by: int
    session_type: SessionType
    date: date
    scheduled_start: datetime
    scheduled_end: datetime
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    status: SessionStatus
    created_at: datetime
    updated_at: datetime

    model_config = {'from_attributes': True}


class AttendanceSessionSummary(AttendanceSessionPublic):
    expected_workers: int = 0
    present_workers: int = 0
    absent_workers: int = 0
    pending_review: int = 0


class VerificationAttemptRequest(BaseModel):
    session_id: int
    worker_id: Optional[int] = None
    verification_method: VerificationMethod
    face_image_data: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class VerificationAttemptResponse(BaseModel):
    id: int
    session_id: int
    worker_id: Optional[int] = None
    timestamp: datetime
    verification_method: VerificationMethod
    face_match_status: FaceMatchStatus
    liveness_status: LivenessStatus
    location_status: LocationStatus
    distance_from_worksite: Optional[float] = None
    result: AttemptResult
    failure_reason: Optional[str] = None

    model_config = {'from_attributes': True}


class CheckInRequest(BaseModel):
    verification_attempt_id: int


class CheckOutRequest(BaseModel):
    session_id: int
    worker_id: int


class AttendancePublic(BaseModel):
    id: int
    organization_id: int
    session_id: int
    worker_id: int
    status: AttendanceStatus
    verification_method: VerificationMethod
    check_in_at: Optional[datetime] = None
    check_out_at: Optional[datetime] = None
    break_start: Optional[datetime] = None
    break_end: Optional[datetime] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    distance_from_worksite: Optional[float] = None
    face_match_status: FaceMatchStatus
    liveness_status: LivenessStatus
    location_status: LocationStatus
    verification_attempt_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = {'from_attributes': True}


class ManualOverrideRequest(BaseModel):
    status: AttendanceStatus
    reason: str


class QRGenerateRequest(BaseModel):
    session_id: int


class QRGenerateResponse(BaseModel):
    token: str
    expires_at: datetime


class QRVerifyRequest(BaseModel):
    token: str
    worker_id: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
