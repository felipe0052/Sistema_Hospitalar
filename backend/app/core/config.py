from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "oracle+oracledb://decos:decos123@localhost:1521/?service_name=FREEPDB1"
    JWT_SECRET: str = "troque-por-um-valor-grande-e-aleatorio"
    JWT_EXPIRES_MINUTES: int = 480
    CORS_ORIGINS: str = "http://localhost:5173"
    UPLOAD_DIR: str = "./uploads"
    UPLOAD_MAX_MB: int = 20
    STORAGE_BACKEND: str = "local"

    # Object Storage S3 / OCI (Semana 3/4)
    S3_ENDPOINT_URL: str = ""
    S3_BUCKET: str = "intranet-decos-pops"
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_REGION: str = "sa-saopaulo-1"

    # Semanas 5-6
    GEMINI_API_KEY: str = ""
    IA_MODELO_CHAT: str = "gemini-2.5-flash"
    IA_MODELO_EMBEDDING: str = "gemini-embedding-001"
    IA_TIMEOUT_SEGUNDOS: int = 20

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
