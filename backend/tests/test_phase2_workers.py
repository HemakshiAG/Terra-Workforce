from __future__ import annotations

import base64
import sys
from pathlib import Path
from uuid import uuid4

from starlette.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.app.database import SessionLocal
from backend.app.main import app
from backend.app.models import AuditLogModel, WorkerModel


client = TestClient(app)


PNG_DATA = (
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6Z2b8AAAAASUVORK5CYII='
)


def auth_headers(token: str) -> dict[str, str]:
    return {'Authorization': f'Bearer {token}'}


def register_admin(prefix: str) -> dict[str, str]:
    suffix = uuid4().hex[:8]
    email = f'{prefix}.{suffix}@example.com'
    response = client.post(
        '/api/auth/register',
        json={
            'organization_name': f'{prefix.title()} Org {suffix}',
            'admin_name': f'{prefix.title()} Admin',
            'email': email,
            'password': 'Password123!',
            'confirm_password': 'Password123!',
        },
    )
    assert response.status_code == 201

    login = client.post('/api/auth/login', json={'email': email, 'password': 'Password123!'})
    assert login.status_code == 200
    payload = login.json()
    return {
        'token': payload['token'],
        'email': email,
        'organization_name': f'{prefix.title()} Org {suffix}',
    }


def create_worksite(admin_token: str, name: str) -> int:
    response = client.post(
        '/api/admin/worksites',
        headers=auth_headers(admin_token),
        json={
            'name': name,
            'description': 'Field location',
            'latitude': 12.9716,
            'longitude': 77.5946,
            'geofence_radius_meters': 150,
            'active': True,
        },
    )
    assert response.status_code == 201
    return response.json()['id']


def create_supervisor(admin_token: str, email: str, worksite_ids: list[int]) -> str:
    response = client.post(
        '/api/admin/supervisors',
        headers=auth_headers(admin_token),
        json={
            'full_name': 'Supervisor One',
            'email': email,
            'password': 'Password123!',
            'worksite_ids': worksite_ids,
        },
    )
    assert response.status_code == 201
    login = client.post('/api/auth/login', json={'email': email, 'password': 'Password123!'})
    assert login.status_code == 200
    return login.json()['token']


def create_worker(supervisor_token: str, worksite_id: int, code: str | None = None, full_name: str = 'Ravi Kumar') -> dict:
    payload = {
        'full_name': full_name,
        'worker_code': code,
        'date_of_birth': '1990-05-11',
        'gender': 'MALE',
        'phone': '+919876543210',
        'address': 'Village Road',
        'emergency_contact': 'Sita Devi',
        'worksite_id': worksite_id,
        'role': 'WORKER',
    }
    response = client.post('/api/workers', headers=auth_headers(supervisor_token), json=payload)
    assert response.status_code == 201
    return response.json()


def enroll_worker(worker_id: int, token: str, include_liveness: bool = True) -> None:
    consent = client.post(
        f'/api/workers/{worker_id}/consent',
        headers=auth_headers(token),
        json={'consent_given': True, 'consent_version': 'v1'},
    )
    assert consent.status_code == 200

    start = client.post(f'/api/workers/{worker_id}/enrollment/start', headers=auth_headers(token), json={})
    assert start.status_code == 201

    capture_types = ['CENTER', 'LEFT', 'RIGHT', 'NEUTRAL', 'SMILE']
    if include_liveness:
        capture_types.append('LIVENESS')

    for capture_type in capture_types:
        sample = client.post(
            f'/api/workers/{worker_id}/enrollment/samples',
            headers=auth_headers(token),
            json={
                'capture_type': capture_type,
                'quality_status': 'PASS',
                'image_data': f'data:image/png;base64,{PNG_DATA}',
            },
        )
        assert sample.status_code == 201


def test_create_worker():
    admin = register_admin('phase2-worker-create')
    worksite_id = create_worksite(admin['token'], 'Green Valley Field A')
    supervisor_email = f'supervisor.{uuid4().hex[:8]}@example.com'
    supervisor_token = create_supervisor(admin['token'], supervisor_email, [worksite_id])

    worker = create_worker(supervisor_token, worksite_id, code='W-0042')
    assert worker['worker_code'] == 'W-0042'
    assert worker['status'] == 'PENDING_ENROLLMENT'
    assert worker['biometric_enrollment_status'] == 'NOT_STARTED'


def test_duplicate_worker_code_rejection():
    admin = register_admin('phase2-duplicate-code')
    worksite_id = create_worksite(admin['token'], 'Green Valley Field B')
    supervisor_email = f'supervisor.{uuid4().hex[:8]}@example.com'
    supervisor_token = create_supervisor(admin['token'], supervisor_email, [worksite_id])

    create_worker(supervisor_token, worksite_id, code='W-1000', full_name='Worker One')
    response = client.post(
        '/api/workers',
        headers=auth_headers(supervisor_token),
        json={
            'full_name': 'Worker Two',
            'worker_code': 'W-1000',
            'worksite_id': worksite_id,
            'role': 'WORKER',
        },
    )
    assert response.status_code == 409


def test_worker_belongs_to_organization():
    admin = register_admin('phase2-org-check')
    worksite_id = create_worksite(admin['token'], 'Green Valley Field C')
    supervisor_email = f'supervisor.{uuid4().hex[:8]}@example.com'
    supervisor_token = create_supervisor(admin['token'], supervisor_email, [worksite_id])

    worker = create_worker(supervisor_token, worksite_id, code='W-2001', full_name='Organization Check')
    assert worker['organization_id'] != 0

    with SessionLocal() as db:
        worker_row = db.query(WorkerModel).filter(WorkerModel.id == worker['id']).first()
        assert worker_row is not None
        assert worker_row.organization_id == worker['organization_id']


def test_supervisor_cannot_access_another_organization():
    first_admin = register_admin('phase2-org-one')
    first_worksite = create_worksite(first_admin['token'], 'Green Valley Field D')
    first_supervisor_email = f'supervisor.{uuid4().hex[:8]}@example.com'
    first_supervisor_token = create_supervisor(first_admin['token'], first_supervisor_email, [first_worksite])
    worker = create_worker(first_supervisor_token, first_worksite, code='W-3001', full_name='Visible Worker')

    second_admin = register_admin('phase2-org-two')
    second_supervisor_email = f'supervisor.{uuid4().hex[:8]}@example.com'
    second_supervisor_token = create_supervisor(second_admin['token'], second_supervisor_email, [])

    response = client.get(f"/api/workers/{worker['id']}", headers=auth_headers(second_supervisor_token))
    assert response.status_code == 404


def test_supervisor_cannot_access_unauthorized_worksite():
    admin = register_admin('phase2-worksite-access')
    allowed_worksite = create_worksite(admin['token'], 'Green Valley Allowed')
    forbidden_worksite = create_worksite(admin['token'], 'Green Valley Forbidden')
    supervisor_email = f'supervisor.{uuid4().hex[:8]}@example.com'
    supervisor_token = create_supervisor(admin['token'], supervisor_email, [allowed_worksite])

    response = client.post(
        '/api/workers',
        headers=auth_headers(supervisor_token),
        json={
            'full_name': 'Blocked Worker',
            'worker_code': 'W-4001',
            'worksite_id': forbidden_worksite,
            'role': 'WORKER',
        },
    )
    assert response.status_code == 403


def test_identity_update():
    admin = register_admin('phase2-identity')
    worksite_id = create_worksite(admin['token'], 'Green Valley Identity')
    supervisor_email = f'supervisor.{uuid4().hex[:8]}@example.com'
    supervisor_token = create_supervisor(admin['token'], supervisor_email, [worksite_id])
    worker = create_worker(supervisor_token, worksite_id, code='W-5001')

    response = client.post(
        f"/api/workers/{worker['id']}/identity",
        headers=auth_headers(supervisor_token),
        json={
            'identity_type': 'AADHAAR',
            'identity_number': '123412341234',
            'verification_status': 'VERIFIED',
            'manual_review_reason': 'Demo/manual verification',
        },
    )
    assert response.status_code == 200
    worker_detail = client.get(f"/api/workers/{worker['id']}", headers=auth_headers(supervisor_token))
    assert worker_detail.status_code == 200
    data = worker_detail.json()
    assert data['identity_verification_status'] == 'VERIFIED'
    assert data['identity_number_masked'].endswith('1234')


def test_consent_requirement():
    admin = register_admin('phase2-consent')
    worksite_id = create_worksite(admin['token'], 'Green Valley Consent')
    supervisor_email = f'supervisor.{uuid4().hex[:8]}@example.com'
    supervisor_token = create_supervisor(admin['token'], supervisor_email, [worksite_id])
    worker = create_worker(supervisor_token, worksite_id, code='W-6001')

    response = client.post(f"/api/workers/{worker['id']}/enrollment/start", headers=auth_headers(supervisor_token), json={})
    assert response.status_code == 400


def test_enrollment_cannot_complete_without_required_samples():
    admin = register_admin('phase2-missing-samples')
    worksite_id = create_worksite(admin['token'], 'Green Valley Samples')
    supervisor_email = f'supervisor.{uuid4().hex[:8]}@example.com'
    supervisor_token = create_supervisor(admin['token'], supervisor_email, [worksite_id])
    worker = create_worker(supervisor_token, worksite_id, code='W-7001')

    client.post(
        f"/api/workers/{worker['id']}/consent",
        headers=auth_headers(supervisor_token),
        json={'consent_given': True, 'consent_version': 'v1'},
    )
    client.post(f"/api/workers/{worker['id']}/enrollment/start", headers=auth_headers(supervisor_token), json={})
    response = client.post(f"/api/workers/{worker['id']}/enrollment/complete", headers=auth_headers(supervisor_token), json={})
    assert response.status_code == 400


def test_worker_becomes_active_only_after_successful_enrollment():
    admin = register_admin('phase2-complete')
    worksite_id = create_worksite(admin['token'], 'Green Valley Complete')
    supervisor_email = f'supervisor.{uuid4().hex[:8]}@example.com'
    supervisor_token = create_supervisor(admin['token'], supervisor_email, [worksite_id])
    worker = create_worker(supervisor_token, worksite_id, code='W-8001')

    enroll_worker(worker['id'], supervisor_token)
    complete = client.post(f"/api/workers/{worker['id']}/enrollment/complete", headers=auth_headers(supervisor_token), json={})
    assert complete.status_code == 200
    detail = client.get(f"/api/workers/{worker['id']}", headers=auth_headers(supervisor_token))
    assert detail.status_code == 200
    payload = detail.json()
    assert payload['status'] == 'ACTIVE'
    assert payload['biometric_enrollment_status'] == 'COMPLETED'


def test_worker_deactivation():
    admin = register_admin('phase2-deactivate')
    worksite_id = create_worksite(admin['token'], 'Green Valley Deactivate')
    supervisor_email = f'supervisor.{uuid4().hex[:8]}@example.com'
    supervisor_token = create_supervisor(admin['token'], supervisor_email, [worksite_id])
    worker = create_worker(supervisor_token, worksite_id, code='W-9001')

    response = client.delete(f"/api/workers/{worker['id']}", headers=auth_headers(supervisor_token))
    assert response.status_code == 200
    detail = client.get(f"/api/workers/{worker['id']}", headers=auth_headers(supervisor_token))
    assert detail.status_code == 200
    assert detail.json()['status'] == 'INACTIVE'


def test_audit_events_generated():
    admin = register_admin('phase2-audit')
    worksite_id = create_worksite(admin['token'], 'Green Valley Audit')
    supervisor_email = f'supervisor.{uuid4().hex[:8]}@example.com'
    supervisor_token = create_supervisor(admin['token'], supervisor_email, [worksite_id])
    worker = create_worker(supervisor_token, worksite_id, code='W-10001')

    client.post(
        f"/api/workers/{worker['id']}/identity",
        headers=auth_headers(supervisor_token),
        json={
            'identity_type': 'VOTER_ID',
            'identity_number': 'ABCD1234567',
            'verification_status': 'VERIFIED',
            'manual_review_reason': 'Manual check',
        },
    )
    client.post(
        f"/api/workers/{worker['id']}/consent",
        headers=auth_headers(supervisor_token),
        json={'consent_given': True, 'consent_version': 'v1'},
    )

    with SessionLocal() as db:
        events = db.query(AuditLogModel).filter(AuditLogModel.worker_id == worker['id']).all()
        actions = {event.action for event in events}
        assert 'WORKER_CREATED' in actions
        assert 'IDENTITY_VERIFICATION_UPDATED' in actions
        assert 'BIOMETRIC_CONSENT_RECORDED' in actions
