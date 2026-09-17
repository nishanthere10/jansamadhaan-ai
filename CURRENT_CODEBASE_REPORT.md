# Current Codebase Report - Jan Samadhan AI

**Date:** 2026-09-17 (post backend audit) - **Branch:** `initial-v1` - **base:** `e271bf3`
**Commit chain:** `796bc1f` backend infra -> `e98e133` frontend cleanup -> `fe9c0ba` backend audit -> docs commit (this file)
**Working tree:** CLEAN - 0 modified, 0 untracked.

---

## 1. TL;DR

| Area | State |
|---|---|
| Frontend UX4G unlink + continuity tokens | DONE, verified against production build |
| Frontend dead-file deletion (3 files) | DONE |
| Frontend gates: tsc / knip / knip:ci / build | DONE - all exit 0 |
| Frontend commits | DONE (`e98e133`) - incl. first-ever tracking of `index.html`, `vite.config.ts`, `tsconfig.json`, `package.json` |
| Backend logging / middleware / migration / pytest suite | DONE (`796bc1f`) |
| Backend dead-code audit (DELETE / FIX / KEEP+REGISTER) | DONE (`fe9c0ba`) |
| Backend gates: pytest 49/49 - ruff 0 - vulture 0 | DONE |
| `DEAD_CODE_REGISTER.md` | DONE - frontend + backend sections final, review dates set |
| Working tree protection (Phase 1) | DONE - everything committed, tree clean |
| Visual smoke test (Phase 2) | NOT DONE - the only remaining frontend gate |
| Push to remote | NOT DONE - branch exists on one machine only |
| CI (Phase 13) | NOT DONE - every CI command already proven green locally |
| E2E product flow (Phases 9-11) + security audit (12) | NOT DONE - needs live Supabase/Groq creds |

> Most important fact: the work is now **SAFE** (committed, clean tree) but not yet
> **SHARED** (unpushed) and not yet **DEMONSTRATED** (no human-eyeball smoke test).

---

## 2. What was done, per commit

### 2.1 `796bc1f` backend: structured logging, middleware, schema alignment, pytest suite

Pre-existing uncommitted backend work, committed first to separate the histories:
`app/core/logging_config.py` (structured logging + request IDs), `app/core/middleware.py`,
`migrations/005_schema_alignment.sql`, `pytest.ini`, `requirements-dev.txt`,
`tests/conftest.py` + `test_{auth,config,database,logging,schema_gotchas}.py`
(5 obsolete root-level test files retired to `tests/legacy_scripts/`), plus API/config hardening.

### 2.2 `e98e133` frontend: UX4G unlink + continuity tokens + knip tooling

- `index.html` no longer links `/css/ux4g.css`. Why it was a bug, not just bloat:
  UX4G v2.0.8 is a Bootstrap 5 fork (349 KB, 12,619 lines, **1,689 `!important`**, 0 `@layer`),
  so it outranked every Tailwind v4 layer: purple `#613AF5` hijack of `.bg-primary`,
  ~200 spacing utilities re-scaled, `.border/.text-center/.gap-*/.shadow-*` overridden,
  and its own fonts/icons all 404'd. We consumed almost none of it (`--bs-*`: 0 refs).
- `frontend/index.css` "UX4G CONTINUITY TOKENS" `@theme` block re-declares exactly the
  imposed values (`--spacing-3/4/5 = 1/1.5/3rem`, UX4G shadow stacks) -> look unchanged.
  **Verified in emitted dist CSS:** `.p-4 { padding: var(--spacing-4) }` present,
  UX4G shadow stack present, purple `#613AF5`/`#938BB6` 0 hits, `.bg-primary` -> navy.
- Added `prefers-reduced-motion` + `@media print` blocks (gov print: white/black, hide chrome).
- Deleted: `components/ui/button-variants.ts` (byte-identical duplicate, 0 importers),
  `assets/react.svg`, `assets/vite.svg` (scaffolding leftovers).
- Fixed: `lib/client.ts`/`lib/server.ts` read nonexistent `VITE_SUPABASE_PUBLISHABLE_KEY`
  -> now `VITE_SUPABASE_ANON_KEY`; dead fallback removed in `lib/supabase/client.ts`;
  `.env.example` stale `VITE_API_URL` removed (Vite proxy handles `/api/*` -> `127.0.0.1:8001`).
- Tooling: `knip.json`, `npm run knip` + `knip:ci`, knip in devDeps, `*.tsbuildinfo` gitignored.
- Docs: `frontend/public/css/README.md` (UX4G re-enable procedure) + `DEAD_CODE_REGISTER.md`.

### 2.3 `fe9c0ba` backend: dead-code audit, ruff clean-up, tooling pins (59 files, +520/-379)

**DELETE (zero importers verified before deletion):**
- `app/services/ai/placeholders.py` - self-described "Phase 1 placeholder"; the real
  pipeline is `app/ai/services/langgraph_pipeline.py`.
- `app/whatsapp_ai/utils/whatsapp_logger.py` - superseded by `app/core/logging_config.py`;
  would have double-logged (`propagate = False`).

**FIX:**
- `app/ai/tasks.py`: removed dead `nodes = [...]` fallback list referencing a
  non-existent `pipeline.graph_instance` (working fallback directly below it kept).
- 24x `raise HTTPException(...)` chained `from e` (bugbear B904) across
  `api/{auth,incident,notifications,qr_projects}.py`, `services/incident_service.py`,
  `whatsapp_ai/services/whatsapp_user_service.py`.
- E402 import hoists in `core/security.py`, `ai/services/vision_service.py`, `api/incident.py`
  (`app/main.py` + `tests/legacy_scripts/*` keep intentional late imports via per-file-ignores).
- E701 one-line `if` splits; B023 loop-variable capture fixed in `tests/test_auth.py`.

**KEEP + REGISTER (review 2026-12-16 - wire in or delete):**
`trust_scoring_service.py` (built + tested, never invoked),
`whatsapp_confirmation_service.py` (outbound confirmations, unwired),
`whatsapp_incident_mapper.py` + `structured_incident_schema.py`,
`twilio_payload_schema.py` (Twilio form contract doc), `GEO_RADIUS_METERS`,
`get_session_data`, and 5 API-contract response models (`SignupResponseData`,
`LoginResponseData`, `BaseResponse`, `IncidentListResponse`, `IncidentUpdateResponse`).

**Tooling:**
- `ruff.toml`: pinned ruleset (E4/E7/E9/F/I/B/UP) so a ruff upgrade can never silently
  change what CI enforces; `B008` ignored (FastAPI `Depends(...)` defaults);
  per-file-ignores for intentional E402; `vulture_whitelist.py` excluded (see G6).
- `vulture_whitelist.py`: every entry justified inline (route handlers registered by
  decorators, Pydantic validators/fields, API contracts, KEEP+REGISTER items).
- `requirements-dev.txt`: ruff + vulture pinned; install with
  `uv pip install -r requirements-dev.txt`.

### 2.4 docs commit: backend audit dispositions recorded in `DEAD_CODE_REGISTER.md`, plus this report

---

## 3. Git state

- Branch `initial-v1`, 4 commits ahead of base `e271bf3`; HEAD is the docs commit containing this file.
- **Working tree clean** - nothing modified, nothing untracked, nothing staged.
- **Unpushed** - all 4 commits exist only on this machine. Push before any further work.
- Critical files that previously had NO git history (`frontend/index.html`,
  `vite.config.ts`, `tsconfig.json`, `package.json`, `package-lock.json`) are now
  tracked in `e98e133`. The "one careless command deletes the project" risk is closed.

---

## 4. Verification gates - all green, all re-runnable

| Gate | Command | Last result |
|---|---|---|
| Frontend typecheck | `npx tsc -b --force` | exit 0 |
| Frontend dead-code | `npm run knip` / `knip:ci` | exit 0 / exit 0 |
| Frontend build | `npm run build` | OK (~28s), purple 0 hits in dist |
| Backend tests | `python -m pytest -q` | **49 passed** (~1s) |
| Backend lint | `python -m ruff check .` | 0 findings |
| Backend dead-code | `vulture app vulture_whitelist.py --min-confidence 60` | 0 findings |
| Whitespace hygiene | `git diff --check` | clean |
| Dist purity | scan `dist/assets/index-*.css` for `613AF5` | 0 hits |

---

## 5. Gotchas - read before touching anything

**G1 (closed). Everything is committed.** The former "one bad command wipes the
project" risk is gone: clean tree, critical build files tracked. New risk: branch is
unpushed - push it.

**G2. Spacing scale is Bootstrap-sized, not Tailwind-native.** `--spacing-3/4/5 =
1/1.5/3rem` (Tailwind native: 0.75/1/1.25rem) via the continuity-token block in
`frontend/index.css`. ~200 utilities are affected. Writing new code against stock
Tailwind docs will be wrong by ~2x. Decision stands deliberately; changing it is a
visual migration that needs its own commit + screenshot diff (register, review date).

**G3. `bg-primary` is navy now; it was purple under UX4G.** Intended. Anyone who
approved the purple look will notice - capture before/after screenshots in the smoke test.

**G4. `npm run knip` exits 0 but prints a benign hint.** Knip does not parse `@import`
in CSS, so `shadcn/tailwind.css` looks unimported. It IS imported (`frontend/index.css:3`);
Tailwind v4 resolves the name against the local `frontend/shadcn/` directory. Do not
"fix" by moving/deleting without re-running the build.

**G5. Intentional late imports (E402) are suppressed, not broken.** `app/main.py`
imports app modules after `load_dotenv()` on purpose (env must exist before Settings
loads). `tests/legacy_scripts/*` set `sys.path` first. Both are covered by
`per-file-ignores` in `backend/ruff.toml` - do not hoist those imports.

**G6. `backend/vulture_whitelist.py` is not real code.** It is a bare-name manifest
marking dynamically-consumed symbols as used (decorator-registered routes, Pydantic
validators/fields, API contracts, KEEP+REGISTER items). Ruff excludes it; pytest never
collects it. Review date 2026-12-16: re-run vulture without it and re-triage.

**G7. Venv tools live inside the project venv.** Run them as
`.venv\Scripts\python.exe -m pytest|ruff` from `backend/` (or `uv pip install -r
requirements-dev.txt` to provision). A global `ruff` may have a different ruleset.
Note: an interrupted `uv pip install` once left ruff's binary corrupt - a pip
`--force-reinstall --no-cache-dir` repaired it.

**G8. Dev/test `.log` files are transient.** `backend/pip*.log`, `frontend/dev.log`
are run artifacts - gitignored, safe to delete.

**G9. E2E claims are untested.** pytest covers auth/config/db/logging/schema units
with mocks. The real product loop (report -> AI triage -> routing -> assignment ->
verified resolution -> tracking) has NOT been exercised against live Supabase/Groq.
Until then, do not claim the product works end-to-end.

---

## 6. Todo - prioritized

### 🔴 Now
1. **Push `initial-v1`** (4 commits, currently machine-local). Then the branch is
   recoverable and reviewable.
2. **Visual smoke test (Phase 2)** - the last unverified frontend gate:
   `cd frontend; npm run dev`, then walk Landing -> Login/Signup -> dashboards ->
   Report -> Track flow. Confirm navy `bg-primary` (not purple), IBM Plex Sans,
   spacing/cards/shadows unchanged, zero console errors, **no request for `/css/ux4g.css`**
   (check DevTools Network tab and `dev.log`). Screenshots as regression record.

### 🟠 Next
3. **CI workflow** (Phase 13) - every command already proven locally:
   Frontend `npm ci` -> `knip:ci` -> `tsc -b` -> `build`; Backend
   `uv pip install -r requirements*.txt` -> `pytest` -> `ruff check .`
   (vulture optional: `vulture app vulture_whitelist.py --min-confidence 60`).
4. **Spacing decision record** (G2): keep the bridge (recommended) or migrate —
   either way, write the decision into `DEAD_CODE_REGISTER.md` with evidence.
5. **Backend migrations audit** (Phase 8): `003/004/005` vs app expectations
   (`source` accepted-but-dropped param; `ai_category` indexed-in-003-but-never-created).
6. **E2E product flow** (Phases 9-11) against live Supabase/Groq/Twilio creds,
   following the per-phase report format from the master prompt.
7. **Security audit** (Phase 12): confirm `SUPABASE_SERVICE_ROLE_KEY` / `GROQ_API_KEY` /
   `TWILIO_AUTH_TOKEN` never reach the frontend bundle; RBAC on authority/worker routes.

### 🟢 Later
8. **`ruff format`** as an isolated style commit (53/59 files would change; do not mix
   with logic changes).
9. **Phase 19 production readiness**: wire `TrustScoringService` into the lifecycle,
   wire outbound WhatsApp confirmations, replace the dev auth bypass with Supabase Auth,
   then revisit `frontend/lib/client.ts` + `frontend/lib/supabase/client.ts`.
10. **Whitelist + KEEP+REGISTER review 2026-12-16**: wire in or delete.

## 7. Command reference

```powershell
# ── Frontend gates ─────────────────────────────────────────────
cd C:\Users\kirti\coding\PROJECTS\jansamadhan-ai\frontend
npx tsc -b --force          # typecheck  -> exit 0
npm run knip                # dead code  -> exit 0 (+ benign CSS hint, G4)
npm run knip:ci             # CI mode    -> exit 0
npm run build               # production build

# ── Backend gates (use the project venv) ──────────────────────
cd C:\Users\kirti\coding\PROJECTS\jansamadhan-ai\backend
.venv\Scripts\python.exe -m pytest -q
.venv\Scripts\python.exe -m ruff check .
.venv\Scripts\python.exe -m vulture app vulture_whitelist.py --min-confidence 60

# ── Provision dev deps (uv, per your policy) ──────────────────
uv pip install -r requirements-dev.txt --python .venv\Scripts\python.exe

# ── Push the branch ────────────────────────────────────────────
git -C C:\Users\kirti\coding\PROJECTS\jansamadhan-ai push -u origin initial-v1
```

*Report generated 2026-09-17 after backend audit completion (`fe9c0ba`). Maintained by
the docs commit containing this file. Working tree clean.*



