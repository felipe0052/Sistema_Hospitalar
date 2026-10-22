import unicodedata

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(settings.DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)


def _sem_acentos(texto: str | None) -> str:
    if not texto:
        return ""
    nfkd = unicodedata.normalize("NFKD", str(texto))
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower()


@event.listens_for(engine, "connect")
def _ajustar_sessao_oracle(dbapi_conn, _):
    if settings.DATABASE_URL.startswith("sqlite"):
        # Em ambiente local/testes SQLite, registra função auxiliar e LIKE sem diferenciar maiúsculas/acentos
        dbapi_conn.create_function("SEM_ACENTOS", 1, _sem_acentos)

        def _sqlite_like(pattern: str | None, value: str | None) -> bool:
            if pattern is None or value is None:
                return False
            pat = _sem_acentos(pattern)
            val = _sem_acentos(value)
            if pat.startswith("%") and pat.endswith("%"):
                return pat.strip("%") in val
            if pat.startswith("%"):
                return val.endswith(pat.lstrip("%"))
            if pat.endswith("%"):
                return val.startswith(pat.rstrip("%"))
            return val == pat

        dbapi_conn.create_function("like", 2, _sqlite_like)
        return

    cur = dbapi_conn.cursor()
    # Comparações e LIKE sem diferenciar maiúsculas/acentos
    cur.execute("ALTER SESSION SET NLS_COMP=LINGUISTIC NLS_SORT=BINARY_AI")
    cur.execute("ALTER SESSION SET TIME_ZONE='America/Sao_Paulo'")
    cur.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
