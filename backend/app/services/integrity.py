from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from backend.app.models import (
    IntegrityAlertModel, VerificationAttempt, Attendance, WorkerModel, Worksite, AttendanceSession, FaceMatchStatus, LivenessStatus, LocationStatus, AttemptResult
)
from backend.app.services.geofence import GeofenceService

class IntegrityService:
    @staticmethod
    def create_alert(db: Session, worker_id: str, alert_type: str, message: str, severity: str = "MEDIUM"):
        # Deduplicate: don't create the exact same alert if it was already created recently (e.g. last 10 mins)
        ten_mins_ago = datetime.now(timezone.utc) - timedelta(minutes=10)
        existing = db.query(IntegrityAlertModel).filter(
            IntegrityAlertModel.worker_id == str(worker_id),
            IntegrityAlertModel.alert_type == alert_type,
            IntegrityAlertModel.message == message,
            IntegrityAlertModel.created_at >= ten_mins_ago
        ).first()
        
        if not existing:
            alert = IntegrityAlertModel(
                worker_id=str(worker_id),
                alert_type=alert_type,
                message=message,
                severity=severity,
                status="OPEN"
            )
            db.add(alert)
            db.commit()

    @classmethod
    def check_anomalies(
        cls,
        db: Session,
        worker_id: int,
        session_id: int,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ):
        worker = db.query(WorkerModel).filter(WorkerModel.id == worker_id).first()
        if not worker:
            return

        # 1. Geofence violation
        session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
        if session and lat is not None and lon is not None:
            worksite = db.query(Worksite).filter(Worksite.id == session.worksite_id).first()
            if worksite and worksite.latitude is not None and worksite.longitude is not None:
                dist = GeofenceService.haversine(lat, lon, worksite.latitude, worksite.longitude)
                if dist > worksite.geofence_radius_meters:
                    cls.create_alert(
                        db,
                        worker_id=str(worker.id),
                        alert_type="Geofence violation",
                        message=f"Attendance attempt occurred {round(dist)}m outside the configured worksite.",
                        severity="HIGH"
                    )

        # 2. Repeated Low-Confidence Matches (>=3 in last 2 days)
        two_days_ago = datetime.now(timezone.utc) - timedelta(days=2)
        low_conf_count = db.query(func.count(VerificationAttempt.id)).filter(
            VerificationAttempt.worker_id == worker.id,
            VerificationAttempt.face_match_status == FaceMatchStatus.LOW_CONFIDENCE.value,
            VerificationAttempt.timestamp >= two_days_ago
        ).scalar() or 0

        if low_conf_count >= 3:
            cls.create_alert(
                db,
                worker_id=str(worker.id),
                alert_type="Repeated low-confidence matches",
                message=f"{low_conf_count} low-confidence attempts in the last 2 days",
                severity="MEDIUM"
            )

        # 3. Repeated Liveness Failures (>=4 today)
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        liveness_fails = db.query(func.count(VerificationAttempt.id)).filter(
            VerificationAttempt.worker_id == worker.id,
            VerificationAttempt.liveness_status == LivenessStatus.FAILED.value,
            VerificationAttempt.timestamp >= today_start
        ).scalar() or 0

        if liveness_fails >= 4:
            cls.create_alert(
                db,
                worker_id=str(worker.id),
                alert_type="Repeated liveness failures",
                message=f"{liveness_fails} failed liveness attempts today.",
                severity="HIGH"
            )

        # 4. Excessive Manual Corrections (>=8 this week)
        one_week_ago = datetime.now(timezone.utc) - timedelta(days=7)
        manual_count = db.query(func.count(VerificationAttempt.id)).filter(
            VerificationAttempt.worker_id == worker.id,
            VerificationAttempt.verification_method == "MANUAL",
            VerificationAttempt.timestamp >= one_week_ago
        ).scalar() or 0

        if manual_count >= 8:
            cls.create_alert(
                db,
                worker_id=str(worker.id),
                alert_type="Excessive manual corrections",
                message=f"Supervisor manually changed attendance {manual_count} times this week.",
                severity="MEDIUM"
            )

        # 5. Impossible Travel Location (same worker in 2 hours across incompatible worksites)
        two_hours_ago = datetime.now(timezone.utc) - timedelta(hours=2)
        recent_attempts = db.query(VerificationAttempt).filter(
            VerificationAttempt.worker_id == worker.id,
            VerificationAttempt.timestamp >= two_hours_ago,
            VerificationAttempt.latitude.isnot(None),
            VerificationAttempt.longitude.isnot(None)
        ).all()

        for attempt in recent_attempts:
            if attempt.session_id != session_id:
                other_sess = db.query(AttendanceSession).filter(AttendanceSession.id == attempt.session_id).first()
                if other_sess and other_sess.worksite_id != session.worksite_id:
                    # Incompatible worksites check distance
                    other_ws = db.query(Worksite).filter(Worksite.id == other_sess.worksite_id).first()
                    this_ws = db.query(Worksite).filter(Worksite.id == session.worksite_id).first()
                    if other_ws and this_ws and other_ws.latitude is not None and this_ws.latitude is not None:
                        ws_dist = GeofenceService.haversine(this_ws.latitude, this_ws.longitude, other_ws.latitude, other_ws.longitude)
                        # If distance is significant (e.g. > 1000m)
                        if ws_dist > 1000.0:
                            cls.create_alert(
                                db,
                                worker_id=str(worker.id),
                                alert_type="Impossible location",
                                message="Same worker/device appears at incompatible worksites within an impossible travel window.",
                                severity="HIGH"
                            )
                            break
