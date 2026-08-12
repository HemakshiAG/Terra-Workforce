import base64
import binascii
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional, Sequence

from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette.requests import Request
from starlette.responses import JSONResponse

from backend.app.auth import get_user_by_session
from backend.app.database import BIOMETRIC_STORAGE_DIR, SessionLocal
from backend.app.models import (
    AuditLogModel,
    BiometricEnrollment,
    BiometricEnrollmentStatus,
    BiometricSample,
    CaptureType,
    Gender,
    IdentityType,
    IdentityVerificationStatus,
    Organization,
    QualityStatus,
    RoleName,
    SupervisorWorksiteAssignment,
    Worksite,
    WorkerModel,
    WorkerRole,
    WorkerStatus,
)
from backend.app.schemas import (
    BiometricEnrollmentStartRequest,
    BiometricSampleCreateRequest,
    WorkerConsentRequest,
    WorkerCreateRequest,
    WorkerIdentityRequest,
    WorkerUpdateRequest,
)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_payload(schema_cls: Any, payload: Any) -> Any:
    if hasattr(schema_cls, 'model_validate'):
        return schema_cls.model_validate(payload)
    return schema_cls.parse_obj(payload)


def _read_bearer_token(request: Request) -> Optional[str]:
    header = request.headers.get('authorization')
    if isinstance(header, str) and header.lower().startswith('bearer '):
        return header.split(' ', 1)[1].strip()
    return None


def _require_auth(request: Request):
    token = _read_bearer_token(request)
    if not token:
        return None, JSONResponse({'detail': 'Authentication required.'}, status_code=401)

    db = SessionLocal()
    user = get_user_by_session(db, token)
    if not user:
        db.close()
        return None, JSONResponse({'detail': 'Session expired or invalid.'}, status_code=401)
    if not user.is_active:
        db.close()
        return None, JSONResponse({'detail': 'Account is disabled.'}, status_code=403)
    return (user, db), None


def _require_role(request: Request, allowed_roles: set[str]):
    auth_result, response = _require_auth(request)
    if response is not None:
        return None, None, response
    user, db = auth_result
    role_str = user.role_ref.name if user.role_ref else 'WORKER'
    if allowed_roles and role_str.upper() not in {role.upper() for role in allowed_roles}:
        db.close()
        return None, None, JSONResponse({'detail': 'You do not have permission to access this workspace.'}, status_code=403)
    return user, db, None


def _audit(db: Session, *, organization_id: int, actor_user_id: int, action: str, target_type: str, target_id: str, metadata: Optional[dict[str, Any]] = None, worker_id: Optional[int] = None) -> None:
    db.add(
        AuditLogModel(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            metadata_json=json.dumps(metadata or {}, ensure_ascii=True),
            worker_id=worker_id,
        )
    )


def _authorized_worksite_ids(db: Session, user) -> set[int]:
    if user.role_ref and user.role_ref.name == RoleName.ADMIN.value:
        rows = db.execute(select(Worksite.id).where(Worksite.organization_id == user.organization_id)).all()
        return {row[0] for row in rows}

    assigned = db.execute(
        select(SupervisorWorksiteAssignment.worksite_id).where(SupervisorWorksiteAssignment.user_id == user.id)
    ).all()
    assigned_ids = {row[0] for row in assigned}
    if assigned_ids:
        return assigned_ids

    rows = db.execute(select(Worksite.id).where(Worksite.organization_id == user.organization_id)).all()
    return {row[0] for row in rows}


def _worksite_allowed(db: Session, user, worksite_id: Optional[int]) -> bool:
    if worksite_id is None:
        return True
    try:
        normalized_worksite_id = int(worksite_id)
    except (TypeError, ValueError):
        return False
    return normalized_worksite_id in _authorized_worksite_ids(db, user)


def _worker_query_for_user(db: Session, user):
    query = select(WorkerModel).where(WorkerModel.organization_id == user.organization_id)
    if user.role_ref and user.role_ref.name == RoleName.SUPERVISOR.value:
        allowed_ids = _authorized_worksite_ids(db, user)
        if allowed_ids:
            query = query.where((WorkerModel.worksite_id.is_(None)) | (WorkerModel.worksite_id.in_(allowed_ids)))
    return query


def _mask_identity_number(identity_number: Optional[str]) -> Optional[str]:
    if not identity_number:
        return None
    stripped = ''.join(ch for ch in identity_number if ch.isalnum())
    if len(stripped) <= 4:
        return 'X' * len(stripped)
    return f"{'X' * max(0, len(stripped) - 4)}{stripped[-4:]}"


def _generate_worker_code(db: Session, organization_id: int) -> str:
    existing = db.execute(
        select(WorkerModel.worker_code).where(WorkerModel.organization_id == organization_id)
    ).scalars().all()
    highest = 0
    for code in existing:
        if not code:
            continue
        parts = str(code).split('-')
        try:
            candidate = int(parts[-1])
        except (ValueError, IndexError):
            continue
        highest = max(highest, candidate)
    return f'TW-W-{highest + 1:04d}'


def _serialize_sample(sample: BiometricSample) -> dict[str, Any]:
    return {
        'id': sample.id,
        'capture_type': sample.capture_type,
        'quality_status': sample.quality_status,
        'created_at': sample.created_at.isoformat() if sample.created_at else None,
    }


def _serialize_enrollment(enrollment: Optional[BiometricEnrollment]) -> Optional[dict[str, Any]]:
    if enrollment is None:
        return None
    return {
        'id': enrollment.id,
        'worker_id': enrollment.worker_id,
        'organization_id': enrollment.organization_id,
        'status': enrollment.status,
        'consent_version': enrollment.consent_version,
        'created_at': enrollment.created_at.isoformat() if enrollment.created_at else None,
        'completed_at': enrollment.completed_at.isoformat() if enrollment.completed_at else None,
        'samples': [_serialize_sample(sample) for sample in enrollment.samples],
    }


def _serialize_worker(worker: WorkerModel, db: Session) -> dict[str, Any]:
    worksite_name = None
    if worker.worksite_id:
        worksite = db.get(Worksite, worker.worksite_id)
        worksite_name = worksite.name if worksite else None

    latest_enrollment = db.execute(
        select(BiometricEnrollment).where(BiometricEnrollment.worker_id == worker.id).order_by(BiometricEnrollment.id.desc())
    ).scalars().first()

    samples_count = 0
    if latest_enrollment:
        sample_rows = db.execute(
            select(BiometricSample).where(BiometricSample.enrollment_id == latest_enrollment.id)
        ).scalars().all()
        samples_count = len(sample_rows)

    return {
        'id': worker.id,
        'organization_id': worker.organization_id,
        'worksite_id': worker.worksite_id,
        'worker_code': worker.worker_code,
        'full_name': worker.full_name,
        'date_of_birth': worker.date_of_birth.isoformat() if worker.date_of_birth else None,
        'gender': worker.gender,
        'phone': worker.phone,
        'address': worker.address,
        'emergency_contact': worker.emergency_contact,
        'role': worker.role,
        'status': worker.status,
        'identity_type': worker.identity_type,
        'identity_number_masked': _mask_identity_number(worker.identity_number),
        'identity_verification_status': worker.identity_verification_status,
        'consent_given': worker.consent_given,
        'consent_timestamp': worker.consent_timestamp.isoformat() if worker.consent_timestamp else None,
        'consent_version': worker.consent_version,
        'biometric_enrollment_status': worker.biometric_enrollment_status,
        'worksite_name': worksite_name,
        'created_at': worker.created_at.isoformat() if worker.created_at else None,
        'updated_at': worker.updated_at.isoformat() if worker.updated_at else None,
        'enrollment': _serialize_enrollment(latest_enrollment),
        'samples_count': samples_count,
    }


def _find_worker_or_respond(db: Session, user, worker_id: int):
    worker = db.get(WorkerModel, worker_id)
    if not worker or worker.organization_id != user.organization_id:
        return None, JSONResponse({'detail': 'Worker not found.'}, status_code=404)
    if user.role_ref and user.role_ref.name == RoleName.SUPERVISOR.value:
        worker_worksite_id = None
        if worker.worksite_id is not None:
            try:
                worker_worksite_id = int(worker.worksite_id)
            except (TypeError, ValueError):
                worker_worksite_id = None
        if not _worksite_allowed(db, user, worker_worksite_id):
            return None, JSONResponse({'detail': 'You do not have permission to access this worker.'}, status_code=403)
    return worker, None


def _validate_worker_code_unique(db: Session, organization_id: int, worker_code: str, exclude_worker_id: Optional[int] = None) -> Optional[JSONResponse]:
    query = select(WorkerModel).where(WorkerModel.organization_id == organization_id, WorkerModel.worker_code == worker_code)
    if exclude_worker_id is not None:
        query = query.where(WorkerModel.id != exclude_worker_id)
    if db.execute(query).scalar_one_or_none():
        return JSONResponse({'detail': 'Worker code already exists in this organization.'}, status_code=409)
    return None


def _save_biometric_sample(enrollment: BiometricEnrollment, capture_type: str, image_data: str) -> str:
    worker_dir = BIOMETRIC_STORAGE_DIR / f'worker-{enrollment.worker_id}' / f'enrollment-{enrollment.id}'
    worker_dir.mkdir(parents=True, exist_ok=True)
    file_path = worker_dir / f'{capture_type.lower()}.png'

    payload = image_data
    if payload.startswith('data:') and ',' in payload:
        payload = payload.split(',', 1)[1]
    raw_bytes = base64.b64decode(payload.encode('utf-8'), validate=False)
    file_path.write_bytes(raw_bytes)
    return str(file_path)


async def workers_list_endpoint(request: Request) -> JSONResponse:
    user, db, error_response = _require_role(request, {'ADMIN', 'SUPERVISOR'})
    if error_response is not None:
        return error_response

    try:
        workers = db.execute(_worker_query_for_user(db, user)).scalars().all()
        rows = [_serialize_worker(worker, db) for worker in workers]
        stats = {
            'total_workers': len(rows),
            'active': sum(1 for worker in rows if worker['status'] == WorkerStatus.ACTIVE.value),
            'pending_enrollment': sum(1 for worker in rows if worker['status'] == WorkerStatus.PENDING_ENROLLMENT.value),
            'inactive': sum(1 for worker in rows if worker['status'] == WorkerStatus.INACTIVE.value),
        }
        return JSONResponse({'workers': rows, 'stats': stats})
    finally:
        db.close()


async def workers_create_endpoint(request: Request) -> JSONResponse:
    user, db, error_response = _require_role(request, {'ADMIN', 'SUPERVISOR'})
    if error_response is not None:
        return error_response

    try:
        payload = await request.json()
        validated = _parse_payload(WorkerCreateRequest, payload)
    except (ValueError, TypeError, ValidationError) as exc:
        db.close()
        return JSONResponse({'detail': str(exc).split('\n')[0]}, status_code=400)

    try:
        if not _worksite_allowed(db, user, validated.worksite_id):
            return JSONResponse({'detail': 'You do not have permission to use that worksite.'}, status_code=403)

        worker_code = validated.worker_code or _generate_worker_code(db, user.organization_id)
        duplicate_error = _validate_worker_code_unique(db, user.organization_id, worker_code)
        if duplicate_error:
            return duplicate_error

        worker = WorkerModel(
            organization_id=user.organization_id,
            worksite_id=validated.worksite_id,
            worker_id=f'ORG-{user.organization_id}-{worker_code}',
            worker_code=worker_code,
            name=validated.full_name.strip(),
            full_name=validated.full_name.strip(),
            date_of_birth=validated.date_of_birth,
            gender=validated.gender.value if validated.gender else None,
            phone=validated.phone.strip() if validated.phone else None,
            address=validated.address.strip() if validated.address else None,
            emergency_contact=validated.emergency_contact.strip() if validated.emergency_contact else None,
            role=validated.role,
            status=WorkerStatus.PENDING_ENROLLMENT.value,
            is_active=False,
            identity_verification_status=IdentityVerificationStatus.PENDING.value,
            consent_given=False,
            biometric_enrollment_status=BiometricEnrollmentStatus.NOT_STARTED.value,
        )
        db.add(worker)
        db.flush()

        _audit(
            db,
            organization_id=user.organization_id,
            actor_user_id=user.id,
            action='WORKER_CREATED',
            target_type='worker',
            target_id=str(worker.id),
            worker_id=worker.id,
            metadata={'worker_code': worker.worker_code, 'worksite_id': worker.worksite_id, 'role': worker.role},
        )
        db.commit()
        return JSONResponse(_serialize_worker(worker, db), status_code=201)
    finally:
        db.close()


async def worker_detail_endpoint(request: Request) -> JSONResponse:
    user, db, error_response = _require_role(request, {'ADMIN', 'SUPERVISOR'})
    if error_response is not None:
        return error_response

    try:
        worker_id = int(request.path_params['worker_id'])
        worker, worker_error = _find_worker_or_respond(db, user, worker_id)
        if worker_error:
            return worker_error
        return JSONResponse(_serialize_worker(worker, db))
    finally:
        db.close()


async def worker_update_endpoint(request: Request) -> JSONResponse:
    user, db, error_response = _require_role(request, {'ADMIN', 'SUPERVISOR'})
    if error_response is not None:
        return error_response

    try:
        worker_id = int(request.path_params['worker_id'])
        worker, worker_error = _find_worker_or_respond(db, user, worker_id)
        if worker_error:
            return worker_error

        payload = await request.json()
        validated = _parse_payload(WorkerUpdateRequest, payload)
    except (ValueError, TypeError, ValidationError) as exc:
        db.close()
        return JSONResponse({'detail': str(exc).split('\n')[0]}, status_code=400)

    try:
        if validated.full_name is not None:
            worker.full_name = validated.full_name.strip()
            worker.name = validated.full_name.strip()
        if validated.phone is not None:
            worker.phone = validated.phone.strip() if validated.phone else None
        if validated.address is not None:
            worker.address = validated.address.strip() if validated.address else None
        if validated.emergency_contact is not None:
            worker.emergency_contact = validated.emergency_contact.strip() if validated.emergency_contact else None
        if validated.worksite_id is not None:
            if not _worksite_allowed(db, user, validated.worksite_id):
                return JSONResponse({'detail': 'You do not have permission to use that worksite.'}, status_code=403)
            worker.worksite_id = validated.worksite_id
        if validated.role is not None:
            worker.role = validated.role
        if validated.status is not None:
            worker.status = validated.status.value
        worker.updated_at = _utc_now()
        _audit(
            db,
            organization_id=user.organization_id,
            actor_user_id=user.id,
            action='WORKER_UPDATED',
            target_type='worker',
            target_id=str(worker.id),
            worker_id=worker.id,
            metadata={'fields': [key for key, value in validated.model_dump().items() if value is not None]},
        )
        db.commit()
        return JSONResponse(_serialize_worker(worker, db))
    finally:
        db.close()


async def worker_delete_endpoint(request: Request) -> JSONResponse:
    user, db, error_response = _require_role(request, {'ADMIN', 'SUPERVISOR'})
    if error_response is not None:
        return error_response

    try:
        worker_id = int(request.path_params['worker_id'])
        worker, worker_error = _find_worker_or_respond(db, user, worker_id)
        if worker_error:
            return worker_error

        worker.status = WorkerStatus.INACTIVE.value
        worker.is_active = False
        worker.updated_at = _utc_now()
        _audit(
            db,
            organization_id=user.organization_id,
            actor_user_id=user.id,
            action='WORKER_DEACTIVATED',
            target_type='worker',
            target_id=str(worker.id),
            worker_id=worker.id,
            metadata={},
        )
        db.commit()
        return JSONResponse({'message': 'Worker deactivated.'})
    finally:
        db.close()


async def worker_identity_endpoint(request: Request) -> JSONResponse:
    user, db, error_response = _require_role(request, {'ADMIN', 'SUPERVISOR'})
    if error_response is not None:
        return error_response

    try:
        worker_id = int(request.path_params['worker_id'])
        worker, worker_error = _find_worker_or_respond(db, user, worker_id)
        if worker_error:
            return worker_error

        payload = await request.json()
        validated = _parse_payload(WorkerIdentityRequest, payload)
    except (ValueError, TypeError, ValidationError) as exc:
        db.close()
        return JSONResponse({'detail': str(exc).split('\n')[0]}, status_code=400)

    try:
        worker.identity_type = validated.identity_type.value
        worker.identity_number = validated.identity_number.strip()
        worker.identity_verification_status = validated.verification_status.value
        worker.updated_at = _utc_now()

        _audit(
            db,
            organization_id=user.organization_id,
            actor_user_id=user.id,
            action='IDENTITY_VERIFICATION_UPDATED',
            target_type='worker',
            target_id=str(worker.id),
            worker_id=worker.id,
            metadata={'identity_type': worker.identity_type, 'verification_status': worker.identity_verification_status, 'manual_review_reason': validated.manual_review_reason},
        )
        db.commit()
        return JSONResponse(_serialize_worker(worker, db))
    finally:
        db.close()


async def worker_consent_endpoint(request: Request) -> JSONResponse:
    user, db, error_response = _require_role(request, {'ADMIN', 'SUPERVISOR'})
    if error_response is not None:
        return error_response

    try:
        worker_id = int(request.path_params['worker_id'])
        worker, worker_error = _find_worker_or_respond(db, user, worker_id)
        if worker_error:
            return worker_error

        payload = await request.json()
        validated = _parse_payload(WorkerConsentRequest, payload)
    except (ValueError, TypeError, ValidationError) as exc:
        db.close()
        return JSONResponse({'detail': str(exc).split('\n')[0]}, status_code=400)

    try:
        if not validated.consent_given:
            return JSONResponse({'detail': 'Biometric consent is required before enrollment.'}, status_code=400)

        worker.consent_given = True
        worker.consent_timestamp = _utc_now()
        worker.consent_version = validated.consent_version
        worker.updated_at = _utc_now()

        _audit(
            db,
            organization_id=user.organization_id,
            actor_user_id=user.id,
            action='BIOMETRIC_CONSENT_RECORDED',
            target_type='worker',
            target_id=str(worker.id),
            worker_id=worker.id,
            metadata={'consent_version': validated.consent_version},
        )
        db.commit()
        return JSONResponse(_serialize_worker(worker, db))
    finally:
        db.close()


def _latest_enrollment_for_worker(db: Session, worker_id: int) -> Optional[BiometricEnrollment]:
    return db.execute(
        select(BiometricEnrollment).where(BiometricEnrollment.worker_id == worker_id).order_by(BiometricEnrollment.id.desc())
    ).scalars().first()


async def enrollment_start_endpoint(request: Request) -> JSONResponse:
    user, db, error_response = _require_role(request, {'ADMIN', 'SUPERVISOR'})
    if error_response is not None:
        return error_response

    try:
        worker_id = int(request.path_params['worker_id'])
        worker, worker_error = _find_worker_or_respond(db, user, worker_id)
        if worker_error:
            return worker_error

        payload = await request.json() if request.method == 'POST' else {}
        validated = _parse_payload(BiometricEnrollmentStartRequest, payload)
    except (ValueError, TypeError, ValidationError) as exc:
        db.close()
        return JSONResponse({'detail': str(exc).split('\n')[0]}, status_code=400)

    try:
        if not worker.consent_given:
            return JSONResponse({'detail': 'Consent is required before biometric enrollment can start.'}, status_code=400)

        enrollment = BiometricEnrollment(
            worker_id=worker.id,
            organization_id=user.organization_id,
            status=BiometricEnrollmentStatus.IN_PROGRESS.value,
            consent_version=validated.consent_version or worker.consent_version,
        )
        db.add(enrollment)
        worker.biometric_enrollment_status = BiometricEnrollmentStatus.IN_PROGRESS.value
        worker.status = WorkerStatus.PENDING_ENROLLMENT.value
        worker.updated_at = _utc_now()

        _audit(
            db,
            organization_id=user.organization_id,
            actor_user_id=user.id,
            action='BIOMETRIC_ENROLLMENT_STARTED',
            target_type='worker',
            target_id=str(worker.id),
            worker_id=worker.id,
            metadata={'consent_version': enrollment.consent_version},
        )
        db.commit()
        db.refresh(enrollment)
        db.refresh(worker)
        return JSONResponse(_serialize_enrollment(enrollment), status_code=201)
    finally:
        db.close()


async def enrollment_samples_endpoint(request: Request) -> JSONResponse:
    user, db, error_response = _require_role(request, {'ADMIN', 'SUPERVISOR'})
    if error_response is not None:
        return error_response

    try:
        worker_id = int(request.path_params['worker_id'])
        worker, worker_error = _find_worker_or_respond(db, user, worker_id)
        if worker_error:
            return worker_error

        payload = await request.json()
        validated = _parse_payload(BiometricSampleCreateRequest, payload)
    except (ValueError, TypeError, ValidationError) as exc:
        db.close()
        return JSONResponse({'detail': str(exc).split('\n')[0]}, status_code=400)

    try:
        enrollment = _latest_enrollment_for_worker(db, worker.id)
        if enrollment is None:
            return JSONResponse({'detail': 'Enrollment has not started.'}, status_code=400)
        if enrollment.status == BiometricEnrollmentStatus.COMPLETED.value:
            return JSONResponse({'detail': 'Enrollment is already completed.'}, status_code=400)

        image_reference = _save_biometric_sample(enrollment, validated.capture_type.value, validated.image_data)
        sample = BiometricSample(
            enrollment_id=enrollment.id,
            capture_type=validated.capture_type.value,
            image_reference=image_reference,
            quality_status=validated.quality_status.value,
        )
        db.add(sample)
        _audit(
            db,
            organization_id=user.organization_id,
            actor_user_id=user.id,
            action='BIOMETRIC_SAMPLE_CAPTURED',
            target_type='worker',
            target_id=str(worker.id),
            worker_id=worker.id,
            metadata={'capture_type': validated.capture_type.value, 'quality_status': validated.quality_status.value},
        )
        db.commit()
        db.refresh(sample)
        return JSONResponse(_serialize_sample(sample), status_code=201)
    finally:
        db.close()


async def enrollment_complete_endpoint(request: Request) -> JSONResponse:
    user, db, error_response = _require_role(request, {'ADMIN', 'SUPERVISOR'})
    if error_response is not None:
        return error_response

    try:
        worker_id = int(request.path_params['worker_id'])
        worker, worker_error = _find_worker_or_respond(db, user, worker_id)
        if worker_error:
            return worker_error

        enrollment = _latest_enrollment_for_worker(db, worker.id)
        if enrollment is None:
            return JSONResponse({'detail': 'Enrollment has not started.'}, status_code=400)
        if not worker.consent_given:
            return JSONResponse({'detail': 'Consent is required before biometric enrollment can complete.'}, status_code=400)

        sample_rows = db.execute(select(BiometricSample).where(BiometricSample.enrollment_id == enrollment.id)).scalars().all()
        required_capture_types = {CaptureType.CENTER.value, CaptureType.LEFT.value, CaptureType.RIGHT.value, CaptureType.NEUTRAL.value, CaptureType.SMILE.value, CaptureType.LIVENESS.value}
        provided_capture_types = {sample.capture_type for sample in sample_rows}
        missing = sorted(required_capture_types - provided_capture_types)
        if missing:
            return JSONResponse({'detail': 'Required enrollment samples are missing.', 'missing_capture_types': missing}, status_code=400)

        enrollment.status = BiometricEnrollmentStatus.COMPLETED.value
        enrollment.completed_at = _utc_now()
        worker.biometric_enrollment_status = BiometricEnrollmentStatus.COMPLETED.value
        worker.status = WorkerStatus.ACTIVE.value
        worker.is_active = True

        # Generate face embedding from CENTER sample
        center_sample = next((s for s in sample_rows if s.capture_type == CaptureType.CENTER.value), None)
        if center_sample:
            try:
                file_path = Path(center_sample.image_reference)
                if file_path.exists():
                    img_bytes = file_path.read_bytes()
                    encoded = base64.b64encode(img_bytes).decode('utf-8')
                    from backend.app.services.recognition import RecognitionService
                    embedding = RecognitionService.generate_embedding(encoded)
                    if embedding:
                        worker.face_template = json.dumps(embedding)
                        # Check duplicate identity similarity
                        active_workers = db.query(WorkerModel).filter(
                            WorkerModel.organization_id == user.organization_id,
                            WorkerModel.id != worker.id,
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
                                
                        matched_id, score = RecognitionService.find_nearest_candidate(embedding, enrolled_workers)
                        if matched_id is not None and score >= 0.85:
                            from backend.app.services.integrity import IntegrityService
                            IntegrityService.create_alert(
                                db,
                                worker_id=str(worker.id),
                                alert_type="Duplicate identity",
                                message="Biometric enrollment resembles an existing worker.",
                                severity="HIGH"
                            )
            except Exception as e:
                pass

        worker.updated_at = _utc_now()

        _audit(
            db,
            organization_id=user.organization_id,
            actor_user_id=user.id,
            action='BIOMETRIC_ENROLLMENT_COMPLETED',
            target_type='worker',
            target_id=str(worker.id),
            worker_id=worker.id,
            metadata={'captured_capture_types': sorted(provided_capture_types)},
        )
        db.commit()
        db.refresh(enrollment)
        return JSONResponse({'message': 'Enrollment complete.', 'worker': _serialize_worker(worker, db), 'enrollment': _serialize_enrollment(enrollment)})
    finally:
        db.close()


async def enrollment_get_endpoint(request: Request) -> JSONResponse:
    user, db, error_response = _require_role(request, {'ADMIN', 'SUPERVISOR'})
    if error_response is not None:
        return error_response

    try:
        worker_id = int(request.path_params['worker_id'])
        worker, worker_error = _find_worker_or_respond(db, user, worker_id)
        if worker_error:
            return worker_error

        enrollment = _latest_enrollment_for_worker(db, worker.id)
        samples = []
        if enrollment:
            sample_rows = db.execute(select(BiometricSample).where(BiometricSample.enrollment_id == enrollment.id)).scalars().all()
            samples = [_serialize_sample(sample) for sample in sample_rows]
        return JSONResponse({'worker': _serialize_worker(worker, db), 'enrollment': _serialize_enrollment(enrollment), 'samples': samples})
    finally:
        db.close()
