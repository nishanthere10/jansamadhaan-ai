from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.core.security import get_current_user
from app.main import app


def test_qr_project_update_requires_authority(client):
    app.dependency_overrides[get_current_user] = lambda: {"id": "cit-1", "role": "citizen"}
    try:
        resp = client.put("/api/v1/qr-projects/proj-1", json={"progress_percentage": 50})
        assert resp.status_code == 403
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_qr_project_update_validates_status(client, mock_supabase):
    app.dependency_overrides[get_current_user] = lambda: {"id": "auth-1", "role": "authority"}
    try:
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "proj-1", "title": "Road Repair", "status": "planned"}]
        )
        resp = client.put("/api/v1/qr-projects/proj-1", json={"status": "invalid_status_xyz"})
        assert resp.status_code == 422
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_qr_project_update_success(client, mock_supabase):
    app.dependency_overrides[get_current_user] = lambda: {"id": "auth-1", "role": "authority"}
    try:
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "proj-1", "title": "Road Repair", "status": "planned", "progress_percentage": 0}]
        )
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "proj-1", "status": "active", "progress_percentage": 75}]
        )
        resp = client.put("/api/v1/qr-projects/proj-1", json={"status": "active", "progress_percentage": 75})
        assert resp.status_code == 200
        assert resp.json()["data"]["progress_percentage"] == 75
        assert resp.json()["data"]["status"] == "active"
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_incident_feedback_dispute_reopens_incident(client, mock_supabase):
    app.dependency_overrides[get_current_user] = lambda: {"id": "cit-1", "role": "citizen"}
    try:
        # Incident is resolved
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "inc-1", "citizen_id": "cit-1", "status": "resolved", "title": "Pothole", "assigned_to": "worker-1"}]
        )
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[])

        with patch("app.services.notification_service.NotificationService.create_notification") as mock_notify:
            resp = client.post(
                "/api/v1/incidents/inc-1/feedback",
                json={"rating": 1, "comment": "Pothole is still there!", "is_disputed": True}
            )
            assert resp.status_code == 200
            assert resp.json()["data"]["status"] == "in-progress"
            assert resp.json()["data"]["is_disputed"] is True
            # Verify worker received notification
            mock_notify.assert_called_once()
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_incident_feedback_satisfaction_rating(client, mock_supabase):
    app.dependency_overrides[get_current_user] = lambda: {"id": "cit-1", "role": "citizen"}
    try:
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "inc-1", "citizen_id": "cit-1", "status": "resolved", "title": "Garbage", "assigned_to": "worker-1"}]
        )
        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[])

        with patch("app.services.notification_service.NotificationService.create_notification") as mock_notify:
            resp = client.post(
                "/api/v1/incidents/inc-1/feedback",
                json={"rating": 5, "comment": "Great cleanup, thanks!", "is_disputed": False}
            )
            assert resp.status_code == 200
            assert resp.json()["data"]["rating"] == 5
            mock_notify.assert_called_once()
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_incident_feedback_rejects_unresolved_incident(client, mock_supabase):
    app.dependency_overrides[get_current_user] = lambda: {"id": "cit-1", "role": "citizen"}
    try:
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "inc-1", "citizen_id": "cit-1", "status": "pending", "title": "Garbage"}]
        )
        resp = client.post(
            "/api/v1/incidents/inc-1/feedback",
            json={"rating": 5, "comment": "Premature feedback", "is_disputed": False}
        )
        assert resp.status_code == 400
        assert "only be submitted for resolved" in resp.json()["detail"]
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_reverse_geocode_valid_coordinates(client):
    with patch("requests.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"display_name": "Connaught Place, New Delhi, India"}
        mock_get.return_value = mock_resp

        resp = client.get("/api/v1/incidents/reverse-geocode?lat=28.6139&lon=77.2090")
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "Connaught Place" in data["address"]


def test_reverse_geocode_invalid_coordinates(client):
    resp = client.get("/api/v1/incidents/reverse-geocode?lat=999.0&lon=77.2090")
    assert resp.status_code == 400


def test_list_incidents_enriches_worker_and_citizen(client, mock_supabase):
    app.dependency_overrides[get_current_user] = lambda: {"id": "auth-1", "role": "authority"}
    try:
        mock_supabase.table.return_value.select.return_value.order.return_value.execute.return_value = MagicMock(
            data=[{
                "id": "inc-1",
                "citizen_id": "cit-1",
                "assigned_to": "work-1",
                "title": "Broken Pipe",
                "status": "assigned"
            }]
        )
        mock_supabase.table.return_value.select.return_value.in_.return_value.execute.return_value = MagicMock(
            data=[
                {"id": "cit-1", "full_name": "Citizen Ramesh", "role": "citizen"},
                {"id": "work-1", "full_name": "Worker Suresh", "role": "worker", "department": "Jal Board"}
            ]
        )
        resp = client.get("/api/v1/incidents")
        assert resp.status_code == 200
        inc = resp.json()["data"][0]
        assert inc["citizen"]["full_name"] == "Citizen Ramesh"
        assert inc["worker"]["full_name"] == "Worker Suresh"
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_signup_validation_short_password(client):
    resp = client.post("/api/v1/auth/signup", json={
        "full_name": "Valid User",
        "email": "user@example.com",
        "phone": "9876543210",
        "password": "123",  # Less than 6 chars
    })
    assert resp.status_code == 422


def test_signup_validation_short_phone(client):
    resp = client.post("/api/v1/auth/signup", json={
        "full_name": "Valid User",
        "email": "user@example.com",
        "phone": "123",  # Too short
        "password": "StrongPassword1",
    })
    assert resp.status_code == 422

