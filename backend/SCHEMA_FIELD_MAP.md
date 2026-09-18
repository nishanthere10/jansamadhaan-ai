# Jan Samadhan — Schema Field Map (v1.1 hardening audit)

Derived from `report.md`, live code, and `backend/migrations/*`. No field was removed.

| Field pair / column | Source of truth | Writers | Readers | UI consumer | Migration | Safe to remove? |
|---|---|---|---|---|---|---|
| `location_lat` / `latitude` | `incidents.location_lat` | `IncidentService` (dual-write) | dedup candidates, dashboards | maps | base schema | No — dual-write until consolidated migration |
| `location_lng` / `longitude` | `incidents.location_lng` | `IncidentService` (dual-write) | same | maps | base schema | No |
| `address` / `location_name` | `incidents.address` | `IncidentService` (dual-write) | same | detail views | base schema | No |
| `citizen_id` / `user_id` | `incidents.citizen_id` | `IncidentService` (dual-write) | ownership checks, filters | all portals | base schema | No |
| `assigned_to` | `incidents.assigned_to` | status endpoint (assign), resolution ownership | worker list (must filter, never fall back to all), worker detail | worker dashboard | 004 + 005 | Keep; fail closed when absent |
| `updated_at` (incidents) | `incidents.updated_at`, DB-maintained | nobody in the application | `IncidentResponse` optional field | none | 005 (column) + 008 (UPDATE trigger) | Keep; the app must never write it |
| `priority_score` | removed — no such domain field | nobody | nobody | none (frontend synced) | none | **Removed** in Phase 4 |
| `severity_score` | `ai_structured_data.severity_score` | `tasks.py` (from `final_state`) | `ai_structured_data` consumers | authority AI panel | none (JSON, no column) | Keep; real 0.0-1.0 value |
| `ai_department` vs `department` | `incidents.ai_department` | triage endpoint, routing pipeline | dashboards, AI panel | authority panel | base schema | Keep `ai_department` canonical |
| `cluster_id`, `is_primary_incident`, `duplicate_count` | incidents columns | duplicate detection + `tasks.py` final update | authority cluster panel | ExpandedAiPanel | 003 | N/A (canonical) |
| `cluster_match_score` | `ai_structured_data.cluster_match_score` | `tasks.py` | diagnostics only | none | none (no column by design) | Column deferred |
| `incident_updates` | audit timeline | status endpoint; resolution via `finalize_resolution` RPC | GET `/{id}/updates` reads this table only | authority timeline | 005; audit link added in 007 | Keep; resolution audit is transactional |
| `resolution_verifications` | pending/verified/rejected attempts | resolution service + RPC | resolution workflow; not merged into GET updates | resolution response | 006; RPC in 007 | Keep; existing table compatibility needs inspection |
| `duplicate_complaints` | duplicate link rows with actual similarity scores | duplicate detection | no dedicated reader identified | none | No checked-in base DDL | Keep; deployed table existence/constraints unverified |

## Migration evidence and limitations

- Base-schema references above mean an application dependency, **not** a checked-in
  or verified deployed base migration. Obtain the real schema before reconciliation.
- 003 adds cluster columns and indexes; its primary index is not a uniqueness constraint.
- 004 creates notifications, adds user trust fields and assigned_to; 005 also adds
  assigned_to, adds updated_at with DEFAULT now(), and creates incident_updates.
  The timestamp default applies on INSERT; no automatic UPDATE trigger is supplied.
- 006 creates resolution_verifications if absent, adds a status check and restricts
  access. It does not align all columns of an already-existing incompatible table.
- 007 adds the unique verification/audit link and transactional finalization RPC.
  See the transaction checkpoint for outstanding live SQL tests and deployment gates.
- 008 adds a BEFORE UPDATE trigger (`public.set_incidents_updated_at`) so the
  `updated_at` column added by 005 is actually maintained. The application never
  writes the column, so 008 is additive with no application-side dependency.

## Current fallback policy (Phase 4)

- Worker lists fail closed when assigned_to cannot be queried; never return all incidents.
- Assignment writes no longer retry after dropping assigned_to. Missing-column and
  constraint failures return an error before notifications.
- GET updates no longer substitutes resolution_verifications on audit read failure.
  It returns an error rather than a partial timeline. Successful reads retain the
  existing ordered audit-row response, including a valid empty list.
- Non-resolution status updates write the audit row **before** the state change, so a
  failing audit INSERT returns an error and the incident is not modified. A failing
  state change compensates by deleting the audit row it just wrote; if the row id was
  not returned, the compensation is skipped and logged rather than guessed.
  Sequential PostgREST writes are still not transactional (a crash between the two
  writes can leave an audit row without its state change) — see remaining.md.
- Resolution finalization requires 007 and fails with 503 on persistence failure.

