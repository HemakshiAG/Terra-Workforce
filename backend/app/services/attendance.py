from datetime import datetime, timezone
import json
from typing import List, Optional

from sqlalchemy.orm import Session

from backend.app.models import (
    AttendanceSession, Attendance, VerificationAttempt, WorkerModel, Worksite,
    SessionStatus, AttemptResult, AttendanceStatus, FaceMatchStatus, 
    LivenessStatus, LocationStatus, VerificationMethod, BiometricEnrollmentStatus
)
from backend.app.services.verification import VerificationService, QRCodeService
from backend.app.services.geofence import GeofenceService


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
        worker_id: Optional[int], 
        verification_method: VerificationMethod,
        face_image_data: Optional[str] = None,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
        is_qr: bool = False
    ) -> VerificationAttempt:
        session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
        worksite = db.query(Worksite).filter(Worksite.id == session.worksite_id).first() if session else None

        attempt = VerificationAttempt(
            organization_id=session.organization_id if session else 1,
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

        # If worker is pre-specified, validate active status
        if worker_id:
            worker = db.query(WorkerModel).filter(WorkerModel.id == worker_id).first()
            if not worker or not worker.is_active:
                attempt.result = AttemptResult.FAILED.value
                attempt.failure_reason = "WORKER_INACTIVE"
                db.add(attempt)
                db.commit()
                db.refresh(attempt)
                return attempt

            # Enforce biometric enrollment check for face verification
            if not is_qr and worker.biometric_enrollment_status != BiometricEnrollmentStatus.COMPLETED.value:
                attempt.result = AttemptResult.FAILED.value
                attempt.failure_reason = "BIOMETRIC_ENROLLMENT_INCOMPLETE"
                db.add(attempt)
                db.commit()
                db.refresh(attempt)
                return attempt

            # Check duplicate check-in
            existing = db.query(Attendance).filter(
                Attendance.session_id == session_id,
                Attendance.worker_id == worker_id
            ).first()
            if existing:
                attempt.result = AttemptResult.FAILED.value
                attempt.failure_reason = "DUPLICATE_ATTENDANCE"
                db.add(attempt)
                db.commit()
                db.refresh(attempt)
                return attempt

        if is_qr:
            # QR flow
            # Geofence location check
            loc_status, dist = GeofenceService.verify_location(
                lat, lon, worksite.latitude, worksite.longitude, worksite.geofence_radius_meters
            )
            attempt.location_status = loc_status.value
            attempt.distance_from_worksite = dist
            attempt.face_match_status = FaceMatchStatus.NOT_ATTEMPTED.value
            attempt.liveness_status = LivenessStatus.NOT_ATTEMPTED.value
            
            if loc_status == LocationStatus.OUTSIDE_GEOFENCE:
                attempt.result = AttemptResult.FAILED.value
                attempt.failure_reason = "OUTSIDE_GEOFENCE"
            elif loc_status == LocationStatus.UNAVAILABLE:
                attempt.result = AttemptResult.FAILED.value
                attempt.failure_reason = "LOCATION_UNAVAILABLE"
            else:
                attempt.result = AttemptResult.SUCCESS.value
        else:
            # Biometric pipeline
            res, reason, face_s, live_s, loc_s, dist, matched_id, confidence = VerificationService.verify_pipeline(
                db=db,
                image_data=face_image_data,
                worker_id=worker_id,
                organization_id=session.organization_id,
                worksite_lat=worksite.latitude,
                worksite_lon=worksite.longitude,
                geofence_radius=worksite.geofence_radius_meters,
                worker_lat=lat,
                worker_lon=lon
            )

            # Assign resolved worker_id if it was not provided
            if matched_id:
                attempt.worker_id = matched_id
                # Check duplicate again for matched worker
                existing = db.query(Attendance).filter(
                    Attendance.session_id == session_id,
                    Attendance.worker_id == matched_id
                ).first()
                if existing:
                    attempt.result = AttemptResult.FAILED.value
                    attempt.failure_reason = "DUPLICATE_ATTENDANCE"
                    attempt.face_match_status = face_s.value
                    attempt.liveness_status = live_s.value
                    attempt.location_status = loc_s.value
                    attempt.distance_from_worksite = dist
                    db.add(attempt)
                    db.commit()
                    db.refresh(attempt)
                    return attempt

            attempt.result = res.value
            attempt.failure_reason = reason
            attempt.face_match_status = face_s.value
            attempt.liveness_status = live_s.value
            attempt.location_status = loc_s.value
            attempt.distance_from_worksite = dist

        db.add(attempt)
        db.commit()
        db.refresh(attempt)
        return attempt

    @staticmethod
    def record_attendance(db: Session, attempt: VerificationAttempt) -> Optional[Attendance]:
        if attempt.result != AttemptResult.SUCCESS.value:
            return None

        # Double check worker presence
        if not attempt.worker_id:
            return None

        # Check existing attendance to prevent duplication
        existing = db.query(Attendance).filter(
            Attendance.session_id == attempt.session_id,
            Attendance.worker_id == attempt.worker_id
        ).first()
        if existing:
            return existing

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
    def record_break_start(db: Session, session_id: int, worker_id: int) -> Optional[Attendance]:
        attendance = db.query(Attendance).filter(
            Attendance.session_id == session_id,
            Attendance.worker_id == worker_id
        ).first()
        if attendance and not attendance.break_start:
            attendance.break_start = datetime.now(timezone.utc)
            db.commit()
            db.refresh(attendance)
        return attendance

    @staticmethod
    def record_break_end(db: Session, session_id: int, worker_id: int) -> Optional[Attendance]:
        attendance = db.query(Attendance).filter(
            Attendance.session_id == session_id,
            Attendance.worker_id == worker_id
        ).first()
        if attendance and attendance.break_start and not attendance.break_end:
            attendance.break_end = datetime.now(timezone.utc)
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
