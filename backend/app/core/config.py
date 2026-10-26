from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "oracle+oracledb://decos:decos123@localhost:1521/?service_name=FREEPDB1"
    JWT_SECRET: str = "troque-por-um-valor-grande-e-aleatorio"
    JWT_EXPIRES_MINUTES: int = 480
    CORS_ORIGINS: str = "http://localhost:5173"
    UPLOAD_DIR: str = "./uploads"
    UPLOAD_MAX_MB: int = 20
    DOCUMENTOS_MAX_MB: int = 10
    STORAGE_BACKEND: str = "local"

    # Integração Google Agenda (OAuth 2.0). O secret também é lido da variável legada "chave_google".
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = Field(default="", validation_alias=AliasChoices("GOOGLE_CLIENT_SECRET", "chave_google"))
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/google-agenda/callback"
    FRONTEND_URL: str = "http://localhost:5173"

    # Semanas 5-6
    GEMINI_API_KEY: str = ""
    IA_MODELO_CHAT: str = "gemini-2.5-flash"
    IA_MODELO_EMBEDDING: str = "gemini-embedding-001"
    IA_TIMEOUT_SEGUNDOS: int = 20

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
