# Dead Code Register — Jan Samadhan AI

**Status:** living document · **Last updated:** 2026-09-17

## Why this file exists

The repo contains code that is intentionally unused today but is expected to be
needed later — future features, browsable API contracts, government design assets,
planned auth. Deleting it destroys optionality; leaving it unlabelled makes the
codebase unreadable and lets genuinely dead code hide among the parked items.

This register records **what is unused, why it is being kept, which feature it
belongs to, and when to re-review it.**

## Policy

| Tier | Meaning | Action |
|---|---|---|
| **DELETE** | Exact duplicate, dead scaffolding, or a stub the file itself declares obsolete *and* whose live replacement exists | removed |
| **KEEP + REGISTER** | Unused today, plausibly needed later | stays in place, listed below, suppressed in the linters with the reason |
| **FIX** | Unused *because something is misconfigured*, not because it is dead | repaired |

Rules:

1. Nothing is deleted merely because a tool reports it unused.
2. Anything kept must have a row here with a reason and a review date.
3. Anything suppressed in `knip.json` must trace back to a row here.
4. New unused code found by tooling is either deleted or added here in the same change.
5. When a registered item is finally wired up, delete its row.

## How the checks run

```bash
cd frontend && npm run knip      # report unused files / deps / exports
cd frontend && npm run knip:ci   # fails on any unregistered issue

cd backend  && python -m vulture app/ --min-confidence 80
cd backend  && python -m ruff check app/
```

`frontend/knip.json` is the source of truth for frontend suppressions.
knip cannot analyse `backend/` — it is Python and has no `package.json`.

## Frontend — KEEP + REGISTER

| Path | Unused because | Kept because | Review by |
|---|---|---|---|
| `lib/supabase/client.ts` | nothing imports it | the client to wire when the dev auth bypass (`ProtectedRoute.tsx` / `useAuthStore.ts`) is replaced with real Supabase Auth | 2026-12-31 |
| `lib/client.ts` | nothing imports it | cookie-backed `@supabase/ssr` browser client, needed if sessions move to cookies | 2026-12-31 |
| `lib/server.ts` | nothing imports it | SSR cookie client. Only usable if the frontend moves to Next.js / React Router SSR — it uses `process.env` + Web `Request`, so it cannot run in the current Vite SPA | 2026-12-31 |
| `@supabase/ssr`, `@supabase/supabase-js` | only imported by the three files above | same reason — listed in `knip.json#ignoreDependencies` | 2026-12-31 |
| `public/css/ux4g-*.css` (16 files) | see the UX4G section below | official government design standard: grid, RTL, utilities, reboot, date-time layers, plus the icon sprites `ux4g.css` references | 2027-03-31 |
| `public/logo2.jpg`, `public/icons.svg`, `assets/hero.png` | 0 references in code | branding / marketing assets; `icons.svg` looks like the sprite `ux4g.css` expects at `../img/common-gov-icons/` | 2027-03-31 |
| `components/ui/dialog.tsx` → `DialogClose`, `DialogDescription`, `DialogFooter`, `DialogTrigger` | not used by current screens | standard shadcn primitives, re-exported as a set so `dialog.tsx` stays a drop-in shadcn file. Suppressed via `knip.json#ignoreIssues` | 2027-03-31 |
| `components/ui/card.tsx` → `CardAction` | not used by current screens | part of the shadcn Card primitive set (Card / Header / Title / Description / Action / Content / Footer). Suppressed via `knip.json#ignoreIssues` | 2027-03-31 |
| `types/index.ts` → `DashboardStats`, `IncidentFormData` | not referenced by current screens | mirror the Supabase schema / API payload shapes, so the next screen that needs them does not have to re-derive the contract. Suppressed via `knip.json#ignoreIssues` | 2027-03-31 |
| `lib/translations/index.ts` → `export { en, hi, ta, te, mr, bn }` | the barrel's `translations` map is what is consumed | per-language named re-exports so a single locale can be imported in isolation (tests, a language picker) | 2027-03-31 |
| `store/useAuthStore.ts` → `DEFAULT_DEV_USER` | used only as the store's own dev default | it *is* the dev-bypass profile; it must be removed together with the auth bypass, never before it | with auth work |
| `components/ui/badge.tsx` → `badgeVariants`, `components/ui/button.tsx` → `buttonVariants` | used only inside their own file | shadcn convention (and the reason `button-variants.ts` was a duplicate). Suppressed via `knip.json#ignoreExportsUsedInFile` | n/a |
| `langchain` (pip, backend) | no direct import anywhere | umbrella metapackage; removing it risks breaking the `langchain-groq` / `langchain-core` install for zero benefit | with backend pass |

## Frontend — FIX

These were not dead; something was misconfigured, so they were repaired rather than removed.

| Path | Problem found | Fix applied |
|---|---|---|
| `lib/client.ts` | read `VITE_SUPABASE_PUBLISHABLE_KEY`, which exists in no `.env` or `.env.example` | changed to `VITE_SUPABASE_ANON_KEY` |
| `lib/supabase/client.ts` | fell back to `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (nonexistent) | removed the dead fallback |
| `lib/server.ts` | read `VITE_SUPABASE_PUBLISHABLE_KEY` | changed to `VITE_SUPABASE_ANON_KEY` |
| `.env.example` | advertised `VITE_API_URL`, which no code reads — the app uses relative `/api/*` paths plus the Vite proxy | replaced with an explanation of the proxy model |
| `frontend/tsconfig.tsbuildinfo` | untracked **and** not gitignored, so a build artifact polluted `git status` | added `*.tsbuildinfo` to `.gitignore` |
| `frontend/package.json`, `frontend/package-lock.json` | untracked, so frontend dependencies were not reproducible from git | `knip` added to devDependencies and `npm install` run so the lockfile is current — **both files are still untracked and land in the baseline commit** |
| `index.html` UX4G `<link>` | unlayered global CSS silently overriding Tailwind and our own base layer | unlinked; values preserved via our own tokens — see below |

## Frontend — DELETE

| Path | Why it was provably safe |
|---|---|
| `components/ui/button-variants.ts` | byte-for-byte duplicate of the `buttonVariants` cva defined inside `button.tsx`; nothing imported it |
| `assets/react.svg` | Vite scaffolding leftover, 0 references |
| `assets/vite.svg` | Vite scaffolding leftover, 0 references |

## UX4G vendored CSS — deliberate decision (NOT dead code)

`frontend/public/css/` is the vendored [UX4G](https://doc.ux4g.gov.in) design system —
v2.0.8, MIT, © 2024-2025 NeGD/MeitY, the Government of India's official design
standard and a forked + extended Bootstrap 5 distribution.

`ux4g.css` was **unlinked from `index.html`** because loading it globally was an
active bug, not because it is unused:

- It is unlayered CSS with **1,689 `!important`** declarations and **0 `@layer`**.
  Unlayered declarations beat declarations inside any `@layer`, so it silently
  outranked every Tailwind v4 utility layer (`.border`, `.text-center`, `.gap-*`,
  `.p-*`, `.mb-*`, `.shadow-*`, …) and our own `@layer base` body typography.
- It forced a **purple (`#613AF5`) theme** onto `.bg-primary` / `.bg-secondary`,
  overriding our `--primary` / `--secondary` tokens on 14 buttons and badges.
- It imposed Bootstrap's spacer scale (`3 = 1rem`, `4 = 1.5rem`, `5 = 3rem`) over
  Tailwind's (`0.75 / 1 / 1.25rem`) across roughly 200 spacing utilities.
- Its own assets 404: `../fonts/NotoSans-*`, `../img/common-gov-icons/…`,
  `../img/state-icon/…`, `../img/ut-icon/…`, `../img/country-icons/…`,
  `../img/social-icons/…`, `../images/search.svg` — none of those directories exist,
  so its `@font-face` and every government icon class were silently broken.
- We were not consuming it anyway: `--bs-*` had **0** references in the app
  (versus 450 `--cr-*`), and `d-flex` / `nav-link` / `form-control` /
  `table-striped` had **0** usages.

**Every file in `public/css/` is retained, byte-identical.** The values UX4G was
genuinely imposing were re-declared by us in `frontend/index.css` under
**"UX4G CONTINUITY TOKENS"**, and verified against the production build:

```
.p-4        {padding:var(--spacing-4)}                 --spacing-4: 1.5rem   ← UX4G value, now ours
.shadow-sm  {--tw-shadow:0px 4px 4px 0px …#2121211f}                          ← UX4G value, now ours
.bg-primary {background-color:var(--primary)}          = our navy token      ← purple hijack fixed
.text-center{text-align:center}                        no !important         ← conflict gone
```

See `frontend/public/css/README.md` for the re-enable procedure and the
"never bridge `--bs-*` into `--cr-*`" policy.

## Backend (audit COMPLETE — 2026-09-17)

Static pass finished: vulture (`app vulture_whitelist.py --min-confidence 60`) is
clean, ruff (`ruff.toml`: E4/E7/E9/F/I/B/UP) is clean, pytest 49/49 green.

### Dispositions (final)

| Path | Finding | Disposition |
|---|---|---|
| `app/services/ai/placeholders.py` | "Phase 1 placeholder" superseded by `langgraph_pipeline.py`; zero importers | **DELETED** (`git rm`) |
| `app/whatsapp_ai/utils/whatsapp_logger.py` | superseded by `app/core/logging_config.py`; would double-log | **DELETED** (`git rm`) |
| `app/ai/tasks.py` dead `nodes = [...]` list | referenced non-existent `pipeline.graph_instance` | **FIXED** (list removed) |
| 24× `raise HTTPException(...)` without `from e` (B904) | in `api/{auth,incident,notifications,qr_projects}.py`, `services/incident_service.py`, `whatsapp_ai/services/whatsapp_user_service.py` | **FIXED** (all chained `from e`) |
| `app/core/security.py`, `app/ai/services/vision_service.py`, `app/api/incident.py` | imports below module-level statements | **FIXED** (hoisted) |
| 2× one-line `if: x` (E701) in `transcription_service.py`, `whatsapp_media_service.py` | style only | **FIXED** |
| `tests/test_auth.py` B023 loop-variable capture | consumed synchronously (benign) | **FIXED** (default-arg binding) |
| `app/main.py` E402, `tests/legacy_scripts/*` E402 | `load_dotenv()` / `sys.path` MUST precede app imports | **KEEP** — documented `per-file-ignores` in `ruff.toml` |
| `app/whatsapp_ai/services/whatsapp_confirmation_service.py` | outbound citizen confirmations, unwired | **KEEP + REGISTER** — Phase-19 roadmap item |
| `app/whatsapp_ai/services/whatsapp_incident_mapper.py` + `schemas/structured_incident_schema.py` | canonical-payload mapping | **KEEP + REGISTER** |
| `app/whatsapp_ai/schemas/twilio_payload_schema.py` | documents the Twilio form contract | **KEEP** (contract doc) |
| `app/ai/services/trust_scoring_service.py` | fully implemented, tested (`test_schema_gotchas.py`), never invoked by pipeline/API | **KEEP + REGISTER** — Phase-19 roadmap item |
| `app/ai/services/duplicate_detection_service.py::GEO_RADIUS_METERS` | tuning constant, referenced in comments only | **KEEP + REGISTER** — review at duplicate-detection tuning |
| `whatsapp_session_manager.py::get_session_data` | alternate accessor; live flow uses `get_session` | **KEEP + REGISTER** — review next backend pass |
| `ai_response_models.py::TranscriptionResponse / VisionAnalysisResponse`; `schemas/auth.py` response models; `schemas/incident.py` response models | complete API contracts, ready for `response_model=` | **KEEP** — API contracts |
| `app/core/database.py::reset_supabase_client` | used by `tests/test_database.py` | **KEEP** |
| FastAPI handlers, Pydantic validators/fields, dataclass fields | static-analysis false positives | **KEEP** — whitelisted in `vulture_whitelist.py` with rationale |

### Deliberately deferred

- **`ruff format`**: 53/59 files would be reformatted. Pure style churn on working
  modules — must land as its own dedicated commit, never mixed with logic edits.
- **Whitelist review date: 2026-12-16** (3 months). Items above marked
  KEEP+REGISTER must either be wired in or deleted at that point.

> **Do not "fix" the unused-function warnings in `app/api/*.py` or `app/main.py`.**
> Every function flagged there (`health_check`, `list_incidents`, `upload_image`,
> `handle_whatsapp_webhook`, …) is registered through an `@router` / `@app`
> decorator. Static analysis cannot see decorator-based registration.

## Change log

| Date | Change |
|---|---|
| 2026-09-17 | Register created. UX4G `ux4g.css` unlinked; continuity tokens added and verified against the production build. 3 dead frontend files removed. Env-var misreads and `.env.example` fixed. `tsconfig.tsbuildinfo` gitignored; `package.json` + lock updated (both still untracked — pending baseline commit). knip configured (`frontend/knip.json`) with `npm run knip` / `knip:ci`; knip added to devDependencies (lockfile updated, 22 packages). Reduced-motion and print styles added. |
| 2026-09-17 | Backend dead-code audit completed: `placeholders.py` + `whatsapp_logger.py` deleted; `tasks.py` dead nodes list removed; 24× B904 exception chains fixed; E402/E701/B023 resolved (2 documented per-file-ignores). `ruff.toml` + `vulture_whitelist.py` added; ruff/vulture pinned in `requirements-dev.txt`. pytest 49/49 green throughout. `ruff format` deferred (see above). |