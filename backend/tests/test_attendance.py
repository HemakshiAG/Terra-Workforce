import pytest
from datetime import date, datetime, timedelta, timezone
from backend.app.services.verification import LocationService, DemoRecognitionService, QRCodeService
from backend.app.models import LocationStatus, FaceMatchStatus, LivenessStatus, AttemptResult

def test_haversine_distance():
    # Same point
    assert LocationService.haversine(12.9716, 77.5946, 12.9716, 77.5946) == 0.0
    
    # 1 degree lat approx 111km
    dist = LocationService.haversine(0.0, 0.0, 1.0, 0.0)
    assert 110000 < dist < 112000

def test_verify_location_inside():
    # Worksite at (12.9716, 77.5946)
    # Worker exactly at same spot
    status, dist = LocationService.verify_location(12.9716, 77.5946, 12.9716, 77.5946, 100.0)
    assert status == LocationStatus.WITHIN_GEOFENCE
    assert dist == 0.0

def test_verify_location_outside():
    # 1 degree away is ~111km, radius is 100m
    status, dist = LocationService.verify_location(13.9716, 77.5946, 12.9716, 77.5946, 100.0)
    assert status == LocationStatus.OUTSIDE_GEOFENCE
    assert dist > 100000

def test_demo_recognition():
    # It just needs a non-null string for match in demo mode unless it's a specific fail string
    assert DemoRecognitionService.verify_face("demo-data", None) == FaceMatchStatus.MATCHED
    assert DemoRecognitionService.verify_face("fail_match", None) == FaceMatchStatus.NO_MATCH
    assert DemoRecognitionService.verify_face("low_confidence", None) == FaceMatchStatus.LOW_CONFIDENCE
    
    assert DemoRecognitionService.verify_liveness("demo-data") == LivenessStatus.PASSED
    assert DemoRecognitionService.verify_liveness("fail_liveness") == LivenessStatus.FAILED

def test_qr_generation_and_verification():
    token = QRCodeService.generate_token(session_id=42, organization_id=1, expires_in_minutes=10)
    assert token is not None
    
    payload = QRCodeService.verify_token(token)
    assert payload is not None
    assert payload["session_id"] == 42
    assert payload["organization_id"] == 1
    
    # Check invalid token
    assert QRCodeService.verify_token("invalid.token.string") is None

# Note: Integration tests requiring the full FastAPI/Starlette test client & DB setup 
# would be added here, but unit tests for services confirm the core logic as per phase 3.
