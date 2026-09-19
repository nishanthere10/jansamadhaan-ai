from pydantic import field_validator
from pydantic_settings import BaseSettings


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
    GROQ_MODEL: str = "qwen/qwen3.8-27b"
    GROQ_VISION_MODEL: str = "llama-3.2-11b-vision-preview"

    # Gemini Flash (Vision & Multimodal on Free Tier)
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"

    # App
    ENVIRONMENT: str = "production"

    # ── Auth hardening ────────────────────────────────────────────────────────
    # DEV_AUTH_BYPASS enables the development-only canned-user bypass in
    # app/core/security.py. It is honoured ONLY when ENVIRONMENT != "production".
    # Production always requires a real Supabase JWT, regardless of this flag.
    DEV_AUTH_BYPASS: bool = False

    @property
    def is_production(self) -> bool:
        """Single source of truth for production-only restrictions.

        Demo data and demo-only shortcuts are gated on this rather than on a
        scattered comparison, so an unset ENVIRONMENT (which defaults to
        production) can never enable them.
        """
        return self.ENVIRONMENT.strip().lower() == "production"

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
        "GROQ_MODEL",
        "GROQ_VISION_MODEL",
        "GEMINI_API_KEY",
        "GEMINI_MODEL",
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
