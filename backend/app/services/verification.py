import math
import os
import json
import base64
import hmac
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple, Dict, List

from sqlalchemy.orm import Session
from backend.app.models import WorkerModel, Organization, FaceMatchStatus, LivenessStatus, LocationStatus, AttemptResult
from backend.app.services.geofence import GeofenceService
from backend.app.services.face_quality import FaceQualityService
from backend.app.services.liveness import LivenessService
from backend.app.services.recognition import RecognitionService

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "hackathon_super_secret_key")
ALGORITHM = "HS256"

class VerificationService:
    # Configurable thresholds
    THRESHOLD_HIGH = float(os.getenv("THRESHOLD_HIGH", "0.80"))
    THRESHOLD_MEDIUM = float(os.getenv("THRESHOLD_MEDIUM", "0.60"))

    @classmethod
    def verify_pipeline(
        cls,
        db: Session,
        image_data: Optional[str],
        worker_id: Optional[int],
        organization_id: int,
        worksite_lat: Optional[float],
        worksite_lon: Optional[float],
        geofence_radius: float,
        worker_lat: Optional[float],
        worker_lon: Optional[float]
    ) -> Tuple[AttemptResult, Optional[str], FaceMatchStatus, LivenessStatus, LocationStatus, Optional[float], Optional[int], float]:
        """
        Executes the entire verification pipeline.
        Returns:
            (attempt_result, failure_reason, face_match_status, liveness_status, location_status, distance, matched_worker_id, confidence)
        """
        # 1. Location / Geofence Check
        loc_status, dist = GeofenceService.verify_location(
            worker_lat, worker_lon, worksite_lat, worksite_lon, geofence_radius
        )

        # 2. Face Quality Check
        is_quality_ok, quality_err = FaceQualityService.analyze_quality(image_data)
        if not is_quality_ok:
            return (
                AttemptResult.FAILED,
                quality_err, # NO_FACE, IMAGE_TOO_DARK, etc.
                FaceMatchStatus.UNAVAILABLE,
                LivenessStatus.NOT_ATTEMPTED,
                loc_status,
                dist,
                worker_id,
                0.0
            )

        # 3. Liveness Check
        liveness = LivenessService.verify_liveness(image_data)
        if liveness == LivenessStatus.FAILED:
            return (
                AttemptResult.FAILED,
                "LIVENESS_FAILED",
                FaceMatchStatus.NOT_ATTEMPTED,
                LivenessStatus.FAILED,
                loc_status,
                dist,
                worker_id,
                0.0
            )

        # 4. Generate Embedding and search
        live_emb = RecognitionService.generate_embedding(image_data)
        if not live_emb:
            return (
                AttemptResult.FAILED,
                "EMBEDDING_FAILED",
                FaceMatchStatus.UNAVAILABLE,
                liveness,
                loc_status,
                dist,
                worker_id,
                0.0
            )

        # Load enrolled templates for all active workers in organization
        active_workers = db.query(WorkerModel).filter(
            WorkerModel.organization_id == organization_id,
            WorkerModel.is_active == True,
            WorkerModel.face_template.isnot(None)
        ).all()

        enrolled_workers = {}
        for w in active_workers:
            try:
                emb = json.loads(w.face_template)
                if isinstance(emb, list) and len(emb) == 512:
                    enrolled_workers[w.id] = emb
            except Exception:
                continue

        # If a worker_id is provided, check if it matches that specific worker or find nearest
        matched_id, score = RecognitionService.find_nearest_candidate(live_emb, enrolled_workers)

        # If no active workers are enrolled
        if matched_id is None:
            return (
                AttemptResult.FAILED,
                "NO_MATCHING_WORKER",
                FaceMatchStatus.NO_MATCH,
                liveness,
                loc_status,
                dist,
                None,
                0.0
            )

        # Map score to status
        if score >= cls.THRESHOLD_HIGH:
            match_status = FaceMatchStatus.MATCHED
        elif score >= cls.THRESHOLD_MEDIUM:
            match_status = FaceMatchStatus.LOW_CONFIDENCE
        else:
            match_status = FaceMatchStatus.NO_MATCH

        # Check outcomes
        if match_status == FaceMatchStatus.NO_MATCH:
            return (
                AttemptResult.FAILED,
                "NO_MATCH",
                match_status,
                liveness,
                loc_status,
                dist,
                matched_id,
                score
            )
        elif match_status == FaceMatchStatus.LOW_CONFIDENCE:
            return (
                AttemptResult.PENDING_REVIEW,
                "LOW_CONFIDENCE",
                match_status,
                liveness,
                loc_status,
                dist,
                matched_id,
                score
            )

        # Location constraint checks
        if loc_status == LocationStatus.OUTSIDE_GEOFENCE:
            return (
                AttemptResult.FAILED,
                "OUTSIDE_GEOFENCE",
                match_status,
                liveness,
                loc_status,
                dist,
                matched_id,
                score
            )

        return (
            AttemptResult.SUCCESS,
            None,
            match_status,
            liveness,
            loc_status,
            dist,
            matched_id,
            score
        )


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
