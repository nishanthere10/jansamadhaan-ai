"""
tests/test_phase4_consistency.py
────────────────────────────────
Phase 4 schema-consistency contracts (mocked persistence, not live-schema proof):

- A failing audit INSERT must never be masked by a successful status response.
- A failing state change must compensate the audit row it already wrote.
- The real 0.0-1.0 severity score must be persisted (no phantom priority_score).
- Migration 008 must own the updated_at maintenance the app refuses to write.
"""

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.ai.services.duplicate_detection_service import DuplicateDetectionService
from app.ai.tasks import process_incident_ai_background
from app.core.security import get_current_user
from app.main import app

MIGRATIONS = Path(__file__).resolve().parents[1] / "migrations"


@pytest.fixture
def authority_user():
    return {
        "id": "auth-user-123",
        "full_name": "Commissioner Sharma",
        "email": "sharma@gov.in",
        "role": "authority",
    }


class TestStatusAuditOrdering:
    def test_missing_audit_table_blocks_state_change(self, authority_user):
        """Audit INSERT failure must fail closed before the status is changed."""
        app.dependency_overrides[get_current_user] = lambda: authority_user
        mock_db = MagicMock()
        incidents = MagicMock()
        audit = MagicMock()
        audit.insert.return_value.execute.side_effect = RuntimeError(
            'relation "public.incident_updates" does not exist'
        )
        mock_db.table.side_effect = lambda name: incidents if name == "incidents" else audit
        try:
            with (
                patch("app.api.incident.get_supabase", return_value=mock_db),
                patch("app.api.incident.NotificationService.create_notification") as notify,
            ):
                response = TestClient(app).put(
                    "/api/v1/incidents/inc-100/status",
                    json={"status": "in-progress"},
                )
            assert response.status_code == 500
            incidents.update.assert_not_called()
            notify.assert_not_called()
        finally:
            app.dependency_overrides.clear()

    def test_failed_state_change_compensates_audit_row(self, authority_user):
        """A status write failure removes the audit row that claims the change."""
        app.dependency_overrides[get_current_user] = lambda: authority_user
        mock_db = MagicMock()
        incidents = MagicMock()
        audit = MagicMock()
        audit.insert.return_value.execute.return_value.data = [{"id": "audit-9"}]
        incidents.update.return_value.eq.return_value.execute.side_effect = RuntimeError(
            'column "assigned_to" does not exist'
        )
        mock_db.table.side_effect = lambda name: incidents if name == "incidents" else audit
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
            audit.delete.return_value.eq.assert_called_once_with("id", "audit-9")
            notify.assert_not_called()
        finally:
            app.dependency_overrides.clear()

    def test_unidentified_audit_row_is_never_deleted_blindly(self, authority_user):
        """Without a returned row id the compensation is skipped, not guessed."""
        app.dependency_overrides[get_current_user] = lambda: authority_user
        mock_db = MagicMock()
        incidents = MagicMock()
        audit = MagicMock()
        audit.insert.return_value.execute.return_value.data = []
        incidents.update.return_value.eq.return_value.execute.side_effect = RuntimeError("boom")
        mock_db.table.side_effect = lambda name: incidents if name == "incidents" else audit
        try:
            with (
                patch("app.api.incident.get_supabase", return_value=mock_db),
                patch("app.api.incident.NotificationService.create_notification"),
            ):
                response = TestClient(app).put(
                    "/api/v1/incidents/inc-100/status",
                    json={"status": "in-progress"},
                )
            assert response.status_code == 500
            audit.delete.assert_not_called()
        finally:
            app.dependency_overrides.clear()


    def test_successful_update_notifies_after_state_change(self, authority_user):
        """Happy path keeps its response contract and post-commit notifications."""
        app.dependency_overrides[get_current_user] = lambda: authority_user
        mock_db = MagicMock()
        incidents = MagicMock()
        audit = MagicMock()
        audit.insert.return_value.execute.return_value.data = [{"id": "audit-1"}]
        incidents.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
        incidents.select.return_value.eq.return_value.execute.return_value.data = [
            {"title": "Pothole", "citizen_id": "c-1", "tracking_id": "CIV-01", "image_url": None}
        ]
        mock_db.table.side_effect = lambda name: incidents if name == "incidents" else audit
        try:
            with (
                patch("app.api.incident.get_supabase", return_value=mock_db),
                patch("app.api.incident.NotificationService.create_notification") as notify,
            ):
                response = TestClient(app).put(
                    "/api/v1/incidents/inc-100/status",
                    json={"status": "in-progress"},
                )
            assert response.status_code == 200
            assert response.json()["data"] == {"status": "in-progress"}
            assert notify.call_count == 1
        finally:
            app.dependency_overrides.clear()


class TestSeverityScorePersistence:
    @pytest.mark.asyncio
    async def test_orchestrator_persists_real_severity_score(self):
        """The computed 0.0-1.0 score is stored; no phantom priority_score key."""
        db = MagicMock()
        pipeline = MagicMock()
        pipeline.ainvoke = AsyncMock(
            return_value={
                "incident_id": "incident",
                "category": "Pothole",
                "severity": "High Risk",
                "severity_score": 0.8,
                "severity_explanation": "Main road hazard.",
            }
        )
        with (
            patch("app.ai.tasks.get_supabase", return_value=db),
            patch("app.ai.tasks.get_pipeline", return_value=pipeline),
            patch.object(DuplicateDetectionService, "process", AsyncMock(return_value={})),
        ):
            await process_incident_ai_background("incident", "Pothole")
        final = db.table.return_value.update.call_args.args[0]
        assert "priority_score" not in final
        assert final["ai_structured_data"]["severity_score"] == 0.8
        assert final["ai_structured_data"]["severity_explanation"] == "Main road hazard."


class TestMigrationOwnership:
    def test_updated_at_trigger_is_migration_owned(self):
        """The app never writes updated_at, so 008 must maintain it in the DB."""
        sql = (MIGRATIONS / "008_updated_at_trigger.sql").read_text(encoding="utf-8")
        assert "public.set_incidents_updated_at" in sql
        assert "trg_incidents_set_updated_at" in sql
        assert "BEFORE UPDATE ON public.incidents" in sql
        assert "NEW.updated_at := now();" in sql