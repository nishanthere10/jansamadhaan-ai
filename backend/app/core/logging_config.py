"""
Structured logging configuration for Jan Samadhan AI backend.

Features
--------
- ISO-8601 timestamps
- Log level coloring in dev mode (ENVIRONMENT=development)
- Consistent format: timestamp | level | logger | request_id | message
- Suppresses noisy third-party loggers (httpx, httpcore, supabase)
"""
import logging
import sys
from contextvars import ContextVar

# Request-ID context variable — populated by middleware on every request
request_id_var: ContextVar[str] = ContextVar("request_id", default="-")

# ── ANSI colour codes (dev only) ───────────────────────────────────────────────
_COLOURS = {
    "DEBUG":    "\033[36m",   # cyan
    "INFO":     "\033[32m",   # green
    "WARNING":  "\033[33m",   # yellow
    "ERROR":    "\033[31m",   # red
    "CRITICAL": "\033[35m",   # magenta
}
_RESET = "\033[0m"


class RequestIdFilter(logging.Filter):
    """Injects the current request-ID into every log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get("-")
        return True


class ColourFormatter(logging.Formatter):
    """Coloured formatter for development consoles."""

    FMT = "%(asctime)s | %(levelname)-8s | %(name)s | req=%(request_id)s | %(message)s"

    def format(self, record: logging.LogRecord) -> str:
        colour = _COLOURS.get(record.levelname, "")
        record.levelname = f"{colour}{record.levelname}{_RESET}"
        return super().format(record)


class PlainFormatter(logging.Formatter):
    """Plain formatter for production / log aggregators."""

    FMT = "%(asctime)s | %(levelname)-8s | %(name)s | req=%(request_id)s | %(message)s"


def configure_logging(level: str = "INFO", dev: bool = False) -> None:
    """
    Call once at application startup (before any logger is used).

    Parameters
    ----------
    level:
        Root log level string, e.g. "DEBUG", "INFO", "WARNING".
    dev:
        If True, use colour output and DEBUG-level for the app's own loggers.
    """
    root = logging.getLogger()
    root.setLevel(logging.DEBUG)  # root catches everything; handlers filter

    # Remove any handlers that basicConfig or uvicorn may have added
    root.handlers.clear()

    rid_filter = RequestIdFilter()

    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

    handler = logging.StreamHandler(sys.stdout)
    handler.addFilter(rid_filter)

    if dev:
        fmt = ColourFormatter(ColourFormatter.FMT, datefmt="%Y-%m-%dT%H:%M:%S")
        handler.setLevel(logging.DEBUG)
    else:
        fmt = PlainFormatter(PlainFormatter.FMT, datefmt="%Y-%m-%dT%H:%M:%S")
        handler.setLevel(getattr(logging, level.upper(), logging.INFO))

    handler.setFormatter(fmt)
    root.addHandler(handler)

    # ── Silence noisy third-party libraries ────────────────────────────────────
    # These emit per-request/per-header DEBUG records. `hpack` in particular
    # dumps every HTTP/2 header, which leaked the Supabase `apikey` into logs.
    for noisy in (
        "httpx",
        "httpcore",
        "hpack",
        "hyperframe",
        "urllib3",
        "supabase",
        "gotrue",
        "postgrest",
        "storage3",
        "realtime",
        "asyncio",
    ):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    logging.getLogger(__name__).info(
        f"Logging configured - level={level}, dev={dev}"
    )
