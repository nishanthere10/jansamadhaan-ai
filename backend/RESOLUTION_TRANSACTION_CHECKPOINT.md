# Atomic resolution finalization — implementation checkpoint

## Change

`app/services/resolution_service.py` now calls `finalize_resolution` once to finalize
an existing pending verification, update incident status, and insert the audit row.
`migrations/007_atomic_resolution.sql` implements that operation in one PostgreSQL
transaction, with incident/verification row locks, assignment/status checks, actor
role checks, and a unique audit link to prevent finalizing the same attempt twice.
Notifications are sent only after a successful RPC response. The pending attempt
is deliberately committed before provider evaluation so an interrupted attempt
remains available for review.

## Validation performed

- Before the fix: all three simulated audit-failure cases failed (partial writes).
- After the fix: `python -m pytest -q`: **98 passed**.
- `python -m ruff check .`: passed.
- `python -m vulture app vulture_whitelist.py --min-confidence 60`: passed.
- Already-resolved guard checked: 409 before any verification/audit/RPC write.
- Source checked: finalization calls `db.rpc("finalize_resolution", ...).execute()`.
- Read-only configured Supabase OpenAPI request: HTTP 200, but no
  `/rpc/finalize_resolution` path exposed. This is a schema-cache observation,
  not definitive migration-history inspection.
- No remote schema/data changes and no live RPC invocation were performed.

## Deployment gate — NOT READY

The application rollback tests use a stateful simulated RPC. They do not execute
migration SQL or prove PostgreSQL constraints, permissions, enum compatibility,
rollback, locking, or concurrent behavior. No PostgreSQL/psql/Docker executable was
available on PATH in this environment.

Before deployment:

1. Obtain the real base schema (absent from repository migrations) and prepare a
   disposable/staging database matching its types, constraints, and grants.
2. Apply migrations 005, 006, and 007 in order after reviewing compatibility with
   any existing tables; `CREATE TABLE IF NOT EXISTS` does not align existing columns.
3. In that database, test verified/rejected/error outcomes; force an audit INSERT
   failure and assert incident and verification finalization both roll back.
4. Test stale assignment/status, repeated finalization, and concurrent requests.
5. Verify anon/authenticated roles cannot execute the RPC; service_role can.
6. Refresh/check PostgREST schema exposure before deploying the RPC-dependent code.

Do not replace the RPC with sequential HTTP writes as a compatibility fallback.
Notification delivery remains best-effort after commit; crash-safe delivery is
not guaranteed. Duplicate-cluster writes are still non-transactional, and their
multi-worker race/partial-write behavior remains outstanding. Overall Phase 4 and
later WhatsApp, notification lifecycle, security regression, and CI work are not
complete. No readiness claim for the complete hardening project is made here.
