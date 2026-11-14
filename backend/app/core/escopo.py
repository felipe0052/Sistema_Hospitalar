from sqlalchemy.orm import Session

from app.models.setor import Setor
from app.models.usuario import Usuario

PERFIS_VISAO_TOTAL = ("ADMIN", "RH")


def setores_liderados(db: Session, usuario: Usuario) -> list[int]:
    """Retorna os IDs dos setores liderados pelo usuário."""
    return [s for (s,) in db.query(Setor.id_setor).filter(Setor.id_lider == usuario.id_usuario).all()]


def listar_setores_liderados(db: Session, usuario: Usuario) -> list[Setor]:
    """Retorna os setores (ordenados por nome) liderados pelo usuário."""
    return (
        db.query(Setor)
        .filter(Setor.id_lider == usuario.id_usuario)
        .order_by(Setor.nome.asc())
        .all()
    )
