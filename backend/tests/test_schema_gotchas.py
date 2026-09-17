"""
tests/test_schema_gotchas.py
─────────────────────────────
Comprehensive tests verifying alignment with the live Supabase SQL schema:
- public.users
- public.incidents (no updated_at column, ai_department vs department, dual coordinates)
- public.incident_ai_metadata
- public.duplicate_complaints
- public.trust_scores
- public.resolution_verifications
- public.qr_projects
- public.notifications
"""

import pytest
from unittest.mock import MagicMock, patch, ANY
from fastapi.testclient import TestClient
from app.main import app
from app.services.incident_service import IncidentService
from app.core.security import get_current_user


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

        insert_args = mock_db.table.return_value.insert.call_args[0][0]

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
        SCHEMA GOTCHA:
        public.incidents has NO updated_at column in the SQL schema.
        Sending updated_at causes PostgreSQL error 42703 (column does not exist).
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

    def test_get_incident_updates_falls_back_if_table_missing(self, citizen_user):
        """
        SCHEMA GOTCHA:
        If public.incident_updates table does not exist in the database,
        GET /api/v1/incidents/{id}/updates must fall back to querying
        public.resolution_verifications instead of crashing with a 500 error.
        """
        app.dependency_overrides[get_current_user] = lambda: citizen_user
        mock_db = MagicMock()

        mock_incidents = MagicMock()
        mock_incidents.select.return_value.eq.return_value.execute.return_value = (
            MagicMock(data=[{"citizen_id": citizen_user["id"]}])
        )

        mock_incident_updates = MagicMock()
        mock_incident_updates.select.return_value.eq.return_value.order.return_value.execute.side_effect = (
            Exception('relation "public.incident_updates" does not exist')
        )

        mock_rv = MagicMock()
        mock_rv.select.return_value.eq.return_value.order.return_value.execute.return_value = (
            MagicMock(data=[
                {
                    "id": "rv-1",
                    "incident_id": "inc-100",
                    "verification_status": "verified",
                    "verification_score": 0.95,
                    "before_image_url": "http://img/before.jpg",
                    "after_image_url": "http://img/after.jpg",
                    "created_at": "2026-09-13T12:00:00Z",
                }
            ])
        )

        def table_router(table_name):
            if table_name == "incidents":
                return mock_incidents
            elif table_name == "incident_updates":
                return mock_incident_updates
            elif table_name == "resolution_verifications":
                return mock_rv
            return MagicMock()

        mock_db.table.side_effect = table_router

        with patch("app.api.incident.get_supabase", return_value=mock_db):
            client = TestClient(app)
            response = client.get("/api/v1/incidents/inc-100/updates")

        app.dependency_overrides.clear()
        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert len(body["data"]) == 1
        assert body["data"][0]["status"] == "verified"


class TestWorkerResilience:
    def test_worker_list_incidents_fallback_when_assigned_to_missing(self, worker_user):
        """
        SCHEMA GOTCHA:
        If assigned_to column is not present in public.incidents,
        worker incident listing should gracefully fall back rather than crash.
        """
        app.dependency_overrides[get_current_user] = lambda: worker_user
        mock_db = MagicMock()

        # First query with .eq("assigned_to", ...) throws column does not exist
        # Fallback query without assigned_to succeeds
        mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.execute.side_effect = (
            Exception('column "assigned_to" does not exist')
        )
        mock_db.table.return_value.select.return_value.order.return_value.limit.return_value.execute.return_value = (
            MagicMock(data=[{"id": "inc-fallback", "title": "Nearby Road Hazard", "citizen_id": None}])
        )

        with patch("app.api.incident.get_supabase", return_value=mock_db):
            client = TestClient(app)
            response = client.get("/api/v1/incidents")

        app.dependency_overrides.clear()
        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True


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
        from app.ai.services.duplicate_detection_service import DuplicateDetectionService

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
