"""Regras de negócio do módulo de FAQ — Perguntas Frequentes (UC09 — S3-T2)."""

from datetime import datetime, timezone
import unicodedata

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.exceptions import NaoEncontrado
from app.models.faq import Faq
from app.models.usuario import Usuario
from app.schemas.faq import FaqCategoriaGrupoOut, FaqIn, FaqOut


def _sem_acentos(texto: str | None) -> str:
    if not texto:
        return ""
    nfkd = unicodedata.normalize("NFKD", str(texto))
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower()


def listar_faqs(
    db: Session,
    busca: str | None = None,
    categoria: str | None = None,
) -> list[FaqCategoriaGrupoOut]:
    query = db.query(Faq)

    if busca and busca.strip():
        termo = f"%{busca.strip()}%"
        query = query.filter(
            or_(
                Faq.pergunta.like(termo),
                Faq.resposta.like(termo),
            )
        )

    if categoria and categoria.strip():
        query = query.filter(Faq.categoria.like(categoria.strip()))

    registros = query.order_by(Faq.ordem.asc(), Faq.id_faq.asc()).all()

    grupos_map: dict[str, tuple[str, list[FaqOut]]] = {}
    for item in registros:
        cat_nome = item.categoria.strip()
        chave_cat = _sem_acentos(cat_nome)
        if chave_cat not in grupos_map:
            grupos_map[chave_cat] = (cat_nome, [])
        grupos_map[chave_cat][1].append(FaqOut.model_validate(item))

    chaves_ordenadas = sorted(grupos_map.keys())
    return [
        FaqCategoriaGrupoOut(
            categoria=grupos_map[k][0],
            perguntas=grupos_map[k][1],
        )
        for k in chaves_ordenadas
    ]


def listar_categorias_faq(db: Session) -> list[str]:
    linhas = db.query(Faq.categoria).filter(Faq.categoria.is_not(None)).distinct().all()
    categorias_unicas: dict[str, str] = {}
    for (cat,) in linhas:
        if cat and cat.strip():
            limpa = cat.strip()
            chave = _sem_acentos(limpa)
            if chave not in categorias_unicas:
                categorias_unicas[chave] = limpa
    return [categorias_unicas[k] for k in sorted(categorias_unicas.keys())]


def _obter_modelo_faq(db: Session, id_faq: int) -> Faq:
    faq = db.query(Faq).filter(Faq.id_faq == id_faq).first()
    if faq is None:
        raise NaoEncontrado("Pergunta frequente não encontrada.")
    return faq


def obter_faq(db: Session, id_faq: int) -> FaqOut:
    return FaqOut.model_validate(_obter_modelo_faq(db, id_faq))


def criar_faq(db: Session, dados: FaqIn, autor: Usuario) -> FaqOut:
    novo = Faq(
        pergunta=dados.pergunta.strip(),
        resposta=dados.resposta.strip(),
        categoria=dados.categoria.strip(),
        ordem=dados.ordem,
        id_autor=autor.id_usuario,
        data_criacao=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return FaqOut.model_validate(novo)


def atualizar_faq(db: Session, id_faq: int, dados: FaqIn) -> FaqOut:
    faq = _obter_modelo_faq(db, id_faq)
    faq.pergunta = dados.pergunta.strip()
    faq.resposta = dados.resposta.strip()
    faq.categoria = dados.categoria.strip()
    faq.ordem = dados.ordem
    faq.data_atualizacao = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(faq)
    return FaqOut.model_validate(faq)


def excluir_faq(db: Session, id_faq: int) -> None:
    faq = _obter_modelo_faq(db, id_faq)
    db.delete(faq)
    db.commit()
