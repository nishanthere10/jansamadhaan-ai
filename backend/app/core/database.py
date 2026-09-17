import logging
from typing import Optional
from supabase import create_client, Client
from app.core.config import settings

logger = logging.getLogger(__name__)

_supabase_client: Optional[Client] = None


def get_supabase() -> Client:
    """Returns a singleton Supabase service-role client, reusing HTTP connections."""
    global _supabase_client
    if _supabase_client is None:
        url = settings.SUPABASE_URL
        key = settings.SUPABASE_SERVICE_ROLE_KEY

        # Log the URL so we can spot malformed values immediately in server logs
        logger.info(f"[Supabase] Initialising client -> URL='{url}'")

        if not url or not key:
            raise ValueError(
                "Supabase credentials not configured. "
                "Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env"
            )

        if not url.startswith("https://"):
            raise ValueError(
                f"SUPABASE_URL must start with 'https://', got: '{url}'"
            )

        _supabase_client = create_client(url, key)
        logger.info("[Supabase] Client initialised successfully [OK]")

    return _supabase_client


def reset_supabase_client() -> None:
    """Force a fresh client on the next call — useful in tests."""
    global _supabase_client
    _supabase_client = None
