"""
tests/test_security_hardening.py
────────────────────────────────
Phase 1 (v1.1 hardening): authentication must fail closed.

Covers: missing/malformed/random/substring tokens → 401 in production;
valid JWT per role resolves; wrong role → 403; dev bypass gated on
ENVIRONMENT != production AND DEV_AUTH_BYPASS=true; aadhar mock gated.
"""
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.core import database
from app.main import app


def _targets():
    return [
        "app.core.security.get_supabase",
        "app.api.auth.get_supabase",
        "app.api.incident.get_supabase",
        "app.api.qr_projects.get_supabase",
        "app.api.notifications.get_supabase",
    ]


def _mock_supabase_for(user_id="uid-1", role="citizen"):
    mock_db = MagicMock()
    user = MagicMock()
    user.id = user_id
    user.email = "user@example.com"
    user_response = MagicMock()
    user_response.user = user
    mock_db.auth.get_user.return_value = user_response
    profile = {"id": user_id, "email": "user@example.com", "full_name": "User", "role": role}
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[profile]
    )
    return mock_db


@pytest.fixture()
def prod_env():
    with patch("app.core.security.settings") as sec_settings:
        sec_settings.ENVIRONMENT = "production"
        sec_settings.DEV_AUTH_BYPASS = False
        yield sec_settings


@pytest.fixture()
def prod_client(prod_env, mock_supabase):
    database._supabase_client = None
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    database._supabase_client = None


class TestProductionRejectsBadCredentials:
    def test_missing_header_returns_401(self, prod_client):
        assert prod_client.get("/api/v1/auth/me").status_code == 401

    def test_malformed_header_returns_401(self, prod_client):
        res = prod_client.get("/api/v1/auth/me", headers={"Authorization": "NotBearer"})
        assert res.status_code == 401

    def test_random_token_returns_401_not_dev_authority(self, mock_supabase, prod_env):
        mock_supabase.auth.get_user.side_effect = Exception("invalid signature")
        database._supabase_client = None
        with TestClient(app, raise_server_exceptions=False) as c:
            res = c.get("/api/v1/auth/me", headers={"Authorization": "Bearer random-token-xyz"})
        database._supabase_client = None
        assert res.status_code == 401

    @pytest.mark.parametrize(
        "token",
        ["citizen-token", "worker-token", "dev-token", "mock-token",
         "bypass-token", "mock_aadhar_token_abc", "dev-bypass-token"],
    )
    def test_substring_tokens_rejected_in_production(self, mock_supabase, prod_env, token):
        mock_supabase.auth.get_user.side_effect = Exception("invalid token")
        database._supabase_client = None
        with TestClient(app, raise_server_exceptions=False) as c:
            res = c.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        database._supabase_client = None
        assert res.status_code == 401, f"token {token!r} was not rejected"

    def test_expired_token_returns_401(self, mock_supabase, prod_env):
        mock_supabase.auth.get_user.side_effect = Exception("Token expired")
        database._supabase_client = None
        with TestClient(app, raise_server_exceptions=False) as c:
            res = c.get("/api/v1/auth/me", headers={"Authorization": "Bearer expired.jwt.token"})
        database._supabase_client = None
        assert res.status_code == 401

    def test_get_user_empty_returns_401(self, mock_supabase, prod_env):
        mock_supabase.auth.get_user.return_value = MagicMock(user=None)
        database._supabase_client = None
        with TestClient(app, raise_server_exceptions=False) as c:
            res = c.get("/api/v1/auth/me", headers={"Authorization": "Bearer valid.shape.bad-user"})
        database._supabase_client = None
        assert res.status_code == 401


class TestProductionAcceptsValidJwt:
    @pytest.mark.parametrize(
        ("role", "user_id"),
        [("citizen", "cit-1"), ("worker", "wrk-1"), ("authority", "aut-1")],
    )
    def test_valid_jwt_resolves_role_profile(self, prod_env, role, user_id):
        mock_db = _mock_supabase_for(user_id, role)
        database._supabase_client = None
        patches = [patch(t, return_value=mock_db) for t in _targets()]
        for p in patches:
            p.start()
        try:
            with TestClient(app, raise_server_exceptions=False) as c:
                res = c.get("/api/v1/auth/me", headers={"Authorization": "Bearer real.supabase.jwt"})
        finally:
            for p in patches:
                p.stop()
        database._supabase_client = None
        assert res.status_code == 200
        assert res.json()["data"]["role"] == role
        assert res.json()["data"]["id"] == user_id

    def test_valid_citizen_jwt_wrong_role_gets_403(self, prod_env):
        mock_db = _mock_supabase_for("cit-1", "citizen")
        database._supabase_client = None
        patches = [patch(t, return_value=mock_db) for t in _targets()]
        for p in patches:
            p.start()
        try:
            with TestClient(app, raise_server_exceptions=False) as c:
                res = c.get("/api/v1/auth/workers", headers={"Authorization": "Bearer real.supabase.jwt"})
        finally:
            for p in patches:
                p.stop()
        database._supabase_client = None
        assert res.status_code == 403


class TestDevBypassGate:
    def test_bypass_open_in_dev_with_flag(self):
        from app.core import security

        with patch.object(security.settings, "ENVIRONMENT", "development"), patch.object(
            security.settings, "DEV_AUTH_BYPASS", True
        ):
            assert security.is_dev_bypass_enabled() is True
            assert security.get_current_user("Bearer dev-citizen-token")["role"] == "citizen"
            with pytest.raises(HTTPException) as exc:
                security.get_current_user(None)
            assert exc.value.status_code == 401

    def test_bypass_closed_without_flag(self, mock_supabase):
        from app.core import security

        with patch.object(security.settings, "ENVIRONMENT", "development"), patch.object(
            security.settings, "DEV_AUTH_BYPASS", False
        ):
            assert security.is_dev_bypass_enabled() is False
            with pytest.raises(Exception) as exc:
                security.get_current_user("Bearer dev-citizen-token")
            assert exc.value.status_code == 401

    def test_bypass_impossible_in_production_even_with_flag(self):
        from app.core import security

        with patch.object(security.settings, "ENVIRONMENT", "production"), patch.object(
            security.settings, "DEV_AUTH_BYPASS", True
        ):
            assert security.is_dev_bypass_enabled() is False
            with pytest.raises(Exception) as exc:
                security.get_current_user("Bearer dev-bypass-token")
            assert exc.value.status_code == 401


class TestAadharMockGate:
    def test_aadhar_login_blocked_in_production(self, prod_client):
        res = prod_client.post("/api/v1/auth/aadhar-login", json={"aadhar_number": "123456789012"})
        assert res.status_code == 403
        assert "disabled" in res.json()["detail"].lower()

    def test_aadhar_login_allowed_with_dev_bypass(self, client):
        from app.core import security

        with patch.object(security.settings, "ENVIRONMENT", "development"), patch.object(
            security.settings, "DEV_AUTH_BYPASS", True
        ):
            res = client.post("/api/v1/auth/aadhar-login", json={"aadhar_number": "123456789012"})
        assert res.status_code == 200
        assert res.json()["success"] is True


    def test_demo_session_restored_by_fresh_client_is_rejected_in_production(self, client, mock_supabase, tmp_path):
        """Exercise real routes/dependencies, with only the external database mocked."""
        import json
        import uuid

        from app.core import security

        user_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, "aadhar-123456789012"))
        profile = {"id": user_id, "full_name": "Demo Citizen", "email": "demo@example.com", "role": "citizen"}
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[profile])
        mock_supabase.auth.get_user.side_effect = Exception("Not a Supabase JWT")
        saved_session = tmp_path / "session.json"
        with patch.object(security.settings, "ENVIRONMENT", "development"), patch.object(
            security.settings, "DEV_AUTH_BYPASS", True
        ):
            login = client.post("/api/v1/auth/aadhar-login", json={"aadhar_number": "123456789012"})
            assert login.status_code == 200
            saved_session.write_text(json.dumps(login.json()["data"]), encoding="utf-8")
            restored = json.loads(saved_session.read_text(encoding="utf-8"))
            headers = {"Authorization": f"Bearer {restored['access_token']}"}
            with TestClient(app) as fresh_client:
                result = fresh_client.get("/api/v1/auth/me", headers=headers)
                assert result.status_code == 200
                assert result.json()["data"] == profile
                assert fresh_client.get("/api/v1/auth/workers", headers=headers).status_code == 403
            mock_supabase.auth.get_user.assert_not_called()
        try:
            with patch.object(security.settings, "ENVIRONMENT", "production"), patch.object(
                security.settings, "DEV_AUTH_BYPASS", True
            ):
                assert client.get("/api/v1/auth/me", headers=headers).status_code == 401
                mock_supabase.auth.get_user.assert_called_once_with(restored["access_token"])
                mock_supabase.reset_mock()
                assert client.post("/api/v1/auth/aadhar-login", json={"aadhar_number": "123456789012"}).status_code == 403
                mock_supabase.table.assert_not_called()
                mock_supabase.auth.admin.create_user.assert_not_called()
        finally:
            security._DEV_SESSIONS.pop(restored["access_token"], None)


def test_security_headers_present_on_responses(client):
    """Verify security headers are injected into HTTP responses."""
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.headers.get("X-Content-Type-Options") == "nosniff"
    assert resp.headers.get("X-Frame-Options") == "DENY"
    assert resp.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"


def test_rate_limiter_blocks_excessive_requests(client):
    """Verify rate limiter returns 429 when max threshold is exceeded."""
    # Using X-Test-Rate-Limit header activates rate limiting in test mode
    headers = {"X-Test-Rate-Limit": "1"}
    # Limit for /api/v1/auth/signup is 5 requests/min
    for _ in range(5):
        client.post("/api/v1/auth/signup", json={"email": "bad"}, headers=headers)

    # 6th request must be throttled with 429
    blocked = client.post("/api/v1/auth/signup", json={"email": "bad"}, headers=headers)
    assert blocked.status_code == 429
    assert "detail" in blocked.json()
    assert "Retry-After" in blocked.headers


def test_upload_image_rejects_spoofed_magic_bytes(client, mock_supabase):
    """Verify upload_image rejects files where file bytes do not match MIME type."""
    from app.core.security import get_current_user
    from app.main import app

    app.dependency_overrides[get_current_user] = lambda: {"id": "user-1", "role": "citizen"}
    try:
        # Spoofed text content disguised as image/png
        fake_png = b"THIS IS NOT A VALID PNG FILE HEADER AT ALL"
        resp = client.post(
            "/api/v1/incidents/upload",
            files={"file": ("malicious.png", fake_png, "image/png")}
        )
        assert resp.status_code == 415
        assert "File signature mismatch" in resp.json()["detail"]
    finally:
        app.dependency_overrides.pop(get_current_user, None)

