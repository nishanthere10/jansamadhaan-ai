"""
tests/test_database.py
───────────────────────
Tests for app.core.database — Supabase client initialisation gotchas.

GOTCHAS TESTED
--------------
1.  Singleton caches a broken client forever (test reset_supabase_client).
2.  Missing SUPABASE_URL raises a clear ValueError instead of DNS crash.
3.  Missing SUPABASE_SERVICE_ROLE_KEY raises ValueError.
4.  URL without https:// raises ValueError before any network call.
5.  DNS / network error from create_client propagates as-is (not swallowed).
6.  Happy path: valid credentials produce a Client object.
"""
from unittest.mock import MagicMock, patch

import pytest


class TestGetSupabase:

    def test_raises_if_url_is_empty(self):
        """
        GOTCHA: If SUPABASE_URL is '' the client calls create_client('', key)
        which produces a confusing httpx.InvalidURL, not a clear config error.
        We now guard against this and raise ValueError early.
        """
        from app.core.database import get_supabase
        with patch("app.core.database.settings") as mock_settings:
            mock_settings.SUPABASE_URL = ""
            mock_settings.SUPABASE_SERVICE_ROLE_KEY = "valid_key"
            with pytest.raises(ValueError, match="SUPABASE_URL"):
                get_supabase()

    def test_raises_if_service_role_key_is_empty(self):
        """GOTCHA: Empty service-role key passes silently to create_client."""
        from app.core.database import get_supabase
        with patch("app.core.database.settings") as mock_settings:
            mock_settings.SUPABASE_URL = "https://abc.supabase.co"
            mock_settings.SUPABASE_SERVICE_ROLE_KEY = ""
            with pytest.raises(ValueError, match="SUPABASE_SERVICE_ROLE_KEY"):
                get_supabase()

    def test_raises_if_url_lacks_https(self):
        """
        GOTCHA: URL without https:// causes create_client to attempt HTTP,
        which Supabase rejects, leading to a confusing SSL error.
        """
        from app.core.database import get_supabase
        with patch("app.core.database.settings") as mock_settings:
            mock_settings.SUPABASE_URL = "abc.supabase.co"   # no scheme
            mock_settings.SUPABASE_SERVICE_ROLE_KEY = "key"
            with pytest.raises(ValueError, match="https://"):
                get_supabase()

    def test_singleton_is_reused_on_second_call(self):
        """
        GOTCHA: get_supabase() must return the SAME object on repeated calls
        so we don't open a new HTTP connection pool on every request.
        """
        from app.core.database import get_supabase
        mock_client = MagicMock()
        with patch("app.core.database.settings") as mock_settings, \
             patch("app.core.database.create_client", return_value=mock_client) as mock_create:
            mock_settings.SUPABASE_URL = "https://abc.supabase.co"
            mock_settings.SUPABASE_SERVICE_ROLE_KEY = "key"

            c1 = get_supabase()
            c2 = get_supabase()

        assert c1 is c2, "Singleton violated — two different client instances created"
        mock_create.assert_called_once()

    def test_reset_clears_singleton(self):
        """
        GOTCHA: After a config change or test, the stale singleton must be
        cleared via reset_supabase_client() so the next call re-initialises.
        """
        from app.core.database import get_supabase, reset_supabase_client
        mock_client = MagicMock()
        with patch("app.core.database.settings") as mock_settings, \
             patch("app.core.database.create_client", return_value=mock_client):
            mock_settings.SUPABASE_URL = "https://abc.supabase.co"
            mock_settings.SUPABASE_SERVICE_ROLE_KEY = "key"

            get_supabase()
            reset_supabase_client()

            from app.core import database
            assert database._supabase_client is None

    def test_dns_error_propagates_with_clear_message(self):
        """
        GOTCHA: A DNS resolution failure inside create_client() must NOT be
        swallowed. It should propagate so the caller (endpoint) can convert
        it to HTTP 503.
        """
        import httpx

        from app.core.database import get_supabase

        dns_error = httpx.ConnectError("[Errno 11001] getaddrinfo failed")

        with patch("app.core.database.settings") as mock_settings, \
             patch("app.core.database.create_client", side_effect=dns_error):
            mock_settings.SUPABASE_URL = "https://abc.supabase.co"
            mock_settings.SUPABASE_SERVICE_ROLE_KEY = "key"
            with pytest.raises(httpx.ConnectError):
                get_supabase()

    def test_happy_path_returns_client(self):
        """Sanity check: valid config produces a Client object."""
        from app.core.database import get_supabase
        mock_client = MagicMock()
        with patch("app.core.database.settings") as mock_settings, \
             patch("app.core.database.create_client", return_value=mock_client):
            mock_settings.SUPABASE_URL = "https://abc.supabase.co"
            mock_settings.SUPABASE_SERVICE_ROLE_KEY = "key"
            result = get_supabase()
        assert result is mock_client
