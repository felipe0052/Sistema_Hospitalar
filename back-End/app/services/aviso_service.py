from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.models import AvisoModel, UsuarioModel
from app.repositories import aviso_repository
from app.schemas.aviso import AvisoCreate


def listar(db: Session, categoria: str | None) -> list[AvisoModel]:
    """Avisos e comunicados ordenados pela data de publicação mais recente."""
    return aviso_repository.listar(db, categoria)


def listar_eventos(db: Session) -> list[AvisoModel]:
    """Avisos cuja categoria seja 'Evento' (treinamentos/ações internas)."""
    return aviso_repository.listar_eventos(db)


def obter(db: Session, id_aviso: int) -> AvisoModel:
    aviso = aviso_repository.obter_por_id(db, id_aviso)
    if aviso is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aviso não encontrado")
    return aviso


def criar(db: Session, dados: AvisoCreate, usuario_atual: UsuarioModel) -> AvisoModel:
    """Criação de avisos — restrito a usuários autenticados."""
    return aviso_repository.criar(db, dados, id_autor=usuario_atual.id_usuario)
