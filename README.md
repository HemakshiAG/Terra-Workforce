# Terra Workforce

Terra Workforce is a polished, offline-first AI workforce attendance and wage-integrity platform for rural worksites.

## What is included
- Polished dark agricultural-tech landing experience
- Dashboard, attendance, workers, integrity, wages, reports, audit, and settings screens
- Offline-first UI state and sync-aware context for the app shell
- FastAPI demo backend with authentication, attendance, and sync-queue flows
- Tests for authentication, duplicate attendance prevention, low-confidence review, and sync idempotency

## Run the frontend
```bash
cd frontend
npm install
npm run dev
```

## Run the backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Test the API
```bash
pytest backend/tests/test_api.py
```
