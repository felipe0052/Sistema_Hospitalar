"""Reconhecimentos publicados pelo RH e indicações de colegas/setores (S5-T3)."""

from datetime import UTC, datetime

from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session, aliased, joinedload

from app.core.escopo import PERFIS_VISAO_TOTAL, setores_liderados
from app.core.exceptions import Conflito, NaoEncontrado, Proibido, RegraNegocio
from app.models.reconhecimento import IndicacaoReconhecimento, Reconhecimento
from app.models.setor import Setor
from app.models.usuario import Usuario
from app.schemas.reconhecimento import (
    ColaboradorReconhecidoOut,
    IndicacaoIn,
    IndicacaoOut,
    PaginadoIndicacoesOut,
    PaginadoReconhecimentosOut,
    PessoaResumoOut,
    ReconhecimentoIn,
    ReconhecimentoOut,
    ReconhecimentoUpdate,
    SetorResumoOut,
)
from app.services import notificacao_service


def _agora() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def _colaborador_out(u: Usuario | None) -> ColaboradorReconhecidoOut | None:
    if u is None:
        return None
    setor = SetorResumoOut(id_setor=u.setor.id_setor, nome=u.setor.nome) if u.setor is not None else None
    return ColaboradorReconhecidoOut(id_usuario=u.id_usuario, nome=u.nome, cargo=u.cargo, setor=setor)


def _converter_reconhecimento(r: Reconhecimento) -> ReconhecimentoOut:
    is_setor = r.alvo_tipo == "SETOR" or (r.id_setor is not None and r.id_colaborador is None)
    return ReconhecimentoOut(
        id_reconhecimento=r.id_reconhecimento,
        alvo_tipo="SETOR" if is_setor else "COLABORADOR",
        tipo=r.tipo,  # type: ignore[arg-type]
        titulo=r.titulo,
        mensagem=r.mensagem,
        data_criacao=r.data_criacao,
        colaborador=_colaborador_out(r.colaborador) if (not is_setor and r.colaborador is not None) else None,
        setor=SetorResumoOut(id_setor=r.setor.id_setor, nome=r.setor.nome) if (is_setor and r.setor is not None) else None,
        autor=PessoaResumoOut(id_usuario=r.autor.id_usuario, nome=r.autor.nome) if r.autor is not None else None,
    )


def _converter_indicacao(
    i: IndicacaoReconhecimento,
    ocultar_indicante: bool = False,
) -> IndicacaoOut:
    is_setor = i.alvo_tipo == "SETOR" or (i.id_setor is not None and i.id_indicado is None)
    return IndicacaoOut(
        id_indicacao=i.id_indicacao,
        alvo_tipo="SETOR" if is_setor else "COLABORADOR",
        indicado=_colaborador_out(i.indicado) if (not is_setor and i.indicado is not None) else None,
        setor=SetorResumoOut(id_setor=i.setor.id_setor, nome=i.setor.nome) if (is_setor and i.setor is not None) else None,
        indicante=None if ocultar_indicante else PessoaResumoOut(id_usuario=i.indicante.id_usuario, nome=i.indicante.nome),
        motivo=i.motivo,
        status=i.status,  # type: ignore[arg-type]
        id_reconhecimento=i.id_reconhecimento,
        data_indicacao=i.data_indicacao,
        data_avaliacao=i.data_avaliacao,
    )


def _consulta_reconhecimentos(db: Session):
    return db.query(Reconhecimento).options(
        joinedload(Reconhecimento.colaborador).joinedload(Usuario.setor),
        joinedload(Reconhecimento.setor),
        joinedload(Reconhecimento.autor),
    )


def _obter_reconhecimento(db: Session, id_reconhecimento: int) -> Reconhecimento:
    r = (
        _consulta_reconhecimentos(db)
        .filter(Reconhecimento.id_reconhecimento == id_reconhecimento)
        .first()
    )
    if r is None:
        raise NaoEncontrado("Reconhecimento não encontrado.")
    return r


def _exigir_usuario_ativo(db: Session, id_usuario: int, campo: str) -> Usuario:
    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    if usuario is None or usuario.status != "ATIVO":
        msg = "Colaborador não encontrado ou inativo."
        raise RegraNegocio(msg, erros={campo: msg})
    return usuario


def _exigir_setor(db: Session, id_setor: int, campo: str) -> Setor:
    setor = db.query(Setor).filter(Setor.id_setor == id_setor).first()
    if setor is None:
        msg = "Setor não encontrado."
        raise RegraNegocio(msg, erros={campo: msg})
    return setor


def _aplicar_escopo(db: Session, query, usuario: Usuario):
    """Restringe a consulta conforme a cadeia de comando."""
    if usuario.perfil in PERFIS_VISAO_TOTAL:
        return query
    liderados = setores_liderados(db, usuario)
    colab_escopo = aliased(Usuario)
    query = query.outerjoin(colab_escopo, colab_escopo.id_usuario == Reconhecimento.id_colaborador)
    condicoes = [Reconhecimento.id_colaborador == usuario.id_usuario]
    if usuario.id_setor is not None:
        condicoes.append(and_(Reconhecimento.alvo_tipo == "SETOR", Reconhecimento.id_setor == usuario.id_setor))
    if liderados:
        condicoes += [Reconhecimento.id_setor.in_(liderados), colab_escopo.id_setor.in_(liderados)]
    return query.filter(or_(*condicoes))


def listar_reconhecimentos(
    db: Session,
    usuario: Usuario,
    tipo: str | None = None,
    id_setor: int | None = None,
    alvo_tipo: str | None = None,
    id_colaborador: int | None = None,
    pagina: int = 1,
    tamanho: int = 20,
) -> PaginadoReconhecimentosOut:
    query = _aplicar_escopo(db, _consulta_reconhecimentos(db), usuario)
    eh_visao_total = usuario.perfil in PERFIS_VISAO_TOTAL
    pode_filtrar = eh_visao_total or len(setores_liderados(db, usuario)) > 0

    if tipo and tipo.strip():
        query = query.filter(Reconhecimento.tipo == tipo.strip().upper())
    if alvo_tipo and alvo_tipo.strip():
        query = query.filter(Reconhecimento.alvo_tipo == alvo_tipo.strip().upper())
    if pode_filtrar:
        if id_setor is not None:
            colab_filtro = aliased(Usuario)
            query = query.outerjoin(colab_filtro, colab_filtro.id_usuario == Reconhecimento.id_colaborador).filter(
                or_(
                    Reconhecimento.id_setor == id_setor,
                    and_(Reconhecimento.id_colaborador.isnot(None), colab_filtro.id_setor == id_setor),
                )
            )
        if id_colaborador is not None:
            query = query.filter(Reconhecimento.id_colaborador == id_colaborador)
    total = query.count()
    registros = (
        query.order_by(Reconhecimento.data_criacao.desc(), Reconhecimento.id_reconhecimento.desc())
        .offset((pagina - 1) * tamanho)
        .limit(tamanho)
        .all()
    )
    return PaginadoReconhecimentosOut(
        itens=[_converter_reconhecimento(r) for r in registros], total=total, pagina=pagina, tamanho=tamanho
    )


def obter_reconhecimento(db: Session, id_reconhecimento: int, usuario: Usuario) -> ReconhecimentoOut:
    r = (
        _aplicar_escopo(db, _consulta_reconhecimentos(db), usuario)
        .filter(Reconhecimento.id_reconhecimento == id_reconhecimento)
        .first()
    )
    if r is None:
        raise NaoEncontrado("Reconhecimento não encontrado.")
    return _converter_reconhecimento(r)


def listar_colaboradores_filtro(
    db: Session,
    usuario: Usuario,
    id_setor: int | None = None,
) -> list[PessoaResumoOut]:
    eh_visao_total = usuario.perfil in PERFIS_VISAO_TOTAL
    liderados = [] if eh_visao_total else setores_liderados(db, usuario)
    if not eh_visao_total and not liderados:
        raise Proibido("Permissão insuficiente.")

    query = db.query(Usuario).filter(Usuario.status == "ATIVO")
    if not eh_visao_total:
        if id_setor is not None:
            if id_setor not in liderados:
                return []
            query = query.filter(Usuario.id_setor == id_setor)
        else:
            query = query.filter(Usuario.id_setor.in_(liderados))
    elif id_setor is not None:
        query = query.filter(Usuario.id_setor == id_setor)

    usuarios = query.order_by(func.lower(Usuario.nome).asc(), Usuario.id_usuario.asc()).all()
    return [PessoaResumoOut(id_usuario=u.id_usuario, nome=u.nome) for u in usuarios]


def criar_reconhecimento(db: Session, dados: ReconhecimentoIn, autor: Usuario) -> ReconhecimentoOut:
    indicacao: IndicacaoReconhecimento | None = None
    if dados.id_indicacao is not None:
        indicacao = (
            db.query(IndicacaoReconhecimento)
            .filter(IndicacaoReconhecimento.id_indicacao == dados.id_indicacao)
            .first()
        )
        if indicacao is None:
            raise NaoEncontrado("Indicação não encontrada.")
        if indicacao.status != "PENDENTE":
            raise Conflito("Esta indicação já foi avaliada.")

    is_setor = dados.alvo_tipo == "SETOR" or (dados.id_setor is not None and dados.id_colaborador is None)
    if is_setor:
        if dados.id_setor is None:
            msg = "Informe o setor a ser reconhecido."
            raise RegraNegocio(msg, erros={"id_setor": msg})
        _exigir_setor(db, dados.id_setor, "id_setor")
        if indicacao is not None:
            if indicacao.alvo_tipo != "SETOR" or indicacao.id_setor != dados.id_setor:
                msg = "A indicação pertence a outro setor ou a um colaborador individual."
                raise RegraNegocio(msg, erros={"id_indicacao": msg})
        novo = Reconhecimento(
            alvo_tipo="SETOR",
            id_setor=dados.id_setor,
            id_colaborador=None,
            tipo=dados.tipo,
            titulo=dados.titulo,
            mensagem=dados.mensagem,
            id_autor=autor.id_usuario,
            data_criacao=_agora(),
        )
    else:
        if dados.id_colaborador is None:
            msg = "Informe o colaborador a ser reconhecido."
            raise RegraNegocio(msg, erros={"id_colaborador": msg})
        _exigir_usuario_ativo(db, dados.id_colaborador, "id_colaborador")
        if indicacao is not None:
            if indicacao.alvo_tipo != "COLABORADOR" or indicacao.id_indicado != dados.id_colaborador:
                msg = "A indicação pertence a outro colaborador."
                raise RegraNegocio(msg, erros={"id_indicacao": msg})
        novo = Reconhecimento(
            alvo_tipo="COLABORADOR",
            id_colaborador=dados.id_colaborador,
            id_setor=None,
            tipo=dados.tipo,
            titulo=dados.titulo,
            mensagem=dados.mensagem,
            id_autor=autor.id_usuario,
            data_criacao=_agora(),
        )

    db.add(novo)
    db.flush()
    if indicacao is not None:
        indicacao.status = "APROVADA"
        indicacao.id_avaliador = autor.id_usuario
        indicacao.id_reconhecimento = novo.id_reconhecimento
        indicacao.data_avaliacao = _agora()
    db.commit()

    notificacao_service.registrar(db, "RECONHECIMENTO", novo.id_reconhecimento, novo.titulo)
    return _converter_reconhecimento(_obter_reconhecimento(db, novo.id_reconhecimento))


def atualizar_reconhecimento(db: Session, id_reconhecimento: int, dados: ReconhecimentoUpdate) -> ReconhecimentoOut:
    r = _obter_reconhecimento(db, id_reconhecimento)
    r.tipo = dados.tipo
    r.titulo = dados.titulo
    r.mensagem = dados.mensagem
    db.commit()
    return _converter_reconhecimento(_obter_reconhecimento(db, id_reconhecimento))


def excluir_reconhecimento(db: Session, id_reconhecimento: int) -> None:
    r = _obter_reconhecimento(db, id_reconhecimento)
    # Em bancos sem ON DELETE SET NULL ativo (SQLite), desvincula a indicação de forma explícita.
    db.query(IndicacaoReconhecimento).filter(
        IndicacaoReconhecimento.id_reconhecimento == id_reconhecimento
    ).update({IndicacaoReconhecimento.id_reconhecimento: None}, synchronize_session=False)
    db.delete(r)
    db.commit()
    notificacao_service.remover(db, "RECONHECIMENTO", id_reconhecimento)


# ----------------------------- Indicações -----------------------------


def _consulta_indicacoes(db: Session):
    return db.query(IndicacaoReconhecimento).options(
        joinedload(IndicacaoReconhecimento.indicado).joinedload(Usuario.setor),
        joinedload(IndicacaoReconhecimento.setor),
        joinedload(IndicacaoReconhecimento.indicante),
    )


def criar_indicacao(db: Session, dados: IndicacaoIn, indicante: Usuario) -> IndicacaoOut:
    is_setor = dados.alvo_tipo == "SETOR" or (dados.id_setor is not None and dados.id_indicado is None)
    if is_setor:
        if dados.id_setor is None:
            msg = "Informe o setor a ser indicado."
            raise RegraNegocio(msg, erros={"id_setor": msg})
        _exigir_setor(db, dados.id_setor, "id_setor")
        nova = IndicacaoReconhecimento(
            alvo_tipo="SETOR",
            id_setor=dados.id_setor,
            id_indicado=None,
            id_indicante=indicante.id_usuario,
            motivo=dados.motivo,
            status="PENDENTE",
            data_indicacao=_agora(),
        )
    else:
        if dados.id_indicado is None:
            msg = "Informe o colega a ser indicado."
            raise RegraNegocio(msg, erros={"id_indicado": msg})
        if dados.id_indicado == indicante.id_usuario:
            msg = "Você não pode indicar a si mesmo."
            raise RegraNegocio(msg, erros={"id_indicado": msg})
        _exigir_usuario_ativo(db, dados.id_indicado, "id_indicado")
        nova = IndicacaoReconhecimento(
            alvo_tipo="COLABORADOR",
            id_indicado=dados.id_indicado,
            id_setor=None,
            id_indicante=indicante.id_usuario,
            motivo=dados.motivo,
            status="PENDENTE",
            data_indicacao=_agora(),
        )

    db.add(nova)
    db.commit()
    return _converter_indicacao(_consulta_indicacoes(db).filter_by(id_indicacao=nova.id_indicacao).one())


def listar_minhas_indicacoes(db: Session, usuario: Usuario) -> list[IndicacaoOut]:
    registros = (
        _consulta_indicacoes(db)
        .filter(
            or_(
                IndicacaoReconhecimento.id_indicante == usuario.id_usuario,
                IndicacaoReconhecimento.id_indicado == usuario.id_usuario,
            )
        )
        .order_by(IndicacaoReconhecimento.data_indicacao.desc(), IndicacaoReconhecimento.id_indicacao.desc())
        .all()
    )
    return [
        _converter_indicacao(
            i,
            ocultar_indicante=(i.id_indicado == usuario.id_usuario and i.id_indicante != usuario.id_usuario),
        )
        for i in registros
    ]


def listar_indicacoes(
    db: Session,
    usuario: Usuario,
    status: str | None = None,
    id_colaborador: int | None = None,
    pagina: int = 1,
    tamanho: int = 20,
) -> PaginadoIndicacoesOut:
    eh_visao_total = usuario.perfil in PERFIS_VISAO_TOTAL
    liderados = [] if eh_visao_total else setores_liderados(db, usuario)
    if not eh_visao_total and not liderados:
        raise Proibido("Permissão insuficiente.")

    query = _consulta_indicacoes(db)
    if not eh_visao_total:
        indicado_escopo = aliased(Usuario)
        query = query.outerjoin(
            indicado_escopo, indicado_escopo.id_usuario == IndicacaoReconhecimento.id_indicado
        ).filter(
            or_(
                IndicacaoReconhecimento.id_setor.in_(liderados),
                indicado_escopo.id_setor.in_(liderados),
            )
        )
    if status and status.strip():
        query = query.filter(IndicacaoReconhecimento.status == status.strip().upper())
    if id_colaborador is not None:
        query = query.filter(IndicacaoReconhecimento.id_indicado == id_colaborador)
    total = query.count()
    registros = (
        query.order_by(IndicacaoReconhecimento.data_indicacao.desc(), IndicacaoReconhecimento.id_indicacao.desc())
        .offset((pagina - 1) * tamanho)
        .limit(tamanho)
        .all()
    )
    return PaginadoIndicacoesOut(
        itens=[_converter_indicacao(i) for i in registros], total=total, pagina=pagina, tamanho=tamanho
    )


def recusar_indicacao(db: Session, id_indicacao: int, avaliador: Usuario) -> IndicacaoOut:
    indicacao = (
        _consulta_indicacoes(db).filter(IndicacaoReconhecimento.id_indicacao == id_indicacao).first()
    )
    if indicacao is None:
        raise NaoEncontrado("Indicação não encontrada.")
    if indicacao.status != "PENDENTE":
        raise Conflito("Esta indicação já foi avaliada.")
    indicacao.status = "RECUSADA"
    indicacao.id_avaliador = avaliador.id_usuario
    indicacao.data_avaliacao = _agora()
    db.commit()
    return _converter_indicacao(indicacao)
