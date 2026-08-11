import json
from datetime import datetime, timezone
from typing import Any, Optional

from pydantic import ValidationError
from starlette.requests import Request
from starlette.responses import JSONResponse

from backend.app.database import SessionLocal
from backend.app.models import (
    AttendanceSession, AttemptResult, VerificationMethod, 
    AttendanceStatus, FaceMatchStatus, LivenessStatus, LocationStatus, RoleName
)
from backend.app.schemas_attendance import (
    AttendanceSessionCreate, VerificationAttemptRequest, 
    CheckInRequest, CheckOutRequest, QRGenerateRequest, QRVerifyRequest
)
from backend.app.services.attendance import SessionService, AttendanceService
from backend.app.services.verification import QRCodeService
from backend.app.worker_phase2 import _require_auth, _require_role, _parse_payload, _utc_now


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
    auth_result, _ = _require_auth(request)
    if not auth_result:
        # allow public access if no auth for kiosk, but let's assume auth is needed
        pass
    
    try:
        db = SessionLocal()
        payload = await request.json()
        validated = _parse_payload(VerificationAttemptRequest, payload)
    except Exception as exc:
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
        
        from backend.app.models import VerificationAttempt
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
