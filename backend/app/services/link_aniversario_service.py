from datetime import datetime

from sqlalchemy.orm import Session

from app.core.exceptions import NaoEncontrado
from app.models.configuracao_aniversario import (
    ASSINATURA_ANIVERSARIO_PADRAO,
    MENSAGEM_ANIVERSARIO_PADRAO,
    TITULO_ANIVERSARIO_PADRAO,
    ConfiguracaoAniversario,
)
from app.models.link_aniversario import LinkAniversario
from app.models.usuario import Usuario
from app.schemas.link_aniversario import (
    ConfiguracaoAniversarioIn,
    ConfiguracaoAniversarioOut,
    LinkAniversarioIn,
    LinkAniversarioOut,
)


def listar_ativos(db: Session) -> list[LinkAniversarioOut]:
    itens = (
        db.query(LinkAniversario)
        .filter(LinkAniversario.ativo == 1)
        .order_by(LinkAniversario.id.asc())
        .all()
    )
    return [LinkAniversarioOut.model_validate(item) for item in itens]


def listar_todos(db: Session) -> list[LinkAniversarioOut]:
    itens = db.query(LinkAniversario).order_by(LinkAniversario.id.asc()).all()
    return [LinkAniversarioOut.model_validate(item) for item in itens]


def _buscar_por_id(db: Session, id_link: int) -> LinkAniversario:
    link = db.query(LinkAniversario).filter(LinkAniversario.id == id_link).first()
    if not link:
        raise NaoEncontrado("Link de aniversário não encontrado.")
    return link


def criar_link(db: Session, dados: LinkAniversarioIn, usuario: Usuario) -> LinkAniversarioOut:
    novo = LinkAniversario(
        titulo=dados.titulo,
        url=dados.url,
        ativo=1 if dados.ativo else 0,
        criado_por=usuario.id_usuario,
        criado_em=datetime.now(),
    )
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return LinkAniversarioOut.model_validate(novo)


def atualizar_link(db: Session, id_link: int, dados: LinkAniversarioIn) -> LinkAniversarioOut:
    link = _buscar_por_id(db, id_link)
    link.titulo = dados.titulo
    link.url = dados.url
    link.ativo = 1 if dados.ativo else 0
    link.atualizado_em = datetime.now()
    db.commit()
    db.refresh(link)
    return LinkAniversarioOut.model_validate(link)


def excluir_link(db: Session, id_link: int) -> None:
    link = _buscar_por_id(db, id_link)
    db.delete(link)
    db.commit()


def obter_configuracao(db: Session) -> ConfiguracaoAniversarioOut:
    config = db.query(ConfiguracaoAniversario).order_by(ConfiguracaoAniversario.id.asc()).first()
    if not config:
        return ConfiguracaoAniversarioOut(
            mensagem=MENSAGEM_ANIVERSARIO_PADRAO,
            titulo=TITULO_ANIVERSARIO_PADRAO,
            assinatura=ASSINATURA_ANIVERSARIO_PADRAO,
            atualizado_em=None,
        )
    return ConfiguracaoAniversarioOut(
        mensagem=config.mensagem or MENSAGEM_ANIVERSARIO_PADRAO,
        titulo=config.titulo or TITULO_ANIVERSARIO_PADRAO,
        assinatura=config.assinatura or ASSINATURA_ANIVERSARIO_PADRAO,
        atualizado_em=config.atualizado_em,
    )


def atualizar_configuracao(
    db: Session, dados: ConfiguracaoAniversarioIn, usuario: Usuario
) -> ConfiguracaoAniversarioOut:
    config = db.query(ConfiguracaoAniversario).order_by(ConfiguracaoAniversario.id.asc()).first()
    if not config:
        config = ConfiguracaoAniversario(
            mensagem=dados.mensagem,
            titulo=dados.titulo or TITULO_ANIVERSARIO_PADRAO,
            assinatura=dados.assinatura or ASSINATURA_ANIVERSARIO_PADRAO,
            atualizado_por=usuario.id_usuario,
            atualizado_em=datetime.now(),
        )
        db.add(config)
    else:
        config.mensagem = dados.mensagem
        config.titulo = dados.titulo or TITULO_ANIVERSARIO_PADRAO
        config.assinatura = dados.assinatura or ASSINATURA_ANIVERSARIO_PADRAO
        config.atualizado_por = usuario.id_usuario
        config.atualizado_em = datetime.now()

    db.commit()
    db.refresh(config)
    return ConfiguracaoAniversarioOut(
        mensagem=config.mensagem,
        titulo=config.titulo or TITULO_ANIVERSARIO_PADRAO,
        assinatura=config.assinatura or ASSINATURA_ANIVERSARIO_PADRAO,
        atualizado_em=config.atualizado_em,
    )
