"""Notificações internas exibidas no sino do Header (S5-T4, parte 1).

Uma linha por publicação em NOTIFICACOES; o estado de leitura é individual (NOTIFICACOES_LIDAS).
Sem push/e-mail: o front consulta a contagem por polling.
"""

import logging
from datetime import date, datetime, time

from sqlalchemy import and_, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import NaoEncontrado
from app.models.evento import Evento
from app.models.notificacao import Notificacao, NotificacaoLida
from app.models.usuario import Usuario
from app.schemas.notificacao import NotificacaoOut, PaginadoNotificacoesOut

logger = logging.getLogger(__name__)

TIPOS_EVENTO = ("EVENTO", "EVENTO_DO_DIA")


def _montar_link(tipo: str, id_referencia: int) -> str:
    if tipo == "NOTICIA":
        return f"/avisos/{id_referencia}"
    if tipo in TIPOS_EVENTO:
        return f"/eventos?evento={id_referencia}"
    return f"/reconhecimentos?reconhecimento={id_referencia}"


def registrar(
    db: Session,
    tipo: str,
    id_referencia: int,
    titulo: str,
    data_referencia: date | None = None,
) -> None:
    """Cria a notificação sem duplicar. Falhas são registradas em log e nunca desfazem a publicação."""
    referencia = data_referencia or date.today()
    try:
        existente = (
            db.query(Notificacao.id_notificacao)
            .filter(
                Notificacao.tipo == tipo,
                Notificacao.id_referencia == id_referencia,
                Notificacao.data_referencia == referencia,
            )
            .first()
        )
        if existente is not None:
            return
        db.add(
            Notificacao(tipo=tipo, id_referencia=id_referencia, data_referencia=referencia, titulo=titulo[:200])
        )
        db.commit()
    except IntegrityError:
        # Consulta simultânea já criou a mesma notificação: a UNIQUE do banco garante uma só.
        db.rollback()
    except Exception:
        db.rollback()
        logger.exception("Falha ao registrar notificação %s/%s", tipo, id_referencia)


def remover(db: Session, tipos: str | tuple[str, ...], id_referencia: int) -> None:
    """Apaga as notificações (e o estado de leitura) de um conteúdo excluído."""
    lista = (tipos,) if isinstance(tipos, str) else tipos
    try:
        ids = [
            n.id_notificacao
            for n in db.query(Notificacao.id_notificacao).filter(
                Notificacao.tipo.in_(lista), Notificacao.id_referencia == id_referencia
            )
        ]
        if not ids:
            return
        db.query(NotificacaoLida).filter(NotificacaoLida.id_notificacao.in_(ids)).delete(synchronize_session=False)
        db.query(Notificacao).filter(Notificacao.id_notificacao.in_(ids)).delete(synchronize_session=False)
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Falha ao remover notificações %s/%s", lista, id_referencia)


def garantir_eventos_do_dia(db: Session) -> None:
    """Gera, sob demanda, uma notificação EVENTO_DO_DIA para cada evento que começa hoje."""
    hoje = date.today()
    inicio = datetime.combine(hoje, time.min)
    fim = datetime.combine(hoje, time.max)
    eventos = db.query(Evento).filter(Evento.data_inicio >= inicio, Evento.data_inicio <= fim).all()
    for evento in eventos:
        titulo = f"Hoje: {evento.titulo} às {evento.data_inicio:%H:%M}"
        registrar(db, "EVENTO_DO_DIA", evento.id_evento, titulo, data_referencia=hoje)


def _consulta_visiveis(db: Session, usuario: Usuario):
    """Notificações do usuário (apenas as criadas depois da conta) com a marca de leitura."""
    query = (
        db.query(Notificacao, NotificacaoLida.id_notificacao.label("lida"))
        .outerjoin(
            NotificacaoLida,
            and_(
                NotificacaoLida.id_notificacao == Notificacao.id_notificacao,
                NotificacaoLida.id_usuario == usuario.id_usuario,
            ),
        )
        # Coluna x coluna (mesmo formato no banco): só vale o que foi criado depois da conta do usuário.
        .join(Usuario, Usuario.id_usuario == usuario.id_usuario)
        .filter(Notificacao.data_criacao >= Usuario.data_criacao)
    )
    return query


def contar_nao_lidas(db: Session, usuario: Usuario) -> int:
    garantir_eventos_do_dia(db)
    return (
        _consulta_visiveis(db, usuario)
        .filter(NotificacaoLida.id_notificacao.is_(None))
        .with_entities(func.count(Notificacao.id_notificacao))
        .scalar()
        or 0
    )


def listar(
    db: Session,
    usuario: Usuario,
    pagina: int = 1,
    tamanho: int = 20,
    apenas_nao_lidas: bool = False,
) -> PaginadoNotificacoesOut:
    garantir_eventos_do_dia(db)
    query = _consulta_visiveis(db, usuario)
    if apenas_nao_lidas:
        query = query.filter(NotificacaoLida.id_notificacao.is_(None))

    total = query.with_entities(func.count(Notificacao.id_notificacao)).scalar() or 0
    linhas = (
        query.order_by(Notificacao.data_criacao.desc(), Notificacao.id_notificacao.desc())
        .offset((pagina - 1) * tamanho)
        .limit(tamanho)
        .all()
    )
    itens = [
        NotificacaoOut(
            id_notificacao=n.id_notificacao,
            tipo=n.tipo,  # type: ignore[arg-type]
            id_referencia=n.id_referencia,
            titulo=n.titulo,
            link=_montar_link(n.tipo, n.id_referencia),
            lida=lida is not None,
            data_criacao=n.data_criacao,
        )
        for n, lida in linhas
    ]
    return PaginadoNotificacoesOut(itens=itens, total=total, pagina=pagina, tamanho=tamanho)


def marcar_lida(db: Session, usuario: Usuario, id_notificacao: int) -> None:
    """Idempotente: marcar de novo uma notificação já lida não gera erro."""
    visivel = (
        _consulta_visiveis(db, usuario).filter(Notificacao.id_notificacao == id_notificacao).first()
    )
    if visivel is None:
        raise NaoEncontrado("Notificação não encontrada.")
    if visivel.lida is not None:
        return
    try:
        db.add(NotificacaoLida(id_usuario=usuario.id_usuario, id_notificacao=id_notificacao))
        db.commit()
    except IntegrityError:
        db.rollback()


def marcar_todas_lidas(db: Session, usuario: Usuario) -> None:
    pendentes = _consulta_visiveis(db, usuario).filter(NotificacaoLida.id_notificacao.is_(None)).all()
    for notificacao, _ in pendentes:
        db.add(NotificacaoLida(id_usuario=usuario.id_usuario, id_notificacao=notificacao.id_notificacao))
    db.commit()
