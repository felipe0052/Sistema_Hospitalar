from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.aviso import AvisoModel
from app.models.enums import Perfil
from app.models.usuario import UsuarioModel
from app.repositories import aviso_repository
from app.schemas.aviso import AvisoCreate, AvisoUpdate


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
    """Criação de avisos — restrita a Administrador, RH e Marketing (RN08)."""
    return aviso_repository.criar(db, dados, id_autor=usuario_atual.id_usuario)


def _pode_gerenciar(usuario_atual: UsuarioModel, aviso: AvisoModel) -> bool:
    """RN08 — Administrador gerencia qualquer aviso; RH/Marketing só os que
    eles mesmos criaram (comparação por `id_autor`)."""
    if usuario_atual.perfil == Perfil.ADMINISTRADOR:
        return True
    return aviso.id_autor == usuario_atual.id_usuario


def atualizar(db: Session, id_aviso: int, dados: AvisoUpdate, usuario_atual: UsuarioModel) -> AvisoModel:
    aviso = obter(db, id_aviso)
    if not _pode_gerenciar(usuario_atual, aviso):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas o autor do aviso ou um Administrador podem editá-lo",
        )
    return aviso_repository.atualizar(db, aviso, dados)


def remover(db: Session, id_aviso: int, usuario_atual: UsuarioModel) -> None:
    aviso = obter(db, id_aviso)
    if not _pode_gerenciar(usuario_atual, aviso):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas o autor do aviso ou um Administrador podem excluí-lo",
        )
    aviso_repository.remover(db, aviso)
