"""Mural de Reconhecimentos e Indicações de colegas (S5-T3)."""

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.usuario import Usuario
from app.schemas.reconhecimento import (
    IndicacaoIn,
    IndicacaoOut,
    PaginadoIndicacoesOut,
    PaginadoReconhecimentosOut,
    ReconhecimentoIn,
    ReconhecimentoOut,
    ReconhecimentoUpdate,
)
from app.services import reconhecimento_service

PERFIS_GESTAO_RECONHECIMENTOS = ("ADMIN", "RH")

router = APIRouter(prefix="/reconhecimentos", tags=["Reconhecimentos"])
router_indicacoes = APIRouter(prefix="/indicacoes", tags=["Indicações de reconhecimento"])


@router.get("", response_model=PaginadoReconhecimentosOut)
def listar_reconhecimentos(
    tipo: str | None = Query(default=None, description="PROMOCAO, DESTAQUE, TEMPO_DE_CASA ou AGRADECIMENTO"),
    id_setor: int | None = Query(default=None, description="Setor do colaborador reconhecido"),
    pagina: int = Query(default=1, ge=1),
    tamanho: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _usuario_atual: Usuario = Depends(get_current_user),
) -> PaginadoReconhecimentosOut:
    """Lista os reconhecimentos publicados, mais recentes primeiro."""
    return reconhecimento_service.listar_reconhecimentos(db, tipo, id_setor, pagina, tamanho)


@router.get("/{id_reconhecimento}", response_model=ReconhecimentoOut)
def obter_reconhecimento(
    id_reconhecimento: int,
    db: Session = Depends(get_db),
    _usuario_atual: Usuario = Depends(get_current_user),
) -> ReconhecimentoOut:
    return reconhecimento_service.obter_reconhecimento(db, id_reconhecimento)


@router.post("", response_model=ReconhecimentoOut, status_code=status.HTTP_201_CREATED)
def criar_reconhecimento(
    payload: ReconhecimentoIn,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(require_roles(*PERFIS_GESTAO_RECONHECIMENTOS)),
) -> ReconhecimentoOut:
    """Publica um reconhecimento (RH/Admin) e gera a notificação interna."""
    return reconhecimento_service.criar_reconhecimento(db, payload, usuario_atual)


@router.put("/{id_reconhecimento}", response_model=ReconhecimentoOut)
def atualizar_reconhecimento(
    id_reconhecimento: int,
    payload: ReconhecimentoUpdate,
    db: Session = Depends(get_db),
    _usuario_atual: Usuario = Depends(require_roles(*PERFIS_GESTAO_RECONHECIMENTOS)),
) -> ReconhecimentoOut:
    return reconhecimento_service.atualizar_reconhecimento(db, id_reconhecimento, payload)


@router.delete("/{id_reconhecimento}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_reconhecimento(
    id_reconhecimento: int,
    db: Session = Depends(get_db),
    _usuario_atual: Usuario = Depends(require_roles(*PERFIS_GESTAO_RECONHECIMENTOS)),
) -> Response:
    reconhecimento_service.excluir_reconhecimento(db, id_reconhecimento)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router_indicacoes.post("", response_model=IndicacaoOut, status_code=status.HTTP_201_CREATED)
def criar_indicacao(
    payload: IndicacaoIn,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
) -> IndicacaoOut:
    """Qualquer usuário logado indica um colega; a indicação vai para análise do RH."""
    return reconhecimento_service.criar_indicacao(db, payload, usuario_atual)


@router_indicacoes.get("/minhas", response_model=list[IndicacaoOut])
def listar_minhas_indicacoes(
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
) -> list[IndicacaoOut]:
    return reconhecimento_service.listar_minhas_indicacoes(db, usuario_atual)


@router_indicacoes.get("", response_model=PaginadoIndicacoesOut)
def listar_indicacoes(
    status_indicacao: str | None = Query(default=None, alias="status", description="PENDENTE, APROVADA ou RECUSADA"),
    pagina: int = Query(default=1, ge=1),
    tamanho: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _gestor: Usuario = Depends(require_roles(*PERFIS_GESTAO_RECONHECIMENTOS)),
) -> PaginadoIndicacoesOut:
    return reconhecimento_service.listar_indicacoes(db, status_indicacao, pagina, tamanho)


@router_indicacoes.post("/{id_indicacao}/recusar", response_model=IndicacaoOut)
def recusar_indicacao(
    id_indicacao: int,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(require_roles(*PERFIS_GESTAO_RECONHECIMENTOS)),
) -> IndicacaoOut:
    return reconhecimento_service.recusar_indicacao(db, id_indicacao, usuario_atual)
