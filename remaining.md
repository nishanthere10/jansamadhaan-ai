# Jan Samadhan v1.1 — Remaining Work

Updated: 2026-09-18. Status: **NOT READY for deployment**. Passing simulated tests
does not establish live database readiness. Phase 4 is code-complete; PostgreSQL
validation of migrations 006/007/008 remains open.

## Verified checkpoint

- Original baseline: 49 backend tests; frontend TypeScript, Knip and build passed.
- Latest Phase 4 increment: **109 backend tests passed** (6 new in
  `test_phase4_consistency.py`). Ruff and Vulture passed. `git diff --check` reported
  no whitespace errors (only pre-existing line-ending warnings).
- Frontend after the priority_score removal: `tsc -b --force` exit 0,
  `npm run knip:ci` exit 0, production `npm run build` exit 0
  (2821 modules, ~48s; asset chunk-size warning only).
- Auth, resolution proof/tri-state handling and sequential duplicate clustering have
  implementation and regression coverage; their remaining gaps are below.
- Knip's CSS hint is non-failing; the frontend bundle-size warning remains.
- Hardening changes are uncommitted. Preserve the pre-existing `report.md`.

## P0 — Database deployment blockers

- [ ] Obtain a sanitized schema-only export, including enums/types, constraints,
  triggers, indexes, functions, RLS and grants. No base-schema migration is checked in.
- [ ] Prepare disposable/staging PostgreSQL matching the real schema. Earlier checks
  found no psql/postgres/Docker on PATH; no real SQL rollback test has run.
- [ ] Review existing-table compatibility and apply required migrations in order.
  006 adds pending verification support; **007 already exists** and defines
  `finalize_resolution` plus the unique audit link. Do not duplicate the migration.
- [ ] Validate/apply 007 on staging. The previous read-only Supabase OpenAPI request
  returned 200 but did NOT expose `/rpc/finalize_resolution`; migration history was
  not inspected. Do not deploy the RPC-dependent handler before this is resolved.
- [ ] Test SQL verified/rejected/error outcomes; force audit INSERT failure and prove
  finalization rolls back while the previously committed pending attempt remains.
- [ ] Test stale assignment/status, repeat/concurrent finalization, enum compatibility
  and constraints. Verify service_role access and anon/authenticated denial.
- [ ] Refresh/check PostgREST schema exposure. Never substitute sequential HTTP
  writes as a fallback for the atomic RPC.
- [ ] Validate/apply 008 (`updated_at` trigger). It is additive and has no
  application-side dependency, so it can be applied independently of 006/007;
  verify it did not disturb existing UPDATE paths.

## Phase 4 - Schema consistency (code complete; PostgreSQL validation open)

- [x] Correct field-map claims about timestamps, timeline substitution and migration
  coverage against repository SQL. Reconciliation with deployed schema remains open.
- [ ] Finish the source-backed field map and reconcile it with the exported schema.
- [ ] Preserve citizen_id/user_id, location_lat/latitude, location_lng/longitude and
  address/location_name dual writes until a reviewed consolidation migration exists.
- [x] Remove assignment-write fallback that discarded assigned_to and timeline-read
  substitution on audit errors. Regression coverage includes missing schema,
  assignment constraint errors, connection failures, and empty/populated timelines.
- [x] Remove best-effort non-resolution audit writing. The audit row is written
  BEFORE the state change, so a failing audit INSERT returns an error and leaves the
  incident unmodified; a failing state change compensates the audit row it wrote.
- [ ] Make those two writes truly transactional. Sequential PostgREST writes cannot
  be atomic, so a crash between them can still leave an audit row without its state
  change. Closing this needs a status/audit RPC migration like 007.
- [x] Establish updated_at semantics: migration 008 adds a BEFORE UPDATE trigger
  (`public.set_incidents_updated_at`). The application deliberately never writes the
  column, so 008 is additive with no application-side dependency.
- [x] Decide priority_score semantics: it is not a domain field. Removed from
  `IncidentResponse`, `frontend/types`, `IncidentRow` and dashboard sorting. The real
  0.0-1.0 `severity_score` from the pipeline is now persisted in
  `ai_structured_data.severity_score` instead of being discarded.
- [x] Keep ai_department canonical for incidents; department stays an API alias and a
  user-profile field. Triage writes ai_department and the UI reads ai_department.
- [x] Retain cluster_match_score in existing JSON and duplicate-link scores unless a
  demonstrated query/UI need warrants a dedicated migrated column.
- [ ] Guarantee required base tables/columns through reviewed migrations, including
  duplicate_complaints and incident_ai_metadata. CREATE TABLE IF NOT EXISTS does not
  reconcile pre-existing incompatible tables.
- [ ] Verify SQL/grants on PostgreSQL, including the 008 trigger, before closing the
  phase.

## Earlier-phase gaps requiring verification

### Authentication and frontend sessions
- [ ] Exercise real citizen/worker/authority Supabase JWTs, expiry, provisioning and
  RBAC on staging; current auth tests substitute Supabase.
- [ ] Review remaining signup/login and Aadhaar demo provisioning failure paths;
  production must never create mock identities or derive authority from email text.
- [ ] Review historical privileged/demo accounts through an explicit remediation
  plan, not automatic deletion/demotion.
- [ ] Test browser reload, legacy persisted sessions, 401 redirects, role guards
  and dev UI exclusion in production. Inventory/run the frontend tests.
- [ ] Document ENVIRONMENT, DEV_AUTH_BYPASS and VITE_DEV_AUTH_BYPASS in examples;
  defaults must remain safe.

### Resolution integrity
- [ ] Validate original/proof fetching and actual provider behavior; route tests
  mostly substitute verification. Review SSRF/DNS rebinding, redirect/size/type
  limits, proof ownership and storage policies.
- [ ] Test pending/manual-review recovery after provider timeout, process death,
  transaction failure and lost HTTP response; verify citizen/worker browser UX.
- [ ] Define how operators find and close pending attempts without treating provider
  errors as rejected repairs.
- [ ] Post-commit notifications remain best-effort, not crash-safe/exactly-once.

### Duplicate persistence
- [ ] Make multi-row cluster/link/count writes concurrency safe/atomic. Sequential
  A/B/C tests do not establish multi-worker correctness.
- [ ] Recover partial attachment failures; early return on existing membership can
  hide a missing link or count update.
- [ ] Review stale count/severity overwrites, reprocessing standalone incidents with
  improved classification, and candidate-query/missing-column fallbacks.
- [ ] Audit historical multiple-primary clusters, counts and orphaned links using
  reviewed migration/data repair, not destructive cleanup.
- [ ] Test radius/time/category/keyword boundaries and authority rendering against
  a real database. Preserve the existing algorithm unless proven wrong.

## Phase 5 - WhatsApp (code complete; single-process posture retained)

- [x] Bound and expire the in-memory stores. Processed MessageSids now carry a
  1h TTL plus oldest-first eviction at 10k, replacing the previous `clear()`
  that silently re-opened deduplication for every recent message at once.
  Conversations expire after 30 min, are swept on each new session, and are
  evicted least-recently-active-first at 5k. `get_session_data` no longer
  returns data for an expired session.
- [x] Twilio signatures: the verifier is now the single enforcement point and the
  webhook service no longer re-checks the environment. It fails closed when
  `TWILIO_AUTH_TOKEN` is unset (previously the unset-`ENVIRONMENT` case skipped the
  403), reads config via `settings` at call time, and keeps the bypass strictly
  when `ENVIRONMENT == development`.
- [x] `WhatsAppConfirmationService` is wired after a successful creation only,
  sending the tracking ID exactly once and never on the failure path.
  Credentials now come from `settings` at call time.
- [x] Tests: duplicate SID creates one incident and one confirmation; failed
  creation sends none; unverifiable signature is rejected before parsing; store
  TTL/eviction/expiry; production token-missing fail-closed.
- [ ] Persistent conversation state and deduplication remain prerequisites for
  multi-worker production. In-memory state is deliberately retained; no Redis.
- [ ] A MessageSid is marked before the work completes, so a mid-flow failure is
  not retried (a Twilio redelivery is a no-op). Unmarking would risk duplicate
  incidents; true recovery needs an idempotency key on incident creation.
- [ ] `whatsapp_media_downloader.py` still reads Twilio env vars at import time;
  align it to `settings` when that module is next touched.
- [ ] Delivery, concurrency and outbound-failure behaviour are only covered by
  mocked tests; no live Twilio sandbox run has been performed.

## Phase 6 - Notification lifecycle (code complete)

- [x] Reused `NotificationService`; no new notification machinery.
- [x] Events covered: complaint created (citizen receipt with tracking ID),
  AI analysis completed (citizen, category + routing), AI analysis failed
  (authority fan-out, because only an authority can reprocess), duplicate
  detection linked (the duplicate reporter only), worker assignment and
  resolution outcome (already present).
- [x] Spam control: one notification per event per recipient; the primary
  incident's citizen is never pinged for every later duplicate; routine
  progress stages emit nothing.
- [x] `notify_authorities` is the only fan-out path and degrades to 0 on a
  failed recipient lookup.
- [x] Failure isolation: the creation receipt and the pipeline notification
  block are both guarded, so notifications can never fail incident creation
  or an analysis that already persisted.
- [x] Tests: recipient and content per event, exactly-once counting, AI
  failure routed to authorities only, duplicate-link recipient selection,
  fan-out lookup failure, blank recipient never notified, and notification
  failure leaving creation and analysis intact.
- [ ] Notification delivery is best effort, not crash-safe or exactly-once:  a process death between the state write and the notification loses it.
- [ ] No email/SMS/push channel exists; the table is in-app only, and the
  notifications endpoint has no live-database coverage.
- [ ] Authority fan-out notifies every authority account because incidents
  carry no per-authority ownership. Revisit with the Phase 7 audit.

## Phase 7 - Security regression, frontend UX and CI (code complete)

- [x] Audited auth, incident list/detail/status/timeline/triage/reprocess/upload,
  workers, QR projects and notifications for authentication, RBAC and ownership.
- [x] Closed the worker BOLA hole: a worker could update ANY incident whose
  `assigned_to` was null (and a missing incident slipped through). Ownership is now
  strict, with 404 for a missing incident, matching detail/timeline/upload.
- [x] Closed the timeline leak: `GET /{id}/updates` only checked citizens, so any
  worker could read notes and proof URLs of any incident. Workers are now scoped to
  their assigned incidents.
- [x] Removed the production demo-worker leak: `GET /auth/workers` appended 6 fake
  workers in every environment, and selecting one silently assigned the incident to
  a DIFFERENT real worker (or seeded a demo account). The bench is now
  development-only and a mock id is rejected with 422 in production.
- [x] Confirmed already-correct controls: upload requires worker ownership; signup
  forces the citizen role; login auto-provision is citizen-only; triage and QR
  creation are authority-only; notifications are ownership-checked; reprocess
  checks ownership.
- [x] Frontend matches the backend: no session means no protected call, a 401 logs
  out and redirects to `/login?reason=session-expired`, and role guards are active.
- [x] Tests: unassigned/foreign/missing incident status updates, own-incident
  success, timeline read restrictions, worker listing per environment, mock
  assignment rejected in production and substituted only in development.
- [x] CI added (`.github/workflows/ci.yml`): backend installs the application AND
  dev requirements then runs pytest, ruff and vulture; frontend runs `npm ci`,
  `tsc -b`, `knip:ci` and the production build.
- [ ] CI does NOT validate SQL. A green run is not deployment evidence for
  migrations 006/007/008 or the `finalize_resolution` RPC.
- [ ] No browser or live-API end-to-end suite exists; frontend tests are
  node-run unit tests only, and the citizen-to-resolution flow has not been
  re-verified against a running stack since the hardening changes.
- [ ] Historical privileged/demo accounts still need an explicit remediation
  plan rather than automatic demotion.

## References

- backend/SCHEMA_FIELD_MAP.md — working map, not proof of deployed schema.
- backend/RESOLUTION_TRANSACTION_CHECKPOINT.md — RPC contract/validation limits.
- backend/migrations/006_resolution_pending.sql, 007_atomic_resolution.sql and
  008_updated_at_trigger.sql.

Update this checklist as items are verified. Do not declare schema/deployment
readiness solely because Python tests pass.
