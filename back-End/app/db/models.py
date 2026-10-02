"""Modelos SQLAlchemy 2.0 — mapeamento 1:1 ao schema Oracle da especificação
do projeto (Intranet Hospitalar Decós Corporativa).

Extensão ao schema oficial: `FaqModel` (tabela FAQS) e `SetorModel.ANDAR`
não existem no DDL Oracle do documento de especificação, mas são
necessários para fechar os módulos "Central de Dúvidas (FAQ)" e
"Diretório por setor e andar" descritos no escopo.
"""

from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class SetorModel(Base):
    __tablename__ = "SETORES"

    id_setor: Mapped[int] = mapped_column("ID_SETOR", Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column("NOME", String(100), nullable=False)
    ramal: Mapped[str | None] = mapped_column("RAMAL", String(10))
    andar: Mapped[str | None] = mapped_column("ANDAR", String(20))

    usuarios: Mapped[list["UsuarioModel"]] = relationship(back_populates="setor")


class UsuarioModel(Base):
    __tablename__ = "USUARIOS"

    id_usuario: Mapped[int] = mapped_column("ID_USUARIO", Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column("NOME", String(150), nullable=False)
    email: Mapped[str] = mapped_column("EMAIL", String(150), unique=True, nullable=False, index=True)
    senha_hash: Mapped[str] = mapped_column("SENHA_HASH", String(255), nullable=False)
    id_setor: Mapped[int | None] = mapped_column("ID_SETOR", ForeignKey("SETORES.ID_SETOR"))
    cargo: Mapped[str | None] = mapped_column("CARGO", String(100))
    data_nascimento: Mapped[date | None] = mapped_column("DATA_NASCIMENTO", Date)
    data_criacao: Mapped[datetime] = mapped_column(
        "DATA_CRIACAO", DateTime(timezone=True), server_default=func.now()
    )

    setor: Mapped["SetorModel"] = relationship(back_populates="usuarios")


class AvisoModel(Base):
    __tablename__ = "AVISOS"

    id_aviso: Mapped[int] = mapped_column("ID_AVISO", Integer, primary_key=True, autoincrement=True)
    titulo: Mapped[str] = mapped_column("TITULO", String(200), nullable=False)
    conteudo: Mapped[str] = mapped_column("CONTEUDO", Text, nullable=False)
    # Ex.: 'Promocao', 'Comunicado', 'Evento'
    categoria: Mapped[str | None] = mapped_column("CATEGORIA", String(50), index=True)
    data_publicacao: Mapped[datetime] = mapped_column(
        "DATA_PUBLICACAO", DateTime(timezone=True), server_default=func.now()
    )
    id_autor: Mapped[int | None] = mapped_column("ID_AUTOR", ForeignKey("USUARIOS.ID_USUARIO"))

    autor: Mapped["UsuarioModel"] = relationship()


class DocumentoModel(Base):
    __tablename__ = "DOCUMENTOS"

    id_doc: Mapped[int] = mapped_column("ID_DOC", Integer, primary_key=True, autoincrement=True)
    titulo: Mapped[str] = mapped_column("TITULO", String(200), nullable=False)
    categoria: Mapped[str | None] = mapped_column("CATEGORIA", String(100), index=True)
    url_arquivo: Mapped[str] = mapped_column("URL_ARQUIVO", String(500), nullable=False)
    data_upload: Mapped[datetime] = mapped_column(
        "DATA_UPLOAD", DateTime(timezone=True), server_default=func.now()
    )


class FaqModel(Base):
    __tablename__ = "FAQS"

    id_faq: Mapped[int] = mapped_column("ID_FAQ", Integer, primary_key=True, autoincrement=True)
    pergunta: Mapped[str] = mapped_column("PERGUNTA", String(300), nullable=False)
    resposta: Mapped[str] = mapped_column("RESPOSTA", Text, nullable=False)
    categoria: Mapped[str | None] = mapped_column("CATEGORIA", String(100), index=True)
    data_criacao: Mapped[datetime] = mapped_column(
        "DATA_CRIACAO", DateTime(timezone=True), server_default=func.now()
    )
