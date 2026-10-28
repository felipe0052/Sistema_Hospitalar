"""Regras de negócio de Aniversariantes do Mês (UC11 — §7.6 e S4-T1)."""

from datetime import date, datetime
import unicodedata
from zoneinfo import ZoneInfo

from sqlalchemy import extract
from sqlalchemy.orm import Session, joinedload

from app.models.usuario import Usuario
from app.schemas.aniversariante import AniversarianteOut, SetorAniversarianteOut

FUSO_BRASIL = ZoneInfo("America/Sao_Paulo")


def obter_hoje_brasil() -> date:
    return datetime.now(FUSO_BRASIL).date()


def _sem_acentos(texto: str | None) -> str:
    if not texto:
        return ""
    nfkd = unicodedata.normalize("NFKD", str(texto))
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower()


def listar_aniversariantes(
    db: Session,
    mes: int | None = None,
    dia: int | None = None,
    id_setor: int | None = None,
    busca: str | None = None,
    referencia: date | None = None,
) -> list[AniversarianteOut]:
    """
    Lista colaboradores ativos que fazem aniversário no mês informado (UC11).
    Por privacidade obrigatória, nunca retorna ano de nascimento nem idade.
    """
    hoje = referencia or obter_hoje_brasil()
    mes_alvo = mes if mes is not None else hoje.month

    query = (
        db.query(Usuario)
        .options(joinedload(Usuario.setor))
        .filter(
            Usuario.status == "ATIVO",
            Usuario.data_nascimento.is_not(None),
            extract("month", Usuario.data_nascimento) == mes_alvo,
        )
    )

    if dia is not None:
        query = query.filter(extract("day", Usuario.data_nascimento) == dia)

    if id_setor is not None:
        query = query.filter(Usuario.id_setor == id_setor)

    usuarios = query.all()

    if busca and busca.strip():
        termo_norm = _sem_acentos(busca.strip())
        usuarios = [u for u in usuarios if termo_norm in _sem_acentos(u.nome)]

    usuarios.sort(
        key=lambda u: (
            u.data_nascimento.day if u.data_nascimento else 32,
            _sem_acentos(u.nome),
            u.id_usuario,
        )
    )

    return [
        AniversarianteOut(
            id_usuario=u.id_usuario,
            nome=u.nome,
            cargo=u.cargo,
            setor=(
                SetorAniversarianteOut(id_setor=u.setor.id_setor, nome=u.setor.nome)
                if u.setor is not None
                else None
            ),
            dia=u.data_nascimento.day,
            mes=u.data_nascimento.month,
            aniversario_hoje=(
                u.data_nascimento.day == hoje.day and u.data_nascimento.month == hoje.month
            ),
        )
        for u in usuarios
        if u.data_nascimento is not None
    ]
