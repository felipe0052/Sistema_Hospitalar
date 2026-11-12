"""Regras de negócio do Onboarding Digital: checklist, primeiros atendimentos e 'quem procurar'."""

from datetime import UTC, datetime

from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import NaoEncontrado
from app.models.onboarding import OnboardingContato, OnboardingItem, OnboardingProgresso
from app.models.setor import Setor
from app.models.usuario import Usuario
from app.schemas.onboarding import (
    ColaboradorOnboardingOut,
    OnboardingContatoIn,
    OnboardingContatoOut,
    OnboardingItemIn,
    OnboardingItemOut,
    OnboardingOut,
    ProgressoOnboardingOut,
    SetorResumoOut,
)


def _agora() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def _ids_concluidos(db: Session, id_usuario: int) -> set[int]:
    linhas = db.query(OnboardingProgresso.id_item).filter(OnboardingProgresso.id_usuario == id_usuario).all()
    return {id_item for (id_item,) in linhas}


def _item_out(item: OnboardingItem, concluidos: set[int]) -> OnboardingItemOut:
    out = OnboardingItemOut.model_validate(item)
    out.concluido = item.id_item in concluidos
    return out


def _calcular_progresso(itens: list[OnboardingItem], concluidos: set[int]) -> ProgressoOnboardingOut:
    total = len(itens)
    feitos = sum(1 for i in itens if i.id_item in concluidos)
    percentual = round(feitos * 100 / total) if total else 0
    return ProgressoOnboardingOut(total=total, concluidos=feitos, percentual=percentual)


def obter_onboarding(db: Session, usuario: Usuario) -> OnboardingOut:
    itens = db.query(OnboardingItem).order_by(OnboardingItem.ordem.asc(), OnboardingItem.id_item.asc()).all()
    concluidos = _ids_concluidos(db, usuario.id_usuario)

    checklist = [i for i in itens if i.tipo == "CHECKLIST"]
    atendimentos = [i for i in itens if i.tipo == "ATENDIMENTO"]

    contatos = (
        db.query(OnboardingContato)
        .options(joinedload(OnboardingContato.setor))
        .order_by(OnboardingContato.ordem.asc(), OnboardingContato.id_contato.asc())
        .all()
    )

    setor = SetorResumoOut.model_validate(usuario.setor) if usuario.setor else None

    return OnboardingOut(
        colaborador=ColaboradorOnboardingOut(nome=usuario.nome, cargo=usuario.cargo, setor=setor),
        progresso=_calcular_progresso(itens, concluidos),
        checklist=[_item_out(i, concluidos) for i in checklist],
        atendimentos=[_item_out(i, concluidos) for i in atendimentos],
        contatos=[OnboardingContatoOut.model_validate(c) for c in contatos],
    )


# ---------------------------------------------------------------- Progresso do colaborador


def _obter_item(db: Session, id_item: int) -> OnboardingItem:
    item = db.query(OnboardingItem).filter(OnboardingItem.id_item == id_item).first()
    if item is None:
        raise NaoEncontrado("Item do onboarding não encontrado.")
    return item


def marcar_item(db: Session, usuario: Usuario, id_item: int, concluido: bool) -> OnboardingItemOut:
    item = _obter_item(db, id_item)
    registro = (
        db.query(OnboardingProgresso)
        .filter(
            OnboardingProgresso.id_usuario == usuario.id_usuario,
            OnboardingProgresso.id_item == id_item,
        )
        .first()
    )
    if concluido and registro is None:
        db.add(OnboardingProgresso(id_usuario=usuario.id_usuario, id_item=id_item, concluido_em=_agora()))
        db.commit()
    elif not concluido and registro is not None:
        db.delete(registro)
        db.commit()

    out = OnboardingItemOut.model_validate(item)
    out.concluido = concluido
    return out


# ---------------------------------------------------------------- Gestão de itens (ADMIN/RH)


def criar_item(db: Session, dados: OnboardingItemIn, autor: Usuario) -> OnboardingItemOut:
    novo = OnboardingItem(
        tipo=dados.tipo,
        titulo=dados.titulo,
        descricao=dados.descricao,
        ordem=dados.ordem,
        criado_por=autor.id_usuario,
        criado_em=_agora(),
    )
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return OnboardingItemOut.model_validate(novo)


def atualizar_item(db: Session, id_item: int, dados: OnboardingItemIn) -> OnboardingItemOut:
    item = _obter_item(db, id_item)
    item.tipo = dados.tipo
    item.titulo = dados.titulo
    item.descricao = dados.descricao
    item.ordem = dados.ordem
    item.atualizado_em = _agora()
    db.commit()
    db.refresh(item)
    return OnboardingItemOut.model_validate(item)


def excluir_item(db: Session, id_item: int) -> None:
    item = _obter_item(db, id_item)
    db.query(OnboardingProgresso).filter(OnboardingProgresso.id_item == id_item).delete()
    db.delete(item)
    db.commit()


# ---------------------------------------------------------------- Gestão de contatos (ADMIN/RH)


def _obter_contato(db: Session, id_contato: int) -> OnboardingContato:
    contato = db.query(OnboardingContato).filter(OnboardingContato.id_contato == id_contato).first()
    if contato is None:
        raise NaoEncontrado("Contato do onboarding não encontrado.")
    return contato


def _validar_setor(db: Session, id_setor: int | None) -> None:
    if id_setor is not None and db.query(Setor).filter(Setor.id_setor == id_setor).first() is None:
        raise NaoEncontrado("Setor não encontrado.")


def criar_contato(db: Session, dados: OnboardingContatoIn) -> OnboardingContatoOut:
    _validar_setor(db, dados.id_setor)
    novo = OnboardingContato(
        situacao=dados.situacao,
        responsavel=dados.responsavel,
        id_setor=dados.id_setor,
        ramal=dados.ramal,
        observacao=dados.observacao,
        ordem=dados.ordem,
        criado_em=_agora(),
    )
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return OnboardingContatoOut.model_validate(novo)


def atualizar_contato(db: Session, id_contato: int, dados: OnboardingContatoIn) -> OnboardingContatoOut:
    contato = _obter_contato(db, id_contato)
    _validar_setor(db, dados.id_setor)
    contato.situacao = dados.situacao
    contato.responsavel = dados.responsavel
    contato.id_setor = dados.id_setor
    contato.ramal = dados.ramal
    contato.observacao = dados.observacao
    contato.ordem = dados.ordem
    contato.atualizado_em = _agora()
    db.commit()
    db.refresh(contato)
    return OnboardingContatoOut.model_validate(contato)


def excluir_contato(db: Session, id_contato: int) -> None:
    contato = _obter_contato(db, id_contato)
    db.delete(contato)
    db.commit()
