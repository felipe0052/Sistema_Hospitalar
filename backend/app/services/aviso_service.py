from datetime import UTC, date, datetime

from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import NaoEncontrado, RegraNegocio
from app.models.aviso import Aviso
from app.models.usuario import Usuario
from app.schemas.aviso import (
    AutorAvisoOut,
    AvisoIn,
    AvisoOut,
    AvisoResumo,
    PaginadoAvisosOut,
    PaginadoAvisosResumoOut,
    extrair_resumo_sem_html,
)

PERFIS_GESTAO_AVISOS = ("ADMIN", "RH", "MARKETING")


def _eh_expirado(aviso: Aviso, referencia: date | None = None) -> bool:
    hoje = referencia or date.today()
    return aviso.data_expiracao is not None and aviso.data_expiracao < hoje


def converter_para_resumo(aviso: Aviso) -> AvisoResumo:
    autor_out = (
        AutorAvisoOut(id_usuario=aviso.autor.id_usuario, nome=aviso.autor.nome)
        if aviso.autor is not None
        else None
    )
    return AvisoResumo(
        id_aviso=aviso.id_aviso,
        titulo=aviso.titulo,
        resumo=extrair_resumo_sem_html(aviso.conteudo, tamanho_max=200),
        categoria=aviso.categoria,  # type: ignore[arg-type]
        destaque=(aviso.destaque == "S"),
        data_publicacao=aviso.data_publicacao,
        autor=autor_out,
    )


def converter_para_out(aviso: Aviso) -> AvisoOut:
    resumo_obj = converter_para_resumo(aviso)
    return AvisoOut(
        **resumo_obj.model_dump(),
        conteudo=aviso.conteudo,
        data_expiracao=aviso.data_expiracao,
        data_atualizacao=aviso.data_atualizacao,
        expirado=_eh_expirado(aviso),
    )


def _aplicar_filtros_comuns(
    query,
    busca: str | None = None,
    categoria: str | None = None,
    destaque: bool | None = None,
    apenas_vigentes: bool = True,
):
    hoje = date.today()
    if apenas_vigentes:
        query = query.filter(
            or_(
                Aviso.data_expiracao.is_(None),
                Aviso.data_expiracao >= hoje,
            )
        )

    if busca and busca.strip():
        termo = f"%{busca.strip()}%"
        query = query.filter(
            or_(
                Aviso.titulo.like(termo),
                Aviso.conteudo.like(termo),
            )
        )

    if categoria and categoria.strip():
        query = query.filter(Aviso.categoria == categoria.strip().upper())

    if destaque is not None:
        flag = "S" if destaque else "N"
        query = query.filter(Aviso.destaque == flag)

    return query


def listar_avisos(
    db: Session,
    busca: str | None = None,
    categoria: str | None = None,
    destaque: bool | None = None,
    pagina: int = 1,
    tamanho: int = 20,
) -> PaginadoAvisosResumoOut:
    query = db.query(Aviso).options(joinedload(Aviso.autor))
    query = _aplicar_filtros_comuns(
        query,
        busca=busca,
        categoria=categoria,
        destaque=destaque,
        apenas_vigentes=True,
    )

    total = query.count()
    registros = (
        query.order_by(Aviso.data_publicacao.desc(), Aviso.id_aviso.desc())
        .offset((pagina - 1) * tamanho)
        .limit(tamanho)
        .all()
    )

    return PaginadoAvisosResumoOut(
        itens=[converter_para_resumo(a) for a in registros],
        total=total,
        pagina=pagina,
        tamanho=tamanho,
    )


def listar_avisos_gestao(
    db: Session,
    busca: str | None = None,
    categoria: str | None = None,
    destaque: bool | None = None,
    incluir_expirados: bool = False,
    pagina: int = 1,
    tamanho: int = 20,
) -> PaginadoAvisosOut:
    query = db.query(Aviso).options(joinedload(Aviso.autor))
    query = _aplicar_filtros_comuns(
        query,
        busca=busca,
        categoria=categoria,
        destaque=destaque,
        apenas_vigentes=not incluir_expirados,
    )

    total = query.count()
    registros = (
        query.order_by(Aviso.data_publicacao.desc(), Aviso.id_aviso.desc())
        .offset((pagina - 1) * tamanho)
        .limit(tamanho)
        .all()
    )

    return PaginadoAvisosOut(
        itens=[converter_para_out(a) for a in registros],
        total=total,
        pagina=pagina,
        tamanho=tamanho,
    )


def obter_aviso(db: Session, id_aviso: int, usuario_atual: Usuario | None = None) -> AvisoOut:
    aviso = (
        db.query(Aviso)
        .options(joinedload(Aviso.autor))
        .filter(Aviso.id_aviso == id_aviso)
        .first()
    )
    if aviso is None:
        raise NaoEncontrado("Aviso não encontrado.")

    eh_gestor = usuario_atual is not None and usuario_atual.perfil in PERFIS_GESTAO_AVISOS
    if _eh_expirado(aviso) and not eh_gestor:
        raise NaoEncontrado("Aviso não encontrado.")

    return converter_para_out(aviso)


def _validar_data_expiracao(data_expiracao: date | None) -> None:
    if data_expiracao is not None and data_expiracao < date.today():
        msg = "A data de expiração não pode ser anterior à data atual"
        raise RegraNegocio(msg, erros={"data_expiracao": msg})


def criar_aviso(db: Session, dados: AvisoIn, autor: Usuario) -> AvisoOut:
    _validar_data_expiracao(dados.data_expiracao)

    novo = Aviso(
        titulo=dados.titulo.strip(),
        conteudo=dados.conteudo,
        categoria=dados.categoria,
        destaque="S" if dados.destaque else "N",
        data_publicacao=datetime.now(UTC).replace(tzinfo=None),
        data_expiracao=dados.data_expiracao,
        id_autor=autor.id_usuario,
    )
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return obter_aviso(db, novo.id_aviso, autor)


def atualizar_aviso(db: Session, id_aviso: int, dados: AvisoIn, autor: Usuario) -> AvisoOut:
    aviso = db.query(Aviso).filter(Aviso.id_aviso == id_aviso).first()
    if aviso is None:
        raise NaoEncontrado("Aviso não encontrado.")

    _validar_data_expiracao(dados.data_expiracao)

    aviso.titulo = dados.titulo.strip()
    aviso.conteudo = dados.conteudo
    aviso.categoria = dados.categoria
    aviso.destaque = "S" if dados.destaque else "N"
    aviso.data_expiracao = dados.data_expiracao
    aviso.data_atualizacao = datetime.now(UTC).replace(tzinfo=None)

    db.commit()
    db.refresh(aviso)
    return obter_aviso(db, aviso.id_aviso, autor)


def excluir_aviso(db: Session, id_aviso: int) -> None:
    aviso = db.query(Aviso).filter(Aviso.id_aviso == id_aviso).first()
    if aviso is None:
        raise NaoEncontrado("Aviso não encontrado.")

    db.delete(aviso)
    db.commit()


def listar_destaques_e_ultimos_dashboard(
    db: Session,
    limite_destaques: int = 5,
    limite_ultimos: int = 5,
) -> tuple[list[AvisoResumo], list[AvisoResumo]]:
    """Retorna os avisos vigentes em destaque e os mais recentes para o Dashboard (S2-T3)."""
    base_query = _aplicar_filtros_comuns(
        db.query(Aviso).options(joinedload(Aviso.autor)),
        apenas_vigentes=True,
    )

    destaques = (
        base_query.filter(Aviso.destaque == "S")
        .order_by(Aviso.data_publicacao.desc(), Aviso.id_aviso.desc())
        .limit(limite_destaques)
        .all()
    )
    ultimos = (
        base_query.order_by(Aviso.data_publicacao.desc(), Aviso.id_aviso.desc())
        .limit(limite_ultimos)
        .all()
    )

    return (
        [converter_para_resumo(a) for a in destaques],
        [converter_para_resumo(a) for a in ultimos],
    )
