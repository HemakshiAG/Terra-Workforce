# Frontend Exact-Implementation Guide

## Reference

Use the uploaded `terra` agricultural landing-page screenshot as the
**primary visual reference**.

The goal is not to reproduce every pixel literally; the goal is to
reproduce its visual system, spacing hierarchy, composition, density,
and premium dark agricultural-tech identity while adapting the content
to workforce attendance.

## Visual target

Think:

-   dark editorial agriculture
-   cinematic
-   premium
-   restrained
-   minimal but information-rich
-   sophisticated rather than "green SaaS"
-   subtle organic details
-   strong typography
-   asymmetrical layouts
-   large hero imagery
-   thin borders
-   olive/lime accent

## Global layout

Use a near-black green background.

Recommended structure:

``` text
┌─────────────────────────────────────────────────────────┐
│ logo      Home Platform How it works ...   CTA  menu   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  eyebrow                                                │
│  LARGE EDITORIAL HEADLINE          cinematic farm       │
│  with short italic accent          /worksite image      │
│                                                         │
│  description                    floating verification   │
│  CTA  secondary                 cards                  │
│                                                         │
│  metrics                                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  feature statement            feature grid             │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│             large supervisor dashboard preview          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Navbar

Keep it thin and elegant.

Left: - small botanical mark - `terra.`

Middle: - Home - Platform - How it works - Integrity - Resources - About

Right: - `Launch Dashboard →` - menu icon

No oversized navbar.

## Hero

Use the reference screenshot's left-text/right-image composition.

Eyebrow:

`AI FOR FAIRER WORK`

Headline:

`Every worker.` `Every day.` `Verified.`

Make one word use a restrained italic organic accent.

Body:

`Offline-first attendance intelligence for rural worksites — built to verify workers, prevent proxy attendance, and keep wage records transparent.`

Buttons:

`Launch Platform →`

`See how it works`

Right: - agricultural field/worksite image - worker verification
overlay - subtle crop/field texture - floating cards

Cards:

`Worker Verified` `Ravi Kumar` `98.7% match` `Liveness passed`

and

`Worksite` `Green Valley` `42m from center`

## Dashboard preview

Build a realistic dashboard, not a static screenshot.

Sidebar:

-   Overview
-   Attendance
-   Workers
-   Worksites
-   Integrity
-   Wages
-   Reports
-   Audit
-   Settings

Header:

`Good morning, Ananya.`

Subtitle:

`Here's what's happening at your worksite today.`

Main cards: - Worksite - Attendance - Workers present - Integrity -
Estimated wages

Add a live/offline indicator.

## Dashboard styling

Do NOT: - use white cards - use huge rounded containers - use rainbow
charts - use excessive shadows - use generic Bootstrap components - make
every element green

Use: - dark surfaces - subtle 1px borders - muted text - olive accent -
sparse lime highlights - small icons - strong whitespace - controlled
density

## Attendance page

This is the most important application screen.

Desktop:

``` text
┌────── Sidebar ──────┬────────────────────────────────────┐
│                     │ Today's Attendance                 │
│                     │ Green Valley Worksite              │
│                     │                                    │
│                     │ ┌────────────────┐ ┌─────────────┐ │
│                     │ │                │ │ Verification│ │
│                     │ │ CAMERA         │ │ Worker      │ │
│                     │ │                │ │ Match       │ │
│                     │ │                │ │ Liveness    │ │
│                     │ └────────────────┘ └─────────────┘ │
│                     │                                    │
│                     │ attendance table                    │
└─────────────────────┴────────────────────────────────────┘
```

Camera panel should have: - face guide - live status - liveness step -
recognition progress - location status

Success:

`Ravi Kumar` `98.7% match` `✓ Liveness passed` `✓ On site`
`Attendance marked — 09:04`

Failure:

`Liveness failed` `Try again`

Low confidence:

`Review required` `89.2% match` `Send to supervisor`

## Integrity Center

Make this visually distinctive.

Header: `Workforce Integrity`

Top cards: - Critical - Review - Suspicious attempts - Corrections

Main feed:

``` text
LOW CONFIDENCE MATCH
Ravi Kumar
89.2%
2 minutes ago
[Review]
```

``` text
GEOFENCE VIOLATION
Worker ID W-104
Outside worksite by 430m
[Review]
```

Use restrained severity accents.

## Enrollment

Make the page camera-first.

Left: large camera capture.

Right: stepper:

1.  Worker details
2.  Capture face
3.  Liveness
4.  Duplicate check
5.  Confirm

The camera should feel like a professional verification station, not a
generic webcam box.

## Worker dashboard

Use a calmer version of the supervisor dashboard.

Hero: `Your work record`

Cards: - attendance - hours - estimated wages

Calendar: - present - absent - reviewed

Never expose other workers.

## Offline indicator

Persistent compact status:

Online: `● Online`

Offline: `● Offline` `Core features available`
`12 records waiting to sync`

Reconnection: `Connection restored` `Syncing 12 records...`

Success: `✓ All records synchronized`

## Mobile

Do not merely scale desktop.

Use: - compact top bar - bottom navigation - camera-first attendance -
large touch targets - simplified charts - stacked cards

## Animation

Use restrained animation: - page fade/slide - chart transitions - scan
line during face verification - sync progress - subtle hover states

Do NOT add: - spinning agriculture graphics - constant floating
elements - distracting parallax - excessive glassmorphism

## Typography

Use a modern geometric/sans font.

Hero: very large, light-weight editorial typography.

Dashboard: medium-weight headings.

Labels: small uppercase or compact muted text.

One italic accent font treatment can be used in hero headings.

## Imagery

Use 2--4 strong images rather than dozens.

Preferred: - aerial crop field - rural worksite - worker in field - crop
close-up

Images should be darkened/graded to integrate with the interface.

## Icons

Use one consistent icon system.

Recommended: Lucide.

Keep icons small and thin.

## Data visualization

Use charts only where they answer a question: - attendance trend - work
hours - attendance by day - wage estimate - integrity event trend

Avoid charts purely for decoration.

## Exact page hierarchy

Landing: 1. Navbar 2. Hero 3. metrics 4. feature grid 5. workflow 6.
dashboard preview 7. integrity section 8. offline-first section 9. CTA
10. footer

App: 1. sidebar 2. topbar 3. page header 4. primary content 5.
contextual actions 6. states/errors

## Frontend implementation rules

-   Build reusable `Sidebar`, `Topbar`, `MetricCard`, `StatusBadge`,
    `VerificationCard`, `AttendanceTable`, `AlertCard`, `ChartCard`,
    `CameraPanel`, `OfflineIndicator`.
-   Use design tokens.
-   Do not hard-code random margins page by page.
-   Keep spacing consistent.
-   Build desktop first but test tablet/mobile.
-   Use accessible semantic components.
-   Ensure keyboard focus.
-   Do not expose sensitive biometric information.
-   Never place secrets in client-side environment variables.
