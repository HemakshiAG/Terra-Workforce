import json
from datetime import datetime, timezone, date
from typing import Any, Optional

from pydantic import ValidationError, BaseModel
from starlette.requests import Request
from starlette.responses import JSONResponse

from backend.app.database import SessionLocal
from backend.app.models import (
    AttendanceSession, AttemptResult, VerificationMethod, 
    AttendanceStatus, FaceMatchStatus, LivenessStatus, LocationStatus, RoleName,
    Attendance, WorkerModel, VerificationAttempt, Worksite, SessionStatus
)
from backend.app.schemas_attendance import (
    AttendanceSessionCreate, VerificationAttemptRequest, 
    CheckInRequest, CheckOutRequest, QRGenerateRequest, QRVerifyRequest
)
from backend.app.services.attendance import SessionService, AttendanceService
from backend.app.services.verification import QRCodeService
from backend.app.worker_phase2 import _require_auth, _require_role, _parse_payload, _utc_now, _audit


class ManualAttendanceRequest(BaseModel):
    session_id: int
    worker_id: int
    reason: str


class ReviewDecisionRequest(BaseModel):
    action: str  # APPROVE, REJECT, RECAPTURE
    reason: Optional[str] = None


async def create_session_endpoint(request: Request) -> JSONResponse:
    user, db, error_response = _require_role(request, {'ADMIN', 'SUPERVISOR'})
    if error_response:
        return error_response
    
    try:
        payload = await request.json()
        validated = _parse_payload(AttendanceSessionCreate, payload)
    except (ValueError, TypeError, ValidationError) as exc:
        db.close()
        return JSONResponse({'detail': str(exc).split('\n')[0]}, status_code=400)
        
    try:
        session = SessionService.create_session(
            db, validated.worksite_id, user.id, validated.session_type.value,
            validated.date, validated.scheduled_start, validated.scheduled_end
        )
        return JSONResponse({'id': session.id, 'status': session.status}, status_code=201)
    finally:
        db.close()

async def get_sessions_endpoint(request: Request) -> JSONResponse:
    user, db, error_response = _require_role(request, {'ADMIN', 'SUPERVISOR'})
    if error_response:
        return error_response
        
    try:
        worksite_id = int(request.query_params.get('worksite_id', 0))
        if not worksite_id:
            return JSONResponse({'detail': 'worksite_id is required'}, status_code=400)
            
        sessions = SessionService.get_sessions_by_worksite(db, worksite_id)
        return JSONResponse([{'id': s.id, 'status': s.status, 'session_type': s.session_type} for s in sessions])
    finally:
        db.close()

async def open_session_endpoint(request: Request) -> JSONResponse:
    user, db, error_response = _require_role(request, {'ADMIN', 'SUPERVISOR'})
    if error_response:
        return error_response
        
    try:
        session_id = int(request.path_params['session_id'])
        session = SessionService.open_session(db, session_id)
        if not session:
            return JSONResponse({'detail': 'Session not found or not in SCHEDULED state'}, status_code=404)
        return JSONResponse({'id': session.id, 'status': session.status})
    finally:
        db.close()

async def close_session_endpoint(request: Request) -> JSONResponse:
    user, db, error_response = _require_role(request, {'ADMIN', 'SUPERVISOR'})
    if error_response:
        return error_response
        
    try:
        session_id = int(request.path_params['session_id'])
        session = SessionService.close_session(db, session_id)
        if not session:
            return JSONResponse({'detail': 'Session not found or not OPEN'}, status_code=404)
        return JSONResponse({'id': session.id, 'status': session.status})
    finally:
        db.close()

async def verify_attendance_endpoint(request: Request) -> JSONResponse:
    auth_result, error_response = _require_auth(request)
    if error_response:
        return error_response
    user, db = auth_result
    
    try:
        payload = await request.json()
        validated = _parse_payload(VerificationAttemptRequest, payload)
    except Exception as exc:
        db.close()
        return JSONResponse({'detail': str(exc)}, status_code=400)
        
    try:
        if validated.verification_method == VerificationMethod.QR:
            return JSONResponse({'detail': 'Use /qr/verify for QR verification'}, status_code=400)
            
        attempt = AttendanceService.process_verification_attempt(
            db, validated.session_id, validated.worker_id, validated.verification_method,
            validated.face_image_data, validated.latitude, validated.longitude, is_qr=False
        )
        return JSONResponse({
            'id': attempt.id,
            'result': attempt.result,
            'failure_reason': attempt.failure_reason,
            'face_match_status': attempt.face_match_status,
            'liveness_status': attempt.liveness_status,
            'location_status': attempt.location_status,
        })
    finally:
        db.close()

async def check_in_endpoint(request: Request) -> JSONResponse:
    db = SessionLocal()
    try:
        payload = await request.json()
        validated = _parse_payload(CheckInRequest, payload)
        
        attempt = db.query(VerificationAttempt).filter(VerificationAttempt.id == validated.verification_attempt_id).first()
        if not attempt:
            return JSONResponse({'detail': 'Attempt not found'}, status_code=404)
            
        attendance = AttendanceService.record_attendance(db, attempt)
        if not attendance:
            return JSONResponse({'detail': 'Check-in failed. Attempt was not SUCCESS.'}, status_code=400)
            
        return JSONResponse({'id': attendance.id, 'status': attendance.status, 'check_in_at': str(attendance.check_in_at)})
    except Exception as exc:
        return JSONResponse({'detail': str(exc)}, status_code=400)
    finally:
        db.close()

async def check_out_endpoint(request: Request) -> JSONResponse:
    db = SessionLocal()
    try:
        payload = await request.json()
        validated = _parse_payload(CheckOutRequest, payload)
        
        attendance = AttendanceService.check_out(db, validated.session_id, validated.worker_id)
        if not attendance:
            return JSONResponse({'detail': 'Active check-in not found'}, status_code=404)
            
        return JSONResponse({'id': attendance.id, 'check_out_at': str(attendance.check_out_at)})
    except Exception as exc:
        return JSONResponse({'detail': str(exc)}, status_code=400)
    finally:
        db.close()

async def generate_qr_endpoint(request: Request) -> JSONResponse:
    user, db, error_response = _require_role(request, {'ADMIN', 'SUPERVISOR'})
    if error_response:
        return error_response
        
    try:
        payload = await request.json()
        validated = _parse_payload(QRGenerateRequest, payload)
        token = QRCodeService.generate_token(validated.session_id, user.organization_id)
        return JSONResponse({'token': token})
    finally:
        db.close()

async def verify_qr_endpoint(request: Request) -> JSONResponse:
    db = SessionLocal()
    try:
        payload = await request.json()
        validated = _parse_payload(QRVerifyRequest, payload)
        
        decoded = QRCodeService.verify_token(validated.token)
        if not decoded:
            return JSONResponse({'detail': 'Invalid or expired QR token'}, status_code=400)
            
        session_id = decoded.get("session_id")
        attempt = AttendanceService.process_verification_attempt(
            db, session_id, validated.worker_id, VerificationMethod.QR,
            face_image_data=None, lat=validated.latitude, lon=validated.longitude, is_qr=True
        )
        return JSONResponse({
            'id': attempt.id,
            'result': attempt.result,
            'failure_reason': attempt.failure_reason,
            'location_status': attempt.location_status,
        })
    except Exception as exc:
        return JSONResponse({'detail': str(exc)}, status_code=400)
    finally:
        db.close()

# --- NEW PHASE 4 ENDPOINTS ---

async def break_start_endpoint(request: Request) -> JSONResponse:
    auth_result, error_response = _require_auth(request)
    if error_response:
        return error_response
    user, db = auth_result
    try:
        payload = await request.json()
        session_id = payload.get('session_id')
        worker_id = payload.get('worker_id')
        attendance = AttendanceService.record_break_start(db, session_id, worker_id)
        if not attendance:
            return JSONResponse({'detail': 'Active attendance record not found'}, status_code=404)
        return JSONResponse({'id': attendance.id, 'break_start': str(attendance.break_start)})
    except Exception as exc:
        return JSONResponse({'detail': str(exc)}, status_code=400)
    finally:
        db.close()

async def break_end_endpoint(request: Request) -> JSONResponse:
    auth_result, error_response = _require_auth(request)
    if error_response:
        return error_response
    user, db = auth_result
    try:
        payload = await request.json()
        session_id = payload.get('session_id')
        worker_id = payload.get('worker_id')
        attendance = AttendanceService.record_break_end(db, session_id, worker_id)
        if not attendance:
            return JSONResponse({'detail': 'Active break or attendance record not found'}, status_code=404)
        return JSONResponse({'id': attendance.id, 'break_end': str(attendance.break_end)})
    except Exception as exc:
        return JSONResponse({'detail': str(exc)}, status_code=400)
    finally:
        db.close()

async def manual_attendance_endpoint(request: Request) -> JSONResponse:
    user, db, error_response = _require_role(request, {'ADMIN', 'SUPERVISOR'})
    if error_response:
        return error_response
    try:
        payload = await request.json()
        validated = _parse_payload(ManualAttendanceRequest, payload)
        
        # Check active status of worker
        worker = db.query(WorkerModel).filter(WorkerModel.id == validated.worker_id).first()
        if not worker or not worker.is_active:
            return JSONResponse({'detail': 'Worker is inactive or not found'}, status_code=400)

        # Create VerificationAttempt
        attempt = VerificationAttempt(
            organization_id=user.organization_id,
            session_id=validated.session_id,
            worker_id=validated.worker_id,
            verification_method=VerificationMethod.MANUAL.value,
            result=AttemptResult.SUCCESS.value,
            face_match_status=FaceMatchStatus.NOT_ATTEMPTED.value,
            liveness_status=LivenessStatus.NOT_ATTEMPTED.value,
            location_status=LocationStatus.NOT_ATTEMPTED.value,
            failure_reason="MANUAL_OVERRIDE"
        )
        db.add(attempt)
        db.flush()

        attendance = Attendance(
            organization_id=user.organization_id,
            session_id=validated.session_id,
            worker_id=validated.worker_id,
            status=AttendanceStatus.PRESENT.value,
            verification_method=VerificationMethod.MANUAL.value,
            check_in_at=datetime.now(timezone.utc),
            face_match_status=FaceMatchStatus.NOT_ATTEMPTED.value,
            liveness_status=LivenessStatus.NOT_ATTEMPTED.value,
            location_status=LocationStatus.NOT_ATTEMPTED.value,
            verification_attempt_id=attempt.id
        )
        db.add(attendance)
        
        _audit(
            db,
            organization_id=user.organization_id,
            actor_user_id=user.id,
            action='MANUAL_ATTENDANCE_MARKED',
            target_type='worker',
            target_id=str(validated.worker_id),
            worker_id=validated.worker_id,
            metadata={'reason': validated.reason, 'session_id': validated.session_id}
        )
        db.commit()
        return JSONResponse({'id': attendance.id, 'status': attendance.status, 'verification_method': attendance.verification_method})
    except Exception as exc:
        return JSONResponse({'detail': str(exc)}, status_code=400)
    finally:
        db.close()

async def get_reviews_endpoint(request: Request) -> JSONResponse:
    user, db, error_response = _require_role(request, {'ADMIN', 'SUPERVISOR'})
    if error_response:
        return error_response
    try:
        attempts = db.query(VerificationAttempt).filter(
            VerificationAttempt.organization_id == user.organization_id,
            VerificationAttempt.result == AttemptResult.PENDING_REVIEW.value
        ).all()
        
        return JSONResponse([
            {
                'id': a.id,
                'session_id': a.session_id,
                'worker_id': a.worker_id,
                'worker_name': a.worker.full_name if a.worker else "Unknown",
                'timestamp': a.timestamp.isoformat(),
                'verification_method': a.verification_method,
                'face_match_status': a.face_match_status,
                'liveness_status': a.liveness_status,
                'location_status': a.location_status,
                'distance': a.distance_from_worksite,
                'result': a.result
            } for a in attempts
        ])
    finally:
        db.close()

async def process_review_endpoint(request: Request) -> JSONResponse:
    user, db, error_response = _require_role(request, {'ADMIN', 'SUPERVISOR'})
    if error_response:
        return error_response
    try:
        attempt_id = int(request.path_params['attempt_id'])
        payload = await request.json()
        validated = _parse_payload(ReviewDecisionRequest, payload)

        attempt = db.query(VerificationAttempt).filter(VerificationAttempt.id == attempt_id).first()
        if not attempt or attempt.organization_id != user.organization_id:
            return JSONResponse({'detail': 'Verification attempt not found'}, status_code=404)

        if attempt.result != AttemptResult.PENDING_REVIEW.value:
            return JSONResponse({'detail': 'Attempt has already been processed'}, status_code=400)

        original_result = attempt.result

        if validated.action == 'APPROVE':
            attempt.result = AttemptResult.SUCCESS.value
            attendance = AttendanceService.record_attendance(db, attempt)
            if attendance:
                attendance.status = AttendanceStatus.PRESENT.value
        else:
            attempt.result = AttemptResult.FAILED.value
            attempt.failure_reason = "REVIEW_REJECTED" if validated.action == 'REJECT' else "REVIEW_RECAPTURE"

        _audit(
            db,
            organization_id=user.organization_id,
            actor_user_id=user.id,
            action=f'REVIEW_DECISION_{validated.action}',
            target_type='verification_attempt',
            target_id=str(attempt_id),
            worker_id=attempt.worker_id,
            metadata={
                'decision': validated.action,
                'reason': validated.reason,
                'original_result': original_result
            }
        )
        db.commit()
        return JSONResponse({'id': attempt.id, 'result': attempt.result})
    except Exception as exc:
        return JSONResponse({'detail': str(exc)}, status_code=400)
    finally:
        db.close()

async def list_attendance_endpoint(request: Request) -> JSONResponse:
    auth_result, error_response = _require_auth(request)
    if error_response:
        return error_response
    user, db = auth_result
    
    try:
        query = db.query(Attendance).filter(Attendance.organization_id == user.organization_id)
        
        # Enforce RBAC/Worker view isolation
        role_str = user.role_ref.name if user.role_ref else 'WORKER'
        if role_str == 'WORKER':
            worker_record = db.query(WorkerModel).filter(
                WorkerModel.organization_id == user.organization_id,
                (WorkerModel.phone == user.phone) | (WorkerModel.name == user.name)
            ).first()
            if not worker_record:
                return JSONResponse([])
            query = query.filter(Attendance.worker_id == worker_record.id)
        else:
            # Supervisors/Admins can filter
            session_id = request.query_params.get('session_id')
            worksite_id = request.query_params.get('worksite_id')
            status = request.query_params.get('status')
            date_filter = request.query_params.get('date')
            search = request.query_params.get('search')
            
            if session_id:
                query = query.filter(Attendance.session_id == int(session_id))
            if worksite_id:
                query = query.join(AttendanceSession).filter(AttendanceSession.worksite_id == int(worksite_id))
            if status:
                query = query.filter(Attendance.status == status)
            if date_filter:
                try:
                    dt = datetime.strptime(date_filter, "%Y-%m-%d").date()
                    query = query.join(AttendanceSession).filter(AttendanceSession.date == dt)
                except ValueError:
                    pass
            if search:
                query = query.join(WorkerModel).filter(
                    (WorkerModel.full_name.icontains(search)) | (WorkerModel.worker_code.icontains(search))
                )
                
        attendances = query.all()
        return JSONResponse([
            {
                'id': att.id,
                'worker_id': att.worker_id,
                'worker_code': att.worker.worker_code if att.worker else None,
                'worker_name': att.worker.full_name if att.worker else "Unknown",
                'session_id': att.session_id,
                'session_type': att.session.session_type if att.session else None,
                'status': att.status,
                'verification_method': att.verification_method,
                'check_in_at': att.check_in_at.isoformat() if att.check_in_at else None,
                'check_out_at': att.check_out_at.isoformat() if att.check_out_at else None,
                'break_start': att.break_start.isoformat() if att.break_start else None,
                'break_end': att.break_end.isoformat() if att.break_end else None,
                'latitude': att.latitude,
                'longitude': att.longitude,
                'distance': att.distance_from_worksite,
                'face_match_status': att.face_match_status,
                'liveness_status': att.liveness_status,
                'location_status': att.location_status,
            } for att in attendances
        ])
    finally:
        db.close()


async def supervisor_dashboard_endpoint(request: Request) -> JSONResponse:
    user, db, error_response = _require_role(request, {'ADMIN', 'SUPERVISOR'})
    if error_response:
        return error_response

    try:
        from sqlalchemy import func
        from backend.app.models import WorkerModel, Attendance, VerificationAttempt, IntegrityAlertModel, WageRecordModel, AttendanceSession
        
        # 1. Total Workers in Organization
        workers_count = db.query(func.count(WorkerModel.id)).filter(
            WorkerModel.organization_id == user.organization_id,
            WorkerModel.is_active == True
        ).scalar() or 0

        # 2. Present Workers today
        present_count = db.query(func.count(Attendance.id)).filter(
            Attendance.organization_id == user.organization_id,
            func.date(Attendance.check_in_at) == date.today()
        ).scalar() or 0

        # 3. Absent workers today
        absent_count = max(0, workers_count - present_count)

        # 4. Pending Review
        pending_count = db.query(func.count(VerificationAttempt.id)).filter(
            VerificationAttempt.organization_id == user.organization_id,
            VerificationAttempt.result == AttemptResult.PENDING_REVIEW.value
        ).scalar() or 0

        # 5. Integrity Alerts
        alerts_count = db.query(func.count(IntegrityAlertModel.id)).scalar() or 0

        # 6. Estimated Wages Today (present workers * 400.0 or from WageRecordModel sum)
        wage_sum = db.query(func.sum(WageRecordModel.estimated_wage)).filter(
            WageRecordModel.organization_id == user.organization_id
        ).scalar()
        estimated_wages = float(wage_sum) if wage_sum is not None else float(present_count * 400.0)

        # 7. Active Session
        active_sess = db.query(AttendanceSession).filter(
            AttendanceSession.organization_id == user.organization_id,
            AttendanceSession.status == SessionStatus.OPEN.value
        ).first()

        active_session_data = None
        if active_sess:
            active_session_data = {
                'id': active_sess.id,
                'session_type': active_sess.session_type,
                'status': active_sess.status,
                'worksite_name': active_sess.worksite.name if active_sess.worksite else "Unknown",
                'actual_start': active_sess.actual_start.isoformat() if active_sess.actual_start else None
            }

        # 8. Today's check-in timeline (last 5 check-ins)
        recent_checkins = db.query(Attendance).filter(
            Attendance.organization_id == user.organization_id
        ).order_by(Attendance.check_in_at.desc()).limit(5).all()

        timeline = [
            {
                'id': att.id,
                'worker_name': att.worker.full_name if att.worker else "Unknown",
                'time': att.check_in_at.isoformat() if att.check_in_at else None,
                'verification_method': att.verification_method
            }
            for att in recent_checkins
        ]

        # 9. Integrity Alerts List
        alerts = db.query(IntegrityAlertModel).order_by(IntegrityAlertModel.created_at.desc()).limit(5).all()
        alerts_list = [
            {
                'id': a.id,
                'worker_id': a.worker_id,
                'alert_type': a.alert_type,
                'message': a.message,
                'severity': a.severity,
                'created_at': a.created_at.isoformat()
            }
            for a in alerts
        ]

        return JSONResponse({
            'workers_today': workers_count,
            'present': present_count,
            'absent': absent_count,
            'pending_review': pending_count,
            'integrity_alerts': alerts_count,
            'estimated_wages': estimated_wages,
            'active_session': active_session_data,
            'timeline': timeline,
            'alerts': alerts_list
        })
    finally:
        db.close()


async def worker_dashboard_endpoint(request: Request) -> JSONResponse:
    auth_result, error_response = _require_auth(request)
    if error_response:
        return error_response
    user, db = auth_result

    try:
        from sqlalchemy import func
        from backend.app.models import WorkerModel, Attendance, WageRecordModel, AttendanceSession
        
        # Enforce worker identity verification
        worker = db.query(WorkerModel).filter(
            WorkerModel.organization_id == user.organization_id,
            (WorkerModel.phone == user.phone) | (WorkerModel.name == user.name)
        ).first()

        if not worker:
            return JSONResponse({
                'attendance_pct': 0.0,
                'days_present': 0,
                'hours_worked': 0.0,
                'estimated_wages': 0.0,
                'biometric_enrollment_status': 'NOT_STARTED',
                'history': []
            })

        # Calculate metrics
        days_present = db.query(func.count(Attendance.id)).filter(
            Attendance.worker_id == worker.id,
            Attendance.status == AttendanceStatus.PRESENT.value
        ).scalar() or 0

        total_sessions = db.query(func.count(AttendanceSession.id)).filter(
            AttendanceSession.worksite_id == worker.worksite_id,
            AttendanceSession.status == SessionStatus.CLOSED.value
        ).scalar() or 0

        attendance_pct = 100.0 if total_sessions == 0 else min(100.0, (days_present / total_sessions) * 100.0)

        # Hours worked
        all_attendance = db.query(Attendance).filter(Attendance.worker_id == worker.id).all()
        total_seconds = 0.0
        for att in all_attendance:
            if att.check_in_at and att.check_out_at:
                diff = (att.check_out_at - att.check_in_at).total_seconds()
                # Subtract break duration
                if att.break_start and att.break_end:
                    b_diff = (att.break_end - att.break_start).total_seconds()
                    if b_diff > 0:
                        diff -= b_diff
                if diff > 0:
                    total_seconds += diff
        hours_worked = round(total_seconds / 3600.0, 1)

        # Wages
        wages_val = db.query(func.sum(WageRecordModel.estimated_wage)).filter(
            WageRecordModel.worker_id == str(worker.id)
        ).scalar()
        estimated_wages = float(wages_val) if wages_val is not None else float(days_present * 400.0)

        # History list
        history = [
            {
                'id': att.id,
                'date': att.session.date.isoformat() if (att.session and att.session.date) else None,
                'session_type': att.session.session_type if att.session else "Unknown",
                'check_in_at': att.check_in_at.isoformat() if att.check_in_at else None,
                'check_out_at': att.check_out_at.isoformat() if att.check_out_at else None,
                'status': att.status,
                'verification_method': att.verification_method,
            }
            for att in all_attendance
        ]

        return JSONResponse({
            'attendance_pct': attendance_pct,
            'days_present': days_present,
            'hours_worked': hours_worked,
            'estimated_wages': estimated_wages,
            'biometric_enrollment_status': worker.biometric_enrollment_status,
            'history': history
        })
    finally:
        db.close()
