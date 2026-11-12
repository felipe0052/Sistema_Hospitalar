"""Endpoints do Onboarding Digital do novo colaborador.

Reúne o checklist de integração, as orientações de primeiros atendimentos e o guia
'quem procurar em cada situação'. O mapa do hospital reaproveita o guia de ramais por
andar já existente em `/diretorio/ramais`.
"""

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.usuario import Usuario
from app.schemas.onboarding import (
    ConclusaoIn,
    OnboardingContatoIn,
    OnboardingContatoOut,
    OnboardingItemIn,
    OnboardingItemOut,
    OnboardingOut,
)
from app.services import onboarding_service

router = APIRouter(prefix="/onboarding", tags=["Onboarding Digital"])

GESTORES = ("ADMIN", "RH")


@router.get("", response_model=OnboardingOut)
def obter_onboarding(
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
) -> OnboardingOut:
    """Retorna os dados do colaborador logado, o checklist com o progresso dele e os guias de apoio."""
    return onboarding_service.obter_onboarding(db, usuario_atual)


@router.put("/itens/{id_item}/conclusao", response_model=OnboardingItemOut)
def marcar_item(
    id_item: int,
    payload: ConclusaoIn,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(get_current_user),
) -> OnboardingItemOut:
    """Marca ou desmarca um item como concluído pelo colaborador logado."""
    return onboarding_service.marcar_item(db, usuario_atual, id_item, payload.concluido)


@router.post("/itens", response_model=OnboardingItemOut, status_code=status.HTTP_201_CREATED)
def criar_item(
    payload: OnboardingItemIn,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(require_roles(*GESTORES)),
) -> OnboardingItemOut:
    """Cadastra um item de checklist ou de primeiros atendimentos (Admin e RH)."""
    return onboarding_service.criar_item(db, payload, usuario_atual)


@router.put("/itens/{id_item}", response_model=OnboardingItemOut)
def atualizar_item(
    id_item: int,
    payload: OnboardingItemIn,
    db: Session = Depends(get_db),
    _usuario_atual: Usuario = Depends(require_roles(*GESTORES)),
) -> OnboardingItemOut:
    """Atualiza um item do onboarding (Admin e RH)."""
    return onboarding_service.atualizar_item(db, id_item, payload)


@router.delete("/itens/{id_item}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_item(
    id_item: int,
    db: Session = Depends(get_db),
    _usuario_atual: Usuario = Depends(require_roles(*GESTORES)),
) -> Response:
    """Exclui um item do onboarding e o progresso associado (Admin e RH)."""
    onboarding_service.excluir_item(db, id_item)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/contatos", response_model=OnboardingContatoOut, status_code=status.HTTP_201_CREATED)
def criar_contato(
    payload: OnboardingContatoIn,
    db: Session = Depends(get_db),
    _usuario_atual: Usuario = Depends(require_roles(*GESTORES)),
) -> OnboardingContatoOut:
    """Cadastra uma situação no guia 'quem procurar' (Admin e RH)."""
    return onboarding_service.criar_contato(db, payload)


@router.put("/contatos/{id_contato}", response_model=OnboardingContatoOut)
def atualizar_contato(
    id_contato: int,
    payload: OnboardingContatoIn,
    db: Session = Depends(get_db),
    _usuario_atual: Usuario = Depends(require_roles(*GESTORES)),
) -> OnboardingContatoOut:
    """Atualiza uma situação do guia 'quem procurar' (Admin e RH)."""
    return onboarding_service.atualizar_contato(db, id_contato, payload)


@router.delete("/contatos/{id_contato}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_contato(
    id_contato: int,
    db: Session = Depends(get_db),
    _usuario_atual: Usuario = Depends(require_roles(*GESTORES)),
) -> Response:
    """Remove uma situação do guia 'quem procurar' (Admin e RH)."""
    onboarding_service.excluir_contato(db, id_contato)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
