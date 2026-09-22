"""Public tracking endpoint contract tests.

The route is unauthenticated, so these tests pin down both halves of the
contract: the exact fields served, and the failure modes (404 for an unknown
token, 503 when migration 009 is not applied, never a 500).
"""
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.core.database import get_supabase
from app.main import app

VALID_TOKEN = "valid-token-123"
INCIDENT_ID = "inc-123"


class FakePostgrestError(Exception):
    """Mirrors postgrest.exceptions.APIError's string shape."""


class _Query:
    def __init__(self, db, table):
        self.db = db
        self.table = table
        self.filters = []
        self.row_limit = None

    def select(self, *_a, **_k):
        return self

    def eq(self, key, value):
        self.filters.append((key, value))
        return self

    def order(self, *_a, **_k):
        return self

    def limit(self, n):
        self.row_limit = n
        return self

    def execute(self):
        if self.db.missing_token_column and self.table == "incidents":
            raise FakePostgrestError(
                "{'message': 'column incidents.public_tracking_token does not exist', "
                "'code': '42703', 'hint': None, 'details': None}"
            )
        rows = [dict(r) for r in self.db.rows.get(self.table, [])]
        for key, value in self.filters:
            rows = [r for r in rows if r.get(key) == value]
        if self.row_limit is not None:
            rows = rows[: self.row_limit]
        return SimpleNamespace(data=rows)


def _ago(hours: float) -> str:
    return (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()


def default_rows():
    return {
        "incidents": [{
            "id": INCIDENT_ID,
            "tracking_id": "CIV-2026-TEST",
            "public_tracking_token": VALID_TOKEN,
            "title": "Test Incident",
            "description": "A large pothole near the school gate.",
            "category": "pothole",
            "severity": "high",
            "status": "resolved",
            "source": "app",
            "created_at": _ago(100),  # 100h old against a 48h pothole SLA
            "image_url": "https://cdn.example.com/before.jpg",
            "address": "MG Road",
            "location_name": "MG Road, Ward 4",
            "ai_department": "Roads & Footpaths",
            "department": None,
            "ai_processing_status": "completed",
            # Fields that must NEVER reach an anonymous caller.
            "citizen_id": "citizen-secret-id",
            "user_id": "citizen-secret-id",
            "assigned_to": "worker-secret-id",
        }],
        "incident_updates": [{
            "incident_id": INCIDENT_ID,
            "status": "assigned",
            "note": "Assigned to field team",
            "created_at": _ago(90),
            "after_image_url": None,
        }, {
            "incident_id": INCIDENT_ID,
            "status": "resolved",
            "note": "Filled with bitumen mix",
            "created_at": _ago(10),
            "after_image_url": "https://cdn.example.com/after.jpg",
        }],
        "resolution_verifications": [{
            "incident_id": INCIDENT_ID,
            "verification_status": "verified",
            "verification_score": 0.93,
        }],
    }


class FakeSupabase:
    def __init__(self, rows=None, missing_token_column=False):
        self.rows = rows if rows is not None else default_rows()
        self.missing_token_column = missing_token_column

    def table(self, name):
        return _Query(self, name)


@pytest.fixture
def make_client():
    def _factory(rows=None, missing_token_column=False):
        db = FakeSupabase(rows, missing_token_column)
        app.dependency_overrides[get_supabase] = lambda: db
        return TestClient(app, raise_server_exceptions=False)

    yield _factory
    app.dependency_overrides.clear()


# ── Happy path ────────────────────────────────────────────────────────────────

def test_valid_token_returns_sanitized_record(make_client):
    response = make_client().get(f"/api/v1/incidents/public/track/{VALID_TOKEN}")
    assert response.status_code == 200
    data = response.json()

    assert data["tracking_id"] == "CIV-2026-TEST"
    assert data["title"] == "Test Incident"
    assert data["location_label"] == "MG Road, Ward 4"
    assert data["department"] == "Roads & Footpaths"

    # PII must never cross the public boundary.
    for leaked in ("citizen_id", "user_id", "assigned_to", "address"):
        assert leaked not in data, f"{leaked} leaked to the public tracker"


def test_timeline_is_built_from_real_audit_rows(make_client):
    data = make_client().get(f"/api/v1/incidents/public/track/{VALID_TOKEN}").json()
    timeline = data["citizen_visible_timeline"]

    statuses = [entry["status"] for entry in timeline]
    assert statuses == ["Report received", "AI triage completed", "Assigned", "Resolved"]

    # The audit note must survive, and the verified wording must win.
    assert timeline[-1]["note"] == "Worker submitted repair, verified by AI."


def test_resolution_proof_is_taken_from_the_resolved_row(make_client):
    data = make_client().get(f"/api/v1/incidents/public/track/{VALID_TOKEN}").json()
    assert data["image_url"] == "https://cdn.example.com/before.jpg"
    assert data["resolution_image"] == "https://cdn.example.com/after.jpg"
    assert data["verification_status"] == "verified"
    assert data["verification_score"] == 0.93


def test_sla_state_is_computed_not_hardcoded(make_client):
    """A 100h-old pothole against a 48h SLA must report BREACHED.

    The previous implementation returned a hardcoded "ON TRACK" for every
    incident regardless of age.
    """
    data = make_client().get(f"/api/v1/incidents/public/track/{VALID_TOKEN}").json()
    # A resolved incident stops the clock.
    assert data["sla_state"] == "MET"

    rows = default_rows()
    rows["incidents"][0]["status"] = "pending"
    rows["incident_updates"] = []
    rows["resolution_verifications"] = []
    data = make_client(rows).get(f"/api/v1/incidents/public/track/{VALID_TOKEN}").json()
    assert data["sla_state"] == "BREACHED"
    assert data["sla_hours"] == 48
    assert data["sla_due_at"] is not None


def test_unverified_proof_is_not_described_as_verified(make_client):
    rows = default_rows()
    rows["resolution_verifications"] = [
        {
            "incident_id": INCIDENT_ID,
            "verification_status": "error",
            "verification_score": 0.0,
        }
    ]
    data = make_client(rows).get(f"/api/v1/incidents/public/track/{VALID_TOKEN}").json()
    assert data["verification_status"] == "error"
    assert data["citizen_visible_timeline"][-1]["note"] == "Filled with bitumen mix"


# ── Failure modes ─────────────────────────────────────────────────────────────

def test_invalid_token_returns_404(make_client):
    response = make_client().get("/api/v1/incidents/public/track/invalid-token")
    assert response.status_code == 404
    assert response.json()["detail"] == "Complaint not found. Please check your tracking link."


def test_missing_migration_returns_503_not_500(make_client):
    """A pending migration 009 must degrade cleanly, never surface a raw 500."""
    response = make_client(missing_token_column=True).get(
        f"/api/v1/incidents/public/track/{VALID_TOKEN}"
    )
    assert response.status_code == 503
    assert response.json()["detail"] == "Public tracking is not enabled on this deployment yet."


def test_broken_timeline_does_not_fail_the_page(make_client):
    """Out-of-band failures must not turn into an unhandled exception."""

    class ExplodingUpdates(FakeSupabase):
        def table(self, name):
            if name == "incident_updates":
                raise RuntimeError("simulated side-table outage")
            return super().table(name)

    db = ExplodingUpdates(default_rows())
    app.dependency_overrides[get_supabase] = lambda: db
    client = TestClient(app, raise_server_exceptions=False)
    response = client.get(f"/api/v1/incidents/public/track/{VALID_TOKEN}")

    assert response.status_code == 200
    assert [e["status"] for e in response.json()["citizen_visible_timeline"]] == [
        "Report received",
        "AI triage completed",
    ]
