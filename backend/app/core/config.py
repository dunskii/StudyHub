"""Application configuration."""
import logging
from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

# Minimum secret key length for production
MIN_SECRET_KEY_LENGTH = 32


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Database
    database_url: str
    test_database_url: str | None = None

    # Redis (optional - for production rate limiting, caching)
    redis_url: str | None = None

    # Supabase Auth
    supabase_url: str = "https://placeholder.supabase.co"
    supabase_anon_key: str = "placeholder"
    supabase_service_key: str = ""

    # Anthropic Claude API
    anthropic_api_key: str = ""

    # Google Cloud Vision (OCR)
    gcp_project_id: str = ""
    gcp_vision_key: str = ""

    # Application
    secret_key: str = "dev-secret-key-change-in-production"
    environment: Literal["development", "staging", "production"] = "development"
    debug: bool = False
    allowed_origins_str: str = "http://localhost:5173,http://localhost:3000"

    # Rate Limiting
    rate_limit_per_minute: int = 60

    # Pagination
    max_page_number: int = 1000  # Prevent expensive offset queries

    # Logging
    log_level: str = "INFO"

    @property
    def allowed_origins(self) -> list[str]:
        """Parse allowed_origins from comma-separated string."""
        return [origin.strip() for origin in self.allowed_origins_str.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        """Check if running in production."""
        return self.environment == "production"

    def validate_for_production(self) -> list[str]:
        """Validate settings for production deployment.

        Returns:
            List of validation error messages (empty if valid).
        """
        errors: list[str] = []

        # Check secret key length
        if len(self.secret_key) < MIN_SECRET_KEY_LENGTH:
            errors.append(
                f"SECRET_KEY must be at least {MIN_SECRET_KEY_LENGTH} characters "
                f"(current: {len(self.secret_key)})"
            )

        # Check for default/dev secret key
        if "dev" in self.secret_key.lower() or "change" in self.secret_key.lower():
            errors.append(
                "SECRET_KEY appears to be a development key. "
                "Please set a secure random key for production."
            )

        # Check for placeholder Supabase values
        if "placeholder" in self.supabase_url.lower():
            errors.append("SUPABASE_URL contains placeholder value")

        if "placeholder" in self.supabase_anon_key.lower():
            errors.append("SUPABASE_ANON_KEY contains placeholder value")

        # Redis recommended for production (multi-server)
        if not self.redis_url:
            logger.warning(
                "REDIS_URL not configured. Rate limiting will use in-memory storage. "
                "This is not recommended for multi-server deployments."
            )

        return errors


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    # pydantic-settings loads from env vars, not constructor args
    settings = Settings()  # type: ignore[call-arg]

    # Validate production settings on startup
    if settings.is_production:
        errors = settings.validate_for_production()
        if errors:
            error_msg = "Production configuration errors:\n" + "\n".join(f"  - {e}" for e in errors)
            logger.error(error_msg)
            raise ValueError(error_msg)

    return settings
