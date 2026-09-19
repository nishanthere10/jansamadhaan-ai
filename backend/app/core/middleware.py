"""
Request-ID middleware for Jan Samadhan AI.

Injects a unique X-Request-ID header into every request and response,
and propagates it to the logging context variable so all log lines
for a single request share the same ID.
"""
import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging_config import request_id_var

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Per-request middleware that:
    1. Reads or generates a X-Request-ID header.
    2. Sets it on the logging context variable.
    3. Logs method + path on arrival and status + latency on departure.
    4. Echoes the ID in the response headers.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # Use caller-supplied ID or generate a short one
        request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:12]
        token = request_id_var.set(request_id)

        start = time.perf_counter()
        logger.info(
            f"→ {request.method} {request.url.path}"
            + (f"?{request.url.query}" if request.url.query else "")
        )

        try:
            response: Response = await call_next(request)
        except Exception:
            elapsed = (time.perf_counter() - start) * 1000
            logger.exception(
                f"✗ {request.method} {request.url.path} "
                f"UNHANDLED_EXCEPTION [{elapsed:.1f}ms]"
            )
            raise
        finally:
            request_id_var.reset(token)

        elapsed = (time.perf_counter() - start) * 1000
        level = logging.WARNING if response.status_code >= 400 else logging.INFO
        logger.log(
            level,
            f"← {request.method} {request.url.path} "
            f"{response.status_code} [{elapsed:.1f}ms]",
        )

        response.headers["X-Request-ID"] = request_id
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Enforces browser security headers:
    - X-Content-Type-Options: nosniff
    - X-Frame-Options: DENY
    - Referrer-Policy: strict-origin-when-cross-origin
    - X-XSS-Protection: 1; mode=block
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    In-memory sliding-window rate limiter for sensitive endpoints:
    - /api/v1/auth/login: max 10 req/min per client IP
    - /api/v1/auth/signup: max 5 req/min per client IP
    - /api/v1/ai/classify: max 20 req/min per client IP
    """

    RATE_LIMITS = {
        "/api/v1/auth/login": (10, 60),
        "/api/v1/auth/signup": (5, 60),
        "/api/v1/ai/classify": (20, 60),
    }

    def __init__(self, app):
        import collections
        super().__init__(app)
        self._history: dict[str, collections.deque[float]] = collections.defaultdict(collections.deque)

    def _get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            # First IP in comma-separated list is the original client
            return forwarded.split(",")[0].strip()
        if request.client:
            return request.client.host
        return "unknown"

    def _evict_stale_entries(self, now: float) -> None:
        """Prevent unbounded memory growth by pruning expired client buckets."""
        if len(self._history) > 1000:
            stale_keys = [
                key for key, timestamps in self._history.items()
                if not timestamps or now - timestamps[-1] > 120
            ]
            for key in stale_keys:
                del self._history[key]

    async def dispatch(self, request: Request, call_next) -> Response:
        import os
        from starlette.responses import JSONResponse

        # Bypass during automated pytest runs unless explicitly testing rate limiting
        if os.getenv("PYTEST_CURRENT_TEST") and not request.headers.get("X-Test-Rate-Limit"):
            return await call_next(request)

        path = request.url.path
        if request.method == "POST":
            for prefix, (max_reqs, window) in self.RATE_LIMITS.items():
                if path == prefix or path.startswith(prefix + "/"):
                    now = time.monotonic()
                    self._evict_stale_entries(now)

                    client_ip = self._get_client_ip(request)
                    key = f"{client_ip}:{prefix}"
                    timestamps = self._history[key]

                    # Remove entries outside the sliding window
                    while timestamps and now - timestamps[0] > window:
                        timestamps.popleft()

                    if len(timestamps) >= max_reqs:
                        retry_after = int(window - (now - timestamps[0])) + 1
                        logger.warning(
                            f"[RateLimit] Client {client_ip} exceeded limit on {path} "
                            f"({len(timestamps)}/{max_reqs} in {window}s)"
                        )
                        return JSONResponse(
                            status_code=429,
                            content={
                                "detail": "Too many requests. Please slow down.",
                                "retry_after": max(1, retry_after)
                            },
                            headers={"Retry-After": str(max(1, retry_after))}
                        )

                    timestamps.append(now)
                    break

        return await call_next(request)
