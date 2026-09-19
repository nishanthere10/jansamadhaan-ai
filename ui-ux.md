# Jan Samadhan AI — UI/UX Enhancement Specification

**Document:** `ui-ux.md`  
**Version:** 2.0 — UI/UX Enhancement & Implementation Brief  
**Project:** Jan Samadhan AI  
**Platform:** React 18 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui  
**Primary users:** Citizens, Municipal Authorities, Field Workers  
**Design goal:** Make Jan Samadhan feel like a high-quality civic operations product: trustworthy like a government service, clear enough for citizens with varying digital literacy, and polished enough to feel like a modern SaaS product.

---

# 1. Purpose

This document defines the UI/UX direction for the next major polish pass of Jan Samadhan.

The objective is **not** to add visual decoration for its own sake. The objective is to improve:

- clarity
- hierarchy
- task completion speed
- perceived performance
- state visibility
- accessibility
- responsive behavior
- consistency
- confidence and trust
- role-specific workflows
- quality of AI feedback

The current product already has a documented design system with brand tokens, typography, component specifications, page specifications, motion rules, accessibility guidance, responsive breakpoints, and known design debt. This document keeps those foundations and turns them into a more complete product-level UI/UX implementation plan.

The existing brand identity is intentionally defined as **trustworthy, modern, and approachable**. fileciteturn6file0L8-L24

---

# 2. Design North Star

Jan Samadhan should feel like:

> **A premium civic operations platform that makes government workflows easier to understand and easier to execute.**

It should NOT feel like:

- a generic admin template
- a government portal from the early web era
- a flashy AI dashboard
- a collection of unrelated cards and charts
- a form-heavy complaint system

The visual experience should be:

```text
Calm
  +
Clear
  +
Responsive
  +
Purposeful
  +
Operational
  +
Trustworthy
```

The strongest visual principle is:

> **Make the important thing obvious, and make the next action obvious.**

---

# 3. Product UX Principles

## 3.1 Clarity before density

Every screen should answer the user's primary question before showing secondary information.

### Citizen

Primary questions:

1. Can I report the problem?
2. Has my report been received?
3. What is happening now?
4. Has it been resolved?

### Authority

Primary questions:

1. What needs attention?
2. What is becoming urgent?
3. What is assigned and what is blocked?
4. Where are incidents concentrated?
5. Which action should I take next?

### Worker

Primary questions:

1. What is my next task?
2. Where do I need to go?
3. What needs to be fixed?
4. How do I prove the work is complete?

---

## 3.2 Action hierarchy

Use a clear hierarchy:

```text
Primary action
    ↓
Critical information
    ↓
Context
    ↓
Secondary actions
    ↓
Supporting detail
```

Do not make every button equally prominent.

Examples:

- Citizen: `Report Incident` is the dominant action.
- Authority: `Review Critical Incidents` or `Assign Worker` is more important than `Export CSV`.
- Worker: `Navigate` and `Upload Resolution Proof` should dominate the screen.

---

## 3.3 Progressive disclosure

Show only what is needed initially.

Advanced information should be expandable:

```text
AI Assessment
Severity: Critical
Confidence: 94%
Department: Water Supply

[Why did AI decide this?]
```

Clicking `Why did AI decide this?` can reveal:

- evidence used
- keywords
- image observations
- severity factors
- routing rationale

Do not expose technical model names to citizens unless it is useful.

---

## 3.4 State visibility

Users should always know what the system is doing.

Every important async operation needs designed states for:

```text
idle
→ uploading
→ processing
→ success
→ partial success
→ error
→ retry/manual review
```

Never leave the interface apparently frozen while the backend is working.

---

## 3.5 Trust through transparency

AI should not feel like a mysterious black box.

Use language such as:

```text
AI triage completed
Pothole detected
High severity
Roads & Traffic
Confidence 92%

[View reasoning]
```

The UI should communicate:

- what the AI detected
- what action it recommends
- how confident it is
- where human review is required

Do not imply certainty when there is none.

---

# 4. Existing Brand System

The existing brand tokens are the foundation and should remain stable during the first enhancement pass.

## 4.1 Brand colors

```css
--cr-blue:        #003366;
--cr-blue-mid:    #0055A4;
--cr-blue-light:  #E8F0FB;
--cr-blue-pale:   #F0F5FD;

--cr-orange:      #F47920;
--cr-orange-dark: #C05E10;
--cr-orange-light:#FFF4EC;

--cr-green:       #1A7A3E;
--cr-green-mid:   #22904A;
--cr-green-light: #E8F5EE;

--cr-red:         #B91C1C;
--cr-red-light:   #FEE2E2;

--cr-amber:       #92400E;
--cr-amber-mid:   #D97706;
--cr-amber-light: #FEF3C7;
```

These existing tokens define authority/system actions, citizen CTAs, success, destructive states, and warning states. fileciteturn6file0L33-L60

Do not introduce arbitrary new accent colors.

---

# 5. Semantic Surface System

Use a restrained surface hierarchy.

## Light

```text
Page background     #F5F7FA
Surface             #FFFFFF
Surface raised      #FFFFFF
Primary text        #1A1A2E
Secondary text      #374151
Muted text          #64748B
Border              #DDE3EA
Border strong       #C4CDD8
```

## Dark

```text
Page background     #0D1117
Surface             #161B22
Surface raised      #1E2530
Primary text        #E6EDF3
Secondary text      #8B949E
Muted text          #6E7681
Border              #30363D
Border strong       #484F58
```

The existing specification already defines these semantic surfaces and dark-mode tokens. fileciteturn6file0L64-L75 fileciteturn6file0L742-L768

---

# 6. Severity and Status UX

Severity and status must remain visually distinct.

## Severity

```text
Critical → Red
High     → Amber
Medium   → Orange
Low      → Green
```

## Status

```text
Pending     → Amber
In Progress → Blue
Resolved    → Green
Rejected    → Red
Verified    → Teal/green-blue
```

Do not use color alone to communicate severity or status. Pair color with:

- icon
- text
- shape/badge
- tooltip where needed

The existing specification defines severity colors and lifecycle colors. fileciteturn6file0L77-L95

---

# 7. Typography

Use:

```text
Headings → Merriweather / DM Sans / system fallback
Body    → IBM Plex Sans / system fallback
Mono    → JetBrains Mono / Courier New
```

The current type scale is:

```text
Display       40px / 800
Page title    28px / 700
Section       20px / 600
Card title    16px / 600
Body          14px / 400
Caption       12px / 500
Micro         11px / 500
```

The existing specification requires visible text to stay at or above 11px and recommends a 4.5:1 contrast ratio for body text. fileciteturn6file0L98-L125

## Enhancement rule

Do not make everything large.

Create stronger hierarchy by reducing competing elements:

```text
1 dominant heading
1 dominant action
2–4 secondary visual anchors
supporting detail below
```

---

# 8. Spacing and Layout

The existing spacing bridge is intentional:

```text
spacing-3 = 16px
spacing-4 = 24px
spacing-5 = 48px
```

Do not migrate to native Tailwind spacing as part of this UI enhancement.

The project already treats that as a separate visual migration. fileciteturn6file0L129-L149

Use a strong layout rhythm:

```text
4px   micro
8px   icon/label gap
16px  standard control gap
24px  card/content spacing
32px  section spacing
48px  major section separation
64px  page-level separation
```

Avoid excessive nested padding.

---

# 9. Shared Component Language

Every reusable component should behave consistently.

## Buttons

### Citizen primary

Orange, high visibility, rounded 8px.

### Authority primary

Government blue.

### Worker primary

Use green for completion/resolution actions only. Blue remains the default operational action color.

### Secondary

Transparent or light surface with strong border.

### Destructive

Red.

The existing button specification defines orange citizen CTAs, blue authority/system actions, ghost/secondary buttons, and destructive buttons. fileciteturn6file0L167-L200

---

# 10. Cards

Do not turn every piece of information into a separate card.

Use cards when they create a clear grouping.

Three levels:

```text
Flat      → tables / structural containers
Raised    → KPI / important content
Floating  → modal / popover / temporary surface
```

Card anatomy remains:

```text
Header
──────
Content
──────
Optional action footer
```

The existing specification defines these elevation levels and anatomy. fileciteturn6file0L206-L223

---

# 11. Five Priority Experiences

These five screens have the highest UI/UX priority:

```text
1. Citizen Report Incident
2. Authority Dashboard
3. Authority Incident Detail + AI Panel
4. Worker Dashboard
5. Public Tracking
```

Do not attempt a complete redesign of every page at once.

Perfect these five first.

---

# 12. Citizen Report Incident — PRIMARY UX

Route:

```text
/citizen/report
```

This should feel like a conversation, not a government form.

The existing design already defines a five-step report flow: category, description, photo, location, review/submit. fileciteturn6file0L419-L450

## Recommended interaction model

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

## Step 1 — Category

Show large, easy-to-scan choices:

```text
[Pothole] [Garbage] [Water]
[Streetlight] [Noise] [Other]
```

Each option contains:

- Lucide icon
- short title
- subtle secondary description where necessary

Selected state:

```text
blue border
blue-tinted surface
check icon
slightly elevated
```

Do not use aggressive animation.

## Step 2 — Description

Primary field:

```text
What happened?
```

Support:

- text input
- microphone
- language selector
- character count

Voice input should show:

```text
Idle
→ recording
→ processing
→ transcript ready
```

Never make the user wonder whether the microphone is recording.

## Step 3 — Photo

Large drop/camera zone.

State sequence:

```text
Add photo
↓
Uploading...
↓
AI checking image...
↓
Relevant / irrelevant / unavailable
```

When successful:

```text
✓ Pothole detected
High severity
Valid civic evidence
```

When AI fails:

```text
AI analysis is unavailable right now.
Your report can still be submitted for manual review.
```

The existing design already defines these AI feedback states. fileciteturn6file0L674-L700

## Step 4 — Location

Default view:

```text
[Use my current location]

MAP

Detected address

[Adjust location]
```

Do not force users to understand latitude/longitude.

Coordinates can be shown as supporting data only.

## Step 5 — Review

Show a clean summary:

```text
Water Leak
Gandhi Road, Mumbai
Photo attached
Description added
```

Every section has an `Edit` action.

Primary CTA:

```text
Submit Report
```

On submit:

```text
✓ Report received

Tracking ID
CIV-2026-XXXX

AI triage is starting...
```

---

# 13. Authority Dashboard — OPERATIONS CONSOLE

Route:

```text
/authority
```

The authority dashboard should not feel like a generic KPI dashboard.

It should feel like a municipal command center designed around decisions.

The current design spec defines KPI cards, a large incidents table, filters, bulk actions, heatmap, and analytics widgets. fileciteturn6file0L455-L487

## New hierarchy

Top-level structure:

```text
HEADER
  ↓
ATTENTION STRIP
  ↓
LIVE INCIDENT QUEUE
  ↓
MAP / OPERATIONAL CONTEXT
  ↓
ANALYTICS
```

## Attention strip

Instead of relying only on totals, surface action items:

```text
NEEDS ATTENTION

12 Critical
8 Awaiting Assignment
5 Verification Reviews
23 Duplicate Clusters

[Review Critical →]
```

This is more useful than four static number cards.

## KPI row

Keep KPI cards, but use them as supporting context:

```text
Total incidents
Pending triage
In progress
Resolved today
Avg response time
```

Each should have:

- large number
- label
- small trend
- optional sparkline

Do not make trends visually dominant.

## Incident queue

Use a dense but readable table.

Columns:

```text
Severity
Incident
Location
Status
Department
Assigned
Age
Action
```

The incident title should be the strongest text in the row.

Avoid making IDs visually dominate the table.

## Bulk action toolbar

When nothing is selected:

```text
Filters + search
```

When rows are selected:

```text
3 incidents selected

[Assign]
[Change Status]
[Export]
[Clear]
```

The toolbar should animate into view rather than suddenly replacing the header.

---

# 14. Authority Incident Detail — AI INVESTIGATION WORKSPACE

This is the most important screen for demonstrating Jan Samadhan's intelligence.

Recommended structure:

```text
┌───────────────────────────────────────────────────────┐
│ CRITICAL   WATER LEAK                 CIV-2026-91AF   │
│ Major pipeline leak near Gandhi Road                  │
│                                                       │
│ [Assign Worker] [Change Status] [More]                │
├────────────────────────────┬──────────────────────────┤
│ INCIDENT                   │ AI ASSESSMENT            │
│                            │                          │
│ Before photo               │ Severity   Critical     │
│ Description                │ Confidence 94%          │
│ Location                   │ Department Water        │
│ Citizen                    │                          │
│                            │ Why?                     │
│                            │ • active leak            │
│                            │ • safety hazard          │
│                            │ • traffic impact         │
├────────────────────────────┴──────────────────────────┤
│ MAP / LOCATION                                        │
├────────────────────────────────────────────────────────┤
│ DUPLICATE / CLUSTER CONTEXT                            │
├────────────────────────────────────────────────────────┤
│ ACTIVITY / AUDIT TRAIL                                 │
└────────────────────────────────────────────────────────┘
```

## AI panel rules

Show:

```text
severity
confidence
category
department
visual findings
spam/validity state
secondary routing
```

Use expandable sections:

```text
Visual evidence
Classification
Severity reasoning
Routing reasoning
Duplicate context
```

Do not display raw model prompts or raw JSON.

---

# 15. AI Reasoning Visualization

AI should have its own visual language.

## Processing state

Use a small vertical checklist:

```text
✓ Report received
✓ Image processed
● Assessing severity
○ Routing department
○ Duplicate check
```

This is better than a single spinner because it explains progress.

## Confidence

Prefer:

```text
Confidence
94%
██████████████████░░
```

Use restrained visualization rather than giant percentage badges.

## AI evidence

Each AI conclusion should have an evidence affordance:

```text
Critical
[Why?]
```

Click → explanation.

---

# 16. Worker Dashboard — FIELD UX

Route:

```text
/worker
```

This experience must be optimized for mobile use outdoors.

The existing specification already identifies the worker UI as mobile-first. fileciteturn6file0L511-L539

## Primary screen

```text
MY TASKS

Critical — 1
High — 3
Other — 6
```

Task card:

```text
[CRITICAL]
Pothole on Gandhi Road

0.8 km away
Assigned 8 min ago

[ Navigate ]
[ View Task ]
```

## Task detail

Prioritize:

1. severity
2. location
3. before photo
4. problem description
5. navigation
6. resolution proof

## Resolution flow

```text
Upload resolution proof
        ↓
Preview photo
        ↓
AI verification
        ↓
Verified / Needs rework / Review required
```

The worker should never be left with a blank success state after the AI verification finishes.

---

# 17. Public Tracking — CITIZEN TRUST EXPERIENCE

Route:

```text
/track/:id
```

This page should feel extremely simple.

The existing specification already defines a public status timeline and before/after resolution evidence. fileciteturn6file0L541-L558

Recommended layout:

```text
Jan Samadhan
Public Incident Tracker

Water leak near Gandhi Road
CIV-2026-91AF

✓ Report submitted
  Sep 18 · 10:42

✓ AI triage completed
  Water Leak · High

✓ Worker assigned
  Water Department

● Repair in progress

○ Resolution verification

○ Completed
```

When resolved:

```text
✓ Issue resolved
AI verification passed

[ Before ]  [ After ]

[ Share Report ]
```

Make the timeline the main visual story.

---

# 18. Citizen Dashboard

The citizen dashboard should prioritize reassurance and progress.

Top:

```text
Good morning, [Name]
Here is the current status of your reports.

[+ Report New Incident]
```

Then:

```text
Your reports

Pending  2
Active   1
Resolved 8
```

Incident cards should emphasize:

```text
problem title
location
status
severity
last update
```

Do not show excessive backend metadata.

---

# 19. Navigation

Use the existing navigation model:

## Desktop

```text
Top navbar: 60px
Sidebar: 240px
Collapsed sidebar: 64px
```

## Mobile

Use bottom navigation, maximum five primary destinations.

The existing navigation specification defines role-specific navigation and a mobile bottom navigation model. fileciteturn6file0L606-L644

Enhancement:

Use a consistent transition when the sidebar collapses.

Do not animate every icon independently.

---

# 20. Mobile Experience

Mobile should not be a shrunk desktop layout.

## Citizen

Optimize for:

- thumb reach
- camera
- microphone
- map
- large CTA

## Worker

Optimize even more aggressively for:

- one-hand use
- outdoor visibility
- quick navigation
- camera capture
- minimal typing

## Authority

Mobile authority UI can be less dense and should prioritize:

- urgent queue
- assignments
- incident details
- map

The existing breakpoints define mobile, tablet, desktop, wide, and ultra-wide behavior. fileciteturn6file0L772-L787

---

# 21. Loading States

Replace generic spinners with contextual skeletons wherever content has predictable shape.

Examples:

```text
KPI skeleton
Incident row skeleton
AI panel skeleton
Notification skeleton
Chart skeleton
```

Use spinners only for very short actions such as:

```text
button submit
small inline action
```

The existing design debt explicitly identifies skeleton loaders as a medium-priority improvement. fileciteturn6file0L801-L807

---

# 22. Empty States

Every empty state should answer:

1. Is something wrong?
2. What should I do?

Use illustrations, not emojis.

Examples:

```text
Citizen
No reports yet
File your first complaint and we'll get it resolved.
[Report an Incident]
```

```text
Authority
All clear
No open incidents.
```

```text
Worker
No active assignments
New tasks appear here when assigned.
```

The current specification already defines these empty-state messages. fileciteturn6file0L705-L713

---

# 23. Error Experience

Errors should be calm, specific, and actionable.

Never use:

```text
Something went wrong.
```

by itself.

Use:

```text
AI review unavailable

Your report was received successfully.
A municipal officer can review it manually.

[Continue Tracking]
[Try Again]
```

For authentication:

```text
Your session has expired.
Please sign in again to continue.

[Sign In]
```

The existing design debt identifies dedicated 404/401 states as a required improvement. fileciteturn6file0L801-L804

---

# 24. Toasts and Notifications

Use notifications for events that matter.

Existing placement:

```text
bottom-right
360px max width
stack upward
```

Existing motion:

```text
slide in from right
~200ms
```

The current specification defines the toast structure and event colors. fileciteturn6file0L273-L285

Enhancement:

On mobile, offset toast placement enough to avoid the bottom navigation.

Never cover:

- primary CTA
- camera controls
- bottom navigation

---

# 25. Modal and Sheet Behavior

Desktop:

```text
center modal
blurred backdrop
focus trap
```

Mobile:

```text
bottom sheet
full-width
safe-area aware
```

The existing modal specification requires focus trapping and restoration of focus to the trigger. fileciteturn6file0L290-L296

Use full-screen mobile sheets for complex workflows such as:

- incident details
- assignment selection
- filters

---

# 26. Motion System

Motion should communicate state changes.

Existing durations:

```text
fade-in             150ms
slide-up            200ms
slide-right         200ms
scale-in            180ms
stagger             50ms delay
AI pulse            2s
count-up            1200ms
skeleton shimmer    1.5s
```

These values already exist in the design system. fileciteturn6file0L646-L664

## New motion rules

### Page transitions

Use:

```text
opacity 0 → 1
translateY 8px → 0
```

Keep total transition under 300ms.

### Lists

Stagger only the first visible batch.

Do not animate 50+ rows.

### Shared element continuity

Where possible:

```text
incident row
→ incident detail
```

should feel like the same object expanding into a workspace.

### Never animate

- important text continuously
- large maps every time data refreshes
- entire dashboards on polling updates
- notification badges excessively

---

# 27. Microinteractions

Use small feedback moments to create polish.

Examples:

## Report submitted

```text
✓ Report received
Tracking ID copied
```

## Assignment

```text
✓ Worker assigned
Rajesh Kumar · Water Department
```

## Verification

```text
✓ Repair verified
94% confidence
```

## Copy tracking ID

Button temporarily changes:

```text
Copy ID
→
Copied ✓
```

Use microinteractions sparingly.

---

# 28. Data Table UX

The table should support fast scanning.

Use:

- sticky header
- consistent row height
- hover state
- selected state
- sortable columns
- keyboard navigation where practical
- pagination/server-side pagination when data grows

The existing specification defines sticky headers, selection states, sorting and pagination. fileciteturn6file0L260-L268

Enhancement:

Prioritize the following columns visually:

```text
Severity
Incident title
Status
Action
```

Secondary metadata should be visually quieter.

---

# 29. Search and Filtering

The authority dashboard should support fast narrowing of the incident queue.

Filter hierarchy:

```text
Search
Status
Severity
Category
Department
Date
```

Use a filter drawer on mobile.

For desktop, allow compact inline filters.

Show active filter chips:

```text
Severity: Critical ×
Department: Water ×
Last 7 days ×
```

Provide one `Clear all` action.

---

# 30. Map UX

Maps are operational tools, not decorative backgrounds.

Authority map controls:

```text
[All]
[Critical]
[Clusters]
[Heatmap]
```

Clicking a cluster should show:

```text
23 reports
Water leak
Gandhi Road

Primary incident
CIV-2026-91AF

[Open Cluster]
```

Make active map filters visually match table filters where possible.

---

# 31. Duplicate Cluster UX

Duplicate detection is one of the product's most important operational features.

Do not bury it in a small badge.

For a clustered incident, show:

```text
23 reports linked

Primary incident
CIV-2026-91AF

+22 duplicate reports

[View Cluster]
```

Within the cluster view:

```text
Primary incident
───────────────
Location
Severity
Evidence

Linked reports
───────────────
CIV-...
CIV-...
CIV-...
```

The user should understand immediately that many citizens are reporting the same physical problem.

---

# 32. Resolution Verification UX

This should communicate a clear sequence.

```text
Repair submitted
      ↓
AI reviewing before/after
      ↓
Result
```

Possible outcomes:

### Verified

```text
✓ Repair verified
The issue appears resolved.
Confidence 94%
```

### Rejected

```text
Repair needs rework
The issue is still visible in the submitted proof.

[Review Evidence]
```

### Verification unavailable

```text
Verification unavailable
The repair could not be automatically verified.
A manual review has been requested.
```

Never show `Rejected` when the AI/provider simply failed.

---

# 33. AI Processing Timeline

Use a reusable component across the product:

```text
AIStatusTimeline

✓ Received
✓ Image inspected
✓ Language normalized
● Classifying
○ Severity
○ Routing
```

It should accept a state array and render:

```ts
status: 'complete' | 'active' | 'pending' | 'error'
```

This should become a shared frontend primitive.

---

# 34. Recommended New Shared UI Components

Add or standardize reusable components for the enhancement pass.

```text
components/ui/
  ActionButton.tsx
  StatusBadge.tsx
  SeverityBadge.tsx
  AiStatusBadge.tsx
  Skeleton.tsx
  EmptyState.tsx
  ErrorState.tsx
  ConfirmDialog.tsx
  BottomSheet.tsx

components/shared/
  AiStatusTimeline.tsx
  AiEvidencePanel.tsx
  IncidentTimeline.tsx
  IncidentHeader.tsx
  IncidentSummary.tsx
  ClusterSummary.tsx
  LocationSummary.tsx
  BeforeAfterViewer.tsx
  CopyTrackingId.tsx
  ResponsiveDataTable.tsx
  FilterChips.tsx
  PageHeader.tsx
  MobileActionBar.tsx
```

Do not create duplicates of components that already perform the same responsibility.

Reuse existing primitives where they are good enough.

---

# 35. Form UX Standards

All forms should consistently support:

```text
idle
focus
filled
invalid
valid
loading
disabled
success
```

Inputs:

- 40px baseline height
- 8px border radius
- clear labels
- helper text where necessary
- visible error state
- focus ring

The existing form specification already defines these dimensions and state rules. fileciteturn6file0L244-L254

Never communicate validation only through border color.

---

# 36. Accessibility

Accessibility is part of the interaction design.

Required:

```text
[ ] WCAG AA contrast
[ ] keyboard navigation
[ ] visible focus indicators
[ ] meaningful alt text
[ ] real form labels
[ ] icon + text for errors
[ ] modal focus trap
[ ] aria-live toast region
[ ] role=status loading indicators
[ ] skip-to-content
```

The current specification already defines these requirements. fileciteturn6file0L719-L735

## Regional language

For Hindi and other Indian-language UI:

- use appropriate `lang` attributes
- maintain at least 1.6 line-height for Devanagari
- use a suitable Noto/system fallback

Do not assume English line-height is optimal for Indic scripts.

---

# 37. Dark Mode

Do not treat dark mode as simply inverting colors.

Use the existing dark palette.

Important rules:

- no pure black
- cards retain borders
- primary blue must be lightened on dark surfaces
- status colors should be softened
- tinted surfaces become translucent/low-opacity variants

The existing specification defines these rules. fileciteturn6file0L740-L768

The full implementation can be phased after the five primary screens are polished.

---

# 38. Responsive Design Targets

Validate at minimum:

```text
375px
390px
430px
768px
1024px
1280px
1440px
1536px+
```

Check for:

- horizontal overflow
- clipped buttons
- broken tables
- map sizing
- modal behavior
- bottom-nav overlap
- toast overlap
- typography wrapping
- touch target size

---

# 39. Performance Perception

The interface should feel fast even when the backend is processing asynchronously.

Use:

- skeletons
- optimistic UI where safe
- immediate acknowledgement after actions
- progressive rendering
- background AI state indicators
- low-motion placeholders

Do not block the entire screen while one AI operation runs.

A report submission should acknowledge immediately while AI processing continues in the background.

---

# 40. Landing Page

The current specification calls for a 60/40 hero, Hindi headline, English value proposition, orange CTA, feature cards, a four-step workflow, stats, and footer. fileciteturn6file0L301-L340

Enhance it around one simple story:

```text
Report a civic problem
        ↓
AI understands it
        ↓
The right team gets it
        ↓
You can track the resolution
```

The hero illustration should visually represent this loop.

Avoid generic AI robot artwork.

Prefer:

- civic map
- incident pin
- AI analysis card
- worker dispatch
- verified repair

The result should feel specific to Jan Samadhan.

---

# 41. Signup and Login

Make authentication feel simple.

Login should prioritize:

```text
Email
Password
Sign in
```

Secondary options can follow.

Development-only controls must remain invisible in production.

The current design spec defines a centered login card and development-only testing mode. fileciteturn6file0L346-L364

Signup should progressively reveal additional fields rather than showing everything at once.

---

# 42. Notifications Center

The notification panel should be grouped by importance:

```text
Needs action
Recent updates
Earlier
```

Use concise event cards:

```text
Worker assigned
Rajesh Kumar assigned to your water leak report.
2 min ago
```

Avoid excessive generic status notifications.

---

# 43. Settings

Settings should feel quiet and predictable.

Tabs:

```text
Profile
Notifications
Security
Appearance
```

Do not use the same visual density as the authority dashboard.

Settings is a configuration experience, not an operational console.

---

# 44. Print Experience

Government workflows often involve print/shareable artifacts.

Provide print-clean states for:

- QR project sheet
- incident details
- public tracking page

Print output should remove:

- navigation
- sidebars
- unnecessary interaction controls

The existing design includes initial print rules and identifies broader print support as future design debt. fileciteturn6file0L64-L66 fileciteturn6file0L809-L813

---

# 45. UX Copy Principles

Use direct human language.

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

Citizen-facing copy should minimize technical terms.

Authority-facing copy can expose more operational detail.

Worker-facing copy should be concise and action-oriented.

---

# 46. Three UX Modes

The same design system should support three information densities.

## Citizen Mode

```text
airier
simpler
larger actions
less metadata
more explanation
```

## Authority Mode

```text
dense
fast
filterable
keyboard-friendly
more evidence
more simultaneous context
```

## Worker Mode

```text
mobile-first
location-first
camera-first
large controls
minimal typing
```

This distinction should be deliberate rather than accidental.

---

# 47. Visual Polish Rules

To achieve the intended premium feel:

### Do

- use consistent 8px/16px/24px/32px spacing rhythm
- use restrained shadows
- use consistent icon stroke widths
- use strong alignment
- use subtle dividers
- use consistent corner radii
- use intentional whitespace
- use smooth state transitions

### Do not

- overuse gradients
- use glassmorphism everywhere
- create glowing AI effects
- use excessive border radius
- use random accent colors
- animate every card
- turn every component into a floating card
- use giant numbers without context

---

# 48. Known Design Debt to Fix

The existing UI specification identifies these known issues:

## High priority

- landing-page hero illustration
- inconsistent report stepper
- citizen empty state illustration
- authority bulk action toolbar
- mobile navigation. fileciteturn6file0L792-L799

## Medium priority

- skeleton loaders
- 401/404 error pages
- analytics color palette
- worker mobile card layout
- mobile toast placement
- QR print behavior. fileciteturn6file0L801-L807

## Low priority

- complete dark mode
- broader print styles
- focus-ring audit
- consistent form validation states. fileciteturn6file0L809-L813

The enhancement plan should address these while also improving the core experiences described above.

---

# 49. Implementation Roadmap

Do not redesign everything simultaneously.

## Phase 1 — Design foundation

```text
1. Audit current components
2. Remove duplicate visual patterns
3. Standardize tokens
4. Standardize typography
5. Standardize buttons
6. Standardize badges
7. Standardize cards
8. Standardize inputs
9. Add skeleton primitives
10. Add shared motion primitives
```

## Phase 2 — Citizen experience

```text
1. Report Incident
2. Citizen Dashboard
3. Public Tracker
4. Empty states
5. AI feedback states
6. Submission acknowledgement
```

## Phase 3 — Authority experience

```text
1. Authority Dashboard
2. Incident table
3. Attention strip
4. AI investigation panel
5. Cluster inspector
6. Bulk actions
7. Map interaction
```

## Phase 4 — Worker experience

```text
1. Worker task list
2. Mobile task detail
3. Navigation
4. Camera/proof flow
5. Verification states
6. Task history
```

## Phase 5 — System polish

```text
1. Navigation transitions
2. Toasts
3. Skeletons
4. Error states
5. 401/404
6. Responsive QA
7. Accessibility QA
8. Dark mode
9. Print states
```

## Phase 6 — Final visual QA

```text
Desktop
Tablet
Mobile
Dark mode
Keyboard
Reduced motion
Indic languages
Loading
Empty
Error
Success
```

---

# 50. Suggested Component Architecture

Prefer this structure without moving files unnecessarily:

```text
frontend/
  components/
    ui/
      button.tsx
      card.tsx
      badge.tsx
      input.tsx
      dialog.tsx
      skeleton.tsx
      sheet.tsx
      tooltip.tsx

    shared/
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

    layout/
      Layout.tsx
      Navbar.tsx
      Sidebar.tsx
      AuthNavbar.tsx
```

Before adding a component, search for an existing equivalent.

Do not create two components for the same semantic role.

---

# 51. Animation API / Utility Strategy

Standardize timing values instead of adding arbitrary durations throughout JSX.

Use shared classes/utilities or CSS variables for:

```text
--motion-fast
--motion-base
--motion-slow
--ease-standard
```

Recommended baseline:

```text
fast  = 150ms
base  = 200ms
slow  = 300ms
```

All animation must respect:

```css
@media (prefers-reduced-motion: reduce)
```

The existing design already defines a reduced-motion block. Preserve it. fileciteturn6file0L646-L650

---

# 52. Visual QA Checklist

Before calling the UI enhancement complete, manually inspect every major route.

## Citizen

```text
[ ] Landing
[ ] Login
[ ] Signup
[ ] Dashboard
[ ] Report Incident
[ ] Incident details
[ ] Notifications
[ ] Settings
```

## Authority

```text
[ ] Dashboard
[ ] Incident table
[ ] Incident detail
[ ] AI panel
[ ] Cluster view
[ ] Analytics
[ ] QR Projects
[ ] Settings
```

## Worker

```text
[ ] Task dashboard
[ ] Task detail
[ ] Navigation action
[ ] Resolution upload
[ ] AI verification result
[ ] Task history
[ ] Settings
```

## Public

```text
[ ] Landing
[ ] QR tracker
[ ] Resolved tracking state
[ ] Print state
```

---

# 53. Browser QA Matrix

Validate on:

```text
Chrome desktop
Chrome mobile viewport
Edge desktop
Safari/iOS equivalent where available
```

At minimum test:

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

---

# 54. Accessibility QA

Verify:

```text
[ ] Tab order logical
[ ] focus visible
[ ] modal focus trapped
[ ] Escape closes dismissible overlays
[ ] screen reader labels exist
[ ] icon-only buttons have accessible names
[ ] error text is explicit
[ ] loading state announced
[ ] contrast passes
[ ] keyboard can complete report form
[ ] keyboard can operate filters where practical
```

---

# 55. Performance QA

Measure perceived performance for:

```text
landing load
login load
dashboard load
incident list load
report submission
AI processing state changes
modal open
navigation transition
```

Avoid blocking the main thread with:

- large map rendering
- heavy chart rendering
- unnecessary animation
- repeated data processing

The existing codebase also has a known frontend bundle-size warning. Route-level dynamic imports for dashboards, Recharts, and Leaflet can be handled later as a performance optimization. fileciteturn6file0L329-L331

---

# 56. Definition of Done

The UI enhancement is complete when:

## Design

```text
[ ] consistent visual hierarchy
[ ] consistent component styling
[ ] clear role-specific density
[ ] clean typography
[ ] stable spacing
[ ] no visual regressions
```

## Citizen UX

```text
[ ] report flow feels simple
[ ] photo/voice/location states are clear
[ ] submission feedback is immediate
[ ] public tracking is understandable
```

## Authority UX

```text
[ ] critical work visible immediately
[ ] table easy to scan
[ ] AI reasoning understandable
[ ] duplicate clusters obvious
[ ] bulk actions easy to use
```

## Worker UX

```text
[ ] mobile-first
[ ] clear priority
[ ] navigation easy
[ ] proof workflow obvious
[ ] verification result understandable
```

## Interaction

```text
[ ] loading states
[ ] skeletons
[ ] error states
[ ] empty states
[ ] success states
[ ] motion consistency
```

## Accessibility

```text
[ ] keyboard
[ ] focus
[ ] contrast
[ ] labels
[ ] screen-reader semantics
[ ] reduced motion
```

## Responsive

```text
[ ] mobile
[ ] tablet
[ ] desktop
[ ] ultra-wide
```

---

# 57. Engineering Constraints

During the UI enhancement phase:

- Do not change backend APIs unless required by a UI bug.
- Do not change database structure for visual reasons.
- Do not add a new frontend state-management library.
- Continue using Zustand.
- Continue using Tailwind v4.
- Continue using shadcn-style primitives.
- Continue using Lucide icons.
- Do not reintroduce the unlayered UX4G stylesheet.
- Do not modify the existing spacing bridge casually.
- Preserve the current production authentication behavior.
- Keep development-only controls behind development checks.

The current UI specification uses Lucide throughout and defines icon sizing/stroke conventions. fileciteturn6file0L817-L831

---

# 58. What “Next Level” Means for Jan Samadhan

The goal is not visual complexity.

The target experience is:

```text
Citizen
   ↓
"I know exactly how to report this."

Authority
   ↓
"I know exactly what needs my attention."

Worker
   ↓
"I know exactly what I need to do next."

Citizen
   ↓
"I can see exactly what happened to my report."
```

The interface should continuously reinforce that loop:

```text
REPORT
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
TRACK
```

That operational story should be visible in the UI without requiring the user to understand the underlying architecture.

---

# 59. Final Priority Order

When implementation time is limited, use this order:

```text
1. Report Incident UX
2. Authority Dashboard hierarchy
3. Incident Detail + AI evidence
4. Worker mobile workflow
5. Public Tracking
6. Loading / empty / error states
7. Navigation and transitions
8. Responsive QA
9. Accessibility
10. Dark mode / print / optimization
```

Do not start with low-impact decorative work.

---

# 60. Final Design Direction

Jan Samadhan should look like a mature civic platform with a strong operational backbone.

The visual identity should combine:

```text
Government credibility
        +
Modern SaaS interaction quality
        +
Citizen simplicity
        +
Field-worker practicality
        +
AI transparency
```

The interface should feel **smooth because the interaction model is clear**, not because the screen is overloaded with animation.

The strongest result will come from:

**hierarchy + state feedback + consistency + role-specific UX + deliberate motion + strong responsive behavior.**

---

*Source basis: current Jan Samadhan UI Design System and current implementation context. This document is an enhancement and implementation brief, not a replacement for the existing product architecture.*
