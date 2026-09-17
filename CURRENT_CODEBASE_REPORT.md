# Current Codebase Report — Jan Samadhan AI

**Date:** 2026-09-17 · **Branch:** `initial-v1` · **Base commit:** `e271bf3`
**Scope of this report:** frontend dead-code / CSS-cleanup phase ("Option A"), plus
the exact state of the working tree and what remains.

---

## 1. TL;DR

| Area | State |
|---|---|
| Frontend UX4G unlink + continuity tokens | ✅ **done, verified against production build** |
| Frontend dead-file deletion | ✅ done (3 files, all provably safe) |
| Frontend tooling (knip) | ✅ configured, **exit 0**, clean |
| Typecheck (`tsc -b`) | ✅ exit 0 |
| Production build | ✅ succeeded (28.4s), purple fully absent from dist |
| `DEAD_CODE_REGISTER.md` | ✅ created (policy + per-item reasons + review dates) |
| Backend dead-code pass | ⏸ deferred (documented in the register, not executed) |
| Visual smoke test | ⏳ **not done — the only real remaining frontend check** |
| **Git commits** | 🔴 **NOTHING committed — ~60 changed/new files sit unprotected in the working tree** |

> **The single most important fact in this report:** every change described here —
> and the earlier backend/logging/test work — exists only as uncommitted working-tree
> state on top of `e271bf3`. Commit before anything else.

---

## 2. What was done (frontend)

### 2.1 UX4G unlink — the core change

`frontend/index.html` no longer links `/css/ux4g.css`. A comment block in its place
explains why and points to the two policy documents
(`frontend/public/css/README.md`, `/DEAD_CODE_REGISTER.md`).

**Why it was a bug, not just bloat.** UX4G v2.0.8 (MIT, © NeGD/MeitY) is a Bootstrap 5
fork: **349 KB, 12,619 lines, 1,689 `!important` declarations, 0 `@layer`**. Unlayered
CSS outranks declarations inside any `@layer`, so it silently beat every Tailwind v4
utility layer and our own base layer. Concretely, it was:

- forcing a purple theme (`#613AF5`) onto `.bg-primary`/`.bg-secondary` (14 sites),
- overriding ~200 spacing utilities with Bootstrap's spacer scale,
- overriding `.border`, `.text-center`, `.gap-*`, `.mb-*`, `.shadow-*`,
- failing its own asset loads (`../fonts/NotoSans-*`, `../img/common-gov-icons/…`,
  state/ut/country/social icon dirs, `../images/search.svg` all 404).

And we were consuming almost none of it: `--bs-*` had **0** references (vs 450
`--cr-*`), and `d-flex`/`nav-link`/`form-control`/`table-striped` had **0** usages.
The 83 apparent class hits were Tailwind-name collisions, not UX4G usage.

### 2.2 Continuity tokens — the look survives

`frontend/index.css` gained a **"UX4G CONTINUITY TOKENS"** `@theme` block
(lines 50–79) re-declaring exactly the values UX4G was imposing:

```css
--spacing-3: 1rem;   /* Tailwind native: 0.75rem */
--spacing-4: 1.5rem; /* Tailwind native: 1rem    */
--spacing-5: 3rem;   /* Tailwind native: 1.25rem */
--shadow-sm/md/lg/xl: UX4G's exact stacks
```

plus two new blocks: `@media (prefers-reduced-motion: reduce)` (deliberately
unlayered so it outranks utility transitions) and `@media print` (hides
`.cr-navbar`, `.cr-sidebar`, `.cr-tricolor-bar`; forces white/black for gov print).

**Verified in the emitted bundle** (`dist/assets/index-DJwkhbY6.css`):

| Check | Result |
|---|---|
| `--spacing-4: 1.5rem` emitted | ✅ |
| `.p-4{padding:var(--spacing-4)}` | ✅ |
| UX4G shadow stack (`0px 1px 3px 1px …`) | ✅ |
| purple `#613AF5` / `#938BB6` anywhere | ✅ **0 hits** |
| `.bg-primary` → `var(--primary)` (navy) | ✅ |

The block is self-documenting: delete the `@theme` block to adopt Tailwind's native
scale instead (a deliberate, opt-in visual change — see §6 gotcha #4).

---

## 3. Current working-tree state (exact, 2026-09-17)

Branch `initial-v1` @ `e271bf3`, **nothing staged, nothing committed**.

### Modified (24 backend, 1 root, 20 frontend)

- **Root:** `.gitignore`
- **Backend (19):** `app/ai/services/{duplicate_detection,resolution_verification,trust_scoring,vision}_service.py`, `app/ai/tasks.py`, `app/api/{auth,incident,qr_projects}.py`, `app/core/{config,database,security}.py`, `app/main.py`, `app/schemas/{auth,incident}.py`, `app/services/{incident,notification}_service.py`, `app/whatsapp_ai/controllers/whatsapp_webhook_controller.py`, `app/whatsapp_ai/services/twilio_webhook_service.py`, `requirements.txt`
- **Backend deletions (5):** `tests/test_ai.py`, `test_api.py`, `test_db.py`, `test_pipeline.py`, `test_trace.py`
- **Frontend:** `index.css`, `lib/{api,client,server,supabase/client}.ts`, `components/auth/ProtectedRoute.tsx`, `components/shared/{IncidentDetailModal,LoadingSpinner}.tsx`, `pages/auth/{Login,Signup}.tsx`, `pages/authority/{Analytics,Dashboard,QrProjects}.tsx`, `pages/authority/components/ExpandedAiPanel.tsx`, `pages/authority/hooks/useDashboardState.ts`, `pages/citizen/ReportIncident.tsx`, `pages/public/{LandingPage,QrTracker}.tsx`, `pages/shared/IncidentsList.tsx`, `routes.tsx`, `store/useAuthStore.ts`
- **Frontend deletions (3):** `assets/react.svg`, `assets/vite.svg`, `components/ui/button-variants.ts`

### Untracked (new — must be added)

- **Docs:** `CURRENT_CODEBASE_REPORT.md`, `DEAD_CODE_REGISTER.md`, `CODEBASE_ANALYSIS.md`, `PROJECT_GUIDE.md`
- **Frontend infra:** `index.html`, `vite.config.ts`, `tsconfig.json`, `vite-env.d.ts`, `package.json`, `package-lock.json`, `knip.json`, `.env.example`, `shadcn/tailwind.css`
- **Frontend docs:** `public/css/README.md`
- **Backend infra:** `app/core/logging_config.py`, `app/core/middleware.py`, `migrations/005_schema_alignment.sql`, `pytest.ini`, `requirements-dev.txt`, `tests/conftest.py`, `tests/test_{auth,config,database,logging,schema_gotchas}.py`, `tests/legacy_scripts/`

> Note: `frontend/index.html`, `vite.config.ts`, `tsconfig.json`, `package.json` were
> **never tracked** — the frontend was effectively not reproducible from git. The
> baseline commit fixes that.

---

## 4. Gotchas — read before touching anything

### 🔴 G1. Nothing is committed — and some files have NO git history anywhere

`frontend/index.html`, `vite.config.ts`, `tsconfig.json`, `package.json`,
`package-lock.json` are **untracked**, not merely modified. They exist in exactly one
place: this working directory. A careless `git checkout .`, `git reset --hard`, or
`git clean -fd` deletes them permanently, and with them the ability to run
`npm install` / `vite` at all. **Commit before any further work.**

### 🟠 G2. The `--spacing-*` overrides re-scaled the whole app — on purpose, but it's a trap

`--spacing-3/4/5 = 1rem / 1.5rem / 3rem` means every `p-4`, `gap-3`, `mb-5`,
`px-4`… in the codebase is Bootstrap-sized, **not** stock Tailwind (0.75 / 1 /
1.25rem). Anyone writing new code while reading stock Tailwind docs will be wrong by
2×. This is deliberate (visual continuity), but it is a standing decision that needs
an owner and a review date — it's the single most confusing thing a new contributor
will hit.

### 🟠 G3. `bg-primary` changed colour the moment UX4G was unlinked

Before: UX4G's purple `#613AF5` won. Now: our navy `--primary` token wins. That is the
intended fix, but any stakeholder who remembers/approved the *purple* look will see a
change. Capture before/after screenshots during the smoke test so the change is
explainable.

### 🟠 G4. Deleting the continuity `@theme` block later reflows ~200 sites

The block is an opt-in bridge. Removing it (to adopt native Tailwind spacing) is a
**visual redesign event**, not a cleanup — schedule it, screenshot it, never mix it
with an unrelated commit.

### 🟡 G5. knip runs with `--cache`

`npm run knip` uses the cache in `node_modules/.cache/`. If results look stale after
adding/moving files, delete that folder or run `npx knip` without `--cache` once.

### 🟡 G6. `public/css/*` stays even though it's unlinked

16 UX4G files (~1.1 MB) remain vendored by decision ("don't delete what may be needed
later"). knip won't flag them (its project glob is `**/*.{ts,tsx}`), but do not
"helpfully" delete them. If UX4G is ever re-enabled, its own fonts/icons
(`../fonts/…`, `../img/…`) **still don't exist** and will 404 silently again — vendor
those assets as part of re-enabling. Re-enable via `@import … layer(vendor)` only
(see `public/css/README.md`); a plain `<link>` reintroduces the `!important` war.

### 🟡 G7. `index.css` has mixed CRLF/LF line endings

String-match edits against the whole file can silently fail; prefer positional
inserts or scoped replacements. If you ever normalize, do it in **its own commit** —
otherwise the real diff becomes unreadable.

### 🟡 G8. `lib/server.ts` can never run in this app

It imports `process.env` and the Web `Request` API — it only makes sense under a Node
SSR runtime (Next.js / React Router SSR). It is parked for a possible future SSR
migration, documented in the register. Don't "fix" it, don't wire it into Vite.

### ✅ G9. `frontend/shadcn/tailwind.css` is USED — not a stray (corrected)

`frontend/index.css:3` contains `@import "shadcn/tailwind.css"`. The `shadcn` npm
package is **not** installed; Tailwind v4 resolves the import against the local
`frontend/shadcn/` directory. The file supplies the `* { border-color: var(--border) }`
base rule. knip cannot see CSS imports, which is why it never flagged the file.
**Commit it.** A follow-up nicety (not done here) would be installing the real
`shadcn` package or moving the rule into `index.css` with a clearer name.

### 🟡 G10. Environment quirks that shaped this work

- Shell commands cap at ~30s — long builds must run via `Start-Process`
  (background) + log polling.
- The backend venv has no linter installed; knip cannot analyse Python at all, so
  backend findings came from manual import-graph analysis (rows already in
  `DEAD_CODE_REGISTER.md` § Backend).
- Backend `.env` is gitignored; `.env.example` (frontend) is the only env
  documentation — new devs must copy it.

---

## 5. What needs to be done (in order)

### 🔴 Now — before anything else

| # | Task | Detail |
|---|---|---|
| 1 | **Commit the current state** | Add everything listed in §3 (decide on `frontend/shadcn/` first — G9). Suggested split: (a) backend logging/tests + migration, (b) frontend UX4G unlink + tokens + knip + docs. Two commits keep both stories reviewable. |
| 2 | **Visual smoke test of the dev app** | `npm run dev` → verify: navy `bg-primary` (not purple), IBM Plex Sans 15px body text, spacing unchanged vs. before, shadows unchanged, no console 404s for `/css/ux4g.css`. Screenshots = the before/after record (G3). |
| 3 | **Push the branch** | Everything currently lives only on this machine (G1). |

### 🟠 Next session

| # | Task | Detail |
|---|---|---|
| 4 | Decide `--spacing-*` ownership | Keep the Bootstrap-scale bridge or migrate to native Tailwind. If migrating: it's a redesign event (G4), own commit, screenshot diff. |
| 5 | Backend dead-code pass | Execute the parked table in `DEAD_CODE_REGISTER.md` § Backend: `placeholders.py` + `whatsapp_logger.py` (delete), `tasks.py` dead `nodes` list (fix), keep-with-reason the rest. Install `vulture` + `ruff` into the venv first. |
| 6 | ~~Wire or drop `frontend/shadcn/tailwind.css`~~ | **Resolved: it is used** — `index.css:3` imports it (see corrected G9). No action needed beyond committing it. |
| 7 | CI integration | `knip:ci`, `tsc -b`, (backend) `pytest` + `ruff` on PR. |

### 🟢 Deferred / when a feature needs them

| # | Task | Detail |
|---|---|---|
| 8 | Supabase Auth | Replace the dev bypass; then `lib/supabase/client.ts` + `lib/client.ts` get wired and their register rows retire. |
| 9 | Outbound WhatsApp confirmations | `whatsapp_confirmation_service.py` is built and waiting (register row). |
| 10 | Trust scoring | `trust_scoring_service.py` is built and waiting (register row). |

### Review dates set in the register

- `2026-12-31` — supabase client trio + deps (auth work)
- `2027-03-31` — UX4G CSS set, branding assets, shadcn primitives, types, translations

---

## 6. Command reference

```bash
# Frontend
cd frontend
npm run dev                 # dev server, port 5173, proxies /api/* -> 127.0.0.1:8001
npm run build               # tsc -b && vite build  (use background start; ~30s cap)
npm run knip                # dead-code report (cached)
npm run knip:ci             # gate: fails on any unregistered issue
npx tsc -b --force          # typecheck only

# Re-verify dist purity after any token change
Select-String -Path frontend/dist/assets/index-*.css -Pattern '613AF5'   # must be 0 hits

# Backend
cd backend
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8001
python -m pytest            # per backend/pytest.ini
```

## 7. Document map

| Document | Purpose |
|---|---|
| `CURRENT_CODEBASE_REPORT.md` | this file — state, gotchas, todo |
| `DEAD_CODE_REGISTER.md` | authoritative keep/delete ledger, per-item reasons + review dates |
| `frontend/public/css/README.md` | UX4G background + re-enable procedure |
| `frontend/index.css` (lines 50–79) | the continuity tokens themselves |
| `frontend/index.html` (lines 10–22) | why UX4G is not linked |
| `CODEBASE_ANALYSIS.md`, `PROJECT_GUIDE.md` | earlier architecture/onboarding docs |

### 2.3 Deleted (provably dead)

| File | Reason |
|---|---|
| `frontend/components/ui/button-variants.ts` | byte-identical duplicate of the `buttonVariants` cva inside `button.tsx`; zero importers |
| `frontend/assets/react.svg` | Vite scaffolding leftover |
| `frontend/assets/vite.svg` | Vite scaffolding leftover |

### 2.4 Fixed (was unused because misconfigured)

| File | Fix |
|---|---|
| `lib/client.ts`, `lib/server.ts` | read nonexistent `VITE_SUPABASE_PUBLISHABLE_KEY` → now `VITE_SUPABASE_ANON_KEY` |
| `lib/supabase/client.ts` | removed dead `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` fallback |
| `frontend/.env.example` | removed stale `VITE_API_URL` (Vite proxy handles `/api/*` → `127.0.0.1:8001`), documented the proxy model |
| `.gitignore` | added `*.tsbuildinfo` (build artifact was polluting `git status`) |
| `frontend/package.json` | `knip` added to devDependencies; `npm install` run (22 packages added, lockfile current) |

### 2.5 Tooling & documentation

- **`frontend/knip.json`** — entry `index.html`, project `**/*.{ts,tsx}` (minus
  `dist`), ignores the 3 parked supabase client files, `ignoreDependencies` for the
  2 `@supabase/*` packages, `ignoreExportsUsedInFile: true`, and `ignoreIssues`
  entries for shadcn's unused-but-standard exports.
- **`npm run knip`** (report) and **`npm run knip:ci`** (gate, `--max-issues 0`).
- **`DEAD_CODE_REGISTER.md`** (repo root) — the three-tier policy (DELETE /
  KEEP+REGISTER / FIX), a row for every kept item with reason + review date, the
  full UX4G rationale, and the parked backend table.
- **`frontend/public/css/README.md`** — what UX4G is, why it's unlinked, the
  re-enable procedure (`@import … layer(vendor)`), and the "never bridge `--bs-*`
  into `--cr-*`" rule.

### 2.6 Verification gates — all green

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npx tsc -b --force` | ✅ exit 0 |
| Dead-code lint | `npx knip --include files,dependencies,unlisted,binaries,unresolved,exports,types` | ✅ exit 0 (1 benign hint: knip doesn't follow `.css` imports) |
| Production build | `vite build` (background, 28.4s) | ✅ |
| Dist purity | purple hex scan on emitted CSS | ✅ 0 hits |
| Token emission | `--spacing-4:1.5rem`, `.p-4`, UX4G shadow | ✅ all present |