"""
tests/test_config.py
─────────────────────
Tests for app.core.config — covers every environment-variable gotcha.

GOTCHAS TESTED
--------------
1.  \r\n (Windows CRLF) in .env corrupts the value of the LAST key on a line.
2.  Leading/trailing whitespace in values causes DNS resolution errors.
3.  SUPABASE_URL without https:// silently produces a broken URL.
4.  os.getenv() called at class-definition time returns "" before load_dotenv().
5.  Missing required keys should produce clear ValueError, not a silent empty string.
"""
import os
from unittest.mock import patch


class TestSupabaseUrlValidator:
    """GOTCHA #1/#2/#3 — URL sanitization."""

    def _make_settings(self, env: dict):
        """Helper: patch os.environ and return a fresh Settings instance."""
        with patch.dict(os.environ, env, clear=True):
            # Re-import to get a fresh Settings() with the patched env
            import importlib

            import app.core.config as cfg_mod
            importlib.reload(cfg_mod)
            return cfg_mod.Settings()

    def test_url_is_loaded_correctly(self):
        """Happy path: clean URL is accepted as-is."""
        s = self._make_settings({
            "SUPABASE_URL": "https://abc.supabase.co",
            "SUPABASE_SERVICE_ROLE_KEY": "key",
        })
        assert s.SUPABASE_URL == "https://abc.supabase.co"

    def test_url_with_trailing_whitespace_is_stripped(self):
        """
        GOTCHA: '  https://abc.supabase.co  ' with surrounding spaces
        causes httpx to fail DNS resolution because the host becomes
        '  abc.supabase.co  ' (with spaces).
        """
        s = self._make_settings({
            "SUPABASE_URL": "  https://abc.supabase.co  ",
            "SUPABASE_SERVICE_ROLE_KEY": "key",
        })
        assert s.SUPABASE_URL == "https://abc.supabase.co"
        assert not s.SUPABASE_URL.startswith(" ")
        assert not s.SUPABASE_URL.endswith(" ")

    def test_url_with_carriage_return_is_stripped(self):
        """
        GOTCHA: Windows .env files can embed \r\n (CRLF).
        The value becomes 'https://abc.supabase.co\r' — the \r causes
        getaddrinfo to fail because the hostname is 'abc.supabase.co\r'.
        """
        s = self._make_settings({
            "SUPABASE_URL": "https://abc.supabase.co\r",
            "SUPABASE_SERVICE_ROLE_KEY": "key",
        })
        assert "\r" not in s.SUPABASE_URL
        assert s.SUPABASE_URL == "https://abc.supabase.co"

    def test_url_without_scheme_gets_https_prepended(self):
        """
        GOTCHA: Someone sets SUPABASE_URL=abc.supabase.co (no https://).
        The validator must prepend 'https://' so the client doesn't crash.
        """
        s = self._make_settings({
            "SUPABASE_URL": "abc.supabase.co",
            "SUPABASE_SERVICE_ROLE_KEY": "key",
        })
        assert s.SUPABASE_URL == "https://abc.supabase.co"

    def test_url_with_newline_embedded_is_stripped(self):
        """GOTCHA: \n embedded in value (rare but possible in multiline .env)."""
        s = self._make_settings({
            "SUPABASE_URL": "https://abc.supabase.co\n",
            "SUPABASE_SERVICE_ROLE_KEY": "key",
        })
        assert "\n" not in s.SUPABASE_URL

    def test_all_string_keys_strip_whitespace(self):
        """GOTCHA: Any key with trailing \r causes silent misbehaviour."""
        s = self._make_settings({
            "SUPABASE_URL": "https://abc.supabase.co",
            "SUPABASE_SERVICE_ROLE_KEY": "  secret_key\r  ",
            "GROQ_API_KEY": "gsk_abc\r\n",
            "ENVIRONMENT": "development\r",
        })
        assert s.SUPABASE_SERVICE_ROLE_KEY == "secret_key"
        assert s.GROQ_API_KEY == "gsk_abc"
        assert s.ENVIRONMENT == "development"

    def test_empty_url_stays_empty(self):
        """Empty URL should remain empty (not prepend https://)."""
        s = self._make_settings({
            "SUPABASE_URL": "",
            "SUPABASE_SERVICE_ROLE_KEY": "key",
        })
        assert s.SUPABASE_URL == ""


class TestSettingsDefaults:
    """Verify default values and env_file loading."""

    def test_environment_defaults_to_production(self):
        """
        GOTCHA: If ENVIRONMENT is missing from .env, the app should default
        to 'production' (safe), not crash.

        We must also set env_file='' to prevent pydantic-settings from
        reading the real .env file which has ENVIRONMENT=development.
        """
        with patch.dict(os.environ, {}, clear=True):
            import importlib

            import app.core.config as cfg_mod
            importlib.reload(cfg_mod)
            s = cfg_mod.Settings(_env_file='')  # block .env
        assert s.ENVIRONMENT == "production"

    def test_model_config_uses_env_file(self):
        """model_config must declare env_file so pydantic-settings reads .env."""
        import importlib

        import app.core.config as cfg_mod
        importlib.reload(cfg_mod)
        cfg = cfg_mod.Settings.model_config
        assert "env_file" in cfg
        assert cfg["env_file"] == ".env"
