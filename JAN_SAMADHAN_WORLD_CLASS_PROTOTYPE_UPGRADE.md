# Jan Samadhan AI — World-Class Prototype Upgrade Specification

**Purpose:** Give the coding agent a single implementation brief for taking the current Jan Samadhan prototype from a technically capable hackathon product to a polished, demo-ready, world-class prototype.

**Primary objective:** Maximize the visible product quality and clarity of the existing Jan Samadhan capabilities for the SIH-style shortlist/demo. The goal is not to add technology for technology's sake. The goal is to make the existing intelligence obvious, believable, coherent, fast to understand, and reliable to demonstrate.

---

## 0. SOURCE OF TRUTH

This brief is grounded primarily in:

1. **Current Codebase Report — Jan Samadhan AI, dated 2026-09-20**
2. **Jan Samadhan AI — UI/UX Enhancement Specification, version 2.0**
3. **Jan Samadhan Deep Implementation Context Report, generated from source-code inspection**

Treat the repository itself as the final implementation source of truth. Before changing anything, inspect the current files and reconcile the implementation with the statements in these reports.

### Important source-state caveat

The Sept 20 report contains an internal inconsistency around Git state: one section says the working tree is clean while the final note says the UI/Vision changes are uncommitted. Do not assume either state. Run `git status`, inspect the actual diff, and protect all existing work before modifications.

The same report states that the frontend typecheck/build/Knip gates and backend tests are green, while SQL/migration validation and live post-hardening E2E verification remain open. Do not claim deployment or end-to-end validation until they have actually been performed.

---

# 1. PRODUCT NORTH STAR

Jan Samadhan should feel like:

> **A premium civic operations platform that makes government workflows easier to understand and easier to execute.**

The visible operational loop must be:

```text
REPORT
  ↓
UNDERSTAND
  ↓
TRIAGE
  ↓
PRIORITIZE
  ↓
DISPATCH
  ↓
REPAIR
  ↓
VERIFY
  ↓
TRACK
```

Every major screen should reinforce this loop.

The product should communicate five things immediately:

```text
Citizen:
"I can report this easily."

AI:
"The system understood my report."

Authority:
"I know what needs attention and what action to take."

Worker:
"I know exactly what to fix and how to prove it."

Citizen:
"I can see what happened and whether it was actually resolved."
```

---

# 2. CURRENT PRODUCT BASELINE

Do not redesign from scratch.

The current product already contains a substantial implementation:

## Citizen

- Web incident reporting
- Text description
- Image upload
- Geolocation
- Voice/audio support in the AI pipeline
- Multilingual support
- Pre-submit AI classification endpoint
- Citizen dashboard
- Notifications
- Public tracking
- QR-based public tracking/project flow

## AI

Current AI pipeline architecture is a LangGraph flow containing:

```text
Transcribe
→ Vision Analysis
→ Translation
→ Classification
→ Severity Scoring
→ Department Routing
```

Duplicate detection and trust scoring are handled after the graph.

The latest Sept 20 report says incident-image vision was migrated from the deprecated Groq vision model to Google Gemini Flash through:

`app/services/gemini_vision_service.py`

using `gemini-2.5-flash`, with retry logic, payload-size guards, MIME detection, and structured JSON output.

Do not revert this migration.

## Authority

The latest implementation includes:

- SLA engine
- SLA quick filters
- Split triage workspace
- Fast-Track dispatch
- ATR action templates
- GIS map
- SLA-coded map pins
- Dynamic map recentering
- CSV export
- Status normalization
- Responsive authority components

Relevant current files include:

```text
frontend/lib/sla.ts
SplitTriageWorkspace.tsx
TerritoryMapView.tsx
DashboardFilters.tsx
useDashboardState.ts
```

## Worker

Current worker workflow includes:

- assigned incidents
- status updates
- resolution-proof image upload
- resolution verification flow

Resolution verification is designed around before/after evidence and produces verified/rejected/error-style outcomes in the hardened backend design.

## Backend hardening already performed

The Sept 20 report states the following were completed at code/test level:

- authentication hardening
- route authorization sweep
- worker ownership checks
- notification lifecycle work
- duplicate persistence
- resolution integrity work
- schema consistency work
- WhatsApp hardening
- frontend route/auth hardening
- 145 backend tests passing
- frontend typecheck/build/Knip gates passing

Do not unnecessarily refactor these stable areas while doing UI work.

---

# 3. NON-NEGOTIABLE PRINCIPLES

## 3.1 Do not add complexity for appearance

Do not turn the product into:

- a generic AI SaaS dashboard
- an enterprise architecture diagram disguised as UI
- a glassmorphism template
- a neon cyber-AI interface
- a government portal with modern colors but outdated UX

The intended visual identity is:

```text
Government credibility
+
Modern SaaS interaction quality
+
Citizen simplicity
+
Field practicality
+
Transparent AI
```

## 3.2 Existing design tokens are the foundation

Preserve the current Jan Samadhan palette:

```text
Government Blue: #003366
Blue Mid:        #0055A4

Orange:          #F47920
Orange Dark:     #C05E10

Green:           #1A7A3E
Green Mid:       #22904A

Red:             #B91C1C
Amber:           #D97706
```

Semantic surfaces should continue using the documented light/dark values.

Do not introduce arbitrary new accent colors.

## 3.3 Preserve the existing spacing bridge

The current project intentionally defines:

```text
spacing-3 = 16px
spacing-4 = 24px
spacing-5 = 48px
```

Do not casually migrate these to native Tailwind values.

The spacing bridge is a known project constraint.

## 3.4 Do not reintroduce the removed UX4G stylesheet

The Sept 20 report documents that the unlayered UX4G stylesheet caused major style conflicts and was removed while continuity tokens were preserved.

Do not re-add:

```text
/css/ux4g.css
```

Do not change this without a separate architectural reason and visual migration plan.

## 3.5 Preserve production auth hardening

Do not restore:

- fabricated auth tokens
- unrestricted dev auth bypass
- role bypasses in production
- mock worker behavior in production

Development-only functionality must remain explicitly gated by development environment checks.

## 3.6 Do not claim unsupported functionality

A visible UI control must correspond to real behavior, or be clearly labeled as demo-only/development-only.

Do not create fake “AI confidence”, “SLA”, “verification”, “duplicate count”, or analytics data that visually implies live backend behavior unless the current demo fixture is explicitly identified as deterministic demo data.

---

# 4. PRIORITY MODEL

Implement in this order.

## P0 — Must be excellent before recording

```text
1. Protect repository / inspect current branch and diff
2. Visual smoke test baseline
3. Deterministic demo dataset / demo scenario
4. Citizen report experience
5. AI processing experience
6. Authority dashboard hierarchy
7. Authority incident investigation workspace
8. Duplicate cluster visualization
9. SLA + Fast-Track interaction
10. Worker mobile workflow
11. Before/After resolution verification UX
12. Public tracking timeline
13. Live end-to-end validation
14. SQL migrations + finalize_resolution verification
15. Final visual regression / recording QA
```

## P1 — High-value polish

```text
16. Landing page hero
17. Loading skeletons
18. Empty states
19. Error states
20. Notification center
21. Map ↔ incident synchronization
22. Analytics redesign
23. Mobile navigation refinement
24. Microinteractions
25. Typography / spacing consistency
26. Accessibility QA
```

## P2 — Only after P0/P1

```text
27. Bundle splitting
28. Broader refactoring
29. New AI features
30. New infrastructure
31. Additional CRUD modules
```

Do not spend P0 time on P2 work.

---

# 5. FIRST TASK: REPOSITORY SAFETY + BASELINE

Before modifying code:

```bash
git status
git branch --show-current
git log --oneline -12
git diff
```

Create a clean baseline record of:

- current branch
- uncommitted changes
- current build result
- current tests
- current screenshots if available

Do not overwrite uncommitted user work.

Then run the frontend and perform the currently documented visual smoke test:

```text
Landing
→ Login
→ Citizen
→ Report
→ Authority
→ Worker
→ Tracking
```

Check:

- no console errors
- no horizontal overflow
- no `/css/ux4g.css` network request
- primary is navy, not the old purple
- typography is consistent
- cards/shadows/spacing remain coherent
- restored route guards work
- auth failure states behave correctly

Take baseline screenshots before major visual changes.

---

# 6. DESIGN SYSTEM HARDENING

Before redesigning individual pages, inspect existing reusable components.

Reuse existing primitives wherever they already solve the problem.

Expected semantic shared primitives:

```text
components/ui/
  button.tsx
  card.tsx
  badge.tsx
  input.tsx
  dialog.tsx
  skeleton.tsx
  sheet.tsx
  tooltip.tsx

components/shared/
  PageHeader.tsx
  EmptyState.tsx
  ErrorState.tsx
  IncidentHeader.tsx
  IncidentSummary.tsx
  IncidentTimeline.tsx
  AiStatusTimeline.tsx
  AiEvidencePanel.tsx
  ClusterSummary.tsx
  BeforeAfterViewer.tsx
  FilterChips.tsx
  MobileActionBar.tsx
  CopyTrackingId.tsx
```

Only add a new component when an equivalent does not already exist.

### Standardize:

- button heights
- border radii
- icon sizing
- focus rings
- card padding
- headings
- muted text
- badge semantics
- skeleton animation
- success/error states
- motion durations

### Motion baseline

Use:

```text
fast = 150ms
base = 200ms
slow = 300ms
```

Motion should communicate:

- page change
- selection
- state change
- loading
- expanding detail
- successful completion

Do not animate the entire dashboard continuously.

Respect:

```css
@media (prefers-reduced-motion: reduce)
```

---

# 7. GLOBAL SHELL

The global shell should feel like one cohesive product.

## Desktop

Use the established shell:

```text
Top navigation ≈ 60px
Sidebar ≈ 240px
Collapsed sidebar ≈ 64px
```

## Mobile

Use a bottom navigation model with no more than five primary destinations.

Do not shrink the desktop sidebar into an awkward mobile layout.

### Header requirements

Every authenticated role should have:

```text
Logo
Role/context
Page title or operational context
Notifications
Profile
```

Authority can additionally show a small system status indicator:

```text
● AI systems operational
```

Only show this if it reflects an actual application state. Do not hardcode “operational” if the system cannot detect it.

---

# 8. CITIZEN EXPERIENCE — REPORT INCIDENT

Route:

```text
/citizen/report
```

This is one of the highest-priority screens.

## Goal

The user should feel like they are **telling the government what happened**, not filling out a bureaucratic form.

## Visual flow

```text
WHAT HAPPENED?
      ↓
TELL US MORE
      ↓
ADD EVIDENCE
      ↓
CONFIRM LOCATION
      ↓
REVIEW & SUBMIT
```

Use a prominent stepper but make every step visually consistent.

## Step 1: Category

Large, scan-friendly options:

```text
Pothole
Garbage
Water
Streetlight
Public Safety
Other
```

Every option:

- icon
- clear label
- optional short helper text

Selected state:

```text
blue border
light blue surface
check indicator
subtle elevation
```

Do not use huge cards that consume most of the screen.

## Step 2: Description

Primary prompt:

```text
What happened?
```

Support:

```text
Text input
Microphone
Language selector
Character count
```

Voice state machine:

```text
Idle
→ Recording
→ Processing
→ Transcript ready
```

During recording:

- obvious active state
- elapsed time
- stop control
- clear microphone icon

After transcription:

```text
Voice converted to text
[Edit transcript]
```

Do not expose AI internals here.

## Step 3: Photo

Use a large camera/upload surface.

States:

```text
Add photo
→ Uploading
→ AI checking image
→ Valid evidence
```

Success state:

```text
✓ Pothole detected
High severity
Valid civic evidence
```

Irrelevant state:

```text
This image does not appear to show a civic issue.

[Choose another photo]
```

AI unavailable:

```text
AI review unavailable

Your report can still be submitted for manual review.
```

Never make the user think a temporary AI failure deleted their report.

## Step 4: Location

User-facing UI:

```text
Use my current location
```

Then show:

```text
Map
Detected address
[Adjust location]
```

Do not lead with latitude/longitude.

Coordinates are supporting metadata only.

## Step 5: Review

Show:

```text
Problem
Location
Description
Photo
Language
```

Each section has:

```text
Edit
```

Primary CTA:

```text
Submit Report
```

## Submission

The response should feel immediate.

First state:

```text
✓ Report received

Tracking ID
CIV-2026-XXXX

AI triage is starting...
```

Do not block the entire UI on the complete AI pipeline when the backend already acknowledges incident creation before background AI processing.

---

# 9. AI PROCESSING EXPERIENCE

This is one of the highest-impact visual improvements.

Never leave the user looking at:

```text
Loading...
```

Create a reusable:

```text
AiStatusTimeline
```

Example:

```text
AI TRIAGE

✓ Report received
✓ Image inspected
✓ Language identified
● Classifying issue
○ Assessing severity
○ Routing department
○ Checking duplicate reports
```

The exact visible stages must correspond to the actual data/state available in the frontend.

Do not fake stage completion solely for animation.

## Completion state

Use:

```text
AI TRIAGE COMPLETE

Pothole detected
High severity
Roads & Infrastructure

Confidence
██████████████████░░ 92%
```

Then:

```text
Why?

✓ Visible road damage
✓ Vehicle safety risk
✓ Large surface obstruction
```

Use progressive disclosure.

Do not show raw prompts or raw JSON.

---

# 10. AI EVIDENCE PANEL

Build or standardize an:

```text
AiEvidencePanel
```

It should explain AI outputs in human-readable terms.

Suggested structure:

```text
AI ASSESSMENT

Severity
HIGH

Confidence
92%

Category
Road Damage

Department
Roads & Infrastructure

──────────────────

Visual evidence
✓ Surface damage detected
✓ Vehicle obstruction detected

Severity factors
✓ Safety impact
✓ Infrastructure damage

Routing rationale
Road maintenance department recommended

[View full reasoning]
```

The panel should visually distinguish:

```text
AI recommendation
Human override
Final authority decision
```

This is important because AI should recommend, not visually pretend to have final government authority.

---

# 11. CITIZEN DASHBOARD

Route:

```text
/citizen
```

The dashboard should optimize for reassurance.

Header:

```text
Good morning, [Name]

Here is the current status of your reports.

[+ Report New Incident]
```

Summary:

```text
Pending
2

Active
1

Resolved
8
```

Incident cards should prioritize:

```text
Problem title
Location
Status
Severity
Last update
```

Do not expose database-level metadata.

## Important visual behavior

The first open report should feel like the primary story.

Example:

```text
Water pipeline leak
Gandhi Road, Mumbai

HIGH
In Progress

Last update
Worker assigned 12 min ago

[View status]
```

---

# 12. AUTHORITY DASHBOARD — COMMAND CENTER

Route:

```text
/authority
```

The authority dashboard should not resemble a generic analytics dashboard.

Its purpose is operational decision-making.

## Top hierarchy

```text
HEADER
↓
ATTENTION STRIP
↓
INCIDENT QUEUE
↓
MAP / OPERATIONAL CONTEXT
↓
ANALYTICS
```

## Attention strip

Prioritize action:

```text
NEEDS ATTENTION

4 SLA BREACHING
8 DUE WITHIN 2 HOURS
12 UNASSIGNED
2 VERIFICATION REVIEWS
3 DUPLICATE CLUSTERS
```

Only show metrics actually derivable from current data.

Make each item interactive:

```text
Review
```

## KPI row

Supporting context:

```text
Total incidents
Pending triage
In progress
Resolved today
Average response time
```

Add small trends only when meaningful data exists.

Do not turn the KPI row into the dominant element.

---

# 13. AUTHORITY INCIDENT QUEUE

The queue should be optimized for scan speed.

Recommended columns:

```text
Severity
Incident
Location
Status
Department
Assigned
SLA / Age
Action
```

Priority hierarchy:

```text
1. Severity
2. Title
3. Status
4. Action
```

IDs should be secondary.

## Selected rows

When rows are selected, transition into:

```text
3 incidents selected

[Assign]
[Change status]
[Export]
[Clear]
```

Do not suddenly destroy the layout. Animate the toolbar into place.

## Empty queue

Use:

```text
ALL CLEAR

No open incidents require attention.
```

Avoid:

```text
No data
```

---

# 14. AUTHORITY INCIDENT DETAIL — SIGNATURE SCREEN

This should become the strongest screen in the product.

Recommended layout:

```text
┌──────────────────────────────────────────────────────────┐
│ CRITICAL   WATER LEAK                    CIV-2026-91AF   │
│ Gandhi Road, Mumbai                                     │
│                                                          │
│ [FAST TRACK] [ASSIGN WORKER] [MORE]                    │
├──────────────────────────┬───────────────────────────────┤
│ INCIDENT                 │ AI INVESTIGATION              │
│                          │                               │
│ BEFORE PHOTO             │ Severity                      │
│                          │ CRITICAL                      │
│                          │                               │
│ Description              │ Confidence 94%                │
│                          │                               │
│ Location                 │ Why?                          │
│                          │ • active leak                 │
│                          │ • safety hazard                │
├──────────────────────────┴───────────────────────────────┤
│ MAP / LOCATION / SLA                                   │
├──────────────────────────────────────────────────────────┤
│ DUPLICATE CLUSTER                                       │
├──────────────────────────────────────────────────────────┤
│ INCIDENT TIMELINE / AUDIT                              │
└──────────────────────────────────────────────────────────┘
```

The incident header should be visually stable across:

```text
Authority
Worker
Citizen tracking
```

Use a shared:

```text
IncidentHeader
IncidentSummary
IncidentTimeline
```

where appropriate.

---

# 15. FAST-TRACK DISPATCH

The current authority overhaul includes one-click Fast-Track dispatch.

Make this a clearly understandable action.

Example:

```text
FAST TRACK

Critical severity
SLA: 38 minutes
Multiple nearby reports
Recommended: Water Department

[Fast-Track Dispatch]
```

After click:

```text
✓ Dispatch created

Worker
Ravi Kumar

Department
Water Department

SLA
38 min remaining
```

Do not simply show a toast with no context.

The resulting state should visibly update:

```text
Unassigned
→ Assigned
```

and update the activity timeline.

---

# 16. SLA EXPERIENCE

The new SLA engine should be visible throughout authority workflows.

Do not reduce it to a tiny text label.

Recommended states:

```text
ON TRACK
01h 42m remaining

DUE SOON
00h 38m remaining

BREACHING
+00h 17m overdue
```

The visual treatment must be semantically consistent.

Use the existing SLA engine in:

- attention strip
- incident table
- incident detail
- map pins
- filters
- Fast-Track recommendation

Do not duplicate SLA calculation logic in multiple UI components.

Use:

```text
frontend/lib/sla.ts
```

as the canonical client-side presentation logic where applicable.

---

# 17. DUPLICATE CLUSTER EXPERIENCE

Duplicate detection is one of the most important product differentiators.

Do not bury it in a small badge.

For a clustered incident show:

```text
DUPLICATE CLUSTER

23 reports linked

Primary incident
CIV-2026-91AF

+22 duplicate reports

500m vicinity
5-day reporting window

[View cluster]
```

The main visual message should be:

```text
23 CITIZENS
      ↓
SAME PHYSICAL INCIDENT
      ↓
1 PRIMARY CASE
      ↓
1 DISPATCH
```

## Cluster inspector

Show:

```text
PRIMARY INCIDENT
Photo
Location
Severity
Department
SLA

LINKED REPORTS
CIV-...
CIV-...
CIV-...
...
+20 more
```

## Cluster map

Cluster representation should show multiple points collapsing into a primary incident.

Do not animate this constantly.

Use animation only when the cluster is first opened or selected.

---

# 18. MAP EXPERIENCE

Maps are operational tools.

They should not be decorative backgrounds.

Current map work includes:

- dynamic recentering
- SLA-coded pins
- responsive height

Build the next interaction layer:

## Table → map

Selecting an incident:

```text
zoom map
→ center incident
→ highlight pin
→ show compact context
```

## Map → table

Selecting a pin:

```text
incident summary
severity
SLA
department
status
```

Cluster pin:

```text
23 reports
Water leak
Critical
SLA 38m

[Open Cluster]
```

## Map controls

Useful controls:

```text
[All]
[Critical]
[Clusters]
[Breaching SLA]
```

Where possible, synchronize these filters with the table.

---

# 19. WORKER EXPERIENCE — MOBILE FIRST

Route:

```text
/worker
```

This should look like a field tool, not a desktop admin panel on a phone.

## Worker home

```text
MY FIELD QUEUE

Critical — 1
High — 3
Other — 6
```

Task card:

```text
┌──────────────────────────┐
│ CRITICAL                 │
│ Water pipeline leak      │
│ Gandhi Road              │
│                          │
│ 0.8 km away              │
│ SLA: 38 min              │
│                          │
│ [NAVIGATE]               │
│ [VIEW TASK]              │
└──────────────────────────┘
```

## Task detail ordering

Prioritize:

```text
1. Severity
2. Location
3. Before photo
4. Problem description
5. Navigation
6. Resolution proof
```

No unnecessary metadata above the primary task.

---

# 20. NAVIGATION ACTION

The worker should have an obvious:

```text
[OPEN NAVIGATION]
```

button.

If the application only has a link/open-map behavior rather than full in-app routing, label it accordingly.

Do not imply that Jan Samadhan provides turn-by-turn navigation unless that is actually implemented.

---

# 21. RESOLUTION PROOF WORKFLOW

The flow should be:

```text
Repair task
↓
Take after photo
↓
Preview
↓
Submit proof
↓
AI verification
↓
Result
```

The camera/proof step should be a major CTA.

Example:

```text
WORK COMPLETE?

Take an AFTER photo showing the repaired location.

[OPEN CAMERA]
```

After capture:

```text
After photo

[Retake]    [Submit proof]
```

---

# 22. AI RESOLUTION VERIFICATION

This is another flagship capability.

Make the process visible:

```text
VERIFYING REPAIR

BEFORE            AFTER
[photo]           [photo]

✓ Evidence received
● Comparing before / after
○ Checking remaining damage
○ Producing verification result
```

Use real backend state where available.

Do not animate fake progress unrelated to the backend.

## Verified state

```text
✓ REPAIR VERIFIED

AI confidence
96%

The reported issue appears resolved.

[View evidence]
```

## Needs rework

```text
REPAIR NEEDS REWORK

The submitted proof still shows visible damage.

[Review evidence]
[Request rework]
```

## Verification unavailable

```text
MANUAL REVIEW REQUIRED

Automatic verification could not be completed.

The incident remains under review.
```

Never collapse provider/API failure into a misleading “repair rejected” message.

---

# 23. BEFORE/AFTER VIEWER

Build or standardize:

```text
BeforeAfterViewer
```

It should support:

```text
Side-by-side
```

and ideally:

```text
Drag comparison
```

only if it can be implemented without destabilizing the application.

Prioritize reliability over animation.

The viewer should make the evidence legible at a glance.

---

# 24. PUBLIC TRACKING — CITIZEN TRUST SCREEN

Route:

```text
/track/:id
```

This should be one of the most polished citizen-facing screens.

Use the timeline as the main visual element.

Example:

```text
JAN SAMADHAN
Public Incident Tracker

Water pipeline leak
Gandhi Road, Mumbai

CIV-2026-91AF

────────────────────────

✓ Report submitted
Sep 20 · 10:42 AM

✓ AI triage completed
Water Department · High

✓ Worker assigned
Ravi Kumar

✓ Repair completed
2:18 PM

✓ AI verification passed
96% confidence

────────────────────────

BEFORE              AFTER
[photo]             [photo]

ISSUE RESOLVED
```

Add:

```text
[Share status]
[Print / save]
```

Only include print/download controls if implemented correctly.

---

# 25. SHARED INCIDENT TIMELINE

The timeline should become a reusable product primitive.

Suggested state sequence:

```text
Report received
AI triage
Authority review
Worker assigned
Repair started
Repair submitted
Verification
Resolved
```

The actual visible events must come from the current system state.

Use consistent icons and timestamps.

Different roles can see different levels of detail.

Citizen:

```text
simple
reassuring
human language
```

Authority:

```text
more operational detail
audit context
assignment changes
verification details
```

Worker:

```text
task-focused
action-oriented
```

---

# 26. NOTIFICATION EXPERIENCE

The backend hardening now includes notification lifecycle behavior.

Make notifications useful rather than generic.

Citizen examples:

```text
Report received
Your complaint CIV-2026-91AF was created.

AI triage complete
Your report was classified as High severity.

Worker assigned
Ravi Kumar is handling your complaint.

Issue resolved
The repair passed AI verification.
```

Authority:

```text
Critical incident requires review
SLA breach risk

New duplicate cluster detected
23 reports linked

Verification review required
```

Worker:

```text
New task assigned
Water pipeline leak · 0.8 km
```

Keep notifications concise.

---

# 27. LANDING PAGE — FIRST IMPRESSION

The existing UI specification identifies the landing-page hero as a design-debt item.

Replace a generic hero with a product-specific visual.

## Hero structure

Left:

```text
Suniye.
Samjhiye.
Suljhiye.

AI-powered civic response
for modern municipal governance.

[Report a problem]
[Track a complaint]
```

Right:

A miniature Jan Samadhan product scene showing:

```text
Citizen report
→ AI triage
→ GIS/authority
→ worker dispatch
→ verified repair
```

Do not use:

- generic robot illustration
- unrelated AI brain
- floating neon circles
- generic stock city imagery as the main hero

The hero should show the actual product concept.

---

# 28. ANALYTICS REDESIGN

The current analytics are computed client-side from incident data.

Do not rewrite the backend purely for cosmetic analytics.

Visually, orient the page around outcomes.

Prefer:

```text
RESOLUTION PERFORMANCE

Median response time
2h 18m

SLA compliance
87%

Verified resolution rate
94%

Duplicate reduction
31%

Reports this week
142
```

Only calculate metrics that can be defensibly derived from current data.

If a metric is not available reliably, omit it.

Do not fabricate “industry benchmark” comparisons.

Charts should use the Jan Samadhan semantic palette rather than default Recharts colors.

---

# 29. LOADING STATES

Replace generic full-page spinners where the content shape is predictable.

Implement skeletons for:

```text
KPI row
Incident table
Incident detail
AI panel
Worker task cards
Notifications
Analytics
Public tracker
```

Use spinners for short actions:

```text
button submit
small inline action
```

Skeletons should preserve layout to reduce perceived latency.

---

# 30. EMPTY STATES

Every empty state must answer:

1. Is this expected?
2. What should I do?

Examples.

### Citizen

```text
NO REPORTS YET

Report your first civic issue and track it from submission to resolution.

[Report an incident]
```

### Authority

```text
ALL CLEAR

No open incidents require attention.
```

### Worker

```text
NO ACTIVE ASSIGNMENTS

New field tasks will appear here when assigned.
```

Use illustration/iconography from the design system.

Do not use emojis as primary visual assets.

---

# 31. ERROR STATES

Never show:

```text
Something went wrong.
```

by itself.

Use specific states.

### AI unavailable

```text
AI review unavailable

Your report was received successfully.
A municipal officer can review it manually.

[Continue tracking]
[Try again]
```

### Session expired

```text
Your session has expired.

Please sign in again to continue.

[Sign in]
```

### Verification unavailable

```text
Verification unavailable

The repair evidence could not be automatically reviewed.
Manual review is required.
```

### Not found

```text
We could not find this incident.

Check the tracking ID and try again.
```

---

# 32. MOBILE NAVIGATION

Mobile should be role-aware.

## Citizen

```text
Home
My Reports
Report
Notifications
Profile
```

## Authority

```text
Operations
Incidents
Map
Analytics
Profile
```

## Worker

```text
My Tasks
Nearby
History
Notifications
Profile
```

If the existing route structure differs, adapt the presentation without breaking routing.

---

# 33. RESPONSIVE QA TARGETS

Validate at:

```text
375 × 812
390 × 844
430 × 932
768 × 1024
1024 × 768
1280 × 800
1440 × 900
1536 × 864
```

Check specifically:

- horizontal overflow
- table clipping
- CTA clipping
- map dimensions
- modal/sheet behavior
- bottom nav overlap
- toast overlap
- text wrapping
- touch target sizes
- image aspect ratios
- worker one-hand usability

Authority responsiveness has already been worked on, so preserve and improve the existing work rather than replacing it.

---

# 34. ACCESSIBILITY

Minimum target:

```text
WCAG AA-style interaction quality
```

Audit:

```text
Visible focus ring
Logical tab order
Keyboard activation
Real labels
Accessible button names
Alt text
ARIA live states
Status announcements
Modal focus trap
Escape behavior
Reduced motion
Color + text/icon redundancy
```

For Hindi/Indic UI:

- use correct `lang`
- sufficient line height
- suitable Devanagari font fallback

Do not rely on color alone for severity/status.

---

# 35. LANGUAGE EXPERIENCE

The project supports:

```text
English
Hindi
Tamil
Telugu
Marathi
Bengali
```

Do not treat translation as merely a backend feature.

At minimum verify:

- language selector
- form labels
- report text
- status labels
- timeline
- error states
- buttons

Hindi should be visually comfortable and not cramped by English-oriented line heights.

---

# 36. DEMO DATA — CRITICAL FOR VIDEO QUALITY

Create a deterministic demo dataset.

Do not depend on a nearly empty development database.

Target approximately:

```text
40–60 incidents

10 critical
12 high
15 medium
13 low

multiple departments
multiple workers

3+ duplicate clusters
at least one large cluster

3+ SLA risk cases
multiple assigned cases
multiple unassigned cases
multiple resolved cases
at least one verification-review case
```

The exact counts can vary. The important thing is a dense but understandable operational environment.

## Geography

Place incidents in one believable municipal area.

The map, queue, and incident detail must all tell the same geographic story.

## Required flagship demo cases

Create deterministic cases representing:

### Case A — Large duplicate cluster

```text
23+ reports
same underlying physical incident
one primary case
high/critical priority
Fast-Track eligible
```

### Case B — Successful resolution

```text
before photo
worker assigned
after photo
AI verification passes
public tracker resolves
```

### Case C — Verification failure/rework

```text
worker submits proof
AI flags remaining damage
incident remains/reverts to appropriate review state
authority can act
```

The exact mechanics must follow the real backend state transitions.

---

# 37. DEMO HARNESS / DEMO MODE

A deterministic demo harness is strongly recommended.

Create a clearly development/demo-only mechanism such as:

```text
/demo
/dev-demo
```

only if the existing architecture supports it cleanly.

The demo harness should:

- load known fixtures
- reset to a known state
- provide known incidents
- provide known workers
- expose the flagship cases
- make recording repeatable

Do not introduce demo shortcuts into production behavior.

Do not let demo fixtures bypass authorization in production.

A demo button can be development-only.

---

# 38. VIDEO-FIRST INTERACTION DESIGN

Every core interaction should produce a visible state transition.

## Citizen report

```text
Select category
→ describe
→ photo
→ location
→ submit
```

## AI

```text
Report received
→ AI processing
→ AI assessment
```

## Authority

```text
Critical incident
→ investigate
→ cluster found
→ Fast Track
→ worker assigned
```

## Worker

```text
Task
→ navigate
→ repair
→ after photo
→ verify
```

## Citizen

```text
Public tracker
→ issue resolved
→ before/after proof
```

Avoid dead clicks that produce no obvious visual response.

---

# 39. MICROINTERACTIONS WORTH IMPLEMENTING

Use subtle feedback.

### Copy tracking ID

```text
Copy ID
→
Copied ✓
```

### Assignment

```text
✓ Worker assigned
```

### Fast Track

```text
✓ Incident fast-tracked
```

### Verification

```text
✓ Repair verified
96% confidence
```

### Rework

```text
⚠ Repair needs rework
```

### AI processing

Use an active stage indicator rather than a generic spinner.

Do not animate everything.

---

# 40. UI COPY RULES

Prefer:

```text
Report received
```

over:

```text
Your incident submission has been successfully processed.
```

Prefer:

```text
AI review unavailable
```

over:

```text
An unexpected AI processing exception occurred.
```

Citizen copy:

```text
simple
human
reassuring
```

Authority copy:

```text
operational
evidence-oriented
specific
```

Worker copy:

```text
short
action-oriented
field-friendly
```

Do not show unnecessary technical model names to citizens.

---

# 41. WHAT NOT TO BUILD

Do not spend time on:

```text
New vector database
Neo4j
Redis
Celery
Kubernetes
Another LLM provider
A second AI orchestration framework
Complex 3D maps
Generic AI chatbot
Large backend rewrites
Unnecessary schema redesign
Extra CRUD pages
```

Unless a concrete bug blocks the demo, the current technology stack is sufficient.

---

# 42. WHAT NOT TO DISPLAY IN THE VIDEO

Do not show:

```text
Swagger
raw JSON
terminal logs
Ruff
Vulture
CI configuration
database schema
environment variables
backend code
raw SQL
architecture implementation internals
```

The UI can expose technical capabilities through product behavior.

The judge should see:

```text
capability
→ evidence
→ action
→ outcome
```

not implementation noise.

---

# 43. ACCEPTANCE CRITERIA — CITIZEN

The Citizen flow is done when:

```text
[ ] Report flow feels simple
[ ] Five steps have consistent visual treatment
[ ] Category selection is fast
[ ] Voice states are obvious
[ ] Photo upload has meaningful feedback
[ ] AI image result is understandable
[ ] Location is human-readable
[ ] Review page is clean
[ ] Submission acknowledgement is immediate
[ ] Tracking ID is easy to copy
[ ] Dashboard emphasizes active issues
[ ] Errors are actionable
[ ] Mobile flow works at 390px
```

---

# 44. ACCEPTANCE CRITERIA — AI

```text
[ ] AI status timeline exists
[ ] AI states reflect real application state
[ ] AI output is understandable
[ ] Confidence is visually restrained
[ ] AI evidence can be expanded
[ ] Classification is shown
[ ] Severity is shown
[ ] Department routing is shown
[ ] AI reasoning is human-readable
[ ] Raw JSON is never displayed
[ ] Provider failure is not shown as a definitive negative judgment
```

---

# 45. ACCEPTANCE CRITERIA — AUTHORITY

```text
[ ] Dashboard is clearly operational
[ ] Attention strip surfaces urgent work
[ ] SLA state is obvious
[ ] Incident queue is scan-friendly
[ ] Bulk actions are coherent
[ ] Incident detail feels like a workspace
[ ] AI evidence is visible
[ ] Duplicate cluster is obvious
[ ] Fast Track is understandable
[ ] Worker assignment is fast
[ ] Map and table interact
[ ] Timeline is visible
[ ] Responsive behavior is stable
```

---

# 46. ACCEPTANCE CRITERIA — WORKER

```text
[ ] Mobile-first layout
[ ] Task priority is obvious
[ ] Location is obvious
[ ] Before image is prominent
[ ] Navigate action is obvious
[ ] After-photo workflow is simple
[ ] Verification progress is understandable
[ ] Verified/rework/manual-review states differ
[ ] No critical action is hidden below excessive content
```

---

# 47. ACCEPTANCE CRITERIA — PUBLIC TRACKING

```text
[ ] Tracking ID is prominent
[ ] Current status is obvious
[ ] Timeline is the main visual element
[ ] Department/worker information is understandable
[ ] Resolution proof is visible when appropriate
[ ] Before/after comparison works
[ ] Verification outcome is understandable
[ ] Resolved state feels final
[ ] Share/print controls do not distract
```

---

# 48. ACCEPTANCE CRITERIA — VISUAL QUALITY

Every major screen should pass:

```text
[ ] No obvious visual inconsistencies
[ ] No accidental gradients
[ ] No unnecessary card nesting
[ ] No arbitrary colors
[ ] Consistent spacing rhythm
[ ] Consistent border radius
[ ] Consistent shadows
[ ] Consistent icon sizing
[ ] Strong information hierarchy
[ ] Clear primary action
[ ] Good empty/error/loading states
[ ] No clipping
[ ] No horizontal overflow
[ ] No awkward responsive transitions
```

---

# 49. ACCEPTANCE CRITERIA — DEMO RELIABILITY

Before recording:

```text
[ ] Demo starts from a known state
[ ] Demo data is deterministic
[ ] Flagship cluster exists
[ ] Flagship verified repair exists
[ ] Flagship rework/verification case exists
[ ] AI processing path is stable
[ ] Worker assignment works
[ ] Resolution proof works
[ ] Verification works
[ ] Public tracking works
[ ] No console errors
[ ] No broken images
[ ] No missing API requests
[ ] No accidental auth bypass in production configuration
```

---

# 50. LIVE VALIDATION BLOCKERS

The current Sept 20 report explicitly says these were still open:

## SQL / PostgreSQL

Validate migrations:

```text
006
007
008
```

and verify the:

```text
finalize_resolution
```

RPC against real PostgreSQL.

Include:

- verified path
- rejected path
- error path
- audit failure behavior
- repeated finalization
- concurrent finalization
- role/access behavior
- updated_at trigger behavior

Do not describe resolution finalization as production-ready until this is proven.

## Live E2E

Re-run the actual product loop against the live stack:

```text
report
→ AI triage
→ authority review
→ assignment
→ worker update
→ resolution proof
→ AI verification
→ citizen tracking
```

Also re-test flows affected by hardening:

```text
worker ownership
notifications
WhatsApp ingest
resolution
duplicate linkage
```

---

# 51. FRONTEND PERFORMANCE

The Sept 20 report says the production JS chunk was approximately:

```text
1.24 MB
353 KB gzip
```

with a Vite chunk-size warning.

Do not prioritize this above visible product quality.

After P0/P1 UI work is stable, consider:

```text
route-level dynamic imports
dashboard lazy loading
Recharts lazy loading
Leaflet lazy loading
```

Do not destabilize the demo in pursuit of theoretical performance gains.

---

# 52. CODE QUALITY RULES DURING IMPLEMENTATION

Before adding or changing anything:

1. Search for an existing equivalent component.
2. Reuse current types and API helpers.
3. Avoid duplicating state logic.
4. Avoid changing backend APIs for purely visual concerns.
5. Keep demo-only functionality development-gated.
6. Keep auth and authorization rules intact.
7. Do not assume nonexistent database columns.
8. Do not restore deprecated vision dependencies.
9. Do not silently change the spacing system.
10. Run typecheck after structural frontend changes.

After meaningful changes:

```bash
npm run build
npx tsc -b --force
npm run knip
npm run knip:ci
node --test tests/*.test.cjs
```

Backend when backend files are touched:

```bash
python -m pytest -q
python -m ruff check .
python -m vulture app vulture_whitelist.py --min-confidence 60
```

Use the project's actual environment/venv as documented.

---

# 53. VISUAL QA / SCREENSHOT REGRESSION

Take screenshots for at least:

```text
Landing
Citizen dashboard
Citizen report step 1
Citizen report step 3/photo
AI processing
AI complete
Authority dashboard
Authority incident detail
Duplicate cluster
Map selected incident
Worker dashboard mobile
Worker verification
Public tracker unresolved
Public tracker resolved
```

Compare before/after.

A redesign is not complete because it “looks better” in one browser width.

---

# 54. FINAL DEMO STORY

The final prototype should allow the recording team to tell one continuous story:

```text
A citizen reports a water leak
        ↓
AI inspects the image
        ↓
AI identifies severity and department
        ↓
Authority sees a growing duplicate cluster
        ↓
23 reports collapse into one operational incident
        ↓
SLA marks it urgent
        ↓
Authority Fast-Tracks the case
        ↓
Worker receives the task
        ↓
Worker submits an after photo
        ↓
AI compares before vs after
        ↓
Repair is verified
        ↓
Citizen sees the full resolution timeline
```

This is the central product narrative.

The UI should make the transitions between these states obvious.

---

# 55. DEFINITION OF “WORLD-CLASS” FOR THIS PROTOTYPE

The prototype is ready when a reviewer can understand the system without being told how the backend works.

Within seconds they should understand:

```text
This is for civic complaints.
```

Then:

```text
AI turns messy citizen reports into structured decisions.
```

Then:

```text
The authority can act on those decisions quickly.
```

Then:

```text
Workers provide physical proof.
```

Then:

```text
The system verifies the repair.
```

Finally:

```text
The citizen can see what happened.
```

That is enough.

Do not chase visual novelty for its own sake.

The strongest visual advantage should come from:

```text
Hierarchy
+
Consistency
+
Evidence
+
State visibility
+
Operational clarity
+
Role-specific UX
+
Reliable interactions
```

---

# 56. IMPLEMENTATION ORDER

Execute in this exact practical sequence:

```text
PHASE 0
Repository safety
↓
Baseline screenshots
↓
Smoke test

PHASE 1
Shared component cleanup
↓
Typography / spacing / button / badge consistency
↓
Skeleton / Error / Empty primitives
↓
Motion primitives

PHASE 2
Citizen report redesign
↓
AI processing experience
↓
Citizen dashboard
↓
Public tracking

PHASE 3
Authority dashboard
↓
Attention strip
↓
SLA visuals
↓
Incident queue
↓
Incident investigation workspace
↓
Duplicate cluster
↓
Map interaction
↓
Fast Track dispatch

PHASE 4
Worker mobile workflow
↓
Task detail
↓
Proof upload
↓
Before/After
↓
Verification state UI

PHASE 5
Landing page
↓
Analytics
↓
Notifications
↓
Mobile navigation
↓
Responsive QA

PHASE 6
Demo fixtures
↓
Demo harness
↓
Live E2E
↓
SQL/RPC validation
↓
Recording rehearsal

PHASE 7
Final visual regression
↓
Build/test gates
↓
Git status / commit review
```

---

# 57. FINAL INSTRUCTION TO THE CODING AGENT

Do not interpret this document as a request to create a completely new product.

**Upgrade the current Jan Samadhan codebase in place.**

Preserve the existing architecture and functional capabilities.

Prioritize the six flagship experiences:

```text
1. Citizen Report
2. AI Processing
3. Authority Investigation
4. Duplicate Cluster + GIS
5. Worker Resolution + AI Verification
6. Public Tracking
```

Make these six experiences feel like one product.

When forced to choose between:

```text
new feature
```

and

```text
better interaction / clarity / reliability of an existing feature
```

choose the latter.

When forced to choose between:

```text
visual effect
```

and

```text
better evidence / state feedback / workflow clarity
```

choose the latter.

When forced to choose between:

```text
technically ambitious but fragile
```

and

```text
simpler but deterministic and demo-safe
```

choose deterministic and demo-safe.

The objective is a prototype that looks and behaves like a credible civic operations product, not a collection of hackathon features.

**Do the implementation, run the relevant tests, and leave the repository in a coherent, reviewable state.**
