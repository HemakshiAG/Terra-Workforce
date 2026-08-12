import pytest
import json
from datetime import date, datetime, timedelta, timezone
from backend.app.database import SessionLocal, init_db
from backend.app.services.geofence import GeofenceService
from backend.app.services.face_quality import FaceQualityService
from backend.app.services.liveness import LivenessService
from backend.app.services.verification import VerificationService, QRCodeService
from backend.app.services.attendance import AttendanceService
from backend.app.models import (
    LocationStatus, FaceMatchStatus, LivenessStatus, AttemptResult,
    WorkerModel, AttendanceSession, VerificationAttempt, Attendance, SessionStatus, WorkerStatus
)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    init_db()

def test_haversine_distance():
    assert GeofenceService.haversine(12.9716, 77.5946, 12.9716, 77.5946) == 0.0
    dist = GeofenceService.haversine(0.0, 0.0, 1.0, 0.0)
    assert 110000 < dist < 112000

def test_verify_location_inside():
    status, dist = GeofenceService.verify_location(12.9716, 77.5946, 12.9716, 77.5946, 100.0)
    assert status == LocationStatus.WITHIN_GEOFENCE
    assert dist == 0.0

def test_verify_location_outside():
    status, dist = GeofenceService.verify_location(13.9716, 77.5946, 12.9716, 77.5946, 100.0)
    assert status == LocationStatus.OUTSIDE_GEOFENCE
    assert dist > 100000

def test_face_quality():
    # Null image data
    is_passed, reason = FaceQualityService.analyze_quality(None)
    assert not is_passed
    assert reason == "NO_FACE"

    # Explicit failure flags
    is_passed, reason = FaceQualityService.analyze_quality("fail_blur")
    assert not is_passed
    assert reason == "IMAGE_TOO_BLURRY"

    is_passed, reason = FaceQualityService.analyze_quality("fail_dark")
    assert not is_passed
    assert reason == "IMAGE_TOO_DARK"

    # Standard check fallback
    is_passed, reason = FaceQualityService.analyze_quality("valid_demo_image_payload")
    assert is_passed
    assert reason is None

def test_liveness():
    assert LivenessService.verify_liveness(None) == LivenessStatus.UNAVAILABLE
    assert LivenessService.verify_liveness("fail_liveness") == LivenessStatus.FAILED
    assert LivenessService.verify_liveness("pass_liveness") == LivenessStatus.PASSED

def test_qr_generation_and_verification():
    token = QRCodeService.generate_token(session_id=42, organization_id=1, expires_in_minutes=10)
    assert token is not None
    
    payload = QRCodeService.verify_token(token)
    assert payload is not None
    assert payload["session_id"] == 42
    assert payload["organization_id"] == 1
    
    assert QRCodeService.verify_token("invalid.token.string") is None

def test_verification_pipeline_logic():
    with SessionLocal() as db:
        # Create a mock worker with face template
        worker = WorkerModel(
            organization_id=1,
            worker_id="test_worker_1",
            worker_code="TW-1234",
            name="Test Worker",
            full_name="Test Worker Name",
            status=WorkerStatus.ACTIVE.value,
            is_active=True,
            face_template=json.dumps([0.5] * 512),
            biometric_enrollment_status="COMPLETED"
        )
        db.add(worker)
        db.commit()
        db.refresh(worker)

        # 1. High confidence / Pass
        # High score returned by matching deterministic vectors
        # For mock, RecognitionService calculates match score. 
        # By setting the image_data to a specific mock value, let's test pipeline logic.
        res, reason, face_s, live_s, loc_s, dist, matched_id, score = VerificationService.verify_pipeline(
            db=db,
            image_data="pass_liveness",
            worker_id=worker.id,
            organization_id=1,
            worksite_lat=12.9716,
            worksite_lon=77.5946,
            geofence_radius=100.0,
            worker_lat=12.9716,
            worker_lon=77.5946
        )
        assert face_s == FaceMatchStatus.MATCHED or face_s == FaceMatchStatus.LOW_CONFIDENCE

        # Clean up
        db.delete(worker)
        db.commit()
