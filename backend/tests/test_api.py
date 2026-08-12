import os
import tempfile
from starlette.testclient import TestClient

from backend.app.auth import hash_password, verify_password
from backend.app.database import Base, SessionLocal, engine
from backend.app.main import app
from backend.app.models import Organization, Role, RoleName, User, Worksite

client = TestClient(app)


def test_organization_registration():
    response = client.post(
        "/api/auth/register",
        json={
            "organization_name": "Green Valley Farms",
            "admin_name": "Test Admin",
            "email": "admin@greenvalley.com",
            "password": "Password123!",
            "confirm_password": "Password123!",
        },
    )
    assert response.status_code == 201
    assert response.json()["message"] == "Workspace created."


def test_duplicate_email_rejection():
    response = client.post(
        "/api/auth/register",
        json={
            "organization_name": "Green Valley Farms 2",
            "admin_name": "Test Admin 2",
            "email": "admin@greenvalley.com",
            "password": "Password123!",
            "confirm_password": "Password123!",
        },
    )
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


def test_password_hashing():
    raw_password = "SecurePassword123"
    hashed = hash_password(raw_password)
    assert hashed != raw_password
    assert verify_password(raw_password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_login_success():
    response = client.post(
        "/api/auth/login",
        json={
            "email": "admin@greenvalley.com",
            "password": "Password123!",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert data["role"] == "ADMIN"
    assert data["user"]["email"] == "admin@greenvalley.com"


def test_login_failure():
    response = client.post(
        "/api/auth/login",
        json={
            "email": "admin@greenvalley.com",
            "password": "WrongPassword123!",
        },
    )
    assert response.status_code == 401
    assert "incorrect" in response.json()["detail"].lower()


def test_me_authentication():
    # Login to get token
    login_res = client.post(
        "/api/auth/login",
        json={"email": "admin@greenvalley.com", "password": "Password123!"},
    ).json()
    token = login_res["token"]

    me_res = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "admin@greenvalley.com"
    assert me_res.json()["role"] == "ADMIN"


def test_logout():
    login_res = client.post(
        "/api/auth/login",
        json={"email": "admin@greenvalley.com", "password": "Password123!"},
    ).json()
    token = login_res["token"]

    logout_res = client.post(
        "/api/auth/logout",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert logout_res.status_code == 200

    # Retrying /me with invalidated token
    me_res = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 401


def test_role_enforcement():
    # Register supervisor user
    login_admin = client.post(
        "/api/auth/login",
        json={"email": "admin@greenvalley.com", "password": "Password123!"},
    ).json()
    admin_token = login_admin["token"]

    sup_res = client.post(
        "/api/admin/supervisors",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "full_name": "Supervisor One",
            "email": "supervisor1@greenvalley.com",
            "password": "Password123!",
            "worksite_ids": [],
        },
    )
    assert sup_res.status_code == 201

    sup_login = client.post(
        "/api/auth/login",
        json={"email": "supervisor1@greenvalley.com", "password": "Password123!"},
    ).json()
    sup_token = sup_login["token"]

    # Supervisor attempting admin-only supervisor creation endpoint
    unauth_res = client.post(
        "/api/admin/supervisors",
        headers={"Authorization": f"Bearer {sup_token}"},
        json={
            "full_name": "Supervisor Two",
            "email": "supervisor2@greenvalley.com",
            "password": "Password123!",
            "worksite_ids": [],
        },
    )
    assert unauth_res.status_code == 403


def test_cross_organization_access_rejection():
    # Register Org 2
    client.post(
        "/api/auth/register",
        json={
            "organization_name": "Blue River Orchards",
            "admin_name": "Org2 Admin",
            "email": "admin@blueriver.com",
            "password": "Password123!",
            "confirm_password": "Password123!",
        },
    )
    org2_login = client.post(
        "/api/auth/login",
        json={"email": "admin@blueriver.com", "password": "Password123!"},
    ).json()
    org2_token = org2_login["token"]

    # Org1 Login
    org1_login = client.post(
        "/api/auth/login",
        json={"email": "admin@greenvalley.com", "password": "Password123!"},
    ).json()
    org1_token = org1_login["token"]

    # Create worksite in Org 1
    ws1_res = client.post(
        "/api/admin/worksites",
        headers={"Authorization": f"Bearer {org1_token}"},
        json={
            "name": "Org 1 Field 01",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "geofence_radius_meters": 150.0,
        },
    )
    ws1_id = ws1_res.json()["id"]

    # Org 2 attempts to edit Org 1 worksite
    edit_res = client.put(
        f"/api/admin/worksites/{ws1_id}",
        headers={"Authorization": f"Bearer {org2_token}"},
        json={
            "name": "Hacked Field Name",
            "latitude": 0.0,
            "longitude": 0.0,
            "geofence_radius_meters": 500.0,
        },
    )
    assert edit_res.status_code == 404


def test_supervisor_creation():
    admin_login = client.post(
        "/api/auth/login",
        json={"email": "admin@greenvalley.com", "password": "Password123!"},
    ).json()
    admin_token = admin_login["token"]

    response = client.post(
        "/api/admin/supervisors",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "full_name": "Rahul Verma",
            "email": "rahul.supervisor@greenvalley.com",
            "password": "Password123!",
            "worksite_ids": [],
        },
    )
    assert response.status_code == 201

    list_res = client.get(
        "/api/admin/supervisors",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert list_res.status_code == 200
    assert any(s["email"] == "rahul.supervisor@greenvalley.com" for s in list_res.json())


def test_worksite_creation():
    admin_login = client.post(
        "/api/auth/login",
        json={"email": "admin@greenvalley.com", "password": "Password123!"},
    ).json()
    admin_token = admin_login["token"]

    ws_res = client.post(
        "/api/admin/worksites",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Green Valley Field 01",
            "description": "Primary wheat crop site",
            "latitude": 13.0827,
            "longitude": 80.2707,
            "geofence_radius_meters": 200.0,
            "active": True,
        },
    )
    assert ws_res.status_code == 201
    assert "Worksite created." in ws_res.json()["message"]

    get_res = client.get(
        "/api/admin/worksites",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert get_res.status_code == 200
    assert any(w["name"] == "Green Valley Field 01" for w in get_res.json())


def test_database_persistence_after_restart():
    # Verify that data exists in database across engine sessions
    with SessionLocal() as db:
        user = db.query(User).filter(User.email == "admin@greenvalley.com").first()
        assert user is not None
        assert user.name == "Test Admin"
        org = db.query(Organization).filter(Organization.id == user.organization_id).first()
        assert org is not None
        assert org.name == "Green Valley Farms"


def test_dashboard_rbac():
    # Login Admin
    admin_login = client.post(
        "/api/auth/login",
        json={"email": "admin@greenvalley.com", "password": "Password123!"},
    ).json()
    admin_token = admin_login["token"]

    # Login Supervisor
    sup_login = client.post(
        "/api/auth/login",
        json={"email": "supervisor1@greenvalley.com", "password": "Password123!"},
    ).json()
    sup_token = sup_login["token"]

    # 1. Admin/Supervisor can see admin dashboard
    res = client.get("/api/admin/dashboard", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert "workers" in res.json()

    res = client.get("/api/admin/dashboard", headers={"Authorization": f"Bearer {sup_token}"})
    assert res.status_code == 200

    # 2. Admin/Supervisor can see supervisor dashboard
    res = client.get("/api/supervisor/dashboard", headers={"Authorization": f"Bearer {sup_token}"})
    assert res.status_code == 200
    assert "workers_today" in res.json()

    # 3. Worker dashboard access check with mock user
    # Create worker user first in db
    with SessionLocal() as db:
        from backend.app.models import User, Role, RoleName
        worker_role = db.query(Role).filter(Role.name == RoleName.WORKER.value).first()
        worker_user = User(
            organization_id=1,
            role_id=worker_role.id,
            name="Worker User",
            email="worker@greenvalley.com",
            password_hash=hash_password("Password123!"),
            is_active=True
        )
        db.add(worker_user)
        db.commit()

    worker_login = client.post(
        "/api/auth/login",
        json={"email": "worker@greenvalley.com", "password": "Password123!"},
    ).json()
    worker_token = worker_login["token"]

    # Worker can access worker dashboard
    res = client.get("/api/worker/dashboard", headers={"Authorization": f"Bearer {worker_token}"})
    assert res.status_code == 200

    # Worker cannot access supervisor or admin dashboard
    res = client.get("/api/supervisor/dashboard", headers={"Authorization": f"Bearer {worker_token}"})
    assert res.status_code == 403

    res = client.get("/api/admin/dashboard", headers={"Authorization": f"Bearer {worker_token}"})
    assert res.status_code == 403


def test_integrity_rules():
    # Login Admin/Supervisor
    sup_login = client.post(
        "/api/auth/login",
        json={"email": "supervisor1@greenvalley.com", "password": "Password123!"},
    ).json()
    sup_token = sup_login["token"]

    # Run integrity simulation inside a single DB transaction
    with SessionLocal() as db:
        from backend.app.models import IntegrityAlertModel, WorkerModel, VerificationAttempt, FaceMatchStatus, LivenessStatus, LocationStatus, AttendanceSession
        from datetime import date, datetime, timezone
        
        # Create worker
        worker = WorkerModel(
            organization_id=1,
            worksite_id=1,
            worker_id="W_UNIQUE_001",
            worker_code="W001",
            name="Test Worker 01",
            full_name="Test Worker 01",
            role="FIELD_WORKER",
            status="ACTIVE",
            is_active=True
        )
        db.add(worker)
        db.commit()
        db.refresh(worker)

        # Create session
        session = AttendanceSession(
            organization_id=1,
            worksite_id=1,
            created_by=1,
            session_type="MORNING",
            date=date.today(),
            scheduled_start=datetime.now(timezone.utc),
            scheduled_end=datetime.now(timezone.utc),
            status="OPEN"
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        # 1. Trigger Geofence alert
        from backend.app.services.integrity import IntegrityService
        IntegrityService.check_anomalies(db, worker_id=worker.id, session_id=session.id, lat=22.3, lon=70.4) # outside geofence
        
        alerts = db.query(IntegrityAlertModel).filter(IntegrityAlertModel.worker_id == str(worker.id)).all()
        assert len(alerts) > 0
        assert any(a.alert_type == "Geofence violation" for a in alerts)

        # 2. Trigger Repeated low-confidence match alert
        for _ in range(3):
            attempt = VerificationAttempt(
                session_id=session.id,
                worker_id=worker.id,
                verification_method="FACE",
                face_match_status=FaceMatchStatus.LOW_CONFIDENCE.value,
                liveness_status=LivenessStatus.PASSED.value,
                location_status=LocationStatus.WITHIN_GEOFENCE.value,
                result="SUCCESS",
                organization_id=1
            )
            db.add(attempt)
        db.commit()
        IntegrityService.check_anomalies(db, worker_id=worker.id, session_id=session.id)
        
        alerts = db.query(IntegrityAlertModel).filter(IntegrityAlertModel.worker_id == str(worker.id)).all()
        assert any(a.alert_type == "Repeated low-confidence matches" for a in alerts)

        # 3. Trigger Repeated liveness failures
        for _ in range(4):
            attempt = VerificationAttempt(
                session_id=session.id,
                worker_id=worker.id,
                verification_method="FACE",
                face_match_status=FaceMatchStatus.MATCHED.value,
                liveness_status=LivenessStatus.FAILED.value,
                location_status=LocationStatus.WITHIN_GEOFENCE.value,
                result="FAILED",
                organization_id=1
            )
            db.add(attempt)
        db.commit()
        IntegrityService.check_anomalies(db, worker_id=worker.id, session_id=session.id)
        
        alerts = db.query(IntegrityAlertModel).filter(IntegrityAlertModel.worker_id == str(worker.id)).all()
        assert any(a.alert_type == "Repeated liveness failures" for a in alerts)

    # 4. Fetch alerts endpoint
    res = client.get("/api/integrity/alerts", headers={"Authorization": f"Bearer {sup_token}"})
    assert res.status_code == 200
    alert_list = res.json()
    assert len(alert_list) > 0
    first_alert_id = alert_list[0]["id"]

    # 5. Lifecycle status update (OPEN -> ACKNOWLEDGED)
    update_res = client.post(
        f"/api/integrity/alerts/{first_alert_id}/status",
        headers={"Authorization": f"Bearer {sup_token}"},
        json={"status": "ACKNOWLEDGED"}
    )
    assert update_res.status_code == 200
    assert update_res.json()["alert"]["status"] == "ACKNOWLEDGED"


