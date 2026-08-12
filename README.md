# Terra Workforce

Terra Workforce is a polished, offline-first, AI-powered workforce attendance and wage-integrity platform tailored for rural worksites (e.g., agricultural, construction, or public-works projects). The platform is designed to verify the right worker at the right worksite at the right time—even under conditions of zero internet connectivity.

---

## 📖 Table of Contents

- [Overview & Vision](#-overview--vision)
- [Key Features](#-key-features)
- [Architecture & Design](#-architecture--design)
- [Project Codebase Structure](#-project-codebase-structure)
- [REST API Reference](#-rest-api-reference)
- [Database Schema & Models](#-database-schema--models)
- [Local Setup & Running Guide](#-local-setup--running-guide)
  - [Prerequisites](#prerequisites)
  - [Run Backend API Server](#run-backend-api-server)
  - [Run Frontend Web App](#run-frontend-web-app)
- [Testing](#-testing)

---

## 🎯 Overview & Vision

In rural worksites, attendance fraud, proxy check-ins, unauthorized attendance modifications, and lack of cellular connectivity lead to major wage leakages. Terra Workforce solves this by providing a privacy-first, secure, and offline-capable attendance and verification app using:
- Local face biometric templates (not storing raw images).
- Dynamic, assisted liveness / anti-spoofing challenge layers.
- GPS validation & geofencing limits per worksite.
- Secure local SQLite queues that sync with the cloud (FastAPI/Postgres) automatically when a network connection is detected.

The UI is optimized with **rich agricultural aesthetics**—featuring a cinematic, premium dark-theme dashboard designed for high contrast and extreme ease-of-use in rural conditions.

---

## 🌟 Key Features

1. **Offline-First Core Engine**: Local face recognition, liveness checks, GPS geofencing, and attendance recording are performed entirely on-device without needing internet.
2. **Privacy-Preserving Biometrics**: Only stores numeric biometric embeddings/templates securely, complying with biometric consent. Raw face photos are discarded post-enrollment.
3. **Face Verification & Liveness Check**: 
   - **Quality Check**: Rejects blur, poor lighting (too dark/bright), multiple faces, or faces too far from the camera.
   - **Liveness/Anti-Spoofing**: Requires real-time active gestures (blinking, head turns) to prevent photo/screen spoofs.
4. **GPS/Geofencing Validation**: Cross-checks supervisor/worker device GPS coordinate distance against the worksite's allowed geofence boundary.
5. **Conflict-Free Syncing**: Uses an idempotency-based sync queue (`sync_status = PENDING | SYNCED | FAILED`) to sync data back to the central server cleanly.
6. **Wages Estimation Engine**: Computes payable days, hours worked, breaks, and daily rate to present a real-time wage projection.
7. **Integrity Center**: Flags repeated low-confidence attempts, liveness failures, GPS bypasses, rapid check-ins, or frequent supervisor manual adjustments.
8. **Audit Trail**: Maintains append-only records of sensitive actions (biometrics revoked, thresholds updated, manual overrides).

---

## 🏗️ Architecture & Design

### On-Device Flow (Local/Offline)
```
Camera Feed ──► Quality Check ──► Liveness Challenge ──► Face Recognition (FAISS/Embeddings)
                                                                 │
                                                                 ▼
Encrypted SQLite ◄── Sync Queue ◄── Attendance Logging ◄── GPS Geofence Check
```

### Central Cloud Sync Flow (Online)
```
Local Sync Queue ──► REST API Gateway (FastAPI) ──► Org/Worksite/Audit DB (PostgreSQL) ──► Admin Dashboards
```

---

## 📂 Project Codebase Structure

The project is structured into a backend FastAPI workspace and a Next.js frontend application:

```text
Terra-Workforce/
├── backend/                  # FastAPI Backend API Server
│   ├── app/
│   │   ├── app.db            # Local developer SQLite DB
│   │   ├── auth.py           # User passwords & session helpers
│   │   ├── database.py       # SQLAlchemy engine & SQLite configuration
│   │   ├── main.py           # FastAPI app entry point & routes registration
│   │   ├── models.py         # SQLAlchemy schemas for DB models (Audit, Wage, Alerts)
│   │   ├── schemas.py        # Pydantic core models & DTOs
│   │   ├── schemas_attendance.py # Pydantic DTOs specific to attendance
│   │   ├── worker_phase2.py  # Worker enrollment & biometric management endpoints
│   │   ├── routers/
│   │   │   └── attendance.py # Main router handling sessions, check-in/out, breaks, dashboards
│   │   └── services/
│   │       ├── attendance.py # Business logic for check-in rules & session timing
│   │       ├── face_quality.py # Brightness, blur & size check rules
│   │       ├── geofence.py   # Distance calculation helper (Haversine formula)
│   │       ├── integrity.py  # Anomaly & fraudulent pattern detection rules
│   │       ├── liveness.py   # Active & passive liveness challenge engine
│   │       ├── recognition.py # Face verification embeddings matcher
│   │       └── verification.py # Combined multi-factor validation coordinator
│   └── tests/                # Automated pytest Suite
│       ├── conftest.py       # Pytest configurations & fixtures
│       ├── test_api.py       # Integration tests for core endpoints
│       ├── test_attendance.py # Attendance validation logic tests
│       └── test_phase2_workers.py # Biometric enrollment & duplicate detection tests
│
└── frontend/                 # Next.js TypeScript App
    ├── app/                  # Next.js Pages Router & App Router structures
    │   ├── attendance/       # Attendance capture, session, and review pages
    │   ├── audit/            # Read-only audit log views
    │   ├── dashboard/        # Main admin & supervisor KPI widgets
    │   ├── enrollment/       # Biometric template enrollment screens
    │   ├── integrity/        # Integrity Center dashboard & alert managers
    │   ├── login/            # User credentials input page
    │   ├── register/         # Organization signup screen
    │   ├── reports/          # CSV reports download hub
    │   ├── settings/         # System thresholds & worksites management
    │   ├── wages/            # Wage calculation views & exports
    │   ├── workers/          # Workers registry database views
    │   └── worksites/        # Worksite geofencing limits configurations
    ├── components/           # Reusable UI component cards & forms
    └── lib/                  # State hooks, network clients, context, and constants
```

---

## 🔌 REST API Reference

The FastAPI server exposes endpoints grouped below:

### 🔐 Authentication
* `POST /api/auth/register` (or `/api/register`): Register a new organization and admin account.
* `POST /api/auth/login` (or `/api/login`): Log in to receive a secure session token.
* `GET /api/auth/me` (or `/api/me`): Fetch the active user's role and details.
* `POST /api/auth/logout` (or `/api/logout`): Destroy the current session.

### 🏢 Worksite & Supervisor Configuration
* `GET /api/admin/dashboard`: Fetch organization-level summary stats (worksites count, supervisors count).
* `GET | POST /api/admin/supervisors`: Retrieve/Create supervisor accounts.
* `GET | POST /api/admin/worksites`: Retrieve/Create worksites.
* `PUT /api/admin/worksites/{worksite_id}`: Update worksite description, geofence radius (meters), or GPS coordinates.

### 👷 Worker Directory & Biometric Enrollment
* `GET | POST /api/workers`: Retrieve workers or enroll a new worker profile.
* `GET | PATCH | DELETE /api/workers/{worker_id}`: Fetch, update details, or delete a worker.
* `POST /api/workers/{worker_id}/consent`: Record worker biometric storage consent.
* `POST /api/workers/{worker_id}/enrollment/start`: Initialize a new biometric template capture session.
* `POST /api/workers/{worker_id}/enrollment/samples`: Upload captured face samples (Center, Left, Right, Neutral).
* `POST /api/workers/{worker_id}/enrollment/complete`: Conclude capture and generate local embeddings.

### 📅 Attendance & Verification Sessions
* `GET | POST /api/attendance/sessions`: Retrieve or schedule attendance sessions.
* `POST /api/attendance/sessions/{session_id}/open`: Open an attendance session for verification check-ins.
* `POST /api/attendance/sessions/{session_id}/close`: Close an attendance session.
* `POST /api/attendance/verify`: Check face quality, liveness, and verify worker embeddings match.
* `POST /api/attendance/check-in`: Log a worker's check-in timestamp.
* `POST /api/attendance/check-out`: Log a worker's check-out timestamp.
* `POST /api/attendance/break-start` / `POST /api/attendance/break-end`: Record break timelines.
* `POST /api/attendance/manual`: Create a supervisor-corrected attendance log with a mandatory override reason.
* `GET /api/attendance/reviews`: Retrieve low-confidence check-in attempts queued for supervisor manual confirmation.
* `POST /api/attendance/reviews/{attempt_id}`: Approve or Reject a queued check-in attempt.

### ⚠️ Integrity Center & Alerts
* `GET /api/integrity/alerts`: Fetch fraud and anomaly alerts (e.g. repeated low confidence, geofence violations).
* `POST /api/integrity/alerts/{alert_id}/status`: Update alert state (`RESOLVED`, `IGNORED`).

---

## 💾 Database Schema & Models

Data is managed using SQLAlchemy and mapped to the following main tables:
- **`organizations`**: Master org database.
- **`users`**: Login credentials, passwords (hashed), and roles (`ADMIN` | `SUPERVISOR` | `WORKER`).
- **`worksites`**: GPS coordinates (`latitude`, `longitude`) and `geofence_radius_meters`.
- **`workers`**: Worker records, demographics, and biometric enrollment state.
- **`attendance_sessions`**: Session boundaries (e.g., Morning check-in) for specific worksites.
- **`attendances`**: Work records tracking check-in/out times, break durations, and geofencing outcomes.
- **`verification_attempts`**: Raw AI verification tries, logging liveness scores and face match similarity.
- **`integrity_alerts`**: Log of flagged fraudulent behaviors and warnings.
- **`audit_logs`**: Append-only log of modifications to system parameters or manual attendance adjustments.
- **`wage_records`**: Estimated payable days, rates, and wages calculated per worker.
- **`sync_queue`**: Holds actions pending synchronization (`PENDING` | `SYNCED` | `FAILED`) to ensure offline reliability.

---

## 🚀 Local Setup & Running Guide

### Prerequisites
- Python 3.10+ (for backend)
- Node.js 18+ & npm (for frontend)

---

### Run Backend API Server

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   * **Windows (PowerShell)**:
     ```powershell
     python -m venv .venv
     .venv\Scripts\Activate.ps1
     ```
   * **macOS/Linux**:
     ```bash
     python -m venv .venv
     source .venv/bin/activate
     ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   The backend server will run at [http://localhost:8000](http://localhost:8000). Swagger documentation is available at [http://localhost:8000/docs](http://localhost:8000/docs).

---

### Run Frontend Web App

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Launch the Next.js development server:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to [http://localhost:3000](http://localhost:3000).

---

## 🧪 Testing

The codebase comes equipped with backend testing suites to verify API security, logic rules, offline behaviors, and face detection.

To run the full test suite, navigate to the `backend` directory and execute:
```bash
pytest backend/tests/test_api.py backend/tests/test_attendance.py backend/tests/test_phase2_workers.py
```
