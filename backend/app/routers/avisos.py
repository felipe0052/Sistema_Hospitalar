from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_optional_user, require_roles
from app.models.usuario import Usuario
from app.schemas.aviso import (
    AvisoIn,
    AvisoOut,
    PaginadoAvisosOut,
    PaginadoAvisosResumoOut,
)
from app.services import aviso_service

router = APIRouter(prefix="/avisos", tags=["Avisos e Notícias"])


@router.get("", response_model=PaginadoAvisosResumoOut)
def listar_avisos(
    busca: str | None = Query(default=None, description="Busca por título ou conteúdo"),
    categoria: str | None = Query(
        default=None,
        description="Filtro por categoria (NOTICIA, COMUNICADO, PROMOCAO, MUDANCA_SETOR)",
    ),
    destaque: bool | None = Query(default=None, description="Filtro por destaque (true/false)"),
    pagina: int = Query(default=1, ge=1, description="Número da página"),
    tamanho: int = Query(default=20, ge=1, le=100, description="Itens por página (máx. 100)"),
    db: Session = Depends(get_db),
    _usuario_atual: Usuario | None = Depends(get_optional_user),
) -> PaginadoAvisosResumoOut:
    """Lista apenas avisos vigentes com paginação e filtros (UC05)."""
    return aviso_service.listar_avisos(
        db=db,
        busca=busca,
        categoria=categoria,
        destaque=destaque,
        pagina=pagina,
        tamanho=tamanho,
    )


@router.get("/gestao", response_model=PaginadoAvisosOut)
def listar_avisos_gestao(
    busca: str | None = Query(default=None, description="Busca por título ou conteúdo"),
    categoria: str | None = Query(
        default=None,
        description="Filtro por categoria (NOTICIA, COMUNICADO, PROMOCAO, MUDANCA_SETOR)",
    ),
    destaque: bool | None = Query(default=None, description="Filtro por destaque (true/false)"),
    incluir_expirados: bool = Query(
        default=False,
        description="Se true, inclui avisos cuja data de expiração já venceu",
    ),
    pagina: int = Query(default=1, ge=1, description="Número da página"),
    tamanho: int = Query(default=20, ge=1, le=100, description="Itens por página (máx. 100)"),
    db: Session = Depends(get_db),
    _gestor: Usuario = Depends(require_roles("ADMIN", "RH", "MARKETING")),
) -> PaginadoAvisosOut:
    """Lista avisos para gestão corporativa, permitindo incluir expirados (UC04)."""
    return aviso_service.listar_avisos_gestao(
        db=db,
        busca=busca,
        categoria=categoria,
        destaque=destaque,
        incluir_expirados=incluir_expirados,
        pagina=pagina,
        tamanho=tamanho,
    )


@router.get("/{id_aviso}", response_model=AvisoOut)
def obter_aviso(
    id_aviso: int,
    db: Session = Depends(get_db),
    usuario_atual: Usuario | None = Depends(get_optional_user),
) -> AvisoOut:
    """Obtém os detalhes completos de um aviso pelo ID (UC05)."""
    return aviso_service.obter_aviso(db, id_aviso, usuario_atual)


@router.post("", response_model=AvisoOut, status_code=status.HTTP_201_CREATED)
def criar_aviso(
    payload: AvisoIn,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(require_roles("ADMIN", "RH", "MARKETING")),
) -> AvisoOut:
    """Publica um novo aviso ou notícia no mural (UC04)."""
    return aviso_service.criar_aviso(db, payload, usuario_atual)


@router.put("/{id_aviso}", response_model=AvisoOut)
def atualizar_aviso(
    id_aviso: int,
    payload: AvisoIn,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(require_roles("ADMIN", "RH", "MARKETING")),
) -> AvisoOut:
    """Atualiza um aviso existente (UC04)."""
    return aviso_service.atualizar_aviso(db, id_aviso, payload, usuario_atual)


@router.delete("/{id_aviso}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_aviso(
    id_aviso: int,
    db: Session = Depends(get_db),
    _usuario_atual: Usuario = Depends(require_roles("ADMIN", "RH", "MARKETING")),
) -> Response:
    """Exclui fisicamente um aviso do mural (UC04)."""
    aviso_service.excluir_aviso(db, id_aviso)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
