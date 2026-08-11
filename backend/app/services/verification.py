import math
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session
from backend.app.models import WorkerModel, Organization, FaceMatchStatus, LivenessStatus, LocationStatus

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "hackathon_super_secret_key")
ALGORITHM = "HS256"

class LocationService:
    @staticmethod
    def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371000  # radius of Earth in meters
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    @staticmethod
    def verify_location(worker_lat: Optional[float], worker_lon: Optional[float], worksite_lat: Optional[float], worksite_lon: Optional[float], max_radius: float) -> tuple[LocationStatus, Optional[float]]:
        if worker_lat is None or worker_lon is None:
            return LocationStatus.UNAVAILABLE, None
        
        if worksite_lat is None or worksite_lon is None:
            # If worksite doesn't have coordinates, we can't verify, but we might just pass or fail. Let's pass for demo if worksite is missing coords.
            return LocationStatus.WITHIN_GEOFENCE, 0.0

        distance = LocationService.haversine(worker_lat, worker_lon, worksite_lat, worksite_lon)
        if distance <= max_radius:
            return LocationStatus.WITHIN_GEOFENCE, distance
        else:
            return LocationStatus.OUTSIDE_GEOFENCE, distance


class DemoRecognitionService:
    @staticmethod
    def verify_face(image_data: Optional[str], worker: WorkerModel) -> FaceMatchStatus:
        if not image_data:
            return FaceMatchStatus.UNAVAILABLE
        
        # DEMO IMPLEMENTATION:
        # If the image data is provided, we simulate a successful match
        # To simulate a failed match in demo, one could pass a specific string like "fail"
        if image_data == "fail_match":
            return FaceMatchStatus.NO_MATCH
        if image_data == "low_confidence":
            return FaceMatchStatus.LOW_CONFIDENCE
            
        return FaceMatchStatus.MATCHED

    @staticmethod
    def verify_liveness(image_data: Optional[str]) -> LivenessStatus:
        if not image_data:
            return LivenessStatus.UNAVAILABLE
            
        if image_data == "fail_liveness":
            return LivenessStatus.FAILED
            
        return LivenessStatus.PASSED


import json
import base64
import hmac
import hashlib

class QRCodeService:
    @staticmethod
    def generate_token(session_id: int, organization_id: int, expires_in_minutes: int = 120) -> str:
        expire = int((datetime.now(timezone.utc) + timedelta(minutes=expires_in_minutes)).timestamp())
        payload = {
            "session_id": session_id,
            "organization_id": organization_id,
            "exp": expire
        }
        payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip('=')
        signature = hmac.new(SECRET_KEY.encode(), payload_b64.encode(), hashlib.sha256).digest()
        signature_b64 = base64.urlsafe_b64encode(signature).decode().rstrip('=')
        return f"{payload_b64}.{signature_b64}"

    @staticmethod
    def verify_token(token: str) -> Optional[dict]:
        try:
            parts = token.split('.')
            if len(parts) != 2:
                return None
            payload_b64, signature_b64 = parts
            
            # Verify signature
            expected_sig = hmac.new(SECRET_KEY.encode(), payload_b64.encode(), hashlib.sha256).digest()
            expected_sig_b64 = base64.urlsafe_b64encode(expected_sig).decode().rstrip('=')
            
            if not hmac.compare_digest(signature_b64, expected_sig_b64):
                return None
                
            # Decode payload
            padding = '=' * (-len(payload_b64) % 4)
            payload = json.loads(base64.urlsafe_b64decode(payload_b64 + padding).decode())
            
            # Check expiration
            if payload.get("exp", 0) < int(datetime.now(timezone.utc).timestamp()):
                return None
                
            return payload
        except Exception:
            return None
