import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


def _split_csv(value: str | None) -> list[str]:
    if not value:
        return []
    return [v.strip() for v in value.split(",") if v.strip()]


def _collect_groq_keys() -> list[str]:
    # Mirrors the Next.js pool: GROQ_API_KEY, GROQ_API_KEY_1 .. GROQ_API_KEY_9
    keys = []
    primary = os.environ.get("GROQ_API_KEY")
    if primary:
        keys.append(primary)
    for i in range(1, 10):
        k = os.environ.get(f"GROQ_API_KEY_{i}")
        if k:
            keys.append(k)
    return keys


class Settings:
    def __init__(self) -> None:
        self.database_url: str = os.environ.get("DATABASE_URL", "")
        self.node_env: str = os.environ.get("NODE_ENV", "development")
        self.is_production: bool = self.node_env == "production"

        self.admin_emails: list[str] = [
            e.lower() for e in _split_csv(os.environ.get("NEXT_PUBLIC_ADMIN_EMAILS"))
        ]

        self.upstash_redis_url: str = os.environ.get("UPSTASH_REDIS_REST_URL", "")
        self.upstash_redis_token: str = os.environ.get("UPSTASH_REDIS_REST_TOKEN", "")

        self.turnstile_secret_key: str = os.environ.get("TURNSTILE_SECRET_KEY", "")

        self.google_client_id: str = os.environ.get("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "")
        self.google_places_key: str = os.environ.get("NEXT_PUBLIC_GOOGLE_PLACES_KEY", "")

        self.groq_api_keys: list[str] = _collect_groq_keys()

        self.r2_account_id: str = os.environ.get("R2_ACCOUNT_ID", "")
        self.r2_access_key_id: str = os.environ.get("R2_ACCESS_KEY_ID", "")
        self.r2_secret_access_key: str = os.environ.get("R2_SECRET_ACCESS_KEY", "")
        self.r2_bucket_name: str = os.environ.get("R2_BUCKET_NAME", "")
        self.r2_public_url: str = os.environ.get("R2_PUBLIC_URL", "")

        self.ola_maps_api_key: str = os.environ.get("OLA_MAPS_API_KEY", "")

        # Session cookie contract — must match what Next.js set historically
        self.session_cookie_name: str = "brewplans_session"
        self.session_ttl_days: int = 30

        # Daily per-user API quota (matches Next.js proxy routes)
        self.daily_api_quota: int = 150

    def is_admin_email(self, email: str | None) -> bool:
        if not email:
            return False
        return email.lower() in self.admin_emails


@lru_cache
def get_settings() -> Settings:
    return Settings()
