from datetime import date

from sqlalchemy.orm import Session

from app.models.setor import SetorModel
from app.models.usuario import UsuarioModel
from app.repositories import usuario_repository


def listar_contatos(db: Session, id_setor: int | None, busca: str | None) -> list[UsuarioModel]:
    """Guia de colaboradores, cargos, setores e ramais (Módulo 3 — Diretório)."""
    return usuario_repository.listar_contatos(db, id_setor, busca)


def listar_aniversariantes(db: Session, mes: int | None, dia: int | None, id_setor: int | None) -> list[UsuarioModel]:
    """Aniversariantes do mês vigente, com filtro opcional por mês, dia e setor."""
    mes_filtro = mes or date.today().month
    return usuario_repository.listar_aniversariantes(db, mes_filtro, dia, id_setor)


def listar_setores(db: Session) -> list[SetorModel]:
    return usuario_repository.listar_setores(db)
