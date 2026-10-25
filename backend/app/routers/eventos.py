from datetime import date

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_optional_user, require_roles
from app.models.usuario import Usuario
from app.schemas.evento import EventoIn, EventoOut
from app.services import evento_service

router = APIRouter(prefix="/eventos", tags=["Eventos"])


@router.get("", response_model=list[EventoOut])
def listar_eventos(
    categoria: str | None = Query(
        default=None,
        description="Filtro por categoria (TREINAMENTO, ACAO_INTERNA, INSTITUCIONAL, OUTRO)",
    ),
    id_setor: int | None = Query(default=None, description="Filtro por setor organizador"),
    data_de: date | None = Query(default=None, description="Data inicial do intervalo (AAAA-MM-DD)"),
    data_ate: date | None = Query(default=None, description="Data final do intervalo (AAAA-MM-DD)"),
    mes: int | None = Query(default=None, ge=1, le=12, description="Mês para visualização em calendário (1–12)"),
    ano: int | None = Query(default=None, ge=2000, le=2100, description="Ano para visualização em calendário"),
    busca: str | None = Query(default=None, description="Busca por título, local ou descrição"),
    db: Session = Depends(get_db),
    _usuario_atual: Usuario | None = Depends(get_optional_user),
) -> list[EventoOut]:
    """Lista eventos corporativos (sem filtro de data retorna apenas eventos futuros — UC12)."""
    return evento_service.listar_eventos(
        db=db,
        categoria=categoria,
        id_setor=id_setor,
        data_de=data_de,
        data_ate=data_ate,
        mes=mes,
        ano=ano,
        busca=busca,
    )


@router.get("/{id_evento}", response_model=EventoOut)
def obter_evento(
    id_evento: int,
    db: Session = Depends(get_db),
    _usuario_atual: Usuario | None = Depends(get_optional_user),
) -> EventoOut:
    """Obtém os detalhes de um evento pelo ID (UC12)."""
    return evento_service.obter_evento(db, id_evento)


@router.post("", response_model=EventoOut, status_code=status.HTTP_201_CREATED)
def criar_evento(
    payload: EventoIn,
    db: Session = Depends(get_db),
    usuario_atual: Usuario = Depends(require_roles("ADMIN", "MARKETING")),
) -> EventoOut:
    """Cadastra um novo evento corporativo na agenda (UC12)."""
    return evento_service.criar_evento(db, payload, usuario_atual)


@router.put("/{id_evento}", response_model=EventoOut)
def atualizar_evento(
    id_evento: int,
    payload: EventoIn,
    db: Session = Depends(get_db),
    _usuario_atual: Usuario = Depends(require_roles("ADMIN", "MARKETING")),
) -> EventoOut:
    """Atualiza os dados de um evento existente (UC12)."""
    return evento_service.atualizar_evento(db, id_evento, payload)


@router.delete("/{id_evento}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_evento(
    id_evento: int,
    db: Session = Depends(get_db),
    _usuario_atual: Usuario = Depends(require_roles("ADMIN", "MARKETING")),
) -> Response:
    """Exclui/cancela um evento da agenda (UC12)."""
    evento_service.excluir_evento(db, id_evento)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
