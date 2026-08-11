from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from backend.app.models import (
    AttendanceSession, Attendance, VerificationAttempt, WorkerModel, Worksite,
    SessionStatus, AttemptResult, AttendanceStatus, FaceMatchStatus, 
    LivenessStatus, LocationStatus, VerificationMethod
)
from backend.app.services.verification import LocationService, DemoRecognitionService


class SessionService:
    @staticmethod
    def create_session(db: Session, worksite_id: int, creator_id: int, session_type: str, date, scheduled_start, scheduled_end) -> AttendanceSession:
        session = AttendanceSession(
            organization_id=1,  # In a real system, get from user
            worksite_id=worksite_id,
            created_by=creator_id,
            session_type=session_type,
            date=date,
            scheduled_start=scheduled_start,
            scheduled_end=scheduled_end,
            status=SessionStatus.SCHEDULED.value
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    @staticmethod
    def get_sessions_by_worksite(db: Session, worksite_id: int) -> List[AttendanceSession]:
        return db.query(AttendanceSession).filter(AttendanceSession.worksite_id == worksite_id).all()

    @staticmethod
    def open_session(db: Session, session_id: int) -> Optional[AttendanceSession]:
        session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
        if session and session.status == SessionStatus.SCHEDULED.value:
            session.status = SessionStatus.OPEN.value
            session.actual_start = datetime.now(timezone.utc)
            db.commit()
            db.refresh(session)
        return session

    @staticmethod
    def close_session(db: Session, session_id: int) -> Optional[AttendanceSession]:
        session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
        if session and session.status == SessionStatus.OPEN.value:
            session.status = SessionStatus.CLOSED.value
            session.actual_end = datetime.now(timezone.utc)
            db.commit()
            db.refresh(session)
        return session


class AttendanceService:
    @staticmethod
    def process_verification_attempt(
        db: Session, 
        session_id: int, 
        worker_id: int, 
        verification_method: VerificationMethod,
        face_image_data: Optional[str] = None,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
        is_qr: bool = False
    ) -> VerificationAttempt:
        session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
        worker = db.query(WorkerModel).filter(WorkerModel.id == worker_id).first()
        worksite = db.query(Worksite).filter(Worksite.id == session.worksite_id).first()

        attempt = VerificationAttempt(
            organization_id=session.organization_id,
            session_id=session_id,
            worker_id=worker_id,
            verification_method=verification_method.value,
            latitude=lat,
            longitude=lon
        )
        
        if not session or session.status != SessionStatus.OPEN.value:
            attempt.result = AttemptResult.FAILED.value
            attempt.failure_reason = "SESSION_CLOSED"
            db.add(attempt)
            db.commit()
            db.refresh(attempt)
            return attempt

        if not worker or not worker.is_active:
            attempt.result = AttemptResult.FAILED.value
            attempt.failure_reason = "WORKER_INACTIVE"
            db.add(attempt)
            db.commit()
            db.refresh(attempt)
            return attempt

        # Check existing attendance
        existing_attendance = db.query(Attendance).filter(
            Attendance.session_id == session_id,
            Attendance.worker_id == worker_id
        ).first()

        if existing_attendance:
            attempt.result = AttemptResult.FAILED.value
            attempt.failure_reason = "DUPLICATE_ATTENDANCE"
            db.add(attempt)
            db.commit()
            db.refresh(attempt)
            return attempt

        # Location Check
        loc_status, dist = LocationService.verify_location(lat, lon, worksite.latitude, worksite.longitude, worksite.geofence_radius_meters)
        attempt.location_status = loc_status.value
        attempt.distance_from_worksite = dist

        if is_qr:
            # QR flow skips biometric check
            attempt.face_match_status = FaceMatchStatus.NOT_ATTEMPTED.value
            attempt.liveness_status = LivenessStatus.NOT_ATTEMPTED.value
            
            if loc_status == LocationStatus.OUTSIDE_GEOFENCE:
                attempt.result = AttemptResult.FAILED.value
                attempt.failure_reason = "OUTSIDE_GEOFENCE"
            else:
                attempt.result = AttemptResult.SUCCESS.value
        else:
            # Biometric flow
            face_status = DemoRecognitionService.verify_face(face_image_data, worker)
            live_status = DemoRecognitionService.verify_liveness(face_image_data)

            attempt.face_match_status = face_status.value
            attempt.liveness_status = live_status.value

            if face_status != FaceMatchStatus.MATCHED:
                if face_status == FaceMatchStatus.LOW_CONFIDENCE:
                    attempt.result = AttemptResult.PENDING_REVIEW.value
                    attempt.failure_reason = "LOW_CONFIDENCE"
                else:
                    attempt.result = AttemptResult.FAILED.value
                    attempt.failure_reason = "NO_MATCH"
            elif live_status != LivenessStatus.PASSED:
                attempt.result = AttemptResult.FAILED.value
                attempt.failure_reason = "LIVENESS_FAILED"
            elif loc_status == LocationStatus.OUTSIDE_GEOFENCE:
                attempt.result = AttemptResult.FAILED.value
                attempt.failure_reason = "OUTSIDE_GEOFENCE"
            else:
                attempt.result = AttemptResult.SUCCESS.value

        db.add(attempt)
        db.commit()
        db.refresh(attempt)
        return attempt

    @staticmethod
    def record_attendance(db: Session, attempt: VerificationAttempt) -> Optional[Attendance]:
        if attempt.result != AttemptResult.SUCCESS.value:
            return None

        attendance = Attendance(
            organization_id=attempt.organization_id,
            session_id=attempt.session_id,
            worker_id=attempt.worker_id,
            status=AttendanceStatus.PRESENT.value,
            verification_method=attempt.verification_method,
            check_in_at=datetime.now(timezone.utc),
            latitude=attempt.latitude,
            longitude=attempt.longitude,
            distance_from_worksite=attempt.distance_from_worksite,
            face_match_status=attempt.face_match_status,
            liveness_status=attempt.liveness_status,
            location_status=attempt.location_status,
            verification_attempt_id=attempt.id
        )
        db.add(attendance)
        db.commit()
        db.refresh(attendance)
        return attendance

    @staticmethod
    def check_out(db: Session, session_id: int, worker_id: int) -> Optional[Attendance]:
        attendance = db.query(Attendance).filter(
            Attendance.session_id == session_id,
            Attendance.worker_id == worker_id
        ).first()
        
        if attendance and not attendance.check_out_at:
            attendance.check_out_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(attendance)
        return attendance
