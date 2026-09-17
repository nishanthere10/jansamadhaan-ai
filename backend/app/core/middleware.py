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
