from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""

    # Twilio
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""

    # Groq
    GROQ_API_KEY: str = ""

    # App
    ENVIRONMENT: str = "production"

    # ── Validators ─────────────────────────────────────────────────────────────
    @field_validator("SUPABASE_URL", mode="before")
    @classmethod
    def clean_supabase_url(cls, v: str) -> str:
        """Strip whitespace/newlines and ensure https:// prefix."""
        v = str(v).strip()
        if v and not v.startswith("https://"):
            v = "https://" + v
        return v

    @field_validator(
        "SUPABASE_SERVICE_ROLE_KEY",
        "SUPABASE_ANON_KEY",
        "SUPABASE_JWT_SECRET",
        "GROQ_API_KEY",
        "TWILIO_ACCOUNT_SID",
        "TWILIO_AUTH_TOKEN",
        "TWILIO_PHONE_NUMBER",
        "ENVIRONMENT",
        mode="before",
    )
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return str(v).strip()

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
