from datetime import date
import unicodedata

from fastapi.testclient import TestClient
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import gerar_hash_senha
from app.main import app
from app.models.ramal import Ramal
from app.models.setor import Setor
from app.models.usuario import Usuario

# Hashes pré-computados uma única vez por execução de suíte para acelerar os testes
_HASH_ADMIN = gerar_hash_senha("Admin@123")
_HASH_COLAB = gerar_hash_senha("Colab@123")
_HASH_RH = gerar_hash_senha("Rh@12345")
_HASH_MKT = gerar_hash_senha("Mkt@12345")
_HASH_INATIVO = gerar_hash_senha("Inativo@123")


def _sem_acentos(texto: str | None) -> str:
    if not texto:
        return ""
    nfkd = unicodedata.normalize("NFKD", str(texto))
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower()


@pytest.fixture
def db_session() -> Session:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def _registrar_like_sqlite(dbapi_conn, _):
        def _sqlite_like(pattern: str | None, value: str | None) -> bool:
            if pattern is None or value is None:
                return False
            pat = _sem_acentos(pattern)
            val = _sem_acentos(value)
            if pat.startswith("%") and pat.endswith("%"):
                return pat.strip("%") in val
            return val == pat

        dbapi_conn.create_function("like", 2, _sqlite_like)

    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = TestingSessionLocal()

    # Cria setores iniciais e os 5 usuários de teste do §9
    setor_uti = Setor(nome="UTI", andar="2º andar")
    setor_ti = Setor(nome="Tecnologia", andar="4º andar")
    setor_rh = Setor(nome="RH", andar="4º andar")
    session.add_all([setor_uti, setor_ti, setor_rh])
    session.flush()

    session.add(Ramal(numero="2101", descricao="Posto UTI", id_setor=setor_uti.id_setor))

    usuarios = [
        Usuario(
            nome="André Luiz",
            email="admin@decos.com.br",
            senha_hash=_HASH_ADMIN,
            id_setor=setor_ti.id_setor,
            cargo="Administrador de Sistemas",
            data_nascimento=date(1988, 3, 14),
            perfil="ADMIN",
            status="ATIVO",
            versao_token=0,
        ),
        Usuario(
            nome="Carlos Menezes",
            email="colaborador@decos.com.br",
            senha_hash=_HASH_COLAB,
            id_setor=setor_uti.id_setor,
            cargo="Técnico de Enfermagem",
            data_nascimento=date(1997, 10, 21),
            perfil="COLABORADOR",
            status="ATIVO",
            versao_token=0,
        ),
        Usuario(
            nome="Patrícia Nunes",
            email="rh@decos.com.br",
            senha_hash=_HASH_RH,
            id_setor=setor_rh.id_setor,
            cargo="Analista de RH",
            data_nascimento=date(1982, 5, 19),
            perfil="RH",
            status="ATIVO",
            versao_token=0,
        ),
        Usuario(
            nome="Maria Silva",
            email="marketing@decos.com.br",
            senha_hash=_HASH_MKT,
            id_setor=setor_rh.id_setor,
            cargo="Analista de Marketing",
            data_nascimento=date(1999, 8, 9),
            perfil="MARKETING",
            status="ATIVO",
            versao_token=0,
        ),
        Usuario(
            nome="Roberto Inativo",
            email="inativo@decos.com.br",
            senha_hash=_HASH_INATIVO,
            id_setor=setor_uti.id_setor,
            cargo="Auxiliar",
            data_nascimento=date(1991, 1, 30),
            perfil="COLABORADOR",
            status="INATIVO",
            versao_token=0,
        ),
    ]
    session.add_all(usuarios)
    session.commit()

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db_session: Session) -> TestClient:
    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
