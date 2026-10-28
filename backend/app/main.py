from pathlib import Path

from fastapi import Depends, FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app import models  # noqa: F401
from app.core.config import settings
from app.core.database import Base, engine, get_db
from app.core.exceptions import registrar_exception_handlers
from app.routers import api_router

# Se estiver rodando em SQLite local (desenvolvimento sem container Oracle), garante tabelas criadas.
if settings.DATABASE_URL.startswith("sqlite"):
    Base.metadata.create_all(bind=engine)

Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="Intranet Hospitalar Decós Corporativa — API",
    description="API REST para autenticação, controle de acesso e módulos corporativos do Hospital Decós.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
    expose_headers=["Content-Disposition"],
)


@app.middleware("http")
async def adicionar_headers_seguranca(request: Request, call_next) -> Response:
    response: Response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    return response


registrar_exception_handlers(app)


@app.get("/api/v1/health", tags=["Saúde"])
def health_check(db: Session = Depends(get_db)) -> dict[str, str]:
    """Verifica a saúde da API e a conectividade com o banco de dados (§7.11)."""
    bind = db.get_bind()
    eh_sqlite = bind.dialect.name == "sqlite" if bind is not None else settings.DATABASE_URL.startswith("sqlite")
    sql = "SELECT 1" if eh_sqlite else "SELECT 1 FROM DUAL"
    db.execute(text(sql))
    return {"status": "ok", "banco": "ok"}


app.include_router(api_router, prefix="/api/v1")
