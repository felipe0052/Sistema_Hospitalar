"""Endpoints da Central de Ajuda e FAQ — Perguntas Frequentes (UC09 — §7.8 e S3-T2)."""

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_optional_user, require_roles
from app.models.usuario import Usuario
from app.schemas.faq import FaqCategoriaGrupoOut, FaqIn, FaqOut
from app.services import faq_service

router = APIRouter(prefix="/faq", tags=["FAQ (Perguntas Frequentes)"])


@router.get("", response_model=list[FaqCategoriaGrupoOut])
def listar_faqs(
    busca: str | None = Query(
        default=None,
        description="Busca textual em perguntas e respostas (sem diferenciar maiúsculas/acentos)",
    ),
    categoria: str | None = Query(default=None, description="Filtro por categoria"),
    db: Session = Depends(get_db),
    _usuario_atual: Usuario | None = Depends(get_optional_user),
) -> list[FaqCategoriaGrupoOut]:
    """Lista perguntas frequentes agrupadas por categoria em ordem alfabética (UC09)."""
    return faq_service.listar_faqs(db=db, busca=busca, categoria=categoria)


@router.get("/categorias", response_model=list[str])
def listar_categorias_faq(
    db: Session = Depends(get_db),
    _usuario_atual: Usuario | None = Depends(get_optional_user),
) -> list[str]:
    """Retorna a lista de categorias distintas de FAQ em ordem alfabética (§7.8)."""
    return faq_service.listar_categorias_faq(db)


@router.post("", response_model=FaqOut, status_code=status.HTTP_201_CREATED)
def criar_faq(
    payload: FaqIn,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(require_roles("ADMIN", "RH")),
) -> FaqOut:
    """Cadastra uma nova pergunta frequente na Central de Ajuda (Admin e RH — §5.1 e S3-T2)."""
    return faq_service.criar_faq(db, payload, usuario_atual)


@router.put("/{id_faq}", response_model=FaqOut)
def atualizar_faq(
    id_faq: int,
    payload: FaqIn,
    db: Session = Depends(get_db),
    _usuario_atual: Usuario = Depends(require_roles("ADMIN", "RH")),
) -> FaqOut:
    """Atualiza uma pergunta frequente existente (Admin e RH — §5.1 e S3-T2)."""
    return faq_service.atualizar_faq(db, id_faq, payload)


@router.delete("/{id_faq}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_faq(
    id_faq: int,
    db: Session = Depends(get_db),
    _usuario_atual: Usuario = Depends(require_roles("ADMIN", "RH")),
) -> Response:
    """Exclui uma pergunta frequente (Admin e RH — §5.1 e S3-T2)."""
    faq_service.excluir_faq(db, id_faq)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
