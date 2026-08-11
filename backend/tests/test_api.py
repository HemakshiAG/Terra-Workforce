from backend.app.main import create_attendance, list_workers, login, register_worker, sync_queue, verify_attendance


def test_login_returns_token_for_valid_credentials():
    response = login({"username": "ananya", "password": "terra-2026"})
    assert response["access_token"]


def test_duplicate_attendance_is_rejected():
    first = create_attendance(
        {
            "worker_id": "W-101",
            "worksite_id": "WS-001",
            "confidence": 0.96,
            "liveness": "passed",
            "gps_status": "on_site",
            "event_type": "CHECK_IN",
        }
    )
    try:
        create_attendance(
            {
                "worker_id": "W-101",
                "worksite_id": "WS-001",
                "confidence": 0.96,
                "liveness": "passed",
                "gps_status": "on_site",
                "event_type": "CHECK_IN",
            }
        )
    except Exception as exc:
        assert "Already checked in today" in str(exc)
    else:
        raise AssertionError("expected duplicate attendance to fail")
    assert first["status"] == "accepted"


def test_low_confidence_is_sent_to_manual_review():
    response = create_attendance(
        {
            "worker_id": "W-102",
            "worksite_id": "WS-001",
            "confidence": 0.71,
            "liveness": "passed",
            "gps_status": "on_site",
            "event_type": "CHECK_IN",
        }
    )
    assert response["status"] == "manual_review"


def test_outside_geofence_is_flagged_for_review():
    response = create_attendance(
        {
            "worker_id": "W-104",
            "worksite_id": "WS-001",
            "confidence": 0.95,
            "liveness": "passed",
            "gps_status": "outside_worksite",
            "event_type": "CHECK_IN",
        }
    )
    assert response["status"] == "manual_review"


def test_register_worker_and_list_workers():
    worker = register_worker(
        {
            "worker_id": "W-201",
            "name": "Meera Rao",
            "worksite_id": "WS-001",
            "latitude": 12.9716,
            "longitude": 77.5946,
        }
    )
    workers = list_workers()
    assert worker["worker_id"] == "W-201"
    assert any(item["worker_id"] == "W-201" for item in workers)


def test_verification_marks_inside_geofence_as_verified():
    register_worker(
        {
            "worker_id": "W-202",
            "name": "Rohan Das",
            "worksite_id": "WS-001",
            "latitude": 12.9716,
            "longitude": 77.5946,
        }
    )
    result = verify_attendance(
        {
            "worker_id": "W-202",
            "worksite_id": "WS-001",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "face_match_confidence": 0.97,
            "liveness_status": "passed",
        }
    )
    assert result["verification_status"] == "verified"
    assert result["geofence_status"] == "inside"


def test_sync_queue_is_idempotent_for_retry():
    first = sync_queue({"event_type": "attendance", "payload": {"worker_id": "W-103"}})
    second = sync_queue({"event_type": "attendance", "payload": {"worker_id": "W-103"}})
    assert first["idempotency_key"] == second["idempotency_key"]
