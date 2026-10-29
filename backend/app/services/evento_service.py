import calendar
from datetime import date, datetime, time

from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import NaoEncontrado, RegraNegocio
from app.models.evento import Evento
from app.models.setor import Setor
from app.models.usuario import Usuario
from app.schemas.evento import EventoIn, EventoOut
from app.services import google_agenda_service, notificacao_service


def _validar_setor(db: Session, id_setor: int | None) -> None:
    if id_setor is not None:
        setor = db.query(Setor).filter(Setor.id_setor == id_setor).first()
        if setor is None:
            raise NaoEncontrado("Setor não encontrado.", erros={"id_setor": "Setor informado não existe"})


def _validar_data_inicio_futura(data_inicio: datetime) -> None:
    if data_inicio.date() < date.today():
        msg = "A data de início do evento não pode ser anterior à data atual"
        raise RegraNegocio(msg, erros={"data_inicio": msg})


def listar_eventos(
    db: Session,
    categoria: str | None = None,
    id_setor: int | None = None,
    data_de: date | datetime | None = None,
    data_ate: date | datetime | None = None,
    mes: int | None = None,
    ano: int | None = None,
    busca: str | None = None,
) -> list[EventoOut]:
    query = db.query(Evento).options(joinedload(Evento.setor))

    tem_filtro_data = any(p is not None for p in (mes, ano, data_de, data_ate))

    if not tem_filtro_data:
        # UC12 / S2-T2 regra 1: sem parâmetros de data = apenas eventos com DATA_INICIO >= hoje 00:00
        hoje_inicio = datetime.combine(date.today(), time.min)
        query = query.filter(Evento.data_inicio >= hoje_inicio)
    else:
        if mes is not None or ano is not None:
            ano_alvo = ano if ano is not None else date.today().year
            if mes is not None:
                ultimo_dia = calendar.monthrange(ano_alvo, mes)[1]
                inicio_mes = datetime(ano_alvo, mes, 1, 0, 0, 0)
                fim_mes = datetime(ano_alvo, mes, ultimo_dia, 23, 59, 59, 999999)
                query = query.filter(
                    Evento.data_inicio >= inicio_mes,
                    Evento.data_inicio <= fim_mes,
                )
            else:
                inicio_ano = datetime(ano_alvo, 1, 1, 0, 0, 0)
                fim_ano = datetime(ano_alvo, 12, 31, 23, 59, 59, 999999)
                query = query.filter(
                    Evento.data_inicio >= inicio_ano,
                    Evento.data_inicio <= fim_ano,
                )

        if data_de is not None:
            dt_de = (
                data_de.replace(tzinfo=None)
                if isinstance(data_de, datetime)
                else datetime.combine(data_de, time.min)
            )
            query = query.filter(Evento.data_inicio >= dt_de)

        if data_ate is not None:
            dt_ate = (
                data_ate.replace(tzinfo=None)
                if isinstance(data_ate, datetime)
                else datetime.combine(data_ate, time.max)
            )
            query = query.filter(Evento.data_inicio <= dt_ate)

    if categoria and categoria.strip():
        query = query.filter(Evento.categoria == categoria.strip().upper())

    if id_setor is not None:
        query = query.filter(Evento.id_setor == id_setor)

    if busca and busca.strip():
        termo = f"%{busca.strip()}%"
        query = query.filter(
            or_(
                Evento.titulo.like(termo),
                Evento.local.like(termo),
                Evento.descricao.like(termo),
            )
        )

    registros = query.order_by(Evento.data_inicio.asc(), Evento.id_evento.asc()).all()
    return [EventoOut.model_validate(e) for e in registros]


def obter_evento(db: Session, id_evento: int) -> EventoOut:
    evento = (
        db.query(Evento)
        .options(joinedload(Evento.setor))
        .filter(Evento.id_evento == id_evento)
        .first()
    )
    if evento is None:
        raise NaoEncontrado("Evento não encontrado.")
    return EventoOut.model_validate(evento)


def criar_evento(db: Session, dados: EventoIn, autor: Usuario) -> EventoOut:
    _validar_data_inicio_futura(dados.data_inicio)
    _validar_setor(db, dados.id_setor)

    novo = Evento(
        titulo=dados.titulo.strip(),
        descricao=dados.descricao,
        categoria=dados.categoria,
        data_inicio=dados.data_inicio,
        data_fim=dados.data_fim,
        local=dados.local,
        id_setor=dados.id_setor,
        id_autor=autor.id_usuario,
    )
    db.add(novo)
    db.commit()
    db.refresh(novo)
    notificacao_service.registrar(db, "EVENTO", novo.id_evento, novo.titulo)
    google_agenda_service.sincronizar_criacao(db, novo)
    return obter_evento(db, novo.id_evento)


def atualizar_evento(db: Session, id_evento: int, dados: EventoIn) -> EventoOut:
    evento = db.query(Evento).filter(Evento.id_evento == id_evento).first()
    if evento is None:
        raise NaoEncontrado("Evento não encontrado.")

    _validar_data_inicio_futura(dados.data_inicio)
    _validar_setor(db, dados.id_setor)

    evento.titulo = dados.titulo.strip()
    evento.descricao = dados.descricao
    evento.categoria = dados.categoria
    evento.data_inicio = dados.data_inicio
    evento.data_fim = dados.data_fim
    evento.local = dados.local
    evento.id_setor = dados.id_setor

    db.commit()
    db.refresh(evento)
    google_agenda_service.sincronizar_atualizacao(db, evento)
    return obter_evento(db, evento.id_evento)


def excluir_evento(db: Session, id_evento: int) -> None:
    evento = db.query(Evento).filter(Evento.id_evento == id_evento).first()
    if evento is None:
        raise NaoEncontrado("Evento não encontrado.")

    google_agenda_service.sincronizar_exclusao(db, id_evento)
    db.delete(evento)
    db.commit()
    notificacao_service.remover(db, notificacao_service.TIPOS_EVENTO, id_evento)


def listar_proximos_eventos_dashboard(db: Session, limite: int = 5) -> list[EventoOut]:
    """Retorna os próximos eventos a partir de hoje para o Dashboard (S2-T3)."""
    hoje_inicio = datetime.combine(date.today(), time.min)
    registros = (
        db.query(Evento)
        .options(joinedload(Evento.setor))
        .filter(Evento.data_inicio >= hoje_inicio)
        .order_by(Evento.data_inicio.asc(), Evento.id_evento.asc())
        .limit(limite)
        .all()
    )
    return [EventoOut.model_validate(e) for e in registros]
