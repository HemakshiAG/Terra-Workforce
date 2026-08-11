import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

if __package__ in {None, ''}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from pydantic import ValidationError
from sqlalchemy import select
from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Route

from backend.app.auth import (
    create_session,
    get_role_by_name,
    get_session_token_hash,
    get_user_by_session,
    get_user_for_email,
    hash_password,
    verify_password,
)
from backend.app.database import SessionLocal, init_db
from backend.app.models import (
    AuthSession,
    IntegrityAlertModel,
    Organization,
    Role,
    RoleName,
    SupervisorWorksiteAssignment,
    SyncQueueModel,
    User,
    WorkerModel,
    Worksite,
)
from backend.app.schemas import (
    CreateSupervisorRequest,
    LoginRequest,
    RegisterOrganizationRequest,
    WorksiteCreate,
    WorksiteUpdate,
)
from backend.app.worker_phase2 import (
    enrollment_complete_endpoint,
    enrollment_get_endpoint,
    enrollment_samples_endpoint,
    enrollment_start_endpoint,
    worker_consent_endpoint,
    worker_delete_endpoint,
    worker_detail_endpoint,
    worker_identity_endpoint,
    worker_update_endpoint,
    workers_create_endpoint,
    workers_list_endpoint,
)
from backend.app.routers.attendance import (
    create_session_endpoint,
    get_sessions_endpoint,
    open_session_endpoint,
    close_session_endpoint,
    verify_attendance_endpoint,
    check_in_endpoint,
    check_out_endpoint,
    generate_qr_endpoint,
    verify_qr_endpoint,
)


class DemoHTTPException(Exception):
    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def _parse_payload(schema_cls: Any, payload: Any) -> Any:
    if hasattr(schema_cls, "model_validate"):
        return schema_cls.model_validate(payload)
    return schema_cls.parse_obj(payload)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _read_bearer_token(request: Request) -> Optional[str]:
    header = request.headers.get('authorization')
    if isinstance(header, str) and header.lower().startswith('bearer '):
        return header.split(' ', 1)[1].strip()
    return None


def _serialize_user(user: User, organization: Optional[Organization] = None) -> Dict[str, Any]:
    role_name = user.role_ref.name if user.role_ref else 'WORKER'
    return {
        'id': user.id,
        'name': user.name,
        'email': user.email,
        'role': role_name,
        'organization_id': user.organization_id,
        'organization_name': organization.name if organization else (user.organization.name if user.organization else None),
    }


def _require_auth(request: Request) -> Tuple[User, Any]:
    token = _read_bearer_token(request)
    if not token:
        raise DemoHTTPException(status_code=401, detail='Authentication required.')

    db = SessionLocal()
    user = get_user_by_session(db, token)
    if not user:
        db.close()
        raise DemoHTTPException(status_code=401, detail='Session expired or invalid.')
    if not user.is_active:
        db.close()
        raise DemoHTTPException(status_code=403, detail='Account is disabled.')
    return user, db


def _require_role(request: Request, allowed_roles: Set[str]) -> Tuple[User, Any]:
    user, db = _require_auth(request)
    role_str = user.role_ref.name if user.role_ref else 'WORKER'
    if allowed_roles and role_str.upper() not in {r.upper() for r in allowed_roles}:
        db.close()
        raise DemoHTTPException(status_code=403, detail='You do not have permission to access this workspace.')
    return user, db


# --- Public Auth Endpoints ---

async def health(request: Request) -> JSONResponse:
    return JSONResponse({'status': 'ok'})


async def auth_register_endpoint(request: Request) -> JSONResponse:
    try:
        payload = await request.json()
        validated = _parse_payload(RegisterOrganizationRequest, payload)
    except (ValueError, TypeError, ValidationError) as exc:
        return JSONResponse({'detail': str(exc).split('\n')[0] if isinstance(exc, ValidationError) else str(exc)}, status_code=400)

    with SessionLocal() as db:
        email = validated.email.lower().strip()
        if db.execute(select(User).where(User.email == email)).scalar_one_or_none():
            return JSONResponse({'detail': 'An account with that email already exists.'}, status_code=409)

        if db.execute(select(Organization).where(Organization.name == validated.organization_name.strip())).scalar_one_or_none():
            return JSONResponse({'detail': 'An organization with that name already exists.'}, status_code=409)

        admin_role = get_role_by_name(db, RoleName.ADMIN)
        if admin_role is None:
            return JSONResponse({'detail': 'Admin role is not configured.'}, status_code=500)

        organization = Organization(
            name=validated.organization_name.strip(),
            phone=validated.phone.strip() if validated.phone else None,
        )
        db.add(organization)
        db.flush()

        user = User(
            organization_id=organization.id,
            role_id=admin_role.id,
            name=validated.admin_name.strip(),
            email=email,
            password_hash=hash_password(validated.password),
            phone=validated.phone.strip() if validated.phone else None,
        )
        db.add(user)
        db.commit()
        return JSONResponse({'message': 'Workspace created.'}, status_code=201)


async def auth_login_endpoint(request: Request) -> JSONResponse:
    try:
        payload = await request.json()
        email = payload.get('email', '').lower().strip()
        password = payload.get('password', '')

        if not email or not password:
            return JSONResponse({'detail': 'Email and password are required.'}, status_code=400)

        with SessionLocal() as db:
            user = get_user_for_email(db, email)
            if not user or not verify_password(password, user.password_hash):
                return JSONResponse({'detail': 'Email or password is incorrect.'}, status_code=401)

            if not user.is_active:
                return JSONResponse({'detail': 'Account is disabled.'}, status_code=403)

            token = create_session(db, user)
            org = db.get(Organization, user.organization_id)
            return JSONResponse({
                'token': token,
                'user': _serialize_user(user, org),
                'role': user.role_ref.name if user.role_ref else 'WORKER',
            })
    except Exception as exc:
        return JSONResponse({'detail': str(exc)}, status_code=400)


async def auth_me_endpoint(request: Request) -> JSONResponse:
    try:
        user, db = _require_auth(request)
        try:
            org = db.get(Organization, user.organization_id)
            return JSONResponse(_serialize_user(user, org))
        finally:
            db.close()
    except DemoHTTPException as exc:
        return JSONResponse({'detail': exc.detail}, status_code=exc.status_code)


async def auth_logout_endpoint(request: Request) -> JSONResponse:
    token = _read_bearer_token(request)
    if not token:
        return JSONResponse({'detail': 'Authentication required.'}, status_code=401)

    with SessionLocal() as db:
        session_record = db.execute(select(AuthSession).where(AuthSession.token_hash == get_session_token_hash(token))).scalar_one_or_none()
        if session_record:
            db.delete(session_record)
            db.commit()
        return JSONResponse({'message': 'Logged out successfully.'})


# --- Admin & Workspace Endpoints ---

async def admin_dashboard_endpoint(request: Request) -> JSONResponse:
    try:
        user, db = _require_role(request, {'ADMIN', 'SUPERVISOR'})
    except DemoHTTPException as exc:
        return JSONResponse({'detail': exc.detail}, status_code=exc.status_code)

    try:
        organization = db.get(Organization, user.organization_id)
        supervisors = db.execute(
            select(User).where(User.organization_id == user.organization_id, User.role_ref.has(name=RoleName.SUPERVISOR.value))
        ).scalars().all()
        worksites = db.execute(select(Worksite).where(Worksite.organization_id == user.organization_id)).scalars().all()
        users = db.execute(select(User).where(User.organization_id == user.organization_id)).scalars().all()

        payload = {
            'organization_name': organization.name if organization else None,
            'supervisors': len(supervisors),
            'worksites': len(worksites),
            'users': len(users),
            'role': user.role_ref.name if user.role_ref else 'WORKER',
            'empty_state': 'Your workforce is ready to be set up.' if len(users) <= 1 else None,
        }
        return JSONResponse(payload)
    finally:
        db.close()


async def admin_supervisors_endpoint(request: Request) -> JSONResponse:
    if request.method == 'GET':
        try:
            user, db = _require_role(request, {'ADMIN', 'SUPERVISOR'})
        except DemoHTTPException as exc:
            return JSONResponse({'detail': exc.detail}, status_code=exc.status_code)

        try:
            rows = db.execute(
                select(User).where(User.organization_id == user.organization_id).join(User.role_ref)
            ).scalars().all()
            output = []
            for record in rows:
                if record.role_ref and record.role_ref.name == RoleName.SUPERVISOR.value:
                    assignments = db.execute(
                        select(SupervisorWorksiteAssignment).where(SupervisorWorksiteAssignment.user_id == record.id)
                    ).scalars().all()
                    worksite_ids = [a.worksite_id for a in assignments]
                    output.append({
                        'id': record.id,
                        'name': record.name,
                        'email': record.email,
                        'role': record.role_ref.name,
                        'worksite_ids': worksite_ids,
                    })
            return JSONResponse(output)
        finally:
            db.close()

    # POST create supervisor
    try:
        user, db = _require_role(request, {'ADMIN'})
    except DemoHTTPException as exc:
        return JSONResponse({'detail': exc.detail}, status_code=exc.status_code)

    try:
        payload = await request.json()
        validated = _parse_payload(CreateSupervisorRequest, payload)
    except (ValueError, TypeError, ValidationError) as exc:
        db.close()
        return JSONResponse({'detail': str(exc).split('\n')[0] if isinstance(exc, ValidationError) else str(exc)}, status_code=400)

    try:
        email = validated.email.lower().strip()
        if db.execute(select(User).where(User.email == email)).scalar_one_or_none():
            return JSONResponse({'detail': 'A supervisor with that email already exists.'}, status_code=409)

        role = get_role_by_name(db, RoleName.SUPERVISOR)
        if role is None:
            return JSONResponse({'detail': 'Supervisor role is not configured.'}, status_code=500)

        supervisor = User(
            organization_id=user.organization_id,
            role_id=role.id,
            name=validated.full_name.strip(),
            email=email,
            password_hash=hash_password(validated.password),
        )
        db.add(supervisor)
        db.flush()

        for worksite_id in validated.worksite_ids:
            worksite = db.get(Worksite, worksite_id)
            if worksite and worksite.organization_id == user.organization_id:
                db.add(SupervisorWorksiteAssignment(
                    user_id=supervisor.id,
                    worksite_id=worksite_id,
                    organization_id=user.organization_id
                ))
        db.commit()
        return JSONResponse({'message': 'Supervisor created.'}, status_code=201)
    finally:
        db.close()


async def admin_worksites_endpoint(request: Request) -> JSONResponse:
    try:
        user, db = _require_role(request, {'ADMIN', 'SUPERVISOR'})
    except DemoHTTPException as exc:
        return JSONResponse({'detail': exc.detail}, status_code=exc.status_code)

    try:
        if request.method == 'GET':
            rows = db.execute(
                select(Worksite).where(Worksite.organization_id == user.organization_id)
            ).scalars().all()
            return JSONResponse([
                {
                    'id': r.id,
                    'name': r.name,
                    'description': r.description,
                    'latitude': r.latitude,
                    'longitude': r.longitude,
                    'geofence_radius_meters': r.geofence_radius_meters,
                    'active': r.active,
                    'organization_id': r.organization_id,
                }
                for r in rows
            ])

        if request.method == 'POST':
            if user.role_ref.name != 'ADMIN':
                return JSONResponse({'detail': 'Only administrators can create worksites.'}, status_code=403)
            payload = await request.json()
            validated = _parse_payload(WorksiteCreate, payload)

            ws = Worksite(
                organization_id=user.organization_id,
                name=validated.name.strip(),
                description=validated.description.strip() if validated.description else None,
                latitude=validated.latitude,
                longitude=validated.longitude,
                geofence_radius_meters=validated.geofence_radius_meters,
                active=validated.active,
            )
            db.add(ws)
            db.commit()
            return JSONResponse({'message': 'Worksite created.', 'id': ws.id}, status_code=201)
    finally:
        db.close()


async def admin_worksite_detail_endpoint(request: Request) -> JSONResponse:
    try:
        user, db = _require_role(request, {'ADMIN'})
    except DemoHTTPException as exc:
        return JSONResponse({'detail': exc.detail}, status_code=exc.status_code)

    try:
        worksite_id = int(request.path_params['worksite_id'])
        ws = db.get(Worksite, worksite_id)
        if not ws or ws.organization_id != user.organization_id:
            return JSONResponse({'detail': 'Worksite not found.'}, status_code=404)

        if request.method == 'PUT':
            payload = await request.json()
            validated = _parse_payload(WorksiteUpdate, payload)
            ws.name = validated.name.strip()
            ws.description = validated.description.strip() if validated.description else None
            ws.latitude = validated.latitude
            ws.longitude = validated.longitude
            ws.geofence_radius_meters = validated.geofence_radius_meters
            ws.active = validated.active
            db.commit()
            return JSONResponse({'message': 'Worksite updated.'})
    finally:
        db.close()


async def route_403(request: Request) -> JSONResponse:
    return JSONResponse({'detail': 'Access denied.'}, status_code=403)


init_db()

app = Starlette(
    routes=[
        Route('/health', health, methods=['GET']),
        Route('/api/auth/register', auth_register_endpoint, methods=['POST']),
        Route('/api/register', auth_register_endpoint, methods=['POST']),
        Route('/api/auth/login', auth_login_endpoint, methods=['POST']),
        Route('/api/login', auth_login_endpoint, methods=['POST']),
        Route('/api/auth/me', auth_me_endpoint, methods=['GET']),
        Route('/api/me', auth_me_endpoint, methods=['GET']),
        Route('/api/auth/logout', auth_logout_endpoint, methods=['POST']),
        Route('/api/logout', auth_logout_endpoint, methods=['POST']),
        Route('/api/admin/dashboard', admin_dashboard_endpoint, methods=['GET']),
        Route('/api/admin/supervisors', admin_supervisors_endpoint, methods=['GET', 'POST']),
        Route('/api/admin/worksites', admin_worksites_endpoint, methods=['GET', 'POST']),
        Route('/api/admin/worksites/{worksite_id:int}', admin_worksite_detail_endpoint, methods=['PUT']),
        Route('/api/worksites', admin_worksites_endpoint, methods=['GET', 'POST']),
        Route('/api/workers', workers_list_endpoint, methods=['GET']),
        Route('/api/workers', workers_create_endpoint, methods=['POST']),
        Route('/api/workers/{worker_id:int}', worker_detail_endpoint, methods=['GET']),
        Route('/api/workers/{worker_id:int}', worker_update_endpoint, methods=['PATCH']),
        Route('/api/workers/{worker_id:int}', worker_delete_endpoint, methods=['DELETE']),
        Route('/api/workers/{worker_id:int}/identity', worker_identity_endpoint, methods=['POST']),
        Route('/api/workers/{worker_id:int}/consent', worker_consent_endpoint, methods=['POST']),
        Route('/api/workers/{worker_id:int}/enrollment', enrollment_get_endpoint, methods=['GET']),
        Route('/api/workers/{worker_id:int}/enrollment/start', enrollment_start_endpoint, methods=['POST']),
        Route('/api/workers/{worker_id:int}/enrollment/samples', enrollment_samples_endpoint, methods=['POST']),
        Route('/api/workers/{worker_id:int}/enrollment/complete', enrollment_complete_endpoint, methods=['POST']),
        Route('/api/attendance/sessions', create_session_endpoint, methods=['POST']),
        Route('/api/attendance/sessions', get_sessions_endpoint, methods=['GET']),
        Route('/api/attendance/sessions/{session_id:int}/open', open_session_endpoint, methods=['POST']),
        Route('/api/attendance/sessions/{session_id:int}/close', close_session_endpoint, methods=['POST']),
        Route('/api/attendance/verify', verify_attendance_endpoint, methods=['POST']),
        Route('/api/attendance/check-in', check_in_endpoint, methods=['POST']),
        Route('/api/attendance/check-out', check_out_endpoint, methods=['POST']),
        Route('/api/attendance/qr/generate', generate_qr_endpoint, methods=['POST']),
        Route('/api/attendance/qr/verify', verify_qr_endpoint, methods=['POST']),
        Route('/403', route_403, methods=['GET']),
    ],
    middleware=[
        Middleware(
            CORSMiddleware,
            allow_origin_regex='https?://.*',
            allow_credentials=True,
            allow_methods=['*'],
            allow_headers=['*'],
        )
    ],
)
