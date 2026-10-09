from typing import Optional
from supabase import create_client, Client
from app.core.config import settings

_supabase_client: Optional[Client] = None


def get_supabase_client() -> Optional[Client]:
    """
    Returns an initialized Supabase Python client using service credentials,
    or None if credentials are not configured.
    """
    global _supabase_client
    if _supabase_client is None:
        if (
            settings.SUPABASE_URL
            and settings.SUPABASE_SERVICE_ROLE_KEY
            and not settings.SUPABASE_URL.startswith("https://placeholder")
        ):
            try:
                _supabase_client = create_client(
                    settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY
                )
            except Exception as e:
                print(f"[Warning] Failed to initialize Supabase client: {e}")
                _supabase_client = None
    return _supabase_client
