# Jan Samadhan AI — World-Class Government-Grade Prototype V2
## Automation + Government Workflow Features + Complaint Tracking + Citizen Engagement + Reliability

**Version:** 2.0  
**Date:** 2026-09-20  
**Audience:** Coding/Reasoning Agent implementing directly against the existing Jan Samadhan repository  
**Primary objective:** Upgrade the existing Jan Samadhan product in place so it feels like a credible, production-shaped civic grievance platform, while making the prototype exceptionally strong for a recorded shortlist/demo.

---

# 0. READ THIS FIRST

This is a **master implementation brief**, not a request to rebuild Jan Samadhan from scratch.

The current codebase already has substantial functionality and hardening. Preserve it.

The implementation goal is:

```text
Existing Jan Samadhan
        +
Government-grade case lifecycle
        +
Durable automation
        +
Citizen tracking / receipt
        +
Citizen feedback / reopen / appeal
        +
Light civic engagement
        +
Operational transparency
        +
Demo reliability
```

Do not add technology merely because it sounds advanced.

The product should feel:

```text
Government-grade
+
Modern SaaS
+
Citizen-friendly
+
Operationally credible
+
Evidence-driven
```

It must NOT feel like:

```text
AI startup dashboard
Generic CRUD application
Government portal from 2010
Neon AI interface
Fake enterprise software
```

---

# 1. CURRENT CODEBASE BASELINE

The latest codebase report dated **2026-09-20** says:

- branch `initial-v1`
- commit `daeb421` contains final polish
- origin is synced
- frontend typecheck / Knip / build pass
- frontend unit tests: 3/3 pass
- backend tests: 145 pass
- Ruff: 0 findings
- Vulture: 0 findings
- authorization sweep: 12/12 pass
- Authority UI/UX overhaul is complete
- Gemini Vision migration is complete
- frontend bundle splitting is complete
- Trust Scoring is now wired
- visual smoke testing is still incomplete
- migrations 006/007/008 and `finalize_resolution` RPC are still not validated against real PostgreSQL
- live E2E re-verification is still pending
- residual RLS/database security review is still pending

Do not mark the prototype production-ready merely because automated tests are green.

---

# 2. CURRENT IMPLEMENTED CAPABILITIES TO PRESERVE

The current application already contains:

## Citizen

- Web incident reporting
- Categories
- Description
- Image upload
- Location
- Audio support
- Multilingual support
- Citizen dashboard
- Notifications
- WhatsApp intake
- Public QR/project tracking

## AI

```text
Transcription
→ Vision Analysis
→ Translation
→ Classification
→ Severity
→ Department Routing
```

plus:

```text
Duplicate detection
Trust scoring
Resolution verification
```

## Authority

- Incident queue
- AI assessment
- SLA engine
- SLA quick filters
- Fast Track dispatch
- Triage workspace
- GIS map
- SLA-coded pins
- Dynamic map recentering
- CSV export
- Responsive authority UI

## Worker

- Assigned task queue
- Status updates
- Proof-of-resolution photo
- AI resolution verification

## Infrastructure

- FastAPI
- Supabase PostgreSQL/Auth/Storage
- LangGraph
- Groq for several text/voice tasks
- Gemini Flash for vision
- Twilio WhatsApp
- React/TypeScript/Vite/Tailwind
- Zustand
- Recharts
- Leaflet

Do not replace these systems unless a concrete bug or stability issue requires it.

---

# 3. CURRENT REPORT FINDINGS THAT MUST STILL BE CLOSED

Before new feature work is considered finished:

## P0 deployment validation

The current report says migrations:

```text
006
007
008
```

and:

```text
finalize_resolution
```

have not been proven on real PostgreSQL.

Validate:

- verified resolution path
- rejected resolution path
- verification error path
- failed audit insertion behavior
- repeated finalization
- concurrent finalization
- authorization for RPC
- trigger behavior
- service-role behavior
- anonymous/authenticated behavior

## P0 live E2E

Re-run:

```text
Citizen report
→ AI
→ Authority
→ Assignment
→ Worker
→ Proof upload
→ AI verification
→ Citizen tracking
```

Also re-test:

```text
WhatsApp
Notifications
Duplicate linkage
Worker ownership
Authority resolution
```

after hardening.

## P0 visual smoke test

Walk:

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
- no missing assets
- no `/css/ux4g.css`
- navy primary styling
- typography
- spacing
- cards
- shadows
- responsive behavior
- restored auth guards

## P0 database security

Re-verify:

- RLS policies
- service-role-only operations
- no privileged secret in frontend bundle
- public tracking endpoint sanitization
- worker authorization
- citizen ownership
- public access boundaries

---

# 4. IMPORTANT DOCUMENTATION / SOURCE-OF-TRUTH WARNING

Older implementation reports contain historical statements that were later fixed.

Do NOT blindly implement old findings such as:

```text
auth bypass everywhere
duplicate clusters not persisted
WhatsApp confirmations dead
TrustScoring not wired
bundle splitting absent
```

The 2026-09-20 report explicitly says several of those areas have already been fixed.

Always inspect the actual current source before making changes.

---

# 5. NEW PRODUCT NORTH STAR

The user should experience Jan Samadhan as:

```text
REPORT
   ↓
ACKNOWLEDGE
   ↓
UNDERSTAND
   ↓
TRIAGE
   ↓
ASSIGN
   ↓
REPAIR
   ↓
VERIFY
   ↓
FEEDBACK
   ↓
CLOSE / REOPEN / APPEAL
   ↓
TRACK
```

The authority should experience:

```text
INGEST
→ CLASSIFY
→ PRIORITIZE
→ CLUSTER
→ ASSIGN
→ MONITOR SLA
→ ESCALATE
→ VERIFY
→ CLOSE
```

Automation should sit across this lifecycle.

---

# 6. GOVERNMENT-GRADE FEATURES TO INCORPORATE

The feature list below is based on current/recent official government grievance systems and official government platform documentation.

## 6.1 CPGRAMS-inspired features

The Government of India CPGRAMS currently exposes:

- grievance registration
- unique registration ID
- status tracking
- reminder
- clarification
- feedback/rating
- appeal
- appeal-status tracking
- role-based authority access
- escalation/nodal officer concepts
- notification after resolution

Official references:

- CPGRAMS home: https://www.pgportal.gov.in/
- CPGRAMS FAQ: https://pgportal.gov.in/Home/Faq
- CPGRAMS sitemap: https://pgportal.gov.in/Sitemap
- 2024 Comprehensive Guidelines for Handling Public Grievances: https://pgportal.gov.in/Home/Preview/Q29tcHJlaGVuc2l2ZUd1aWRlbGluZXNGb3JIYW5kbGluZ1RoZVB1YmxpY0dyaWV2YW5jZXMucGRm

## 6.2 Maharashtra grievance / Aaple Sarkar-inspired features

Official Maharashtra material documents:

- unique tracking number
- tracking of current grievance status
- time-bound redressal
- citizen feedback
- first/second/third appeal concepts for delayed/denied services in the Right to Public Services ecosystem

References:

- Maharashtra grievance system: https://sjsa.maharashtra.gov.in/service/%E0%A4%A4%E0%A4%95%E0%A5%8D%E0%A4%B0%E0%A4%BE%E0%A4%B0-%E0%A4%A8%E0%A4%BF%E0%A4%B5%E0%A4%BE%E0%A4%B0%E0%A4%A3-%E0%A4%AA%E0%A5%8D%E0%A4%B0%E0%A4%A3%E0%A4%BE%E0%A4%B2%E0%A5%80/
- Aaple Sarkar Right to Service: https://sjsa.maharashtra.gov.in/en/service/aaple-sarkar/

## 6.3 Swachhata / MoHUA-inspired features

Official Swachhata documentation shows:

- photo-first complaint reporting
- geolocation
- regular status notifications
- citizen comments
- citizen feedback
- final resolution feedback
- reopen unresolved complaints
- public participation / vote-up
- mandatory proof image before engineer can resolve
- ward-based auto-assignment
- complaint filters by ward/category/status/time
- resolution-time reporting
- city/ward performance views

References:

- Swachhata platform: https://www.swachh.city/
- Swachhata technology platform documentation: https://www.swachh.city/assets/files/swachhata-technology-platform.pdf
- Swachhata state-admin FAQ: https://www.swachh.city/assets/files/Swachhata_State_Admin_Module_FAQ_V2.1.pdf
- Swachhata engineer documentation: https://www.swachh.city/assets/files/Navigating_Swachh_city_for_State_Admins_FAQ.pdf

## 6.4 MCGM-style operational patterns

Official MCGM material also demonstrates enterprise support patterns such as:

- unique ticket number
- full issue lifecycle tracking
- escalation matrix
- multi-channel intake including application, phone, email, SMS and WhatsApp
- severity classification
- tracking to resolution
- feedback
- weekly status reporting

References:

- MCGM support/incident-management RFP material: https://portal.mcgm.gov.in/

Important:
Do not present these sources as evidence that Jan Samadhan is an official Government of India or BMC application. We are borrowing documented workflow patterns, not government branding.

---

# 7. GOVERNMENT FEATURE MATRIX

Implement the following.

| Government-grade pattern | Jan Samadhan implementation |
|---|---|
| Unique grievance ID | Improve current tracking ID entropy |
| Public status tracking | Dedicated individual incident tracking |
| Reminder | Citizen reminder / authority follow-up |
| Clarification | Authority ↔ citizen clarification thread |
| Rating | Post-resolution satisfaction |
| Reopen | Citizen reopen request |
| Appeal | Authority/escalation review workflow |
| Nodal officer | Configurable escalation role |
| Citizen charter | Category-specific SLA / expected action |
| Geo-tagging | Existing location + ward |
| Photo proof | Existing photo + worker after-photo |
| Mandatory resolution proof | Preserve hardened logic |
| Auto assignment | Automation engine |
| Ward filtering | Authority filters |
| Escalation matrix | Automation rules |
| Public transparency | Public aggregate civic dashboard |
| Community support | “Support this issue” / corroboration |
| Status notifications | Existing notification lifecycle + expanded UX |
| Multi-channel intake | Web + WhatsApp unified incident |
| Printable complaint receipt | New |
| Complaint history | New citizen-facing case timeline |
| Automation history | New authority feature |

---

# 8. FEATURE 1 — DEDICATED COMPLAINT TRACKING

This is a major missing area.

The current system has public QR/project tracking, but Jan Samadhan needs a first-class **individual incident tracking experience**.

Do not make project QR tracking the only public tracking mechanism.

## New route

Preferred:

```text
/track/:trackingId
```

or, for stronger public security:

```text
/track/:publicToken
```

Recommended production-shaped architecture:

```text
Human-facing tracking ID
CIV-2026-XXXXXXXXXXXX

Private/public lookup token
high-entropy random value
```

Do not expose raw incident UUIDs.

## Critical security improvement

The historical implementation used tracking IDs similar to:

```text
CIV-<epoch>-<4 hex>
```

That is too guessable for a public lookup mechanism.

Replace or augment it with a cryptographically random public token.

Recommended:

```text
CIV-2026-8F3K1Q7M9X2P
```

or:

```text
tracking_id = human reference
public_token = 128-bit random lookup secret
```

The exact implementation should use the least disruptive safe approach.

---

# 9. TRACKING PAGE UX

Design:

```text
JAN SAMADHAN

Track a Civic Complaint

[ CIV-2026-8F3K1Q7M9X2P ]

[Track complaint]
```

After lookup:

```text
Water Pipeline Leak
Gandhi Road

CIV-2026-8F3K1Q7M9X2P

HIGH PRIORITY
● IN PROGRESS

Expected action
Within current SLA

Assigned department
Water Department
```

Then the main timeline:

```text
✓ Report received
Sep 20 · 10:42

✓ AI triage completed
High severity
Water Department

✓ Duplicate reports linked
23 related reports

✓ Fast-Track dispatch
11:01

✓ Worker assigned
Ravi Kumar

● Repair in progress

○ Resolution verification

○ Citizen confirmation
```

The current step must be visually dominant.

---

# 10. TRACKING PAGE SHOULD SHOW A CITIZEN-SAFE CASE RECORD

Visible:

```text
Tracking ID
Title
Category
Severity
Area / location
Current status
Department
Assigned worker name if policy allows
SLA status
Timeline
Citizen-visible updates
Before image
After image when available
Verification outcome
Feedback state
Reopen/appeal state
```

Never expose:

```text
Citizen email
Citizen phone
Internal IDs
Service-role data
Internal prompts
Raw AI JSON
Security metadata
Private officer contact details
Internal database IDs
```

---

# 11. TRACKING SEARCH STATES

Implement:

### Loading

```text
Finding your complaint...
```

### Not found

```text
We could not find this complaint.

Check the grievance ID and try again.
```

### Active

Show live timeline.

### Resolved

Show:

```text
✓ ISSUE RESOLVED

Resolution verified

Before → After
```

### Reopened

Show:

```text
↻ COMPLAINT REOPENED

Citizen requested another review.
```

### Appeal

Show:

```text
ESCALATED FOR REVIEW

Your request has moved to the next review level.
```

---

# 12. FEATURE 2 — GENERATE COMPLAINT RECEIPT

After submission, provide:

```text
[View complaint]
[Download complaint receipt]
[Copy tracking ID]
[Share tracking link]
```

## Receipt title

```text
JAN SAMADHAN
MUNICIPAL GRIEVANCE RECEIPT
```

Important:
Do not present a fake government emblem or claim official government status.

Use only Jan Samadhan branding.

## Receipt contents

```text
Grievance ID
Submission date/time
Source channel
Citizen name (if appropriate)
Category
Description
Location
Department
Initial severity
SLA / service standard
Attached evidence
Current status
Public tracking link
QR code
```

If there is a QR code, encode the secure public tracking URL.

## PDF implementation

Avoid adding a heavy PDF dependency unless necessary.

Preferred first implementation:

```text
Print-friendly receipt route
+
window.print()
+
@media print
```

The user can choose “Save as PDF”.

If the existing stack already has a suitable PDF library, inspect it before adding another dependency.

Do not block the main submission path on PDF generation.

---

# 13. COMPLAINT RECEIPT VISUAL DESIGN

Use an official-document-inspired layout without falsely claiming government authority.

Example:

```text
┌─────────────────────────────────────────────┐
│ JAN SAMADHAN                  GENERATED COPY │
│ Municipal Grievance Receipt                 │
├─────────────────────────────────────────────┤
│ GRIEVANCE ID                                │
│ CIV-2026-8F3K1Q7M9X2P                       │
│                                             │
│ Water Pipeline Leak                         │
│ Gandhi Road, Mumbai                         │
│                                             │
│ Submitted       Sep 20, 2026 · 10:42 AM     │
│ Department      Water Department             │
│ Severity        HIGH                         │
│ SLA             ON TRACK                     │
├─────────────────────────────────────────────┤
│ EVIDENCE                                    │
│ [thumbnail]                                 │
├─────────────────────────────────────────────┤
│ TRACK YOUR COMPLAINT                        │
│ [QR]  jansamadhan.example/track/...         │
└─────────────────────────────────────────────┘
```

---

# 14. FEATURE 3 — CITIZEN CASE HISTORY

Create a stronger citizen-facing case record.

Citizen dashboard card:

```text
Water Pipeline Leak
Gandhi Road

HIGH
In Progress

AI triage ✓
Worker assigned ✓
Repair pending

SLA
01h 18m remaining

[Track complaint]
```

Clicking it should navigate to the same case identity used by public tracking.

This creates continuity:

```text
Citizen dashboard
→ complaint
→ tracking
→ receipt
```

---

# 15. FEATURE 4 — CLARIFICATION REQUEST

Borrow the CPGRAMS concept of clarification.

Authority should be able to click:

```text
Request clarification
```

Then enter:

```text
What do you need from the citizen?

[Text area]

[Send clarification]
```

Citizen receives:

```text
ACTION REQUIRED

The municipal team needs more information
about your complaint.

"Can you confirm whether the leak is still active?"

[Reply]
[Attach photo]
```

## Do not create a new incident for this.

Keep the message attached to the existing case.

---

# 16. CLARIFICATION THREAD

Add:

```text
Communication
```

inside incident detail.

Timeline:

```text
10:42 Report received
10:43 AI triage complete
11:01 Worker assigned
11:14 Authority requested clarification
11:21 Citizen replied
```

This is far more realistic than a one-directional ticket system.

---

# 17. FEATURE 5 — CITIZEN FEEDBACK

After resolution:

```text
Was your issue resolved?

[ Yes, fully resolved ]
[ No, still an issue ]
```

Optional rating:

```text
How satisfied are you?

☆ ☆ ☆ ☆ ☆
```

Optional tags:

```text
Resolution quality
Speed
Communication
Evidence
```

Optional comment.

Do not force a 1–5 rating if a binary answer is more appropriate.

---

# 18. FEATURE 6 — REOPEN COMPLAINT

After resolution, citizen should see:

```text
Is the issue actually resolved?

[Yes]
[No, reopen complaint]
```

If reopening:

```text
Why are you reopening this complaint?

○ Issue still exists
○ Repair was incomplete
○ Issue returned
○ Wrong issue resolved
○ Other

[Add comment]
[Upload current photo]
[Request reopening]
```

Then:

```text
REOPEN REQUESTED

Your complaint has been returned for review.
```

Authority gets a notification.

Automation can reassign/re-escalate it.

---

# 19. FEATURE 7 — APPEAL / ESCALATION

Do not overcomplicate this.

Use:

```text
Request escalation
```

or:

```text
Appeal decision
```

when:

- complaint has breached SLA
- reopened complaint is unresolved
- citizen explicitly disputes closure
- configurable authority policy allows appeal

## Appeal form

```text
Reason

○ Complaint unresolved
○ Incorrect closure
○ No action within SLA
○ Incorrect department
○ Other

Details
[textarea]

[Submit appeal]
```

## Appeal timeline

```text
Appeal submitted
→ Review assigned
→ Under review
→ Decision recorded
```

The citizen can track appeal status.

---

# 20. FEATURE 8 — CITIZEN CHARTER / SERVICE STANDARD

Use the existing SLA engine.

Do not create a second SLA calculation system.

Every category can expose:

```text
SERVICE STANDARD

Expected action
Within category SLA

Current case
01h 18m remaining
```

On the report page:

```text
For Water Leak complaints:
Expected response target: [derive from sla.ts]
Responsible department: Water
```

On the tracker:

```text
Citizen Charter

Service standard
ON TRACK

Remaining
01h 18m
```

The exact target must come from the canonical existing SLA implementation.

Do not invent arbitrary SLA values in UI components.

---

# 21. FEATURE 9 — ESCALATION MATRIX

Create an authority-facing escalation model:

```text
LEVEL 1
Assigned field worker

        ↓ SLA threshold

LEVEL 2
Ward supervisor / authority

        ↓ additional threshold

LEVEL 3
Nodal grievance officer / senior authority
```

Do not invent real officer names unless they exist in configured demo data.

Use roles/designations:

```text
Ward Supervisor
Department Officer
Nodal Grievance Officer
```

These are configuration labels, not fake identities.

---

# 22. FEATURE 10 — AUTOMATION CENTER

This is a major new module.

Add an Authority navigation item:

```text
Automation
```

Possible route:

```text
/authority/automations
```

## Page structure

```text
Automation Center

Automations keep routine civic operations moving
without manual follow-up.

[Create automation]
```

Then:

```text
ACTIVE RULES

Auto-assign by ward
● Active
Last run 1 min ago

SLA warning
● Active
Last run 1 min ago

SLA escalation
● Active
Last run 2 min ago

Duplicate cluster alert
● Active

Citizen resolution follow-up
● Active
```

---

# 23. AUTOMATION RULE TYPES

At minimum implement these:

## Rule A — Auto-route / auto-assign

Trigger:

```text
New incident
```

Conditions:

```text
AI triage complete
Department known
Ward/jurisdiction known
Incident unassigned
```

Action:

```text
Choose best eligible worker
```

Selection priority:

```text
1. same ward/jurisdiction
2. correct department
3. lowest active workload
4. available status
5. stable deterministic tie-break
```

If exact worker location/status does not exist in current schema, use the least invasive available fields and add the minimum required worker/ward configuration.

Never select mock workers in production.

---

# 24. AUTOMATION RULE B — SLA WARNING

Trigger:

```text
SLA remaining <= configurable threshold
```

Example:

```text
20% remaining
```

Action:

```text
notify assigned worker
notify responsible authority
```

Do not hardcode only one threshold.

Make the rule configurable.

Human-readable preview:

```text
When an incident has less than 20% of its SLA remaining,
notify the assigned worker and responsible authority.
```

---

# 25. AUTOMATION RULE C — SLA BREACH ESCALATION

Trigger:

```text
SLA breached
```

Conditions:

```text
status not resolved
```

Action:

```text
notify supervisor
escalate level
create incident update
mark requires attention
```

Human-readable result:

```text
SLA BREACH

CIV-2026-XXXX
Water Leak

Escalated to Department Officer.
```

---

# 26. AUTOMATION RULE D — UNASSIGNED TIMEOUT

Trigger:

```text
Incident remains unassigned for N minutes
```

Action:

```text
auto-assign if safe
otherwise escalate
```

This can be especially compelling in the demo.

---

# 27. AUTOMATION RULE E — DUPLICATE CLUSTER THRESHOLD

Trigger:

```text
duplicate_count >= N
```

Action:

```text
notify authority
increase attention state
suggest Fast Track
```

Do NOT silently manipulate government priority beyond the configured policy.

Show:

```text
COMMUNITY IMPACT ALERT

23 related complaints detected
within the same area.

[Review cluster]
```

---

# 28. AUTOMATION RULE F — RESOLUTION FOLLOW-UP

Trigger:

```text
Incident becomes resolved
```

Action:

```text
wait configurable period
request citizen feedback
```

Citizen:

```text
Was this issue actually resolved?

[Yes]
[No]
```

This is a strong bridge between automated verification and human confirmation.

---

# 29. AUTOMATION RULE G — VERIFICATION FAILURE

Trigger:

```text
resolution verification = rejected/error
```

Action:

```text
incident back to appropriate review state
notify worker
notify authority
create timeline entry
```

Never treat provider/system error as proof that the worker failed.

The current hardened architecture already distinguishes:

```text
verified
rejected
error
```

Preserve that distinction.

---

# 30. AUTOMATION RULE H — INACTIVITY REMINDER

Trigger:

```text
No action/update for N hours
```

Action:

```text
notify owner
notify supervisor if still inactive
```

This makes the case lifecycle more realistic.

---

# 31. AUTOMATION RULE I — DAILY AUTHORITY DIGEST

Create a scheduled summary:

```text
DAILY CIVIC OPERATIONS DIGEST

42 incidents received
31 resolved
5 SLA risks
3 SLA breaches
2 verification reviews
4 duplicate clusters

Top affected category
Water

Longest open incident
CIV-2026-XXXX

[Open dashboard]
```

In the prototype this can initially appear inside the Automation Center and/or notification panel.

Actual email/WhatsApp delivery should only be claimed when the external integration is truly configured.

---

# 32. AUTOMATION RULE BUILDER

Do not build a generic Zapier clone.

Use focused civic operations templates.

UI:

```text
Create automation

WHEN
[Incident is created ▼]

AND
[Severity is Critical ▼]

AND
[Incident is unassigned ▼]

THEN
[Auto-assign worker ▼]

AND
[Notify authority ▼]

[Save automation]
```

Below the builder:

```text
Natural-language preview

"When a critical incident is unassigned,
automatically assign an eligible worker
and notify the responsible authority."
```

This makes the automation feature understandable in seconds.

---

# 33. AUTOMATION RUN HISTORY

Show:

```text
RUN HISTORY

09:42
SLA warning
CIV-2026-91AF
✓ completed

09:41
Auto-assign
CIV-2026-91B2
✓ Ravi Kumar assigned

09:39
Duplicate alert
Cluster CL-004
✓ authority notified

09:36
SLA escalation
CIV-2026-7A19
✓ escalated
```

This is an excellent “real system” visual.

---

# 34. AUTOMATION DATA MODEL

Use a durable structure.

Suggested:

```text
automation_rules
----------------
id
name
key
description
enabled
trigger_type
conditions_json
actions_json
schedule_json
scope_json
created_by
created_at
updated_at
last_run_at
```

```text
automation_runs
---------------
id
rule_id
incident_id nullable
status
idempotency_key
actions_taken_json
error_message
started_at
completed_at
```

Do not create multiple tables for each automation type.

Keep rule behavior data-driven where practical.

---

# 35. DURABLE AUTOMATION ENGINE

Do NOT implement recurring automation using only:

```text
FastAPI BackgroundTasks
```

That is not durable across restart/multiple instances.

Recommended architecture:

```text
Supabase Cron
      ↓
secured automation tick
      ↓
FastAPI AutomationEngine
      ↓
evaluate due rules
      ↓
perform idempotent actions
      ↓
automation_runs
```

Current Supabase documentation confirms Cron can execute scheduled jobs and make HTTP requests, and can be combined with `pg_net` for periodic invocation.

Recommended endpoint:

```text
POST /api/internal/automations/tick
```

Protect it with a dedicated secret:

```text
AUTOMATION_CRON_SECRET
```

Do not use:

```text
SUPABASE_SERVICE_ROLE_KEY
```

as the HTTP authorization secret.

The endpoint should reject unauthorized calls.

---

# 36. IDEMPOTENCY REQUIREMENTS

Automation must not spam users or duplicate assignments.

Every run needs:

```text
idempotency_key
```

Examples:

```text
sla-warning:{incident_id}:{threshold}
auto-assign:{incident_id}
verification-followup:{incident_id}:{date}
```

Before executing:

```text
check automation_runs
```

If already completed:

```text
skip
```

This is mandatory.

---

# 37. MANUAL "RUN NOW" FOR DEMO

The Automation Center should have:

```text
[Run automations now]
```

This should trigger the same engine used by the scheduler.

This gives deterministic demo control without changing production logic.

In production configuration, this should require Authority/admin authorization.

In development, the demo environment may expose it behind development gating.

---

# 38. AUTOMATION STATUS HEADER

Authority screen:

```text
AUTOMATION

● 8 rules active
Last evaluation 18 sec ago

[View automations]
```

Do not fabricate "last evaluation" unless the engine actually records it.

---

# 39. FEATURE 11 — LIGHT CIVIC GAMIFICATION

Yes, add it, but **do not turn Jan Samadhan into a game**.

Use:

```text
Civic Contribution
```

not:

```text
Leaderboard
```

and definitely not:

```text
Top reporters
```

Do NOT reward raw complaint volume.

That could incentivize spam.

---

# 40. CIVIC CONTRIBUTION MODEL

Keep this separate from:

```text
Trust Score
```

Trust Score:

```text
internal credibility / moderation signal
```

Civic Points:

```text
positive participation / engagement reward
```

Never use Civic Points to:

```text
change severity
change SLA
skip verification
override authorities
increase complaint priority
```

---

# 41. CIVIC POINTS RULES

Suggested initial rules:

```text
+10
validated civic report

+5
useful evidence accepted

+5
citizen confirms a genuine resolution

+3
citizen provides useful follow-up information

+2
citizen contributes useful clarification
```

Do not award points for:

```text
Opening many reports
Repeatedly reopening a complaint
Voting repeatedly
Generating receipts
Viewing tracking pages
```

Optional daily/weekly cap:

```text
30 points/day
```

The exact values should be configurable.

---

# 42. CIVIC BADGES

Use restrained badges:

```text
Neighbourhood Watch
Evidence Contributor
Civic Observer
Resolution Verifier
Community Helper
```

Badge criteria must be activity-based and transparent.

Avoid fake prestige.

---

# 43. CITIZEN PROFILE UX

Citizen dashboard:

```text
CIVIC CONTRIBUTION

128 points

Neighbourhood Watch
Evidence Contributor

5 validated reports
2 resolution confirmations
```

Use a quiet progress card.

Do not dominate the dashboard with gamification.

The primary purpose remains:

```text
Report
Track
Resolve
```

---

# 44. COMMUNITY SUPPORT FEATURE

Borrow the Swachhata “vote-up” idea carefully.

On an appropriate public/local incident screen:

```text
23 people have reported / supported this issue

[Support this issue]
```

A user can support an existing issue once.

This should:

```text
add community corroboration
```

but must NOT:

```text
directly control severity
automatically prioritize over safety
```

The authority can see:

```text
23 related reports
```

as operational evidence.

Existing duplicate clustering should remain the actual consolidation mechanism.

---

# 45. FEATURE 12 — PUBLIC CIVIC TRANSPARENCY DASHBOARD

This is optional P1 but highly valuable.

Route:

```text
/transparency
```

or:

```text
/civic-pulse
```

Show anonymized aggregate metrics:

```text
CIVIC RESPONSE PULSE

Open incidents
42

Resolved this week
118

SLA compliance
87%

Median resolution time
2h 18m

Citizen satisfaction
4.4 / 5

Duplicate reports consolidated
31%
```

Then:

```text
BY CATEGORY
Water
Roads
Sanitation
Streetlights
Safety
```

and:

```text
BY WARD
Ward A
Ward B
Ward C
...
```

Do not publish citizen identities or precise private locations.

For demo data, clearly label the environment:

```text
Prototype / Demonstration Data
```

Do not make demo numbers look like actual Mumbai/BMC performance.

---

# 46. FEATURE 13 — CHANNEL UNIFICATION

The authority detail should show:

```text
SOURCE
WEB
```

or:

```text
SOURCE
WHATSAPP
```

All channels should converge into the same incident record.

Example:

```text
SOURCE
WhatsApp

Citizen message
Image
Audio
Location

↓
Same AI triage pipeline
```

This is a strong product story.

---

# 47. FEATURE 14 — WHATSAPP RECEIPT

The current report says outbound WhatsApp confirmation is wired.

Make it visible in the UX narrative.

After WhatsApp case creation:

```text
Jan Samadhan

Complaint received.

Grievance ID:
CIV-2026-XXXXXXXX

Track:
<public tracking link>
```

Do not claim delivery if Twilio did not confirm delivery.

---

# 48. FEATURE 15 — INCIDENT COMMUNICATION CENTER

Inside authority incident detail:

```text
ACTIVITY

System
AI triage completed

Authority
Fast Track dispatch

Worker
Repair started

Authority
Clarification requested

Citizen
Reply received

System
Resolution verified
```

This becomes the authoritative case timeline.

---

# 49. AI TRANSPARENCY IMPROVEMENT

AI panel should distinguish:

```text
AI recommendation
Human decision
Final status
```

Example:

```text
AI RECOMMENDATION

Severity
HIGH

Confidence
92%

Department
Roads & Infrastructure

Reasoning
✓ visible surface damage
✓ vehicle safety risk
✓ active road obstruction

────────────────

AUTHORITY DECISION

Accepted AI recommendation

────────────────

FINAL STATUS
Fast Tracked
```

This is more credible than portraying the AI as the final authority.

---

# 50. AI PARTIAL-FAILURE UX

Re-check current implementation.

If:

```text
Vision succeeds
Classification succeeds
Severity fails
```

the interface should NOT say:

```text
AI analysis complete
```

Use:

```text
AI REVIEW PARTIALLY COMPLETE

Category identified
Image analyzed

Severity assessment unavailable
Manual review recommended
```

The UI should reflect actual backend state.

---

# 51. RESOLUTION VERIFICATION UX

Preserve current hardened tri-state:

```text
VERIFIED
REJECTED
ERROR / MANUAL REVIEW
```

Do not collapse:

```text
provider failure
```

into:

```text
repair rejected
```

The user experience must make this distinction obvious.

---

# 52. WORKER NETWORK RESILIENCE

This is a realistic underserved area.

Field workers may lose connectivity.

Add P1 resilience:

```text
Photo captured
↓
Saved locally
↓
Upload pending
↓
Connection restored
↓
Upload resumes
```

For the prototype:

- local draft state is enough
- show retry UI
- preserve captured photo
- do not lose proof when upload fails
- show offline banner

Do not claim full offline synchronization unless actually implemented.

---

# 53. REPORT DRAFT RECOVERY

Citizen report flow should preserve draft data on unexpected refresh/temporary network loss.

At minimum:

```text
Draft saved locally
```

with:

```text
Resume report
Discard draft
```

Do not persist sensitive media indefinitely.

Keep the draft system bounded and explicit.

---

# 54. AUTHORITY "NEEDS ATTENTION" MODEL

Authority dashboard should prioritize action over raw KPIs.

Example:

```text
NEEDS ATTENTION

4 SLA BREACHING
8 DUE WITHIN 2 HOURS
12 UNASSIGNED
3 DUPLICATE CLUSTERS
2 VERIFICATION REVIEWS
4 REOPEN REQUESTS
1 APPEAL
```

Each is clickable.

This creates the feeling of a real operations console.

---

# 55. WORKER LOAD MODEL

Authority assignment should expose:

```text
Worker
Department
Ward
Active tasks
SLA risk
Availability
```

Example:

```text
Ravi Kumar
Water Department
Ward 12

Active tasks
4

SLA risks
1

[Assign]
```

Use current available data where possible.

Add only the minimum missing fields required for meaningful automation.

---

# 56. AUTO-ASSIGN UX

When automatic assignment happens:

```text
✓ AUTOMATICALLY ASSIGNED

Ravi Kumar
Water Department · Ward 12

Reason
Nearest eligible workload match
```

If the system cannot auto-assign:

```text
AUTO-ASSIGNMENT FAILED

No eligible worker available for this jurisdiction.

[Assign manually]
```

Never silently fail.

---

# 57. GOVERNMENT-GRADE INCIDENT HEADER

Standardize:

```text
CIV-2026-XXXXXXXX

CRITICAL
Water Pipeline Leak

Gandhi Road
Ward 12

Source: WhatsApp

SLA
00h 38m remaining
```

Then:

```text
[Fast Track]
[Assign]
[Request clarification]
[Change status]
```

This header should be shared across:

```text
Authority
Worker
Citizen tracker
Receipt
```

---

# 58. STATUS MODEL

Avoid expanding the fundamental incident status enum unnecessarily.

Use current statuses where possible:

```text
pending
assigned
in-progress
resolved
rejected
closed
```

Additional lifecycle concepts can be represented through:

```text
appeal state
feedback state
verification state
clarification state
automation state
```

unless source inspection proves a dedicated status is necessary.

This minimizes backend churn.

---

# 59. DATA MODEL EXTENSIONS

Use the smallest safe schema changes.

Suggested new structures:

## `incident_feedback`

```text
id
incident_id
citizen_id
satisfied
rating nullable
tags_json
comment nullable
created_at
```

## `incident_appeals`

```text
id
incident_id
citizen_id
reason
details
status
review_level
reviewed_by nullable
review_notes nullable
created_at
updated_at
```

## `incident_communications`

```text
id
incident_id
sender_id
sender_role
message
requires_response
response_due_at nullable
created_at
read_at nullable
```

## `automation_rules`

see section 34.

## `automation_runs`

see section 34.

## `civic_points_ledger`

```text
id
citizen_id
incident_id nullable
points
reason
event_key
created_at
```

Use `event_key` to prevent duplicate rewards.

## `citizen_badges`

Only create a table if badges cannot reasonably be derived.

Do not add unnecessary duplication.

---

# 60. TRACKING TOKEN DATA MODEL

Preferred:

```text
tracking_id
public_tracking_token
```

Use:

```text
tracking_id
```

for human reference.

Use:

```text
public_tracking_token
```

for public API lookup.

Do not expose database primary keys as public identifiers.

---

# 61. PUBLIC TRACKING API

Suggested:

```text
GET /api/v1/public/incidents/track/{public_token}
```

Return only:

```text
tracking_id
title
category
severity
status
department
location_label
ward
source
created_at
sla_state
sla_due_at
citizen_visible_timeline
resolution_image
verification_status
feedback_eligible
reopen_eligible
appeal_eligible
```

Do not expose internal incident JSON.

---

# 62. CITIZEN ACTION API

Suggested endpoints:

```text
POST /api/v1/incidents/{id}/feedback
POST /api/v1/incidents/{id}/reopen
POST /api/v1/incidents/{id}/appeal
POST /api/v1/incidents/{id}/clarifications
GET  /api/v1/incidents/{id}/communications
GET  /api/v1/incidents/{id}/receipt
```

Names can differ if the codebase has established naming conventions.

Reuse existing authorization middleware.

---

# 63. AUTHORIZATION RULES

## Citizen

May:

```text
view own incident
view public tracking
submit feedback on eligible own incident
request reopen on eligible own incident
submit appeal on eligible own incident
respond to clarification on own incident
view own communications
download own receipt
```

## Authority

May:

```text
view all incidents within allowed scope
request clarification
approve/reject reopen
review appeals
configure automation if authorized
view automation logs
assign worker
override AI triage
```

## Worker

May:

```text
view assigned incidents
update assigned incident
upload resolution proof
respond to task-related communications
```

Worker must not access arbitrary citizen communications unrelated to their assigned task unless policy explicitly permits it.

---

# 64. RECEIPT AUTHORIZATION

Authenticated citizen:

```text
download own receipt
```

Public tracking page:

```text
view sanitized public summary
```

Do not expose the full receipt publicly if it contains citizen PII.

The public QR should point to the public tracker, not a PII-rich document.

---

# 65. GAMIFICATION SECURITY

Prevent abuse:

```text
one point event per incident/action
server-side point ledger
event_key uniqueness
no client-submitted points
no points from repeated refreshes
no points for self-generated status changes
no points for duplicate submissions
```

The browser must never be trusted to decide:

```text
+10 points
```

It only requests an eligible action.

Backend determines reward.

---

# 66. AUTOMATION SECURITY

Automation rules should not allow arbitrary code execution.

Actions must come from an allowlist:

```text
notify
assign_worker
escalate
create_timeline_event
request_feedback
request_clarification
suggest_fast_track
trigger_verification
```

Do not implement:

```text
arbitrary SQL
arbitrary Python
arbitrary HTTP
```

from the UI.

---

# 67. AUDIT LOGGING

Every automation action should create an audit/event entry.

Example:

```text
09:41
Automation

SLA Breach Escalation

Incident CIV-2026-91AF
Escalated from Ward Supervisor
to Department Officer
```

Every citizen action should similarly be visible:

```text
Citizen
Requested reopening
```

This is critical for government-grade auditability.

---

# 68. AUTOMATION FAILURE UX

Authority:

```text
Automation warning

Auto-assign failed for 2 incidents.

Reason:
No eligible worker in jurisdiction.

[Review]
```

System should never silently swallow important automation failures.

Best-effort notifications can remain best-effort as currently designed.

---

# 69. NOTIFICATION EXPANSION

Current notification lifecycle should remain non-blocking.

Add UI events for:

```text
Complaint received
AI triage complete
Worker assigned
SLA warning
SLA breach
Clarification requested
Citizen replied
Repair submitted
Repair verified
Repair rejected
Verification unavailable
Reopen requested
Appeal submitted
Appeal decision
Feedback received
```

Do not generate duplicate notification spam.

Automation runs should use idempotent event keys.

---

# 70. AUTHORITY AUTOMATION NOTIFICATION CENTER

Show:

```text
AUTOMATION ACTIVITY

Needs action
3

Recent
12

Earlier
...
```

Example:

```text
SLA breach detected
CIV-2026-91AF
Escalated automatically
2 min ago

New duplicate cluster
23 reports linked
5 min ago

Auto-assigned
Ravi Kumar
10 min ago
```

---

# 71. CITIZEN HOME "MY COMPLAINTS"

Add:

```text
My complaints
```

with filters:

```text
All
Active
Resolved
Reopened
Appealed
```

This is more realistic than only a status card list.

---

# 72. SEARCH

Citizen:

```text
Search by grievance ID
```

Authority:

```text
Search
status
severity
category
department
ward
SLA
source
date
```

Worker:

```text
search assigned tasks
```

Use the smallest implementation that provides reliable behavior.

---

# 73. "REAL SYSTEM" TOUCHES THAT ARE HIGH VALUE

Add small but meaningful details:

```text
Generated at
Last updated
Source channel
Ward
Department
SLA state
Automation state
Audit actor
```

But do not create fake activity.

If the UI says:

```text
Last synced 12 sec ago
```

there should be an actual polling/refresh mechanism supporting that statement.

---

# 74. LANDING PAGE MESSAGE

The landing page should describe the product as:

```text
Report
→ Understand
→ Resolve
→ Verify
```

Use the product itself as the hero visual.

Include:

```text
Web
WhatsApp
AI triage
GIS
SLA
Verified resolution
Public tracking
```

Do not list 15 technologies.

---

# 75. DEMO DATA SHOULD NOW INCLUDE GOVERNMENT WORKFLOW STATES

Seed:

```text
40–60 incidents

multiple wards
multiple departments
critical/high/medium/low

duplicate clusters
SLA warning cases
SLA breaches
unassigned cases
assigned cases
resolved cases
reopened case
appeal case
clarification case
verification review
automation runs
citizen feedback
```

Example flagship cases:

## Case A
```text
23 reports
Water leak
Critical
Duplicate cluster
Fast Track
Auto assigned
Resolved
Verified
Citizen satisfied
```

## Case B
```text
Streetlight
High
Worker proof
Verification rejected
Rework
Reopened
```

## Case C
```text
Garbage
Medium
Clarification requested
Citizen reply
Resolved
Feedback submitted
```

## Case D
```text
Critical
Unassigned
SLA warning
Automation assigns worker
```

This gives the video multiple real interactions.

---

# 76. DEMO DATA MUST BE CONSISTENT ACROSS SURFACES

The same incident must match across:

```text
Citizen dashboard
Authority queue
Map
Authority detail
Worker task
Public tracker
Receipt
Notifications
Automation logs
```

No screen should have conflicting:

```text
status
department
worker
severity
timestamps
```

This consistency is more important than adding another feature.

---

# 77. DEMO SCENARIO

The ideal 2-minute story becomes:

```text
Citizen reports water leak
        ↓
Uploads photo
        ↓
AI inspects image
        ↓
AI detects high severity
        ↓
AI routes to Water Department
        ↓
23 nearby duplicate complaints detected
        ↓
Automation identifies SLA risk
        ↓
Authority Fast Tracks
        ↓
Automation assigns worker
        ↓
Worker opens task
        ↓
Worker uploads after photo
        ↓
AI verifies before/after
        ↓
Citizen gets notification
        ↓
Citizen opens tracking page
        ↓
Citizen sees timeline
        ↓
Downloads complaint receipt
        ↓
Confirms issue resolved
```

This is a much stronger story than a generic dashboard walkthrough.

---

# 78. AUTOMATION DEMO MOMENT

Make one automation event visible.

Example:

```text
INCIDENT CREATED

CIV-2026-91AF
Critical Water Leak

Automation
● Detecting SLA risk
● Finding eligible worker
✓ Ravi Kumar assigned
✓ Authority notified
```

Then Authority sees:

```text
AUTOMATION
Auto-assignment completed

Ravi Kumar
Ward 12
```

This makes automation tangible.

---

# 79. TRACKING DEMO MOMENT

After resolution:

```text
TRACKING

CIV-2026-91AF

✓ Report received
✓ AI triage
✓ Fast Track
✓ Worker assigned
✓ Repair submitted
✓ AI verification passed
✓ Citizen confirmed

ISSUE RESOLVED

Before               After
[photo]              [photo]

[Download complaint receipt]
```

This should be one of the final video shots.

---

# 80. VISUAL DESIGN FOR NEW FEATURES

Stay inside existing design tokens.

Use:

```text
Navy = government/system structure
Blue = operational action
Orange = citizen CTA
Green = verified/success
Amber = SLA warning
Red = critical/breach
```

Do not introduce:

```text
purple AI
neon green AI
gradient dashboards
glowing cards
```

---

# 81. AUTOMATION VISUAL LANGUAGE

Use a small automation icon/state:

```text
⚙ Automation
```

Prefer an actual Lucide icon rather than emoji.

States:

```text
● Active
○ Disabled
✓ Completed
⚠ Failed
```

Keep automation visually secondary to incident severity.

---

# 82. SKELETON / LOADING FOR NEW FEATURES

Add skeleton states for:

```text
Tracking
Receipt
Automation center
Automation history
Feedback form
Appeal history
Communication thread
Civic contribution
```

Do not use full-page spinners if layout can be preserved.

---

# 83. MOBILE FOR NEW FEATURES

### Citizen

Complaint tracking:

```text
simple
single-column
sticky action
large tracking ID
timeline first
```

Receipt:

```text
stacked
print-friendly
QR visible
```

Feedback:

```text
large buttons
one-handed
short form
```

### Authority

Automation center:

```text
rule cards
filterable run history
bottom-sheet editor
```

### Worker

No unnecessary automation controls.

Worker UI remains task-focused.

---

# 84. ACCESSIBILITY FOR NEW FEATURES

Ensure:

```text
buttons have names
timeline events are understandable
status uses text + icon
dialogs trap focus
forms have labels
appeal/reopen reasons are keyboard accessible
automation builder is keyboard usable
QR does not replace text access
```

Do not rely on red/green only.

---

# 85. PERFORMANCE

Do not put:

```text
automation engine
large analytics
full incident datasets
```

into the initial citizen bundle.

Existing bundle splitting is complete.

Preserve it.

Use route-level lazy loading for new heavy pages where appropriate.

---

# 86. ROUTE PLAN

Suggested:

```text
PUBLIC
/
 /track/:publicToken
 /civic-pulse

CITIZEN
/citizen
/citizen/report
/citizen/incidents/:id
/citizen/incidents/:id/receipt
/citizen/incidents/:id/appeal

AUTHORITY
/authority
/authority/analytics
/authority/automations
/authority/incidents/:id

WORKER
/worker
/worker/incidents/:id
```

Adapt to existing route conventions rather than blindly adding duplicate routes.

---

# 87. SHARED COMPONENTS TO STANDARDIZE

Add/reuse:

```text
IncidentHeader
IncidentTimeline
IncidentStatus
AiStatusTimeline
AiEvidencePanel
SlaIndicator
ClusterSummary
BeforeAfterViewer
ComplaintReceipt
PublicTrackingCard
FeedbackForm
ReopenDialog
AppealDialog
CommunicationThread
AutomationCard
AutomationRuleBuilder
AutomationRunHistory
CivicContributionCard
CitizenCharterPanel
```

Before creating each component:

```text
search existing implementation
```

Do not duplicate equivalent components.

---

# 88. API / SERVICE ORGANIZATION

Keep:

```text
IncidentService
NotificationService
ResolutionService
```

as central lifecycle services where possible.

Add:

```text
AutomationService
FeedbackService
AppealService
CommunicationService
CitizenEngagementService
PublicTrackingService
```

only if the repository architecture supports this separation.

Do not place all new logic directly in route handlers.

---

# 89. TESTING REQUIREMENTS

Add backend unit tests for:

## Tracking

```text
valid public token
invalid token
sanitized output
PII excluded
resolved incident
reopened incident
appealed incident
```

## Feedback

```text
eligible feedback
duplicate feedback rejected
unauthorized feedback rejected
```

## Reopen

```text
eligible reopen
ineligible reopen
duplicate reopen
unauthorized reopen
```

## Appeal

```text
eligible appeal
duplicate appeal
unauthorized appeal
```

## Automation

```text
rule matching
action execution
idempotency
duplicate run prevention
SLA threshold logic
assignment selection
escalation
verification-failure action
```

## Civic points

```text
reward only from server
event-key idempotency
duplicate reward blocked
points never alter incident priority
```

---

# 90. FRONTEND TESTING REQUIREMENTS

Add tests where practical for:

```text
tracking states
receipt generation
feedback form
reopen dialog
appeal dialog
automation rule builder
automation status
civic points
```

Current frontend unit test count is only 3, so add focused tests without attempting to create an enormous test framework.

---

# 91. SQL VALIDATION

For all new migrations:

```text
apply to staging Postgres
verify schema
verify constraints
verify indexes
verify foreign keys
verify permissions
verify RLS where relevant
```

Do not rely on:

```text
pytest mocks
```

for SQL correctness.

The current CI explicitly does not validate SQL.

---

# 92. MIGRATION DISCIPLINE

Do not modify old migrations in place.

Add new migration files after the current latest migration.

Suggested conceptual grouping:

```text
009_case_lifecycle.sql
010_automation.sql
011_civic_engagement.sql
012_public_tracking.sql
```

Exact numbering should be determined from the repository after inspecting the actual migration list.

Do not create numbering collisions.

---

# 93. NO FAKE GOVERNMENT INTEGRATION

Do not create fake claims like:

```text
Integrated with BMC
Integrated with CPGRAMS
Integrated with Aaple Sarkar
Official Government of India platform
```

unless an actual integration exists and has been verified.

Instead use:

```text
Government-grade workflow
```

and document:

```text
Inspired by documented government grievance patterns
```

This matters for credibility.

---

# 94. NO FAKE OFFICERS

Do not invent:

```text
Commissioner XYZ
BMC Officer ABC
Government Officer DEF
```

Use:

```text
Ward Supervisor
Department Officer
Nodal Grievance Officer
```

unless real demo data has explicitly been seeded for those identities.

---

# 95. NO FAKE PERFORMANCE METRICS

For demo data:

```text
Prototype data
```

or:

```text
Demonstration environment
```

must be clear where aggregate metrics might be mistaken for real municipal statistics.

---

# 96. REALISM THROUGH STATE, NOT COSMETICS

The product will look real because:

```text
cases have history
cases have actors
cases have timestamps
cases have SLA
cases have evidence
cases have communication
cases can reopen
cases can escalate
cases can appeal
automation acts
citizens receive updates
```

Not because:

```text
the UI has more shadows
```

---

# 97. HIGHEST-PRIORITY NEW FEATURES

Implement in this order:

```text
P0
1. Dedicated public incident tracking
2. Secure public tracking token
3. Complaint receipt / print-to-PDF
4. Citizen feedback
5. Reopen
6. Authority clarification thread
7. Automation engine
8. SLA automation
9. Auto-assignment
10. Automation run history

P1
11. Appeal/escalation
12. Citizen charter
13. Public transparency dashboard
14. Civic contribution points
15. Civic badges
16. Community support/vote
17. Worker network resilience
18. Draft recovery

P2
19. Rich analytics
20. More automation templates
21. deeper public community experience
22. additional integrations
```

---

# 98. FEATURES TO DEFER

Do not spend time on:

```text
Neo4j
Redis
Celery
Kubernetes
new AI providers
3D GIS
generic chatbot
NFT/blockchain for civic points
crypto rewards
full social network
complex rule programming language
```

These do not materially improve the prototype's core case lifecycle.

---

# 99. KEY PRODUCT DIFFERENTIATORS

After implementation, Jan Samadhan should visibly demonstrate:

## 1. Multimodal civic reporting

```text
Text
Voice
Image
Location
WhatsApp
```

## 2. AI cognitive triage

```text
Understand
Classify
Assess
Route
Explain
```

## 3. Duplicate intelligence

```text
many citizens
→ one operational incident
```

## 4. SLA-aware operations

```text
what is urgent
what is due
what is breached
```

## 5. Automation

```text
detect
assign
notify
escalate
follow up
```

## 6. Verified physical resolution

```text
before
→ repair
→ after
→ AI verification
```

## 7. Citizen accountability

```text
receipt
→ timeline
→ feedback
→ reopen
→ appeal
```

This is the complete loop.

---

# 100. ACCEPTANCE CRITERIA — COMPLAINT TRACKING

```text
[ ] Citizen receives high-entropy grievance ID
[ ] Public tracking works without exposing PII
[ ] Tracking shows status timeline
[ ] Tracking shows SLA state
[ ] Tracking shows department
[ ] Tracking shows verification when relevant
[ ] Tracking shows before/after evidence when appropriate
[ ] Tracking has resolved/reopened/appeal states
[ ] Citizen can return to the same case from dashboard
[ ] QR points to public tracking
```

---

# 101. ACCEPTANCE CRITERIA — RECEIPT

```text
[ ] Receipt generated immediately after submission
[ ] Printable
[ ] PDF-save friendly
[ ] Includes grievance ID
[ ] Includes date/time
[ ] Includes category
[ ] Includes location
[ ] Includes evidence summary
[ ] Includes SLA/service standard
[ ] Includes public tracking QR
[ ] Does not expose unnecessary PII
```

---

# 102. ACCEPTANCE CRITERIA — AUTOMATION

```text
[ ] Authority can see active rules
[ ] Rule templates are understandable
[ ] Rule state can be enabled/disabled
[ ] Automation engine is durable
[ ] Scheduler works
[ ] Manual Run Now works
[ ] Runs are idempotent
[ ] Runs are logged
[ ] Failures are visible
[ ] SLA warning works
[ ] SLA escalation works
[ ] Auto-assignment works
[ ] Duplicate cluster alert works
[ ] Resolution follow-up works
```

---

# 103. ACCEPTANCE CRITERIA — CITIZEN ENGAGEMENT

```text
[ ] Feedback after resolution
[ ] Reopen request
[ ] Appeal path
[ ] Clarification replies
[ ] Civic points are server-controlled
[ ] No points for spam volume
[ ] Badges are understandable
[ ] Gamification does not dominate UX
```

---

# 104. ACCEPTANCE CRITERIA — GOVERNMENT-GRADE REALISM

```text
[ ] Unique grievance identity
[ ] Service standard visible
[ ] Status tracking
[ ] Reminder/follow-up
[ ] Clarification
[ ] Feedback
[ ] Reopen
[ ] Appeal/escalation
[ ] Nodal-role concept
[ ] Multi-channel intake
[ ] Geo-tagging
[ ] Mandatory proof
[ ] Audit timeline
[ ] Automation
[ ] Printable receipt
```

---

# 105. ACCEPTANCE CRITERIA — DEMO

Before recording:

```text
[ ] Seed realistic dataset
[ ] Seed duplicate cluster
[ ] Seed SLA risk
[ ] Seed automation activity
[ ] Seed successful verification
[ ] Seed verification rework
[ ] Seed clarification
[ ] Seed feedback
[ ] Seed reopen/appeal state
[ ] Receipt generation works
[ ] Public tracking works
[ ] QR works
[ ] Notifications work
[ ] No console errors
[ ] No broken images
[ ] No fake government claims
[ ] No accidental production bypass
```

---

# 106. FINAL DEMO NARRATIVE

The finished application should support this exact story:

```text
1. A citizen sees a water leak.

2. Opens Jan Samadhan.

3. Takes a photo.
   Adds a short description in a regional language
   or records a voice note.

4. Location is detected.

5. Report is submitted.

6. Receipt is generated:
   CIV-2026-XXXXXXXX
   + QR tracking link.

7. AI processes:
   ✓ image inspected
   ✓ language normalized
   ✓ category detected
   ✓ severity assessed
   ✓ department routed

8. Duplicate engine detects:
   23 related reports.

9. Authority dashboard shows:
   SLA warning
   duplicate cluster
   Fast Track recommendation.

10. Automation executes:
    eligible worker assigned
    authority notified.

11. Worker opens mobile task.

12. Worker repairs the issue.

13. Worker uploads after photo.

14. AI compares:
    BEFORE vs AFTER

15. Repair verified.

16. Citizen receives update.

17. Citizen opens public tracker.

18. Citizen sees complete timeline.

19. Citizen sees:
    Before
    After
    Verified

20. Citizen confirms:
    "Yes, issue resolved."

21. Civic contribution points update:
    +5 for confirmed resolution.

22. Case becomes:
    RESOLVED + VERIFIED + CITIZEN CONFIRMED
```

That is the final product story.

---

# 107. IMPLEMENTATION ORDER

Execute in this sequence.

```text
PHASE 0
Repository inspection
↓
Current route/API/schema inspection
↓
Git safety
↓
Baseline smoke test

PHASE 1
Dedicated public tracking
↓
High-entropy public token
↓
Citizen tracking UI
↓
Receipt generation
↓
QR tracking

PHASE 2
Feedback
↓
Reopen
↓
Clarification
↓
Communication timeline

PHASE 3
Appeal/escalation
↓
Citizen Charter
↓
Escalation roles

PHASE 4
Automation schema
↓
Automation engine
↓
Idempotency
↓
Supabase Cron
↓
Run history
↓
Rule templates

PHASE 5
Auto-assignment
↓
SLA warning
↓
SLA escalation
↓
Duplicate alerts
↓
Resolution follow-up

PHASE 6
Civic points
↓
Badges
↓
Community support

PHASE 7
Public civic transparency
↓
Worker resilience
↓
Draft recovery

PHASE 8
Demo fixtures
↓
Demo scenario
↓
Live E2E
↓
SQL validation
↓
Visual regression
↓
Recording
```

---

# 108. CODING AGENT INSTRUCTIONS

For every feature:

1. Inspect the current implementation.
2. Reuse existing APIs/components/types where possible.
3. Search for duplicate logic before creating new logic.
4. Preserve authentication hardening.
5. Preserve resolution integrity.
6. Preserve duplicate persistence.
7. Preserve notification best-effort semantics.
8. Do not expose service-role keys.
9. Do not add arbitrary frontend-only security assumptions.
10. Do not use public database IDs as tracking identifiers.
11. Add tests for every new stateful behavior.
12. Validate SQL separately.
13. Update the relevant documentation after implementation.

---

# 109. IMPORTANT: DO NOT BREAK CURRENT HARDENING

Do not regress:

```text
Auth 401 behavior
Role guards
Worker BOLA protections
Resolution verification tri-state
Atomic finalization design
Duplicate persistence
WhatsApp signature verification
Notification ownership
Production rejection of mock IDs
Gemini Vision migration
Bundle splitting
```

The Sept 20 report explicitly records these areas as already hardened.

---

# 110. REQUIRED FINAL VALIDATION COMMANDS

Frontend:

```bash
npx tsc -b --force
npm run knip
npm run knip:ci
node --test tests/*.test.cjs
npm run build
```

Backend:

```bash
python -m pytest -q
python -m ruff check .
python -m vulture app vulture_whitelist.py --min-confidence 60
```

Then:

```text
visual smoke test
live E2E
SQL/migration validation
RLS audit
```

Do not stop at unit tests.

---

# 111. FINAL QUALITY BAR

The prototype is not finished when:

```text
the feature exists
```

It is finished when:

```text
the feature is visually coherent
+
works in the complete lifecycle
+
has loading/error/success states
+
is mobile-safe
+
is authorized
+
is testable
+
is demo-deterministic
```

---

# 112. FINAL PRODUCT DEFINITION

Jan Samadhan should now look like:

> **A complete civic case-management system, not merely a complaint form.**

The case should have:

```text
Identity
Evidence
AI assessment
Department
SLA
Assignment
Automation
Communication
Audit trail
Physical proof
Verification
Feedback
Reopen
Appeal
Receipt
Public tracking
Citizen contribution
```

This is the target.

---

# 113. WHAT THE CODING AGENT SHOULD NOT DO

Do not:

```text
rewrite the frontend from scratch
rewrite the backend
switch databases
replace Supabase
replace LangGraph
replace FastAPI
replace the current design tokens
reintroduce UX4G CSS
add random animation
use fake government branding
invent government integrations
invent real municipal performance numbers
fabricate officer names
reward complaint spam
make points influence severity
make public tracking expose PII
use fragile in-process scheduling for recurring production automation
```

---

# 114. FINAL PRIORITY RULE

At every implementation decision, use this ordering:

```text
Reliability
>
Correct lifecycle behavior
>
Security
>
Clarity
>
Operational usefulness
>
Visual polish
>
Novelty
```

Never reverse this order merely to create a more impressive demo.

---

# 115. OFFICIAL RESEARCH REFERENCES

Use these references when validating workflow choices:

### Government of India

CPGRAMS:
https://www.pgportal.gov.in/

CPGRAMS FAQ:
https://pgportal.gov.in/Home/Faq

CPGRAMS sitemap:
https://pgportal.gov.in/Sitemap

CPGRAMS 2024 Comprehensive Grievance Guidelines:
https://pgportal.gov.in/Home/Preview/Q29tcHJlaGVuc2l2ZUd1aWRlbGluZXNGb3JIYW5kbGluZ1RoZVB1YmxpY0dyaWV2YW5jZXMucGRm

### Maharashtra

Aaple Sarkar / Right to Public Services:
https://sjsa.maharashtra.gov.in/en/service/aaple-sarkar/

Maharashtra grievance redressal:
https://sjsa.maharashtra.gov.in/service/%E0%A4%A4%E0%A4%95%E0%A5%8D%E0%A4%B0%E0%A4%BE%E0%A4%B0-%E0%A4%A8%E0%A4%BF%E0%A4%B5%E0%A4%BE%E0%A4%B0%E0%A4%A3-%E0%A4%AA%E0%A5%8D%E0%A4%B0%E0%A4%A3%E0%A4%BE%E0%A4%B2%E0%A5%80/

### MoHUA / Swachhata

Swachhata Platform:
https://www.swachh.city/

Swachhata technology platform:
https://www.swachh.city/assets/files/swachhata-technology-platform.pdf

Swachhata state administration FAQ:
https://www.swachh.city/assets/files/Swachhata_State_Admin_Module_FAQ_V2.1.pdf

Swachhata admin / engineer guidance:
https://www.swachh.city/assets/files/Navigating_Swachh_city_for_State_Admins_FAQ.pdf

### MCGM

MCGM official portal:
https://portal.mcgm.gov.in/

Use MCGM RFP/tender material as evidence of operational support patterns, not as a claim that the current Jan Samadhan UI matches an official BMC system.

### Supabase

Supabase Cron:
https://supabase.com/docs/guides/cron

Scheduling Edge Functions:
https://supabase.com/docs/guides/functions/schedule-functions

Supabase Cron quickstart:
https://supabase.com/docs/guides/cron/quickstart

---

# 116. FINAL INSTRUCTION

**Implement the above directly against the existing Jan Samadhan repository.**

Do not ask to redesign the architecture first.

Start by inspecting the current code and schema.

Then implement:

```text
Dedicated complaint tracking
+
Complaint receipt
+
Feedback
+
Reopen
+
Clarification
+
Appeal
+
Durable automation
+
Auto-assignment
+
SLA escalation
+
Civic contribution
```

and integrate them into the existing:

```text
Citizen
Authority
Worker
AI
GIS
SLA
Duplicate
Resolution Verification
WhatsApp
Notification
```

flows.

The final result should make Jan Samadhan feel like a real civic grievance operating system with a complete citizen-to-government-to-field-worker lifecycle.

**Optimize the product around one idea:**

```text
A complaint should never disappear into a portal.
It should have an identity,
a status,
a responsible owner,
a deadline,
an audit trail,
a verified outcome,
and a citizen-visible resolution.
```
