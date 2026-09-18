"""
tests/test_notification_lifecycle.py
────────────────────────────────────
Phase 6 notification contracts (mocked persistence):

- every event notifies the recipient who can act on it, exactly once
- AI failure goes to authorities, never to the citizen
- a duplicate link notifies the duplicate reporter only, not the primary's
- notification problems never break incident creation or AI analysis
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.ai.services.duplicate_detection_service import DuplicateDetectionService
from app.ai.tasks import process_incident_ai_background
from app.services.incident_service import IncidentService
from app.services.notification_service import NotificationService


def _pipeline(state):
    pipeline = MagicMock()
    pipeline.ainvoke = AsyncMock(return_value=state)
    return pipeline


def _db_with_incident(citizen_id="citizen-9", tracking_id="CIV-42"):
    db = MagicMock()
    db.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"citizen_id": citizen_id, "tracking_id": tracking_id}
    ]
    return db


async def _run_pipeline(db, state, cluster_meta=None):
    with (
        patch("app.ai.tasks.get_supabase", return_value=db),
        patch("app.ai.tasks.get_pipeline", return_value=_pipeline(state)),
        patch.object(
            DuplicateDetectionService,
            "process",
            AsyncMock(return_value=cluster_meta or {}),
        ),
    ):
        await process_incident_ai_background("incident", "Pothole")


class TestCreationReceipt:
    def test_creation_notifies_the_citizen_with_the_tracking_id(self):
        db = MagicMock()
        db.table.return_value.insert.return_value.execute.return_value.data = [
            {"id": "inc-1", "tracking_id": "CIV-1"}
        ]
        with (
            patch("app.ai.tasks.process_incident_ai_background"),
            patch.object(NotificationService, "create_notification") as notify,
        ):
            IncidentService.create_incident(
                db=db,
                background_tasks=MagicMock(),
                citizen_id="citizen-1",
                title="Broken Water Pipe",
                description="Heavy leakage at main junction",
                category="Water Supply",
            )

        notify.assert_called_once()
        recipient, title, message = notify.call_args.args[1:4]
        assert recipient == "citizen-1"
        assert title == "Complaint Received"
        assert "CIV-1" in message

    def test_a_broken_notification_cannot_fail_incident_creation(self):
        db = MagicMock()
        db.table.return_value.insert.return_value.execute.return_value.data = [
            {"id": "inc-1", "tracking_id": "CIV-1"}
        ]
        with (
            patch("app.ai.tasks.process_incident_ai_background"),
            patch.object(
                NotificationService, "create_notification", side_effect=RuntimeError("bad")
            ),
        ):
            result = IncidentService.create_incident(
                db=db,
                background_tasks=MagicMock(),
                citizen_id="citizen-1",
                title="Broken Water Pipe",
                description="Heavy leakage at main junction",
                category="Water Supply",
            )

        assert result["success"] is True
        assert result["data"]["tracking_id"] == "CIV-1"


class TestAiPipelineEvents:
    @pytest.mark.asyncio
    async def test_completion_notifies_the_citizen_once(self):
        db = _db_with_incident()
        with patch.object(NotificationService, "create_notification") as notify:
            await _run_pipeline(
                db,
                {"incident_id": "incident", "category": "Pothole", "severity": "High Risk",
                 "primary_department": "Public Works"},
            )

        notify.assert_called_once()
        recipient, title, message = notify.call_args.args[1:4]
        assert recipient == "citizen-9"
        assert title == "Complaint Analysed"
        assert "Pothole" in message and "Public Works" in message

    @pytest.mark.asyncio
    async def test_failure_notifies_authorities_and_not_the_citizen(self):
        db = _db_with_incident()
        with (
            patch.object(NotificationService, "create_notification") as notify,
            patch.object(NotificationService, "notify_authorities") as escalate,
        ):
            await _run_pipeline(db, {"incident_id": "incident"})

        notify.assert_not_called()
        escalate.assert_called_once()
        message = escalate.call_args.args[2]
        assert "CIV-42" in message


class TestDuplicateLinkEvent:
    @pytest.mark.asyncio
    async def test_only_the_duplicate_reporter_is_told(self):
        db = _db_with_incident()
        with patch.object(NotificationService, "create_notification") as notify:
            await _run_pipeline(
                db,
                {"incident_id": "incident", "category": "Pothole", "severity": "High Risk"},
                cluster_meta={
                    "cluster_id": "CLUSTER-123",
                    "is_primary_incident": False,
                    "duplicate_count": 2,
                },
            )

        titles = [call.args[2] for call in notify.call_args_list]
        assert titles == ["Complaint Analysed", "Report Linked to an Existing Complaint"]
        linked = notify.call_args_list[-1]
        assert linked.args[1] == "citizen-9"
        assert "CLUSTER-123" in linked.args[3]

    @pytest.mark.asyncio
    async def test_the_primary_incident_is_not_notified_about_its_own_cluster(self):
        db = _db_with_incident()
        with patch.object(NotificationService, "create_notification") as notify:
            await _run_pipeline(
                db,
                {"incident_id": "incident", "category": "Pothole", "severity": "High Risk"},
                cluster_meta={
                    "cluster_id": "CLUSTER-123",
                    "is_primary_incident": True,
                    "duplicate_count": 0,
                },
            )

        titles = [call.args[2] for call in notify.call_args_list]
        assert titles == ["Complaint Analysed"]

    @pytest.mark.asyncio
    async def test_a_failing_notification_does_not_fail_the_analysis(self):
        db = _db_with_incident()
        with patch.object(
            NotificationService, "create_notification", side_effect=RuntimeError("bad")
        ):
            await _run_pipeline(
                db, {"incident_id": "incident", "category": "Pothole", "severity": "High Risk"}
            )

        assert db.table.return_value.update.call_args.args[0]["ai_processing_status"] == "completed"


class TestAuthorityFanOut:
    def test_fan_out_targets_every_authority_account(self):
        db = MagicMock()
        db.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            {"id": "auth-1"},
            {"id": "auth-2"},
        ]
        with patch.object(NotificationService, "create_notification", return_value={"id": "n"}) as notify:
            sent = NotificationService.notify_authorities(db, "AI Processing Failed", "reprocess")

        assert sent == 2
        assert [call.args[1] for call in notify.call_args_list] == ["auth-1", "auth-2"]

    def test_lookup_failure_is_tolerated(self):
        db = MagicMock()
        db.table.return_value.select.return_value.eq.return_value.execute.side_effect = RuntimeError(
            "connection unavailable"
        )
        with patch.object(NotificationService, "create_notification") as notify:
            assert NotificationService.notify_authorities(db, "t", "m") == 0

        notify.assert_not_called()

    def test_a_missing_recipient_is_never_notified(self):
        db = MagicMock()
        assert NotificationService.create_notification(db, None, "t", "m") is None
        db.table.assert_not_called()