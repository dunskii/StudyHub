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

    # AI Tutoring Configuration
    ai_model_complex: str = "claude-sonnet-4-20250514"  # For tutoring, essay feedback
    ai_model_simple: str = "claude-3-5-haiku-20241022"  # For flashcards, summaries
    ai_max_tokens: int = 2048  # Max response tokens
    ai_conversation_context_limit: int = 10  # Max previous messages to include
    ai_daily_token_limit: int = 50000  # Daily token limit per student
    ai_session_timeout_minutes: int = 30  # Auto-end session after inactivity

    # Google Cloud Vision (OCR)
    gcp_project_id: str = ""
    gcp_vision_key: str = ""  # API key (optional, prefer service account)
    google_application_credentials: str = ""  # Path to service account JSON

    # Digital Ocean Spaces (S3-compatible storage)
    do_spaces_key: str = ""
    do_spaces_secret: str = ""
    do_spaces_bucket: str = "studyhub-notes"
    do_spaces_region: str = "syd1"
    do_spaces_endpoint: str = ""  # e.g., https://syd1.digitaloceanspaces.com

    # Note/OCR Settings
    ocr_enabled: bool = True
    note_max_file_size_mb: int = 10
    note_max_per_student: int = 1000
    note_thumbnail_size: int = 300  # px for thumbnail dimension
    note_max_dimension: int = 2048  # Max px for OCR processing
    note_supported_formats: str = "image/jpeg,image/png,image/heic,application/pdf"
    note_presigned_url_expiry: int = 3600  # Seconds (1 hour)

    @property
    def note_supported_formats_list(self) -> list[str]:
        """Parse supported formats from comma-separated string."""
        return [fmt.strip() for fmt in self.note_supported_formats.split(",") if fmt.strip()]

    @property
    def do_spaces_url(self) -> str:
        """Get the full DO Spaces URL."""
        if self.do_spaces_endpoint:
            return self.do_spaces_endpoint
        return f"https://{self.do_spaces_region}.digitaloceanspaces.com"

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
