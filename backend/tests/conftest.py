"""
tests/conftest.py
─────────────────
Shared pytest fixtures for the Jan Samadhan AI test suite.

Design principles
-----------------
- All external I/O (Supabase, network) is mocked by default.
- Each test module can opt-in to live calls with `--live` flag.
- The FastAPI `TestClient` is provided via `client` fixture.
- The Supabase singleton is reset between tests to prevent state leakage.

GOTCHA: `from app.core.database import get_supabase` binds a local
reference at import time. Patching `app.core.database.get_supabase`
does NOT affect modules that already imported it. We must patch
get_supabase at every call-site (e.g. `app.api.auth.get_supabase`).
"""
import os
from contextlib import ExitStack
from unittest.mock import MagicMock, patch

import pytest

# ── Ensure .env is loaded before any app import ───────────────────────────────
from dotenv import load_dotenv
from fastapi.testclient import TestClient

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

# All modules that do `from app.core.database import get_supabase`
_GET_SUPABASE_TARGETS = [
    "app.core.database.get_supabase",
    "app.core.security.get_supabase",
    "app.api.auth.get_supabase",
    "app.api.incident.get_supabase",
    "app.api.qr_projects.get_supabase",
    "app.api.notifications.get_supabase",
]


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def reset_supabase_singleton():
    """
    GOTCHA: The Supabase client is a module-level singleton.
    If a test leaves it in a broken/mocked state, subsequent tests fail.
    This fixture resets it before every test.
    """
    from app.core import database
    database._supabase_client = None
    yield
    database._supabase_client = None


@pytest.fixture()
def mock_supabase():
    """
    Returns a fully mocked Supabase client and patches get_supabase()
    at EVERY call-site so no real network call is ever made during unit tests.
    """
    mock_client = MagicMock()
    with ExitStack() as stack:
        for target in _GET_SUPABASE_TARGETS:
            try:
                stack.enter_context(patch(target, return_value=mock_client))
            except (ModuleNotFoundError, AttributeError):
                # Module may not exist in stripped-down test environments
                pass
        yield mock_client


@pytest.fixture()
def client(mock_supabase):
    """FastAPI TestClient with Supabase mocked out."""
    from app.main import app
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


@pytest.fixture()
def auth_client(client, mock_supabase):
    """
    TestClient pre-configured with a valid Authority Bearer token header.
    The token is a mock JWT-shaped string; security.get_current_user is
    patched to return a canned authority profile.
    """
    authority_user = {
        "id": "auth-user-id",
        "email": "authority@test.gov",
        "full_name": "Test Authority",
        "role": "authority",
    }
    with patch("app.core.security.get_current_user", return_value=authority_user):
        client.headers.update({"Authorization": "Bearer mock_authority_token"})
        yield client, authority_user


@pytest.fixture()
def citizen_client(client, mock_supabase):
    """TestClient pre-configured with a valid Citizen Bearer token header."""
    citizen_user = {
        "id": "citizen-user-id",
        "email": "citizen@test.com",
        "full_name": "Test Citizen",
        "role": "citizen",
    }
    with patch("app.core.security.get_current_user", return_value=citizen_user):
        client.headers.update({"Authorization": "Bearer mock_citizen_token"})
        yield client, citizen_user
