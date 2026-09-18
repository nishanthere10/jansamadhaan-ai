"""
tests/test_authorization_sweep.py
─────────────────────────────────
Phase 7 authorization regression (mocked persistence):

- a worker may only touch incidents assigned to them, and never an unassigned
  incident merely because assigned_to is null
- the audit timeline is gated exactly like the incident detail endpoint
- the demo worker bench and its assignment substitution are development-only
"""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import get_current_user
from app.main import app

STATUS_URL = "/api/v1/incidents/inc-100/status"
UPDATES_URL = "/api/v1/incidents/inc-100/updates"
WORKERS_URL = "/api/v1/auth/workers"


@pytest.fixture
def authority_user():
    return {"id": "auth-1", "full_name": "Commissioner", "email": "a@gov.in", "role": "authority"}


@pytest.fixture
def worker_user():
    return {"id": "worker-1", "full_name": "Rajesh", "email": "w@gov.in", "role": "worker"}


def _split_db(**tables):
    """Route db.table(name) to a dedicated mock per table."""
    db = MagicMock()
    default = MagicMock()
    db.table.side_effect = lambda name: tables.get(name, default)
    return db


class TestWorkerStatusOwnership:
    @pytest.mark.asyncio
    async def test_unassigned_incident_is_not_assignable_by_any_worker(self, worker_user):
        app.dependency_overrides[get_current_user] = lambda: worker_user
        incidents = MagicMock()
        incidents.select.return_value.eq.return_value.execute.return_value.data = [
            {"assigned_to": None}
        ]
        db = _split_db(incidents=incidents)
        try:
            with patch("app.api.incident.get_supabase", return_value=db):
                response = TestClient(app).put(STATUS_URL, json={"status": "in-progress"})
            assert response.status_code == 403
            incidents.update.assert_not_called()
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_another_workers_incident_is_rejected(self, worker_user):
        app.dependency_overrides[get_current_user] = lambda: worker_user
        incidents = MagicMock()
        incidents.select.return_value.eq.return_value.execute.return_value.data = [
            {"assigned_to": "worker-999"}
        ]
        db = _split_db(incidents=incidents)
        try:
            with patch("app.api.incident.get_supabase", return_value=db):
                response = TestClient(app).put(STATUS_URL, json={"status": "in-progress"})
            assert response.status_code == 403
            incidents.update.assert_not_called()
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_missing_incident_reports_not_found(self, worker_user):
        app.dependency_overrides[get_current_user] = lambda: worker_user
        incidents = MagicMock()
        incidents.select.return_value.eq.return_value.execute.return_value.data = []
        db = _split_db(incidents=incidents)
        try:
            with patch("app.api.incident.get_supabase", return_value=db):
                response = TestClient(app).put(STATUS_URL, json={"status": "in-progress"})
            assert response.status_code == 404
            incidents.update.assert_not_called()
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_own_incident_is_still_updatable(self, worker_user):
        app.dependency_overrides[get_current_user] = lambda: worker_user
        incidents = MagicMock()
        incidents.select.return_value.eq.return_value.execute.return_value.data = [
            {
                "assigned_to": worker_user["id"],
                "title": "Pothole",
                "citizen_id": "c-1",
                "tracking_id": "CIV-1",
                "image_url": None,
            }
        ]
        audit = MagicMock()
        audit.insert.return_value.execute.return_value.data = [{"id": "audit-1"}]
        db = _split_db(incidents=incidents, incident_updates=audit)
        try:
            with (
                patch("app.api.incident.get_supabase", return_value=db),
                patch("app.api.incident.NotificationService.create_notification"),
            ):
                response = TestClient(app).put(STATUS_URL, json={"status": "in-progress"})
            assert response.status_code == 200
            incidents.update.assert_called_once_with({"status": "in-progress"})
        finally:
            app.dependency_overrides.clear()


class TestWorkerTimelineOwnership:
    def _db(self, assigned_to, rows):
        incidents = MagicMock()
        incidents.select.return_value.eq.return_value.execute.return_value.data = [
            {"assigned_to": assigned_to}
        ]
        updates = MagicMock()
        updates.select.return_value.eq.return_value.order.return_value.execute.return_value.data = rows
        return _split_db(incidents=incidents, incident_updates=updates)

    @pytest.mark.parametrize("assigned_to", [None, "worker-999"])
    def test_worker_cannot_read_someone_elses_timeline(self, worker_user, assigned_to):
        app.dependency_overrides[get_current_user] = lambda: worker_user
        db = self._db(assigned_to, [{"id": "a"}])
        try:
            with patch("app.api.incident.get_supabase", return_value=db):
                response = TestClient(app).get(UPDATES_URL)
            assert response.status_code == 403
        finally:
            app.dependency_overrides.clear()

    def test_worker_can_read_their_own_timeline(self, worker_user):
        app.dependency_overrides[get_current_user] = lambda: worker_user
        rows = [{"id": "audit-1", "status": "in-progress"}]
        db = self._db(worker_user["id"], rows)
        try:
            with patch("app.api.incident.get_supabase", return_value=db):
                response = TestClient(app).get(UPDATES_URL)
            assert response.status_code == 200
            assert response.json()["data"] == rows
        finally:
            app.dependency_overrides.clear()


class TestDemoWorkerBench:
    def _workers_db(self, rows):
        users = MagicMock()
        users.select.return_value.eq.return_value.execute.return_value.data = rows
        return _split_db(users=users)

    def test_production_only_lists_registered_workers(self, authority_user):
        app.dependency_overrides[get_current_user] = lambda: authority_user
        rows = [{"id": "w-real", "full_name": "Real Worker", "department": "PWD"}]
        try:
            with (
                patch.object(settings, "ENVIRONMENT", "production"),
                patch("app.api.auth.get_supabase", return_value=self._workers_db(rows)),
            ):
                response = TestClient(app).get(WORKERS_URL)
            assert response.status_code == 200
            ids = [w["id"] for w in response.json()["data"]]
            assert ids == ["w-real"]
        finally:
            app.dependency_overrides.clear()

    def test_development_keeps_the_demo_bench(self, authority_user):
        app.dependency_overrides[get_current_user] = lambda: authority_user
        rows = [{"id": "w-real", "full_name": "Real Worker", "department": "PWD"}]
        try:
            with (
                patch.object(settings, "ENVIRONMENT", "development"),
                patch("app.api.auth.get_supabase", return_value=self._workers_db(rows)),
            ):
                response = TestClient(app).get(WORKERS_URL)
            assert response.status_code == 200
            ids = [w["id"] for w in response.json()["data"]]
            assert "w-real" in ids
            assert any(i.startswith("mock-") for i in ids)
        finally:
            app.dependency_overrides.clear()

    def test_non_authority_cannot_list_workers(self, worker_user):
        app.dependency_overrides[get_current_user] = lambda: worker_user
        try:
            with patch("app.api.auth.get_supabase", return_value=self._workers_db([])):
                response = TestClient(app).get(WORKERS_URL)
            assert response.status_code == 403
        finally:
            app.dependency_overrides.clear()

    def test_production_rejects_a_demo_worker_assignment(self, authority_user):
        app.dependency_overrides[get_current_user] = lambda: authority_user
        incidents = MagicMock()
        users = MagicMock()
        db = _split_db(incidents=incidents, users=users)
        try:
            with (
                patch.object(settings, "ENVIRONMENT", "production"),
                patch("app.api.incident.get_supabase", return_value=db),
            ):
                response = TestClient(app).put(
                    STATUS_URL, json={"status": "assigned", "worker_id": "mock-w1"}
                )
            assert response.status_code == 422
            incidents.update.assert_not_called()
            users.upsert.assert_not_called()
        finally:
            app.dependency_overrides.clear()

    def test_development_still_substitutes_a_real_worker(self, authority_user):
        app.dependency_overrides[get_current_user] = lambda: authority_user
        users = MagicMock()
        users.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
            {"id": "real-worker-1"}
        ]
        incidents = MagicMock()
        incidents.select.return_value.eq.return_value.execute.return_value.data = []
        audit = MagicMock()
        audit.insert.return_value.execute.return_value.data = [{"id": "audit-1"}]
        db = _split_db(incidents=incidents, users=users, incident_updates=audit)
        try:
            with (
                patch.object(settings, "ENVIRONMENT", "development"),
                patch("app.api.incident.get_supabase", return_value=db),
                patch("app.api.incident.NotificationService.create_notification"),
            ):
                response = TestClient(app).put(
                    STATUS_URL, json={"status": "assigned", "worker_id": "mock-w1"}
                )
            assert response.status_code == 200
            incidents.update.assert_called_once_with(
                {"status": "assigned", "assigned_to": "real-worker-1"}
            )
        finally:
            app.dependency_overrides.clear()