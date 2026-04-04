from supabase import create_client, Client
from app.core.config import settings

def get_supabase() -> Client:
    # Ensure there is a URL and KEY to initialize.
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("Supabase credentials not configured in environment.")
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
