# Terra Workforce --- Winning Hackathon Build Specification

## 0. Product Vision

Build an **offline-first, AI-powered workforce attendance and
wage-integrity platform for rural agricultural/public-work sites**.

The product should not feel like a CRUD attendance app. It should feel
like a polished, production-minded workforce intelligence product that
happens to solve attendance.

### Core promise

> **Verify the right worker, at the right worksite, at the right time
> --- even without internet.**

The system must prevent or reduce: - proxy attendance using another
person's photo/video - accidental face misidentification - attendance
outside the worksite - duplicate worker identities - suspicious
attendance patterns - unauthorized attendance edits - connectivity
failures - opaque wage calculations

The core attendance workflow must work **without internet**. Internet is
used only for optional cloud synchronization, remote access, backups and
notifications.

------------------------------------------------------------------------

# 1. Non-Negotiable Product Principles

1.  **Offline-first**
    -   Recognition, liveness, GPS validation, attendance logging,
        dashboards and local analytics must work without internet.
    -   Records are queued locally and synchronized when connectivity
        returns.
    -   Never make a network request a prerequisite for marking
        attendance.
2.  **Privacy-first biometrics**
    -   Prefer storing face embeddings/templates instead of raw face
        photographs after enrollment.
    -   Encrypt sensitive local and cloud data at rest.
    -   Never log biometric embeddings, raw face images, passwords,
        tokens or sensitive personal data.
    -   Provide consent and biometric enrollment/revocation flows.
3.  **Human-in-the-loop**
    -   Low-confidence matches must go to manual review rather than
        silently becoming attendance.
    -   Supervisors can correct attendance only with a reason.
    -   Every correction is auditable.
4.  **Security by default**
    -   Role-based access control.
    -   Strong password hashing.
    -   Secure sessions/tokens.
    -   Input validation.
    -   Rate limiting.
    -   Strict CORS.
    -   Security headers.
    -   Audit logs.
    -   No secrets in source code.
5.  **Rural usability**
    -   Large touch targets.
    -   High contrast.
    -   Simple language.
    -   Hindi + English architecture, with regional-language support
        extensible.
    -   Low-bandwidth UI.
    -   Clear offline indicator.
    -   Avoid workflows that depend on typing.
6.  **Demo reliability**
    -   Every major feature must have a deterministic demo mode.
    -   Seed realistic workers, attendance and alerts.
    -   Provide clear success/error states.
    -   Never expose mock data as if it were real production data.

------------------------------------------------------------------------

# 2. Recommended Architecture

## Local/offline layer

``` text
Camera
  ↓
OpenCV / camera capture
  ↓
Face detection + quality check
  ↓
Liveness detection
  ↓
InsightFace / ArcFace embedding
  ↓
FAISS/local vector search
  ↓
Confidence decision
  ↓
GPS/geofence validation
  ↓
Attendance engine
  ↓
Encrypted local SQLite/SQLCipher
  ↓
Local dashboard
```

## Cloud layer when internet exists

``` text
Local Sync Queue
  ↓
FastAPI
  ↓
Authentication + authorization
  ↓
Validation
  ↓
PostgreSQL
  ↓
Remote supervisor/admin dashboard
```

## Suggested stack

### Frontend

-   Next.js
-   TypeScript
-   Tailwind CSS
-   shadcn/ui or similarly accessible primitives
-   Recharts for analytics
-   PWA/offline caching
-   Responsive desktop/tablet/mobile layouts

### Backend

-   FastAPI
-   Pydantic
-   SQLAlchemy
-   PostgreSQL for cloud
-   SQLite/SQLCipher for local operation
-   JWT or secure session-based authentication
-   Background synchronization worker

### Computer vision / AI

-   OpenCV
-   InsightFace / ArcFace
-   ONNX Runtime
-   MediaPipe for face landmarks/liveness assistance
-   FAISS for local embedding search

### Infrastructure

-   Docker
-   Environment variables
-   HTTPS in production
-   GitHub Actions for tests/builds
-   Cloud deployment only for synchronization/remote access

------------------------------------------------------------------------

# 3. User Roles

## Admin

Can: - create/manage worksites - create supervisors - manage
organizations - configure attendance rules - configure geofence radius -
configure confidence thresholds - view global audit logs - revoke worker
biometric templates - manage security settings

## Supervisor

Can: - start/end attendance sessions - enroll workers - capture
attendance - review low-confidence matches - correct attendance with
reason - view attendance analytics - view fraud/suspicion alerts -
calculate/export wage records - manage workers belonging to assigned
worksites

## Worker

Can: - view own attendance - view workdays/hours - view estimated
wages - see corrections affecting their record - view biometric
enrollment status - request correction/review

Never expose another worker's personal attendance details to a worker.

------------------------------------------------------------------------

# 4. Core Features

## 4.1 Worker Enrollment

Workflow:

``` text
Supervisor → Add Worker
→ Worker ID/name/basic details
→ Consent confirmation
→ Capture multiple face samples
→ Front / left / right / neutral
→ Quality validation
→ Face embeddings generated locally
→ Duplicate-face check
→ Template encrypted and stored
→ Enrollment completed
```

Requirements: - Do not accept extremely blurry/dark images. - Detect
whether a face is actually present. - Require one clear primary face. -
Generate multiple embeddings or a robust template. - Compare against
existing workers to detect duplicate identity enrollment. - Store
consent timestamp and enrollment operator. - Allow biometric
revocation/re-enrollment.

------------------------------------------------------------------------

# 5. Face Recognition

At attendance:

``` text
Camera frame
→ detect face
→ quality check
→ liveness
→ embedding
→ FAISS search
→ confidence score
→ decision
```

Suggested decision states: - High confidence → auto-accept - Medium
confidence → manual review - Low confidence → reject / ask for recapture

Do not hard-code a fake confidence score. Make thresholds configurable.

Show the supervisor: - worker name - worker ID - confidence - liveness
status - face quality status - timestamp - location status

------------------------------------------------------------------------

# 6. Liveness / Anti-Spoofing

The system must not accept a simple: - printed photo - phone-screen
photo - static image

Implement a practical hackathon-grade liveness layer.

Possible active challenge: - blink - turn head left - turn head right -
look toward a marker

Or passive/assisted liveness using: - facial landmarks - eye aspect
ratio - head pose - temporal movement

UI should show:

``` text
LIVE CHECK
● Look at camera
● Blink
● Turn slightly left
```

Then:

``` text
Liveness verified ✓
```

If failed:

``` text
Liveness failed
Please try again
```

Do not claim military-grade anti-spoofing. Present it honestly as a
prototype liveness layer.

------------------------------------------------------------------------

# 7. Face Quality Detection

Before recognition: - blur detection - brightness/exposure check -
face-size check - occlusion check where practical - multiple-face
detection - extreme pose check

Examples: - `Face too far away` - `Image too dark` -
`Multiple faces detected` - `Face partially occluded` -
`Please move closer`

------------------------------------------------------------------------

# 8. Attendance Engine

Attendance record should contain:

``` text
attendance_id
worker_id
worksite_id
session_id
timestamp
event_type
confidence
liveness_result
gps_latitude
gps_longitude
geofence_result
device_id
verification_method
sync_status
created_at
updated_at
```

Event types: - CHECK_IN - CHECK_OUT - BREAK_START - BREAK_END -
MANUAL_ADJUSTMENT

Prevent accidental duplicate check-ins.

Example rule:

``` text
Already checked in today
→ show current status
→ do not create duplicate attendance
```

------------------------------------------------------------------------

# 9. Work Hours

Calculate: - first check-in - last check-out - break duration - total
working hours - payable workday - overtime where configured

Keep calculations transparent.

Example:

``` text
Check-in       08:12
Break          12:45–13:15
Check-out      17:02
Work duration  8h 20m
Payable day    1.0
```

------------------------------------------------------------------------

# 10. GPS / Geofencing

Each worksite has: - latitude - longitude - allowed radius

At attendance: - capture device GPS - calculate distance from worksite -
accept if inside configured radius - otherwise flag/reject according to
supervisor policy

Show: - `On site` - `Near boundary` - `Outside worksite`

Do not rely on GPS alone for identity.

------------------------------------------------------------------------

# 11. Offline-First Storage

Local database stores: - workers - encrypted biometric templates -
worksites - attendance - sessions - audit events - sync queue - device
configuration

Every cloud-bound record has:

``` text
sync_status = PENDING | SYNCED | FAILED
```

When internet returns:

``` text
PENDING
→ upload
→ server validates
→ server returns canonical ID
→ local record marked SYNCED
```

If upload fails: - retain locally - retry with exponential backoff -
never duplicate records

Use an idempotency key for attendance synchronization.

------------------------------------------------------------------------

# 12. Sync Conflict Handling

If local and cloud records conflict: - never silently overwrite - create
a conflict record - show supervisor/admin review - preserve original
values - preserve timestamps and actors

Example:

``` text
Attendance conflict detected
Local: Present
Cloud: Absent

Review required
```

------------------------------------------------------------------------

# 13. Fraud / Anomaly Detection

Create a separate **Integrity Center**.

Flag examples: - repeated low-confidence matches - repeated liveness
failures - duplicate face enrollment - attendance outside geofence -
unusual rapid check-in/check-out - same worker/device appearing at
incompatible sites - repeated manual attendance edits - unusually high
correction frequency - attendance patterns that differ strongly from
historical behavior

Start with deterministic rules. Optional ML anomaly scoring can be added
later.

Every alert should explain *why* it was generated.

Bad:

``` text
Fraud score: 87
```

Better:

``` text
Suspicious attendance
3 low-confidence attempts in the last 2 days
```

------------------------------------------------------------------------

# 14. Manual Review Queue

Supervisor sees:

``` text
Pending Verification
─────────────────────
Ravi Kumar
Confidence: 89%
Liveness: Passed
Location: On site

[Approve] [Reject] [Recapture]
```

Every decision records: - reviewer - time - reason - original AI
result - final decision

------------------------------------------------------------------------

# 15. Duplicate Identity Detection

During enrollment: - generate embedding - compare against existing
worker templates - if similarity exceeds configured threshold: - flag
possible duplicate - do not automatically merge identities - require
supervisor/admin confirmation

------------------------------------------------------------------------

# 16. Low Attendance Alerts

Configurable threshold.

Example:

``` text
Attendance below 70%
```

Dashboard alert:

``` text
5 workers below attendance threshold
```

Do not label a worker as fraudulent just because attendance is low.

------------------------------------------------------------------------

# 17. Wage Estimation

Inputs: - worker wage/day - payable days - hours where hourly rules
apply - overtime if configured - approved corrections

Output:

``` text
Worker
Payable days
Rate
Estimated wage
```

Clearly label it:

> Estimated wage --- final payment may depend on official payroll rules.

------------------------------------------------------------------------

# 18. Supervisor Dashboard

The dashboard should be the visual centerpiece.

### Header

-   Terra/workforce logo
-   current worksite
-   connection status
-   notification icon
-   supervisor profile

### Primary metrics

-   Workers today
-   Present
-   Absent
-   Pending review
-   Integrity alerts
-   Estimated wages

### Main panels

-   today's attendance timeline
-   attendance trend
-   worksite overview
-   worker list
-   integrity alerts
-   pending reviews
-   upcoming/active session

### Quick actions

-   Start session
-   Enroll worker
-   Mark/review attendance
-   Export report

------------------------------------------------------------------------

# 19. Worker Dashboard

Show only personal information.

Cards: - Attendance % - Days present - Hours worked - Estimated wages

Sections: - monthly calendar - attendance history - wage history -
correction requests - biometric enrollment status

------------------------------------------------------------------------

# 20. CSV / Report Export

Supervisor can export: - daily attendance - monthly attendance - wage
summary - exception report - audit report

CSV export must be generated from validated records.

------------------------------------------------------------------------

# 21. Audit Trail

Track security-sensitive actions:

``` text
Who
What
When
Where/device
Old value
New value
Reason
```

Examples: - attendance edited - worker created - worker
deleted/deactivated - biometric template enrolled - biometric template
revoked - threshold changed - supervisor created - report exported -
sync conflict resolved

Audit logs should be append-only from the application's perspective.

------------------------------------------------------------------------

# 22. Security Requirements

## Authentication

-   Strong password hashing using Argon2id/bcrypt.
-   No plaintext passwords.
-   Secure session management.
-   Short-lived access tokens if JWT is used.
-   Refresh-token rotation if refresh tokens are implemented.
-   Logout/revocation support.

## Authorization

Use RBAC on both frontend and backend.

Never rely only on hiding a frontend button.

Backend must verify: - authenticated user - role - worksite
ownership/access - worker ownership/access

## API security

-   Pydantic validation
-   parameterized database queries
-   rate limiting
-   strict CORS
-   secure headers
-   request size limits
-   structured error handling
-   no stack traces in production responses

## Secrets

Never commit: - API keys - JWT secrets - database passwords - cloud
credentials

Use `.env` locally and secret management in deployment.

## Biometric privacy

-   Store embeddings/templates rather than unnecessary raw photos.
-   Encrypt biometric data at rest.
-   Restrict biometric access to authorized services.
-   Never return embeddings to frontend clients.
-   Never include biometric data in logs.
-   Support template deletion/revocation.
-   Record consent.

## Data minimization

Only collect information required for attendance, wages and
accountability.

------------------------------------------------------------------------

# 23. Frontend Visual Direction

Use the uploaded `terra` agricultural dashboard screenshot as the
primary visual reference.

The target aesthetic is:

**premium dark agricultural technology + editorial + cinematic +
minimal + data-rich.**

Do NOT make: - a generic white SaaS dashboard - a bright green
agricultural template - a Bootstrap-looking admin panel - a dashboard
consisting of only cards - excessive gradients - excessive
glassmorphism - cartoonish agriculture illustrations

## Visual language

### Background

Very dark near-black green: - deep charcoal - black-green - subtle olive
undertones

### Accent

Muted agricultural lime/olive green.

Use accent color sparingly.

### Typography

Large editorial headings with strong hierarchy. Use a modern sans-serif.
Use a refined serif/italic treatment only for selected hero accent text
if it fits the reference.

### Cards

Dark surfaces with subtle borders. Very low-radius or moderate-radius
cards. Avoid huge rounded pills everywhere.

### Imagery

Use high-quality agricultural photography/cinematic farm imagery only
where it adds hierarchy.

Prefer: - hero farm imagery - crop imagery - worker/worksite imagery -
subtle botanical motifs

Do not cover the entire interface in photos.

------------------------------------------------------------------------

# 24. Exact Homepage Structure

Follow the uploaded reference composition closely.

## Navbar

Left:

``` text
small botanical/leaf mark
terra.
```

Center:

``` text
Home
Solutions
How it works
Resources
About us
```

Right:

``` text
Get Started →
hamburger/menu
```

For the attendance product, adapt the content to workforce integrity
while preserving the same visual rhythm.

Suggested navigation:

``` text
Home
Platform
How it works
Integrity
Resources
About
```

CTA:

``` text
Launch Dashboard →
```

------------------------------------------------------------------------

# 25. Hero Section

Left side: small eyebrow:

``` text
AI FOR FAIRER WORK
```

Large headline:

``` text
Work smarter.
Pay fairly.
```

or:

``` text
Every worker.
Every day.
Verified.
```

Use an editorial italic/handwritten accent for one short word only.

Supporting copy:

``` text
Offline-first attendance intelligence for rural worksites —
built to verify workers, prevent proxy attendance,
and keep wage records transparent.
```

CTA:

``` text
Explore Platform →
```

Secondary:

``` text
Watch how it works
```

Right side: - cinematic agricultural/worksite image - face verification
overlay - subtle dashboard/verification cards - no excessive floating UI

Example floating cards:

``` text
Worker Verified
Ravi Kumar
98.7% match
● Liveness passed
```

``` text
Worksite
Green Valley Site
● 42m from center
```

``` text
Today
87%
Attendance
```

------------------------------------------------------------------------

# 26. Hero Metrics

Under hero:

``` text
98%+
Recognition Confidence*

24/7
Offline Operation

<1 sec
Local Verification*

100%
Auditable Changes
```

Do not invent real-world performance claims in production. Label demo
metrics as prototype benchmarks if necessary.

------------------------------------------------------------------------

# 27. Feature Section

Reference the screenshot's lower-left feature section.

Heading:

``` text
Everything you need,
to work fairer.
```

Feature grid:

``` text
Face Verification
Liveness Protection
Offline Attendance
Worksite Intelligence
Wage Transparency
Integrity Alerts
```

Each should have: - small line icon - short title - one-line description

------------------------------------------------------------------------

# 28. Dashboard Preview Section

Use a large dark dashboard mockup similar in composition to the
reference image.

Sidebar:

``` text
Overview
Attendance
Workers
Worksites
Integrity
Wages
Reports
Settings
```

Main area:

``` text
Good morning, Ananya.

Here's what's happening at your worksite today.
```

Cards: - Worksite - Attendance rate - Workers present - Today's weather
(only if online/available; otherwise show `Offline`) - Pending
verification - Estimated wages

------------------------------------------------------------------------

# 29. Dashboard Pages

Implement these pages:

1.  `/dashboard`
2.  `/attendance`
3.  `/workers`
4.  `/workers/[id]`
5.  `/enrollment`
6.  `/sessions`
7.  `/integrity`
8.  `/worksites`
9.  `/wages`
10. `/reports`
11. `/audit`
12. `/settings`
13. `/worker`
14. `/login`

------------------------------------------------------------------------

# 30. Attendance Page

Top:

``` text
Today's Attendance
Green Valley Worksite
```

Status:

``` text
● Offline — All local features available
```

Controls:

``` text
Start Session
Scan Worker
Export
```

Main: - live camera area - verification status - worker queue -
attendance table

Verification panel:

``` text
FACE DETECTED
Ravi Kumar

98.7% MATCH
✓ LIVENESS
✓ ON SITE

Attendance marked
09:04:21
```

------------------------------------------------------------------------

# 31. Integrity Page

This should be a standout page.

Header:

``` text
Workforce Integrity
```

Top metrics: - Critical alerts - Pending reviews - Suspicious attempts -
Manual corrections

Alert cards explain the reason.

Use severity hierarchy: - Critical - Warning - Review - Resolved

------------------------------------------------------------------------

# 32. Enrollment Page

Large camera-first interface.

Left: camera preview

Right:

``` text
Enroll worker

1. Worker details
2. Face capture
3. Liveness
4. Duplicate check
5. Confirmation
```

Progress indicator.

Clear instructions.

------------------------------------------------------------------------

# 33. Offline UX

This is important.

Always show connection state:

``` text
● Online
```

or

``` text
● Offline
All essential features available
12 records waiting to sync
```

When reconnecting:

``` text
Connection restored
Syncing 12 records...
████████░░ 80%
```

Then:

``` text
✓ All records synchronized
```

------------------------------------------------------------------------

# 34. Error States

Every page needs: - loading state - empty state - error state - offline
state - permission-denied state

Example:

``` text
No attendance yet
Start today's session to begin.
```

Not:

``` text
No data found
```

------------------------------------------------------------------------

# 35. Responsive Design

Desktop: - full dashboard - sidebar - large camera panel

Tablet: - collapsible sidebar - two-column layout

Mobile: - bottom navigation or compact drawer - camera-first attendance
flow - large touch targets

Do not simply shrink desktop UI.

------------------------------------------------------------------------

# 36. Accessibility

-   WCAG-aware contrast
-   keyboard navigation
-   visible focus
-   semantic HTML
-   accessible labels
-   no color-only status indicators
-   minimum comfortable touch targets
-   readable typography

------------------------------------------------------------------------

# 37. Backend API Contract

Suggested endpoints:

``` text
POST   /auth/login
POST   /auth/logout
GET    /auth/me

GET    /workers
POST   /workers
GET    /workers/{id}
PATCH  /workers/{id}
DELETE /workers/{id}

POST   /workers/{id}/biometric/enroll
DELETE /workers/{id}/biometric

GET    /worksites
POST   /worksites
PATCH  /worksites/{id}

POST   /sessions
POST   /sessions/{id}/start
POST   /sessions/{id}/end

POST   /attendance/verify
POST   /attendance/manual
GET    /attendance
PATCH  /attendance/{id}

GET    /integrity/alerts
PATCH  /integrity/alerts/{id}

GET    /analytics/overview
GET    /analytics/attendance
GET    /analytics/wages

GET    /audit
GET    /reports/attendance.csv
GET    /reports/wages.csv

POST   /sync
GET    /sync/status
```

Backend must validate authorization on every protected endpoint.

------------------------------------------------------------------------

# 38. Database Model

Core tables:

``` text
users
roles
workers
worksites
worker_worksites
biometric_templates
attendance_sessions
attendance_events
attendance_records
integrity_alerts
manual_reviews
wage_rules
wage_calculations
audit_logs
sync_queue
devices
consents
```

Important relationships:

``` text
Organization
 ├── Users
 ├── Worksites
 │    └── Workers
 └── Attendance Sessions
       └── Attendance Records
             └── Worker
```

------------------------------------------------------------------------

# 39. Testing Requirements

Implement tests for:

### Backend

-   authentication
-   authorization
-   attendance creation
-   duplicate attendance prevention
-   manual correction
-   wage calculation
-   geofence calculation
-   sync idempotency
-   conflict handling

### Frontend

-   protected routes
-   role-specific rendering
-   offline state
-   loading/error states

### AI pipeline

-   known face recognition
-   unknown face rejection
-   multiple-face handling
-   low-confidence review
-   liveness failure
-   poor-quality image

------------------------------------------------------------------------

# 40. Demo Mode

Create a deterministic demo mode.

Seed: - 20--30 workers - 1--3 worksites - realistic attendance - several
low-confidence records - 2--3 integrity alerts - pending manual
reviews - wage data - historical analytics

Demo controls should allow: - simulate offline - simulate online -
simulate liveness failure - simulate unknown face - simulate
low-confidence match - simulate sync

This allows the entire pitch to work reliably even if camera/model
behavior is imperfect.

------------------------------------------------------------------------

# 41. Winning Demo Workflow

The demo should tell a story, not show random pages.

### Scene 1 --- The problem

Show manual roll call and proxy-attendance risk.

### Scene 2 --- Supervisor starts a session

Select worksite.

### Scene 3 --- Internet is intentionally OFF

Show:

``` text
OFFLINE
Core attendance remains operational
```

### Scene 4 --- Worker approaches camera

System: - detects face - checks quality - performs liveness - recognizes
worker - verifies worksite - marks attendance

### Scene 5 --- Spoof attempt

Show a photo/phone-screen attempt.

System:

``` text
Liveness failed
Attendance not recorded
```

### Scene 6 --- Low-confidence attempt

System sends it to:

``` text
Manual Review
```

### Scene 7 --- Dashboard

Show: - attendance - alerts - work hours - wage estimate

### Scene 8 --- Internet returns

Show:

``` text
12 offline records found
Syncing...
✓ synchronized
```

### Scene 9 --- Audit

Show exactly who changed what.

### Scene 10 --- Worker view

Worker sees transparent attendance and estimated wages.

Final message:

> **Attendance shouldn't depend on internet, memory, or manual trust.**

------------------------------------------------------------------------

# 42. What NOT to Build

Do not waste hackathon time on: - training a face model from scratch -
unnecessary blockchain - complicated microservices - an elaborate
weather engine - excessive AI chatbots - fake predictive analytics -
meaningless 3D graphics - dozens of unused settings - decorative
animations that hurt performance

Depth \> feature count.

------------------------------------------------------------------------

# 43. Implementation Priority

## P0 --- Must work

1.  Authentication/RBAC
2.  Worker enrollment
3.  Face recognition
4.  Liveness
5.  Attendance logging
6.  Local database
7.  Offline operation
8.  Supervisor dashboard
9.  Manual review
10. Sync
11. Audit log
12. CSV export

## P1 --- Strong differentiators

13. GPS/geofence
14. Work hours
15. Wage estimation
16. Integrity alerts
17. Duplicate identity detection
18. Worker dashboard
19. Analytics
20. Multilingual UI

## P2 --- Polish

21. PWA
22. advanced anomaly scoring
23. voice guidance
24. richer reports
25. advanced visualizations

If time becomes limited, finish P0 completely before touching P2.

------------------------------------------------------------------------

# 44. Copilot Coding Rules

When implementing: - TypeScript strict mode. - Python type hints. -
Small reusable components. - No giant monolithic components. - No
hardcoded secrets. - No fake API responses in production paths. - Keep
demo seed data isolated. - Use service/repository layers where useful. -
Validate all API inputs. - Add meaningful error messages. - Use database
migrations. - Add tests for critical workflows. - Keep AI inference
behind a clean service interface so the model can be replaced. - Keep
offline storage and sync logic independent from UI. - Use environment
variables for configuration. - Never send raw biometric templates to the
browser unnecessarily. - Never store passwords in local storage. - Never
trust client-side role information.

------------------------------------------------------------------------

# 45. Definition of Done

The project is considered complete only when:

-   A worker can be enrolled.
-   A worker can be recognized locally.
-   Liveness can reject a basic spoof.
-   Attendance works with internet disabled.
-   GPS/geofence validation works where location is available.
-   Attendance appears instantly on the local dashboard.
-   Low-confidence matches enter manual review.
-   Manual changes require a reason.
-   Audit logs record changes.
-   Offline records synchronize after reconnecting.
-   Sync is idempotent.
-   Worker can view personal attendance/wages.
-   Supervisor can export CSV.
-   Role permissions are enforced server-side.
-   Biometric data is protected.
-   The UI is responsive and polished.
-   Demo mode can reproduce the complete workflow.

------------------------------------------------------------------------

# 46. Final Product Positioning

Do NOT present this as:

> "A face recognition attendance website."

Present it as:

> **Terra Workforce --- an offline-first workforce integrity platform
> that verifies identity, location and presence to make rural attendance
> and wage records faster, fairer and auditable.**

The differentiator is not face recognition alone.

It is:

``` text
IDENTITY
   +
LIVENESS
   +
LOCATION
   +
TIME
   +
OFFLINE OPERATION
   +
FRAUD SIGNALS
   +
HUMAN REVIEW
   +
AUDITABILITY
   +
WAGE TRANSPARENCY
```

That is the product.
