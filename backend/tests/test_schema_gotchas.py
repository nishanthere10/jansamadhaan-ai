"""
tests/test_schema_gotchas.py
─────────────────────────────
Application contract tests using mocked persistence, not live-schema validation:
- public.users
- public.incidents (deferred timestamp updates, ai_department, dual coordinates)
- public.incident_ai_metadata
- public.duplicate_complaints
- public.trust_scores
- public.resolution_verifications
- public.qr_projects
- public.notifications
"""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.core.security import get_current_user
from app.main import app
from app.services.incident_service import IncidentService


@pytest.fixture
def authority_user():
    return {
        "id": "auth-user-123",
        "full_name": "Commissioner Sharma",
        "email": "sharma@gov.in",
        "role": "authority",
    }


@pytest.fixture
def citizen_user():
    return {
        "id": "citizen-user-456",
        "full_name": "Aarav Patel",
        "email": "aarav@example.com",
        "role": "citizen",
    }


@pytest.fixture
def worker_user():
    return {
        "id": "worker-user-789",
        "full_name": "Ravi Kumar",
        "email": "ravi@worker.local",
        "role": "worker",
    }


class TestIncidentSchemaAlignment:
    def test_incident_creation_mirrors_dual_coordinate_and_user_columns(self):
        """
        SCHEMA GOTCHA:
        public.incidents contains both:
        - user_id AND citizen_id
        - latitude AND location_lat
        - longitude AND location_lng
        - location_name AND address
        IncidentService must populate both pairs so queries or frontends using
        either convention never receive null.
        """
        mock_db = MagicMock()
        mock_bg = MagicMock()
        mock_db.table.return_value.insert.return_value.execute.return_value.data = [
            {"id": "inc-001", "tracking_id": "CIV-123"}
        ]

        with patch("app.ai.tasks.process_incident_ai_background"):
            IncidentService.create_incident(
                db=mock_db,
                background_tasks=mock_bg,
                citizen_id="citizen-uuid-456",
                title="Broken Water Pipe",
                description="Heavy leakage at main junction",
                category="Water Supply",
                severity="high",
                location_lat=28.6139,
                location_lng=77.2090,
                address="Connaught Place, New Delhi",
                image_url="https://images.unsplash.com/photo-1541888946425-d0fbb18086f6",
            )

        # Incident creation also writes a citizen receipt notification, so
        # select the incident insert explicitly instead of assuming it is
        # whichever insert ran last. It must still happen exactly once.
        incident_inserts = [
            call[0][0]
            for call in mock_db.table.return_value.insert.call_args_list
            if "citizen_id" in call[0][0]
        ]
        assert len(incident_inserts) == 1
        insert_args = incident_inserts[0]

        # Verify dual user references
        assert insert_args["citizen_id"] == "citizen-uuid-456"
        assert insert_args["user_id"] == "citizen-uuid-456"

        # Verify dual coordinate columns
        assert insert_args["location_lat"] == 28.6139
        assert insert_args["latitude"] == 28.6139
        assert insert_args["location_lng"] == 77.2090
        assert insert_args["longitude"] == 77.2090

        # Verify dual address columns
        assert insert_args["address"] == "Connaught Place, New Delhi"
        assert insert_args["location_name"] == "Connaught Place, New Delhi"

    def test_status_update_does_not_send_updated_at_column(self, authority_user):
        """
        Migration 005 adds updated_at with an insert default only.
        Explicit timestamp-update semantics are deferred; preserve current payloads.
        """
        app.dependency_overrides[get_current_user] = lambda: authority_user
        mock_db = MagicMock()

        # Mock incidents query
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            {"title": "Pothole", "citizen_id": "c-1", "tracking_id": "CIV-01", "image_url": None}
        ]

        with patch("app.api.incident.get_supabase", return_value=mock_db):
            client = TestClient(app)
            response = client.put(
                "/api/v1/incidents/inc-123/status",
                json={"status": "in-progress"},
            )

        app.dependency_overrides.clear()
        assert response.status_code == 200

        # Check the payload sent to incidents.update()
        update_calls = mock_db.table.return_value.update.call_args_list
        assert len(update_calls) >= 1
        payload = update_calls[0][0][0]
        assert "updated_at" not in payload, "updated_at must NOT be sent to incidents table"
        assert payload["status"] == "in-progress"

    def test_triage_update_updates_ai_department_not_department(self, authority_user):
        """
        SCHEMA GOTCHA:
        public.incidents column is named 'ai_department', NOT 'department'.
        Updating 'department' throws column does not exist.
        """
        app.dependency_overrides[get_current_user] = lambda: authority_user
        mock_db = MagicMock()

        with patch("app.api.incident.get_supabase", return_value=mock_db):
            client = TestClient(app)
            response = client.put(
                "/api/v1/incidents/inc-123/triage",
                json={
                    "category": "Roads",
                    "severity": "high",
                    "department": "Public Works Department",
                },
            )

        app.dependency_overrides.clear()
        assert response.status_code == 200

        update_calls = mock_db.table.return_value.update.call_args_list
        assert len(update_calls) >= 1
        payload = update_calls[0][0][0]

        assert "department" not in payload, "Must not send 'department' column to incidents"
        assert payload.get("ai_department") == "Public Works Department"
        assert "updated_at" not in payload, "Must not send 'updated_at' column to incidents"

    @pytest.mark.parametrize("error", [
        'relation "public.incident_updates" does not exist',
        "database connection unavailable",
    ])
    def test_get_incident_updates_fails_closed(self, citizen_user, error):
        """Audit read failures must not return a fabricated/partial timeline."""
        app.dependency_overrides[get_current_user] = lambda: citizen_user
        mock_db = MagicMock()
        incidents = MagicMock()
        incidents.select.return_value.eq.return_value.execute.return_value.data = [
            {"citizen_id": citizen_user["id"]}
        ]
        updates = MagicMock()
        updates.select.return_value.eq.return_value.order.return_value.execute.side_effect = RuntimeError(error)
        mock_db.table.side_effect = lambda name: incidents if name == "incidents" else updates
        try:
            with patch("app.api.incident.get_supabase", return_value=mock_db):
                response = TestClient(app).get("/api/v1/incidents/inc-100/updates")
            assert response.status_code == 500
            assert "data" not in response.json()
            assert "resolution_verifications" not in [c.args[0] for c in mock_db.table.call_args_list]
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.parametrize("rows", [[], [{"id": "audit-1", "status": "in-progress"}]])
    def test_get_incident_updates_returns_audit_rows(self, citizen_user, rows):
        app.dependency_overrides[get_current_user] = lambda: citizen_user
        mock_db = MagicMock()
        query = mock_db.table.return_value.select.return_value.eq.return_value
        query.execute.return_value.data = [{"citizen_id": citizen_user["id"]}]
        query.order.return_value.execute.return_value.data = rows
        try:
            with patch("app.api.incident.get_supabase", return_value=mock_db):
                response = TestClient(app).get("/api/v1/incidents/inc-100/updates")
            assert response.status_code == 200
            assert response.json()["data"] == rows
            query.order.assert_called_once_with("created_at", desc=False)
        finally:
            app.dependency_overrides.clear()

    @pytest.mark.parametrize("error", [
        'column "assigned_to" does not exist',
        "assigned_to violates foreign key constraint",
    ])
    def test_assignment_failure_does_not_retry_without_worker(self, authority_user, error):
        """SCHEMA HARDENING (Phase 4): an assignment write failure must surface,
        never retry with the worker dropped, and never emit notifications.
        The audit row is written first by design; see test_phase4_consistency.py.
        """
        app.dependency_overrides[get_current_user] = lambda: authority_user
        mock_db = MagicMock()
        incidents = mock_db.table.return_value
        incidents.update.return_value.eq.return_value.execute.side_effect = RuntimeError(error)
        try:
            with (
                patch("app.api.incident.get_supabase", return_value=mock_db),
                patch("app.api.incident.NotificationService.create_notification") as notify,
            ):
                response = TestClient(app).put(
                    "/api/v1/incidents/inc-100/status",
                    json={"status": "assigned", "worker_id": "worker-123"},
                )
            assert response.status_code == 500
            incidents.update.assert_called_once_with(
                {"status": "assigned", "assigned_to": "worker-123"}
            )
            notify.assert_not_called()
        finally:
            app.dependency_overrides.clear()


class TestWorkerResilience:
    def test_worker_list_fails_closed_when_assigned_to_missing(self, worker_user):
        """
        SCHEMA HARDENING (Phase 4):
        Migration 005 guarantees public.incidents.assigned_to. If the column
        is genuinely absent, the worker list must FAIL CLOSED — it must never
        silently fall back to returning all incidents.
        """
        app.dependency_overrides[get_current_user] = lambda: worker_user
        mock_db = MagicMock()

        mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.execute.side_effect = (
            Exception('column "assigned_to" does not exist')
        )

        with patch("app.api.incident.get_supabase", return_value=mock_db):
            client = TestClient(app)
            response = client.get("/api/v1/incidents")

        app.dependency_overrides.clear()
        assert response.status_code == 500  # internal error, never a data leak


class TestDedicatedSchemaTables:
    @pytest.mark.anyio
    async def test_trust_scoring_service_inserts_into_trust_scores_table(self):
        """
        SCHEMA TABLE: public.trust_scores
        Verifies TrustScoringService logs history to public.trust_scores.
        """
        from app.ai.services.trust_scoring_service import TrustScoringService

        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
            MagicMock(data=[{"status": "resolved"}, {"status": "resolved"}])
        )

        with patch("app.ai.services.trust_scoring_service.get_supabase", return_value=mock_db):
            result = await TrustScoringService.process({"citizen_id": "citizen-123"})

        assert result["trust_score"] == 70
        assert result["is_verified"] is True

        # Check trust_scores insert
        table_calls = [call[0][0] for call in mock_db.table.call_args_list]
        assert "trust_scores" in table_calls

    @pytest.mark.anyio
    async def test_duplicate_detection_inserts_into_duplicate_complaints_table(self):
        """
        SCHEMA TABLE: public.duplicate_complaints
        Verifies duplicate attachments log to public.duplicate_complaints.
        """
        from app.ai.services.duplicate_detection_service import (
            DuplicateDetectionService,
        )

        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
            MagicMock(data=[{"ai_severity": "Low Risk"}])
        )

        with patch("app.ai.services.duplicate_detection_service.get_supabase", return_value=mock_db):
            await DuplicateDetectionService._attach_to_cluster(
                incident_id="inc-new",
                cluster_id="cluster-999",
                primary_id="inc-primary",
                new_dup_count=2,
            )

        table_calls = [call[0][0] for call in mock_db.table.call_args_list]
        assert "duplicate_complaints" in table_calls
