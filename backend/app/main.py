from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Route


class DemoHTTPException(Exception):
    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


# In-memory demo state for hackathon-grade prototype
workers_store: list[dict[str, Any]] = []
attendance_store: list[dict[str, Any]] = []
sync_queue_store: list[dict[str, Any]] = []


def _make_idempotency_key(payload: dict[str, Any]) -> str:
    return str(hash(f"{payload.get('worker_id')}-{payload.get('worksite_id')}-{payload.get('event_type')}"))


def login(payload: dict[str, Any]) -> dict[str, str]:
    username = payload.get("username")
    password = payload.get("password")
    if username == "ananya" and password == "terra-2026":
        return {
            "access_token": "demo-token",
            "token_type": "bearer",
        }
    raise DemoHTTPException(status_code=401, detail="Invalid credentials")


def register_worker(payload: dict[str, Any]) -> dict[str, Any]:
    worker_id = payload.get("worker_id")
    if any(worker["worker_id"] == worker_id for worker in workers_store):
        raise DemoHTTPException(status_code=409, detail="Worker already exists")
    worker = {
        "worker_id": worker_id,
        "name": payload.get("name", "Unknown Worker"),
        "worksite_id": payload.get("worksite_id"),
        "latitude": payload.get("latitude", 0.0),
        "longitude": payload.get("longitude", 0.0),
        "registered_at": datetime.now(timezone.utc).isoformat(),
    }
    workers_store.append(worker)
    return worker


def list_workers() -> list[dict[str, Any]]:
    return workers_store


def verify_attendance(payload: dict[str, Any]) -> dict[str, Any]:
    worker = next((item for item in workers_store if item["worker_id"] == payload.get("worker_id")), None)
    if not worker:
        raise DemoHTTPException(status_code=404, detail="Worker not found")

    geofence_distance = abs(float(payload.get("latitude", 0.0)) - float(worker.get("latitude", 0.0))) + abs(float(payload.get("longitude", 0.0)) - float(worker.get("longitude", 0.0)))
    geofence_status = "inside" if geofence_distance <= 0.01 else "outside"
    verification_status = "verified" if payload.get("face_match_confidence", 0.0) >= 0.8 and payload.get("liveness_status") == "passed" and geofence_status == "inside" else "review"

    return {
        "worker_id": payload.get("worker_id"),
        "worker_name": worker.get("name"),
        "verification_status": verification_status,
        "face_match_confidence": payload.get("face_match_confidence", 0.0),
        "liveness_status": payload.get("liveness_status", "passed"),
        "latitude": payload.get("latitude"),
        "longitude": payload.get("longitude"),
        "geofence_distance": geofence_distance,
        "geofence_status": geofence_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def create_attendance(payload: dict[str, Any]) -> dict[str, Any]:
    worker_id = payload.get("worker_id")
    worksite_id = payload.get("worksite_id")
    confidence = float(payload.get("face_match_confidence", payload.get("confidence", 0)))
    liveness = payload.get("liveness_status", payload.get("liveness", "passed"))
    gps_status = payload.get("geofence_status", payload.get("gps_status", "inside"))
    if gps_status in {"on_site", "inside"}:
        gps_status = "inside"
    if gps_status in {"outside_worksite", "outside"}:
        gps_status = "outside"
    event_type = payload.get("event_type", "CHECK_IN")

    existing = [record for record in attendance_store if record["worker_id"] == worker_id and record["event_type"] == event_type]
    if existing:
        raise DemoHTTPException(status_code=409, detail="Already checked in today")

    status_value = "accepted"
    review_reasons: list[str] = []

    if confidence < 0.8:
        status_value = "manual_review"
        review_reasons.append("low_confidence")
    if liveness == "failed":
        status_value = "rejected"
        review_reasons.append("liveness_failed")
    if gps_status == "outside":
        status_value = "manual_review"
        review_reasons.append("geofence_violation")

    record = {
        "id": str(uuid4()),
        "worker_id": worker_id,
        "worksite_id": worksite_id,
        "timestamp": payload.get("timestamp") or datetime.now(timezone.utc).isoformat(),
        "verification_status": payload.get("verification_status", "verified"),
        "face_match_confidence": confidence,
        "liveness_status": liveness,
        "latitude": payload.get("latitude"),
        "longitude": payload.get("longitude"),
        "geofence_distance": payload.get("geofence_distance", 0.0),
        "geofence_status": gps_status,
        "attendance_status": payload.get("attendance_status", "marked"),
        "event_type": event_type,
        "status": status_value,
        "review_reasons": review_reasons,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    attendance_store.append(record)
    return record


def get_today_attendance() -> list[dict[str, Any]]:
    return attendance_store


def get_dashboard_stats() -> dict[str, Any]:
    verified = sum(1 for item in attendance_store if item.get("status") == "accepted")
    review = sum(1 for item in attendance_store if item.get("status") == "manual_review")
    return {
        "workers": len(workers_store),
        "attendance_today": len(attendance_store),
        "verified": verified,
        "review": review,
    }


def sync_queue(payload: dict[str, Any]) -> dict[str, Any]:
    event_type = payload.get("event_type", "attendance")
    body = payload.get("payload", {})
    key = _make_idempotency_key(body)
    existing = next((item for item in sync_queue_store if item["idempotency_key"] == key), None)
    if existing:
        return {
            "id": existing["id"],
            "idempotency_key": existing["idempotency_key"],
            "status": "queued",
        }

    item = {
        "id": str(uuid4()),
        "idempotency_key": key,
        "event_type": event_type,
        "payload": body,
        "status": "pending",
    }
    sync_queue_store.append(item)
    return item


async def health(request: Request) -> JSONResponse:
    return JSONResponse({"status": "ok"})


async def login_endpoint(request: Request) -> JSONResponse:
    payload = await request.json()
    try:
        return JSONResponse(login(payload))
    except DemoHTTPException as exc:
        return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)


async def register_worker_endpoint(request: Request) -> JSONResponse:
    payload = await request.json()
    try:
        return JSONResponse(register_worker(payload))
    except DemoHTTPException as exc:
        return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)


async def workers_endpoint(request: Request) -> JSONResponse:
    return JSONResponse(list_workers())


async def verification_endpoint(request: Request) -> JSONResponse:
    payload = await request.json()
    try:
        return JSONResponse(verify_attendance(payload))
    except DemoHTTPException as exc:
        return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)


async def face_enrollment_endpoint(request: Request) -> JSONResponse:
    payload = await request.json()
    worker = next((item for item in workers_store if item["worker_id"] == payload.get("worker_id")), None)
    if not worker:
        return JSONResponse({"detail": "Worker not found"}, status_code=404)
    worker["face_template"] = payload.get("face_template", "demo-template")
    return JSONResponse({"worker_id": payload.get("worker_id"), "status": "enrolled"})


async def create_attendance_endpoint(request: Request) -> JSONResponse:
    payload = await request.json()
    try:
        return JSONResponse(create_attendance(payload))
    except DemoHTTPException as exc:
        return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)


async def today_attendance_endpoint(request: Request) -> JSONResponse:
    return JSONResponse(get_today_attendance())


async def dashboard_stats_endpoint(request: Request) -> JSONResponse:
    return JSONResponse(get_dashboard_stats())


async def sync_queue_endpoint(request: Request) -> JSONResponse:
    payload = await request.json()
    return JSONResponse(sync_queue(payload))


app = Starlette(
    routes=[
        Route("/health", health, methods=["GET"]),
        Route("/api/login", login_endpoint, methods=["POST"]),
        Route("/api/workers/register", register_worker_endpoint, methods=["POST"]),
        Route("/api/workers", workers_endpoint, methods=["GET"]),
        Route("/api/verification", verification_endpoint, methods=["POST"]),
        Route("/api/workers/enroll", face_enrollment_endpoint, methods=["POST"]),
        Route("/api/attendance", create_attendance_endpoint, methods=["POST"]),
        Route("/api/attendance/today", today_attendance_endpoint, methods=["GET"]),
        Route("/api/dashboard/stats", dashboard_stats_endpoint, methods=["GET"]),
        Route("/api/sync/queue", sync_queue_endpoint, methods=["POST"]),
    ],
    middleware=[
        Middleware(
            CORSMiddleware,
            allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    ],
)
