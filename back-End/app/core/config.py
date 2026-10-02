from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    PROJECT_NAME: str = "Intranet Hospitalar Decós Corporativa — API"
    API_V1_PREFIX: str = "/api/v1"

    # Oracle em produção; SQLite por padrão para desenvolvimento local
    # sem instância Oracle disponível (ver spec, seção 5 — handover de
    # credenciais do Oracle DB é um passo futuro).
    DATABASE_URL: str = "sqlite:///./decos_intranet.db"

    SECRET_KEY: str = "troque-esta-chave-em-producao"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:5173"]


settings = Settings()
