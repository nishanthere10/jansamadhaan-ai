import ipaddress
import logging
import secrets
import socket
import time
from urllib.parse import urlparse

from fastapi import Header, HTTPException

from app.core.config import settings
from app.core.database import get_supabase

logger = logging.getLogger(__name__)

# --- LOCAL DEV USER PROFILES -------------------------------------------------
# Used ONLY when the explicit development bypass is enabled:
#   ENVIRONMENT != "production" AND DEV_AUTH_BYPASS=true
# Production NEVER returns these profiles: missing/invalid tokens → HTTP 401.
DEV_AUTHORITY = {
    "id": "385ca672-ef17-4ff3-a2f2-ae2077b4feb5",
    "email": "nishantshetty321@gmail.com",
    "full_name": "Nishant Shetty",
    "role": "authority",
    "department": "Ministry of Housing and Urban Affairs",
    "phone": "+919876543210",
    "is_verified": True,
    "trust_score": 100
}

DEV_CITIZEN = {
    "id": "0cc48132-66d1-4231-af22-c142192006e5",
    "email": "ganeshshetty621976@gmail.com",
    "full_name": "Ganesh Shetty",
    "role": "citizen",
    "phone": "+919876543211",
    "is_verified": True,
    "trust_score": 85
}

DEV_WORKER = {
    "id": "bf1ffc54-5145-4f24-bba8-ff5ebf8936f3",
    "email": "meinhusinger12@gmail.com",
    "full_name": "Ravi Kumar",
    "role": "worker",
    "department": "Public Works (PWD)",
    "phone": "+919876543212",
    "is_verified": True,
    "trust_score": 90
}

# Maps explicit dev-only bearer tokens to canned profiles. Honoured ONLY when
# the dev bypass gate below is open. Token *substring* matching is banned:
# production must never interpret "citizen"/"worker"/"dev"/"mock"/"bypass"
# inside an arbitrary token as an authenticated identity.
_DEV_TOKEN_MAP = {
    "dev-authority-token": DEV_AUTHORITY,
    "dev-citizen-token": DEV_CITIZEN,
    "dev-worker-token": DEV_WORKER,
    "dev-bypass-token": DEV_AUTHORITY,
}


def is_dev_bypass_enabled() -> bool:
    """True only when local development bypass is explicitly enabled.

    Requires BOTH:
      ENVIRONMENT != "production"  AND  DEV_AUTH_BYPASS=true
    Production therefore can never activate the bypass, even if the flag is
    accidentally set — the environment check dominates.
    """
    return settings.ENVIRONMENT.strip().lower() != "production" and bool(settings.DEV_AUTH_BYPASS)


_DEV_SESSIONS: dict[str, tuple[float, dict]] = {}


def issue_dev_session(profile: dict) -> str:
    """Issue a short-lived opaque session for the single-process Aadhaar demo."""
    if not is_dev_bypass_enabled():
        raise HTTPException(status_code=403, detail="Demo login is disabled")
    now = time.monotonic()
    for token, (expires, _) in list(_DEV_SESSIONS.items()):
        if expires <= now:
            del _DEV_SESSIONS[token]
    if len(_DEV_SESSIONS) >= 1000:
        raise HTTPException(status_code=503, detail="Demo session capacity reached")
    token = secrets.token_urlsafe(32)
    _DEV_SESSIONS[token] = (now + 3600, {**profile, "role": "citizen"})
    return token


def _dev_bypass_user(token: str | None) -> dict | None:
    """Exact canned tokens or server-issued demo sessions; no substring matching."""
    if token is None:
        return None
    if token in _DEV_TOKEN_MAP:
        return dict(_DEV_TOKEN_MAP[token])
    session = _DEV_SESSIONS.get(token)
    if session and session[0] > time.monotonic():
        return dict(session[1])
    _DEV_SESSIONS.pop(token, None)
    return None


def get_current_user(authorization: str = Header(None)) -> dict:
    """Resolve the caller from a Supabase JWT.

    Production behaviour:
      missing header → 401, malformed header → 401,
      invalid/expired token or lookup failure → 401.
    A valid Supabase JWT resolves via ``db.auth.get_user(token)`` and the
    ``public.users`` profile row (auto-provisioned as citizen when absent).
    Endpoint-level RBAC maps to 403 — never 401 — for wrong roles.

    Development behaviour: when :func:`is_dev_bypass_enabled` is True, exact
    dev tokens (see ``_DEV_TOKEN_MAP``) resolve to canned profiles so local
    development works without Supabase Auth. Any other token still goes
    through real verification.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid or malformed Authorization header")

    token = parts[1].strip()

    # Explicit dev bypass (exact token match only — never substring matching).
    if is_dev_bypass_enabled():
        dev_user = _dev_bypass_user(token)
        if dev_user is not None:
            logger.warning("DEV_AUTH_BYPASS active: dev token accepted")
            return dev_user

    try:
        db = get_supabase()
        user_response = db.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        # Fetch profile safely without throwing PGRST116
        profile_res = db.table("users").select("*").eq("id", user_response.user.id).execute()
        profile_data = profile_res.data[0] if profile_res.data else None

        if not profile_data:
            # Auto-provision missing profile row
            user_email = user_response.user.email or ""
            profile_data = {
                "id": user_response.user.id,
                "full_name": user_email.split("@")[0].capitalize() if user_email else "Citizen",
                "email": user_email,
                "role": "citizen"
            }
            db.table("users").insert(profile_data).execute()

        if profile_data.get("id") != user_response.user.id:
            raise HTTPException(status_code=401, detail="Invalid user profile")
        if profile_data.get("role") not in {"citizen", "worker", "authority"}:
            raise HTTPException(status_code=403, detail="Account role is not authorized")
        return profile_data
    except HTTPException:
        raise
    except Exception as exc:
        # AuthN failure: invalid/expired token, lookup error — never a bypass.
        logger.warning(f"Authentication failed: {exc}")
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc


def is_safe_image_url(url: str) -> bool:
    """Validate that an image URL targets a public web resource and prevent SSRF."""
    if not url or not isinstance(url, str):
        return False
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        hostname = parsed.hostname
        if not hostname:
            return False
        # Block localhost and private IP addresses
        if hostname.lower() in ("localhost", "127.0.0.1", "::1"):
            return False
        ip_str = socket.gethostbyname(hostname)
        ip = ipaddress.ip_address(ip_str)
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_reserved:
            return False
        return True
    except Exception:
        return False
