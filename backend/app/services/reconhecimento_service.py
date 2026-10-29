"""Reconhecimentos publicados pelo RH e indicações de colegas (S5-T3)."""

from datetime import UTC, datetime

from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import Conflito, NaoEncontrado, RegraNegocio
from app.models.reconhecimento import IndicacaoReconhecimento, Reconhecimento
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


def _colaborador_out(u: Usuario) -> ColaboradorReconhecidoOut:
    setor = SetorResumoOut(id_setor=u.setor.id_setor, nome=u.setor.nome) if u.setor is not None else None
    return ColaboradorReconhecidoOut(id_usuario=u.id_usuario, nome=u.nome, cargo=u.cargo, setor=setor)


def _converter_reconhecimento(r: Reconhecimento) -> ReconhecimentoOut:
    return ReconhecimentoOut(
        id_reconhecimento=r.id_reconhecimento,
        tipo=r.tipo,  # type: ignore[arg-type]
        titulo=r.titulo,
        mensagem=r.mensagem,
        data_criacao=r.data_criacao,
        colaborador=_colaborador_out(r.colaborador),
        autor=PessoaResumoOut(id_usuario=r.autor.id_usuario, nome=r.autor.nome) if r.autor is not None else None,
    )


def _converter_indicacao(i: IndicacaoReconhecimento) -> IndicacaoOut:
    return IndicacaoOut(
        id_indicacao=i.id_indicacao,
        indicado=_colaborador_out(i.indicado),
        indicante=PessoaResumoOut(id_usuario=i.indicante.id_usuario, nome=i.indicante.nome),
        motivo=i.motivo,
        status=i.status,  # type: ignore[arg-type]
        id_reconhecimento=i.id_reconhecimento,
        data_indicacao=i.data_indicacao,
        data_avaliacao=i.data_avaliacao,
    )


def _consulta_reconhecimentos(db: Session):
    return db.query(Reconhecimento).options(
        joinedload(Reconhecimento.colaborador).joinedload(Usuario.setor),
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


def listar_reconhecimentos(
    db: Session,
    tipo: str | None = None,
    id_setor: int | None = None,
    pagina: int = 1,
    tamanho: int = 20,
) -> PaginadoReconhecimentosOut:
    query = _consulta_reconhecimentos(db)
    if tipo and tipo.strip():
        query = query.filter(Reconhecimento.tipo == tipo.strip().upper())
    if id_setor is not None:
        query = query.join(Usuario, Usuario.id_usuario == Reconhecimento.id_colaborador).filter(
            Usuario.id_setor == id_setor
        )
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


def obter_reconhecimento(db: Session, id_reconhecimento: int) -> ReconhecimentoOut:
    return _converter_reconhecimento(_obter_reconhecimento(db, id_reconhecimento))


def criar_reconhecimento(db: Session, dados: ReconhecimentoIn, autor: Usuario) -> ReconhecimentoOut:
    _exigir_usuario_ativo(db, dados.id_colaborador, "id_colaborador")

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
        if indicacao.id_indicado != dados.id_colaborador:
            msg = "A indicação pertence a outro colaborador."
            raise RegraNegocio(msg, erros={"id_indicacao": msg})

    novo = Reconhecimento(
        id_colaborador=dados.id_colaborador,
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
    return obter_reconhecimento(db, novo.id_reconhecimento)


def atualizar_reconhecimento(db: Session, id_reconhecimento: int, dados: ReconhecimentoUpdate) -> ReconhecimentoOut:
    r = _obter_reconhecimento(db, id_reconhecimento)
    r.tipo = dados.tipo
    r.titulo = dados.titulo
    r.mensagem = dados.mensagem
    db.commit()
    return obter_reconhecimento(db, id_reconhecimento)


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
        joinedload(IndicacaoReconhecimento.indicante),
    )


def criar_indicacao(db: Session, dados: IndicacaoIn, indicante: Usuario) -> IndicacaoOut:
    if dados.id_indicado == indicante.id_usuario:
        msg = "Você não pode indicar a si mesmo."
        raise RegraNegocio(msg, erros={"id_indicado": msg})
    _exigir_usuario_ativo(db, dados.id_indicado, "id_indicado")

    nova = IndicacaoReconhecimento(
        id_indicado=dados.id_indicado,
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
        .filter(IndicacaoReconhecimento.id_indicante == usuario.id_usuario)
        .order_by(IndicacaoReconhecimento.data_indicacao.desc(), IndicacaoReconhecimento.id_indicacao.desc())
        .all()
    )
    return [_converter_indicacao(i) for i in registros]


def listar_indicacoes(
    db: Session, status: str | None = None, pagina: int = 1, tamanho: int = 20
) -> PaginadoIndicacoesOut:
    query = _consulta_indicacoes(db)
    if status and status.strip():
        query = query.filter(IndicacaoReconhecimento.status == status.strip().upper())
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
