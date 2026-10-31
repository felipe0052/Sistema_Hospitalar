from datetime import date, datetime
from zoneinfo import ZoneInfo

from sqlalchemy import extract, func
from sqlalchemy.orm import Session, joinedload

from app.models.usuario import Usuario
from app.schemas.dashboard import AniversarianteResumoOut, DashboardOut, SetorAniversarianteOut
from app.services import aviso_service, evento_service

FUSO_BRASIL = ZoneInfo("America/Sao_Paulo")


def obter_hoje_brasil() -> date:
    return datetime.now(FUSO_BRASIL).date()


def listar_aniversariantes_mes(
    db: Session,
    mes: int,
    referencia: date | None = None,
) -> list[AniversarianteResumoOut]:
    hoje = referencia or obter_hoje_brasil()
    usuarios = (
        db.query(Usuario)
        .options(joinedload(Usuario.setor))
        .filter(
            Usuario.status == "ATIVO",
            Usuario.data_nascimento.is_not(None),
            extract("month", Usuario.data_nascimento) == mes,
        )
        .all()
    )
    usuarios.sort(key=lambda u: (u.data_nascimento.day, u.nome.lower()))
    return [
        AniversarianteResumoOut(
            id_usuario=u.id_usuario,
            nome=u.nome,
            cargo=u.cargo,
            setor=SetorAniversarianteOut(id_setor=u.setor.id_setor, nome=u.setor.nome) if u.setor else None,
            dia=u.data_nascimento.day,
            mes=u.data_nascimento.month,
            aniversario_hoje=(u.data_nascimento.day == hoje.day and u.data_nascimento.month == hoje.month),
        )
        for u in usuarios
    ]


def obter_resumo_aniversariantes_dashboard(
    db: Session,
    referencia: date | None = None,
) -> tuple[list[AniversarianteResumoOut], int]:
    hoje = referencia or obter_hoje_brasil()

    aniversariantes_mes = (
        db.query(Usuario)
        .options(joinedload(Usuario.setor))
        .filter(
            Usuario.status == "ATIVO",
            Usuario.data_nascimento.is_not(None),
            extract("month", Usuario.data_nascimento) == hoje.month,
        )
        .order_by(func.lower(Usuario.nome).asc(), Usuario.id_usuario.asc())
        .all()
    )

    total_mes = len(aniversariantes_mes)
    aniversariantes_hoje: list[AniversarianteResumoOut] = []

    for u in aniversariantes_mes:
        if u.data_nascimento and u.data_nascimento.day == hoje.day:
            setor_out = (
                SetorAniversarianteOut(id_setor=u.setor.id_setor, nome=u.setor.nome)
                if u.setor is not None
                else None
            )
            aniversariantes_hoje.append(
                AniversarianteResumoOut(
                    id_usuario=u.id_usuario,
                    nome=u.nome,
                    cargo=u.cargo,
                    setor=setor_out,
                    dia=u.data_nascimento.day,
                    mes=u.data_nascimento.month,
                    aniversario_hoje=True,
                )
            )

    return aniversariantes_hoje, total_mes


def obter_dashboard(db: Session, incluir_aniversariantes: bool = True) -> DashboardOut:
    avisos_destaque, ultimos_avisos = aviso_service.listar_destaques_e_ultimos_dashboard(
        db=db,
        limite_destaques=5,
        limite_ultimos=5,
    )
    proximos_eventos = evento_service.listar_proximos_eventos_dashboard(db=db, limite=5)
    if incluir_aniversariantes:
        aniversariantes_hoje, total_aniversariantes_mes = obter_resumo_aniversariantes_dashboard(db=db)
    else:
        aniversariantes_hoje, total_aniversariantes_mes = [], 0

    return DashboardOut(
        avisos_destaque=avisos_destaque,
        ultimos_avisos=ultimos_avisos,
        proximos_eventos=proximos_eventos,
        aniversariantes_hoje=aniversariantes_hoje,
        total_aniversariantes_mes=total_aniversariantes_mes,
    )
