# Jan Samadhan AI — UI Design System
> **Version 1.0 · Draft for Enhancement**  
> A living design specification for the CivicResponse AI platform.  
> Stack: React + Vite · Tailwind v4 · shadcn/ui · CSS Custom Properties

---

## 1. Brand Identity

### 1.1 Product Vision
Jan Samadhan AI is a **government-grade civic incident management platform** built for India.
It must feel simultaneously:
- **Trustworthy** — like a government institution
- **Modern** — like a top-tier SaaS product
- **Approachable** — for citizens with varying digital literacy

### 1.2 Name & Tagline
| | |
|---|---|
| **Product name** | Jan Samadhan AI |
| **Hindi meaning** | "People's Resolution AI" |
| **Tagline** | *Suniye. Samjhiye. Suljhiye.* (Hear. Understand. Resolve.) |
| **English tagline** | Civic Intelligence. Government Speed. |

### 1.3 Logo Concept
The logo should combine:
- An Ashoka Chakra fragment (24-spoke wheel) as an icon motif
- A modern sans-serif wordmark: **"Jan Samadhan"** in `--cr-blue` + **"AI"** in `--cr-orange`
- Minimum size: 24px height in nav contexts

---

## 2. Color System

### 2.1 Brand Palette (existing tokens — do not change)

```css
/* Government Blue — authority, trust, primary actions */
--cr-blue:       #003366   /* Nav bars, headers, primary buttons */
--cr-blue-mid:   #0055A4   /* Hover states, links */
--cr-blue-light: #E8F0FB   /* Chip backgrounds, tag fills */
--cr-blue-pale:  #F0F5FD   /* Page tinted backgrounds */

/* Saffron — CTAs, highlights, energy */
--cr-orange:     #F47920   /* Primary CTA buttons */
--cr-orange-dark:#C05E10   /* CTA hover */
--cr-orange-light:#FFF4EC  /* Alert/info backgrounds */

/* India Green — success, resolved, verified */
--cr-green:      #1A7A3E
--cr-green-mid:  #22904A
--cr-green-light:#E8F5EE

/* Alert Red — critical, destructive, danger */
--cr-red:        #B91C1C
--cr-red-light:  #FEE2E2

/* Amber — warnings, pending, medium severity */
--cr-amber:      #92400E
--cr-amber-mid:  #D97706
--cr-amber-light:#FEF3C7
```

### 2.2 Semantic Color Mapping

| Semantic Role | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| Page background | `#F5F7FA` | `#0D1117` | App shell background |
| Surface (card) | `#FFFFFF` | `#161B22` | Cards, panels |
| Surface raised | `#FFFFFF` | `#1E2530` | Modals, dropdowns |
| Primary text | `#1A1A2E` | `#E6EDF3` | Body copy |
| Secondary text | `#374151` | `#8B949E` | Labels, descriptions |
| Muted text | `#64748B` | `#6E7681` | Timestamps, hints |
| Border default | `#DDE3EA` | `#30363D` | Card outlines |
| Border strong | `#C4CDD8` | `#484F58` | Inputs, dividers |

### 2.3 Severity Colors (incident system)

| Severity | Background | Text | Border | Icon |
|---|---|---|---|---|
| **Critical** | `#FEE2E2` | `#B91C1C` | `#FECACA` | AlertOctagon |
| **High** | `#FEF3C7` | `#92400E` | `#FDE68A` | AlertTriangle |
| **Medium** | `#FFF4EC` | `#C05E10` | `#FED7AA` | AlertCircle |
| **Low** | `#E8F5EE` | `#1A7A3E` | `#BBF7D0` | CheckCircle |

### 2.4 Status Colors (incident lifecycle)

| Status | Pill Color | Meaning |
|---|---|---|
| `pending` | Amber | Submitted, awaiting AI/manual triage |
| `in_progress` | Blue | Assigned to a worker |
| `resolved` | Green | Work completed |
| `rejected` | Red | Spam / duplicate / invalid |
| `verified` | Teal | AI-verified resolution with proof photo |

---

## 3. Typography

### 3.1 Type Scale

```
Font stack:
  Headings  → 'Merriweather', 'DM Sans', system-ui, serif
  Body      → 'IBM Plex Sans', system-ui, sans-serif
  Mono      → 'JetBrains Mono', 'Courier New', monospace
```

### 3.2 Sizes & Weights

| Role | Size | Weight | Line-height | Class |
|---|---|---|---|---|
| **Display** | 2.5rem (40px) | 800 | 1.2 | `.cr-display` |
| **Page title** | 1.75rem (28px) | 700 | 1.3 | `.cr-page-title` |
| **Section title** | 1.25rem (20px) | 600 | 1.35 | `.cr-section-title` |
| **Card title** | 1rem (16px) | 600 | 1.4 | `.cr-card-title` |
| **Body** | 0.875rem (14px) | 400 | 1.6 | — |
| **Caption/Label** | 0.75rem (12px) | 500 | 1.4 | `.cr-label` |
| **Micro** | 0.6875rem (11px) | 500 | 1.4 | `.cr-micro` |

### 3.3 Guidelines
- Never go below **11px** for any visible text (accessibility)
- Use **Merriweather** only for headings — IBM Plex for everything else
- Maintain a **4.5:1 contrast ratio** minimum for body text (WCAG AA)
- Hindi text falls back to `system-ui` — ensure line-height >= 1.6 for Devanagari

---

## 4. Spacing & Layout

### 4.1 Grid System

```
Mobile   → 4-col,  16px gutters, 16px margins
Tablet   → 8-col,  24px gutters, 24px margins
Desktop  → 12-col, 32px gutters, 32px margins
Wide     → 12-col, 32px gutters, max-width 1440px, auto side margins
```

### 4.2 Spacing Scale (Tailwind — UX4G overrides in effect)

```
1 = 4px    micro gaps
2 = 8px    icon-to-label
3 = 16px   (UX4G override, default Tailwind: 12px)
4 = 24px   (UX4G override, default Tailwind: 16px)
5 = 48px   (UX4G override, default Tailwind: 20px)
8 = 32px
12 = 48px
16 = 64px
```

### 4.3 Component Internal Spacing

| Component | Padding | Gap |
|---|---|---|
| **Card** | `p-5` (20px) | — |
| **Modal** | `p-6` (24px) | `gap-4` |
| **Button (md)** | `px-4 py-2.5` | — |
| **Button (sm)** | `px-3 py-1.5` | — |
| **Input** | `px-3 py-2` | — |
| **Badge/Chip** | `px-2 py-0.5` | — |
| **Table row** | `py-3 px-4` | — |

---

## 5. Component Library

### 5.1 Buttons

#### Primary CTA — Orange (citizen-facing)
```
background: var(--cr-orange)
color: #fff
border-radius: 8px
padding: 10px 20px
font-weight: 600
hover: background var(--cr-orange-dark)
focus: outline 3px solid var(--cr-orange), offset 2px
```

#### Primary Action — Blue (authority/system)
```
background: var(--cr-blue)
color: #fff
hover: background var(--cr-blue-mid)
```

#### Secondary / Ghost
```
background: transparent
border: 1.5px solid var(--cr-border-strong)
color: var(--cr-text)
hover: background var(--cr-bg-offset)
```

#### Destructive
```
background: var(--cr-red)
color: #fff
hover: opacity 0.9
```

---

### 5.2 Cards

Three elevation levels:

| Level | Shadow | Use case |
|---|---|---|
| Flat | none + border | Data tables, sidebars |
| Raised | `--cr-shadow` | Dashboard stat cards |
| Floating | `--cr-shadow-md` | Modals, popovers |

Card anatomy:
```
┌──────────────────────────────────────┐
│  [Icon] Card Title        [Action]   │  Header (border-bottom)
├──────────────────────────────────────┤
│  Content body                        │  Body (p-5)
├──────────────────────────────────────┤
│  [Secondary]    [Primary CTA]        │  Footer (optional)
└──────────────────────────────────────┘
```

---

### 5.3 Status Badge / Severity Badge

```
shape: pill — border-radius: 9999px
size: px-2.5 py-0.5, text-xs font-semibold uppercase
```

| Variant | Usage |
|---|---|
| `status` | Incident lifecycle state |
| `severity` | AI-assigned severity level |
| `ai` | AI processing indicator (pulsing dot) |

---

### 5.4 Form Inputs

```
height: 40px
border: 1.5px solid var(--cr-border)
border-radius: 8px
padding: 8px 12px
font-size: 14px

focus: border-color var(--cr-blue-mid), shadow 0 0 0 3px var(--cr-blue-light)
error: border-color var(--cr-red), shadow 0 0 0 3px var(--cr-red-light)
disabled: opacity 0.5, cursor not-allowed, bg var(--cr-bg-offset)
```

---

### 5.5 Data Table

```
- Sticky header with cr-blue-pale background
- Row hover: bg var(--cr-blue-pale)
- Selected row: bg var(--cr-blue-light), left-border 3px solid var(--cr-blue)
- Sortable columns: chevron icon, rotates on direction change
- Pagination: prev/next + page number pills
- Empty state: centered illustration + helpful message
```

---

### 5.6 Toast / Notifications

```
position: bottom-right, stack upward
width: 360px
border-left: 4px solid [color]
border-radius: 10px
animation: slide-in from right 200ms ease-out

success  → green border + CheckCircle icon
error    → red border + XCircle icon
warning  → amber border + AlertTriangle icon
info     → blue border + Info icon
```

---

### 5.7 Modals

```
backdrop: rgba(0,0,0,0.5) blur(4px)
container: max-w-lg, bg surface, border-radius 16px, p-6
animation: scale-in from 0.95 + fade-in 180ms ease-out
focus trap: active while open, returns to trigger on close
```

---

## 6. Page-by-Page Design Specification

### 6.1 Landing Page (`/`)

**Goal:** Convert visitors into registered citizens or authority logins.

#### Hero Section
```
Layout: 60/40 split — text left, illustration right
Background: Gradient from #003366 to #0055A4 + subtle grid pattern overlay
Headline: "Samasyaon ka Samadhan, AI ke Saath" (Hindi)
Subheadline: English translation + value prop
CTAs: "File a Complaint" (orange) | "Sign In to Portal" (white outline)
Trust bar: Govt. dept. logos + "Powered by Groq AI" badge
```

#### Features Section (3-column card grid)
```
Icon + title + 2-line description per card
Icons: Outlined lucide-react in cr-blue-light chip
Animation: Cards stagger fade-in on scroll
```

#### How It Works (Horizontal stepper)
```
Steps: 1. Report → 2. AI Triage → 3. Assign → 4. Resolve & Verify
Each: large step number + icon + 2-line description
```

#### Stats Bar
```
Full-width cr-blue background
4 animated counters: Incidents Resolved | Avg Response Time | Cities | Satisfaction %
Numbers count up on first scroll into view
```

#### Footer
```
3-column: Brand | Quick links | Contact
Bottom: "An initiative under Digital India · WCAG 2.1 AA Compliant"
Tricolor bar at bottom (saffron → white → green, 4px height)
```

---

### 6.2 Login Page (`/login`)

```
Layout: Centered card on dot-grid cr-blue-pale background
Card: max-w-md, p-8, shadow-xl, border-radius 20px

Contents:
  Logo (icon + wordmark)
  "Sign in to your portal" subtitle
  Email input (mail icon prefix)
  Password input (eye toggle suffix)
  "Forgot password?" link (right-aligned)
  Sign In button (full-width, cr-orange)
  Divider "or"
  Google OAuth button
  "New here? Create an account →" footer link

DEV ONLY: Role selector panel with "Testing Mode" badge
  (visible only when DEV_AUTH_BYPASS=true)
```

---

### 6.3 Signup Page (`/signup`)

```
Two-step form with step pill indicator at top:

Step 1 — Account Type Selection
  Two large selection cards (side by side):
    Citizen: person icon, warm tones, "For residents filing complaints"
    Authority: shield icon, navy tones, "For municipal officers managing incidents"

Step 2 — Personal Details
  Full name | Phone | Email | Password | Confirm Password
  Authority-only fields: Organisation | Department | Position | Employee ID
  Submit: "Create Account" (cr-orange, full-width)
  Privacy notice below button
```

---

### 6.4 Citizen Dashboard (`/citizen`)

**Layout:** Sidebar + main content (collapses to bottom nav on mobile)

#### Header Strip
```
"Good morning, [Name]" in cr-page-title
Subtitle: "Here is the current status of your reports."
CTA: "+ Report New Incident" (cr-orange, top-right)
```

#### Stats Row (4 cards)
```
Total Filed | Pending/In Progress | Resolved | Avg Resolution Time
Each: icon + number + label + small trend indicator
```

#### Incidents List
```
Chip filters: All | Pending | In Progress | Resolved
Each row: [Thumbnail] Title | Category · Location | Created At | [Severity] [Status]
```

#### Map Panel (toggle)
```
Leaflet map, markers color-coded by severity
Click marker → popup with title, status, "View Details" link
```

---

### 6.5 Report Incident (`/citizen/report`)

**Most critical citizen-facing page. Multi-step form.**

```
Step 1 — Category
  Grid of cards: Pothole | Garbage | Water Leak | Streetlight | Noise | Other
  Selected: blue border + checkmark overlay

Step 2 — Description
  Textarea (min 20 chars, live counter below)
  Voice input button (mic icon → transcribes)
  Language selector: English | Hindi | Regional

Step 3 — Photo Upload
  Large drag-and-drop zone, dashed border
  On upload: thumbnail preview
  AI analyzing: pulsing blue ring + "AI is analyzing your photo..."
  AI result chip: green (relevant) or amber (irrelevant) with explanation

Step 4 — Location
  Leaflet map with draggable pin
  "Use my current location" (GPS icon)
  Address auto-filled from reverse geocode
  Lat/Lng display in mono text

Step 5 — Review & Submit
  Summary card of all entered details, with edit links
  "Submit Report" button (large, cr-orange, full-width)
  Privacy notice below

Top: 5-segment progress bar, fills left-to-right
```

---

### 6.6 Authority Dashboard (`/authority`)

**Power-user dashboard for municipal officers.**

#### KPI Row (5 stat cards)
```
Total Incidents | Pending Triage | In Progress | Resolved Today | Avg Response Time
Each card: trend arrow (vs last week) + sparkline mini-chart
```

#### Incidents Table
```
Columns: ID | Title | Category | Severity | Status | Location | Submitted | Assigned To | Actions
Filters: Status | Severity | Category | Date range | Department
Bulk actions toolbar: Assign | Change Status | Export CSV
Row actions: View | Assign Worker | Reject | Verify Resolution
```

#### Side Panel: Live Heatmap
```
Leaflet map with incident density heatmap
Toggle: Heatmap | Markers | Clusters
Filter by severity and date range
```

#### Analytics Widgets (mini)
```
Small bar chart: Incidents by category (last 30 days)
Small line chart: Resolution rate trend
"View Full Analytics →" link
```

---

### 6.7 Analytics Page (`/analytics`)

```
Top: Date range picker (7d / 30d / 90d / custom)

Row 1: 4 KPI cards with large trend indicators

Row 2:
  Left 60%: Line chart — Incidents over time, stacked by category
  Right 40%: Donut chart — Category breakdown

Row 3:
  Left 50%: Bar chart — Resolution time by department
  Right 50%: Bar chart — Incidents by severity

Row 4: Table — Top 10 locations by incident count
```

Chart color palette: use `--cr-blue`, `--cr-orange`, `--cr-green` and variants (not Recharts defaults).

---

### 6.8 Worker Dashboard (`/worker`)

**Field agent UI — mobile-first priority.**

#### Active Assignments
```
Card list sorted by severity (Critical first)
Each card:
  [Severity badge] [Category icon] Title
  Location · Assigned at
  [View Details] [Navigate] [Mark In Progress]
```

#### Incident Detail (modal or full-page)
```
Before photo (large display)
Description + AI summary
Location map + directions link
"Upload Resolution Proof" (camera capture)
"Mark as Resolved" CTA (full-width, cr-green)
```

#### Task History Tab
```
Completed tasks, sortable by date
Each entry: title | resolved at | verification status badge
```

---

### 6.9 QR Tracker — Public (`/track/:id`)

**No login required.**

```
Clean centered card, white on grey background
Header: Logo + "Public Incident Tracker"
Incident details: Title | Category | Location
Status timeline:
  [Submitted] → [AI Triaged] → [Assigned] → [Resolved]
  Completed steps: solid green dot
  Current step: pulsing green dot
  Future steps: grey dot

If resolved: before/after photo side-by-side (or slider)
"Share this report" button (copy link to clipboard)
```

---

### 6.10 QR Projects (`/qr-projects`) — Authority Only

```
Grid of project cards:
  Each: location photo | name | created | # incidents | status | [View QR] [Archive]

"+ Create New Project" button (top-right)

QR Code modal:
  Large QR code display
  Download button (PNG)
  Print button (opens print-optimized view)
```

---

### 6.11 Settings (`/settings`)

```
Left nav tabs: Profile | Notifications | Security | Appearance
Right: content for active tab

Profile:
  Circle avatar upload (96px)
  Name, Phone, Email (editable)
  Authority-only: Organisation, Department, Position
  "Save Changes" button

Notifications:
  Toggle switches: Email | SMS | In-app
  Per-event: New assignment | Status change | AI result ready

Appearance:
  Theme: Light | Dark | System (segmented control)
  Language: English | Hindi | Regional
  Font size: Default | Large | Extra Large

Security:
  Change password form
  Active sessions list with "Revoke" per session
  2FA setup (placeholder for V2)
```

---

## 7. Navigation System

### 7.1 Top Navigation Bar
```
Height: 60px
Background: var(--cr-surface), shadow-sm
Left:   Hamburger (mobile) + Logo
Center: App name (desktop)
Right:  Notifications bell (badge) + User avatar (dropdown)
```

### 7.2 Sidebar (Desktop, 240px)
```
Collapsed mode: 64px icon-only
Background: var(--cr-surface)
Right border: 1px solid var(--cr-border)

Citizen items: Dashboard | Report Incident | My Incidents | Settings
Authority items: Dashboard | Incidents | Analytics | QR Projects | Settings
Worker items: My Tasks | Task History | Settings

Active item: cr-blue-pale bg + cr-blue-mid text + 3px left border cr-blue
```

### 7.3 Mobile Bottom Navigation
```
Max 5 tabs fixed at bottom of viewport
Icon + label per tab
Active: cr-blue icon + cr-orange bottom indicator dot
Safe area inset for iOS home bar
```

### 7.4 Breadcrumbs (non-dashboard pages)
```
Format: Dashboard > Incidents > #INC-0042
Each segment clickable, last is plain text
```

---

## 8. Motion & Animation Language

### 8.1 Core Principles
- **Purposeful** — explain state changes, not decorate
- **Fast** — 150ms–300ms; never over 500ms for page transitions
- **Reduced-motion safe** — all transitions respect `prefers-reduced-motion`

### 8.2 Animation Catalogue

| Name | Duration | Easing | Usage |
|---|---|---|---|
| `fade-in` | 150ms | ease-out | Tooltips, popovers |
| `slide-up` | 200ms | ease-out | Modals, sheets |
| `slide-right` | 200ms | ease-out | Toasts |
| `scale-in` | 180ms | ease-out | Cards appearing |
| `stagger-children` | 50ms delay/item | ease-out | Grid card entrances |
| `pulse` | 2s infinite | ease-in-out | AI processing indicator |
| `count-up` | 1200ms | ease-out | Stat counters on landing |
| `shimmer` | 1.5s infinite | ease-in-out | Skeleton loaders |

### 8.3 Page Transitions
```
Exit:  fade out 100ms ease-in
Enter: fade in + translateY(8px → 0) 200ms ease-out
```

---

## 9. AI States & Feedback

### 9.1 AI Processing States (Report Incident)

| State | Visual | Copy |
|---|---|---|
| Idle | Dashed upload zone | "Upload photo for AI analysis" |
| Uploading | Progress bar | "Uploading..." |
| Analyzing | Pulsing blue ring + spinner | "AI is analyzing your photo..." |
| Success — Relevant | Green chip | "Pothole detected · Medium severity · Valid report" |
| Success — Irrelevant | Amber warning | "Your image appears unrelated. Please upload a relevant photo." |
| Failed | Soft amber warning | "AI analysis unavailable. Your report will be manually reviewed." |

### 9.2 AI Badge (on incident cards)
```
[AI Processed]   → blue chip
[Manual Review]  → amber chip
[AI Verified]    → green chip (for resolved incidents)
```

### 9.3 Spam Detection UX
```
Inline warning below submit button (not a blocking modal):
  "Your report was flagged as potentially invalid: [reason].
   You can still submit — it will be reviewed manually."

Submit button text changes to: "Submit for Manual Review"
```

---

## 10. Empty States

| Screen | Headline | Sub-text | CTA |
|---|---|---|---|
| Citizen — no incidents | "No reports yet" | "File your first complaint and we'll get it resolved." | "Report an Incident" |
| Authority — no incidents | "All clear!" | "No open incidents. Your city is looking great." | — |
| Worker — no tasks | "No active assignments" | "New tasks appear here when assigned by your supervisor." | — |
| Analytics — no data | "Not enough data yet" | "Analytics populate once incidents are filed." | — |
| Notifications — none | "You're all caught up!" | "New notifications appear here." | — |

Each empty state should have a simple SVG illustration (not emoji) in the brand color palette.

---

## 11. Accessibility (WCAG 2.1 AA)

### Checklist
- [ ] All text meets 4.5:1 contrast (body) / 3:1 (large text, UI components)
- [ ] All interactive elements keyboard-reachable (Tab / Shift+Tab / Enter / Space)
- [ ] Visible focus indicator: `outline: 3px solid var(--cr-blue); outline-offset: 2px`
- [ ] All images have meaningful `alt` text; decorative images use `alt=""`
- [ ] Form inputs have associated `<label>` (not just placeholder)
- [ ] Error messages use icon + text (never color alone)
- [ ] Modal focus trap: focus moves in on open, returns to trigger on close
- [ ] `aria-live="polite"` on toast notification region
- [ ] `role="status"` on loading/processing indicators
- [ ] Skip-to-content link at page top for screen readers

### Hindi / Regional Language
- Use `lang="hi"` attribute on Hindi text nodes
- Line-height >= 1.6 for Devanagari readability
- Font fallback: `'Noto Sans Devanagari', system-ui`

---

## 12. Dark Mode

### 12.1 Dark Palette

```css
.dark {
  --cr-bg:             #0D1117;
  --cr-bg-offset:      #161B22;
  --cr-surface:        #161B22;
  --cr-surface-raised: #1E2530;
  --cr-text:           #E6EDF3;
  --cr-text-secondary: #8B949E;
  --cr-text-muted:     #6E7681;
  --cr-border:         #30363D;
  --cr-border-strong:  #484F58;

  /* Lighten tinted backgrounds for dark surfaces */
  --cr-blue-light:   rgba(0, 85, 164, 0.20);
  --cr-orange-light: rgba(244, 121, 32, 0.15);
  --cr-green-light:  rgba(26, 122, 62, 0.20);
  --cr-red-light:    rgba(185, 28, 28, 0.20);
  --cr-amber-light:  rgba(217, 119, 6, 0.20);
}
```

### 12.2 Dark Mode Rules
- Avoid pure `#000000` — use `#0D1117` (GitHub-style)
- `#003366` is too dark for dark surfaces — use `#1A6BC6` as primary on dark
- Cards need a `1px border` in dark mode (box-shadow invisible on dark bg)

---

## 13. Responsive Breakpoints

| Breakpoint | Width | Layout behavior |
|---|---|---|
| `xs` | < 480px | Mobile portrait — single column |
| `sm` | 480–767px | Mobile landscape — some 2-col |
| `md` | 768–1023px | Tablet — sidebar collapses to icon-only |
| `lg` | 1024–1279px | Desktop — full sidebar visible |
| `xl` | 1280–1535px | Wide desktop |
| `2xl` | >= 1536px | Ultra-wide — max-width container |

### Mobile-specific rules
- Sidebar replaced by bottom navigation bar (5 icons max)
- Floating "+Report" FAB: 56px circle, cr-orange, fixed bottom-right
- Tables collapse to card list below `sm`
- Modals become full-screen bottom sheets below `md`
- Map panel hidden by default — behind "View Map" toggle

---

## 14. Design Debt & Issues to Fix

### High Priority
- [ ] **Landing page hero** — needs a real SVG/Lottie illustration (currently likely plain text)
- [ ] **Report Incident stepper** — progress bar exists but styling is inconsistent across steps
- [ ] **Citizen dashboard empty state** — needs proper illustration component
- [ ] **Authority incidents table** — bulk action toolbar design missing
- [ ] **Mobile layout** — sidebar/nav not fully mobile-optimized

### Medium Priority
- [ ] **Skeleton loaders** — replace all spinners with shimmer skeletons during data fetch
- [ ] **Error pages (404, 401)** — need illustrations + helpful guidance, not just text
- [ ] **Analytics charts** — color palette should use `--cr-*` tokens (not Recharts defaults)
- [ ] **Worker dashboard** — only one file; needs mobile card layout treatment
- [ ] **Toast on mobile** — verify it doesn't overlap bottom nav bar
- [ ] **QR code modal** — add print styles for direct QR printing

### Low Priority
- [ ] **Dark mode** — `.dark` class tokens defined but full implementation missing
- [ ] **Print styles** — expand beyond hiding nav (add logo, clean layout)
- [ ] **Focus rings** — audit all interactive elements for visible focus indicators
- [ ] **Form validation** — red/green border states needed on all inputs consistently

---

## 15. Icon System

Using **lucide-react** throughout.

| Context | Size | Stroke width |
|---|---|---|
| Nav sidebar | 20px | 1.5 |
| Button prefix | 16px | 1.5 |
| Card header | 20px | 1.5 |
| Stat card | 24px | 1.5 |
| Empty state | 48px | 1 |
| Toast | 20px | 1.5 |
| Severity badge | 14px | 2 |

Icons must never be used without an accessible label (either visible text, `aria-label`, or `title`).

---

## 16. Future Enhancements (V2)

- **Multilingual UI** — full i18n with `react-i18next`, EN/HI/regional
- **PWA** — offline-capable report drafts, background sync on reconnect
- **Push notifications** — Firebase FCM for real-time incident updates
- **AI Chatbot** — floating help bubble with FAQ assistant
- **Field worker mobile app** — standalone React Native app sharing these design tokens
- **Accessibility audit** — axe-core in CI pipeline
- **Design tokens export** — Figma token sync via `style-dictionary`

---

*Last updated: September 2026 · Jan Samadhan AI Team*
