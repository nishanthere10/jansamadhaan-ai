"""
tests/test_logging.py
──────────────────────
Tests for app.core.logging_config and app.core.middleware.

GOTCHAS TESTED
--------------
1.  configure_logging() must clear any handlers set by uvicorn/basicConfig
    to prevent duplicate log lines.
2.  RequestIdFilter injects request_id into every log record.
3.  request_id_var must be reset after each request (no bleed-over).
4.  X-Request-ID header is echoed in the response.
5.  Caller-supplied X-Request-ID is honoured (not overwritten).
6.  Slow/erroring endpoints: latency is still logged even on exception.
7.  Noisy third-party loggers (httpx, supabase) are silenced to WARNING.
"""
import logging
import pytest
from unittest.mock import patch, MagicMock


class TestConfigureLogging:

    def test_removes_existing_handlers_before_adding_new_ones(self):
        """
        GOTCHA #1: uvicorn adds its own StreamHandler before our configure_logging
        runs. Without clearing, every log line appears twice.
        """
        root = logging.getLogger()
        # Simulate uvicorn pre-installing a handler
        dummy = logging.StreamHandler()
        root.addHandler(dummy)
        initial_count = len(root.handlers)

        from app.core.logging_config import configure_logging
        configure_logging(level="INFO", dev=False)

        assert len(root.handlers) == 1, (
            f"Expected exactly 1 handler after configure_logging, "
            f"got {len(root.handlers)} (started with {initial_count})"
        )

    def test_dev_mode_sets_debug_level(self):
        """In dev mode, handler level should be DEBUG."""
        from app.core.logging_config import configure_logging
        configure_logging(level="DEBUG", dev=True)
        root = logging.getLogger()
        assert root.handlers[0].level == logging.DEBUG

    def test_noisy_loggers_are_silenced(self):
        """GOTCHA #7: httpx, supabase, httpcore must be WARNING or above."""
        from app.core.logging_config import configure_logging
        configure_logging(level="INFO", dev=False)

        for name in ("httpx", "httpcore", "supabase", "gotrue", "postgrest"):
            lvl = logging.getLogger(name).level
            assert lvl >= logging.WARNING, (
                f"Logger '{name}' level is {lvl}, expected >= WARNING (30). "
                "This will flood logs with Supabase HTTP request/response noise."
            )

    def test_request_id_filter_injects_default(self):
        """GOTCHA #2: Filter adds request_id='-' when no ID is set."""
        from app.core.logging_config import RequestIdFilter, request_id_var

        # Ensure default
        token = request_id_var.set("-")
        try:
            f = RequestIdFilter()
            record = logging.LogRecord(
                name="test", level=logging.INFO, pathname="", lineno=0,
                msg="hello", args=(), exc_info=None,
            )
            f.filter(record)
            assert record.request_id == "-"
        finally:
            request_id_var.reset(token)

    def test_request_id_filter_injects_set_id(self):
        """GOTCHA #2: Filter reads the current context var value."""
        from app.core.logging_config import RequestIdFilter, request_id_var

        token = request_id_var.set("abc123xyz")
        try:
            f = RequestIdFilter()
            record = logging.LogRecord(
                name="test", level=logging.INFO, pathname="", lineno=0,
                msg="hello", args=(), exc_info=None,
            )
            f.filter(record)
            assert record.request_id == "abc123xyz"
        finally:
            request_id_var.reset(token)


class TestRequestLoggingMiddleware:
    """Integration tests via FastAPI TestClient."""

    @pytest.fixture()
    def app_client(self):
        from app.main import app
        from fastapi.testclient import TestClient
        with patch("app.core.database.get_supabase", return_value=MagicMock()):
            with TestClient(app, raise_server_exceptions=False) as c:
                yield c

    def test_x_request_id_is_present_in_response(self, app_client):
        """GOTCHA #4: Middleware must echo X-Request-ID in every response."""
        res = app_client.get("/health")
        assert "x-request-id" in res.headers, (
            "X-Request-ID header missing from response — "
            "makes distributed tracing impossible"
        )

    def test_caller_request_id_is_honoured(self, app_client):
        """GOTCHA #5: If client sends X-Request-ID, server must use it (not overwrite)."""
        custom_id = "my-trace-001"
        res = app_client.get("/health", headers={"X-Request-ID": custom_id})
        assert res.headers.get("x-request-id") == custom_id

    def test_generated_request_id_is_non_empty(self, app_client):
        """When no X-Request-ID is sent, middleware generates one."""
        res = app_client.get("/health")
        rid = res.headers.get("x-request-id", "")
        assert len(rid) > 0

    def test_request_id_does_not_bleed_across_requests(self, app_client):
        """
        GOTCHA #3: context var must be reset via token.reset() after each request.
        If it bleeds, request A's ID shows up in request B's logs.
        """
        res1 = app_client.get("/health")
        res2 = app_client.get("/health")
        id1 = res1.headers.get("x-request-id")
        id2 = res2.headers.get("x-request-id")
        assert id1 != id2, (
            "Both requests got the same X-Request-ID — "
            "context var is leaking between requests"
        )

    def test_latency_is_logged_even_on_404(self, app_client, caplog):
        """GOTCHA #6: Even on 404 the departure log with latency must be emitted."""
        with caplog.at_level(logging.WARNING, logger="app.core.middleware"):
            app_client.get("/this-does-not-exist")
        # At minimum a warning-level departure log should be present
        assert any("404" in r.message or "this-does-not-exist" in r.message
                   for r in caplog.records), (
            "No log record found for 404 response — latency is not being logged"
        )
