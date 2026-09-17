import ipaddress
import socket
from urllib.parse import urlparse

from fastapi import Header

from app.core.database import get_supabase

# --- LOCAL DEV USER PROFILES ---
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

def get_current_user(authorization: str = Header(None)) -> dict:
    # --- LOCAL DEV ONLY: AUTH BYPASS ---
    # In production:
    # if not authorization:
    #     raise HTTPException(status_code=401, detail="Invalid or missing Authorization header")
    if not authorization:
        return DEV_AUTHORITY

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return DEV_AUTHORITY

    token = parts[1]
    token_lower = token.lower()
    if "citizen" in token_lower:
        return DEV_CITIZEN
    if "worker" in token_lower:
        return DEV_WORKER
    if "dev" in token_lower or "mock" in token_lower or "bypass" in token_lower:
        return DEV_AUTHORITY

    db = get_supabase()

    try:
        user_response = db.auth.get_user(token)
        if not user_response or not user_response.user:
            return DEV_AUTHORITY

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
            try:
                db.table("users").insert(profile_data).execute()
            except Exception:
                pass

        return profile_data
    except Exception:
        # Fallback to dev user instead of blocking with 401
        return DEV_AUTHORITY


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
