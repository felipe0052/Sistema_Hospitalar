"""Modelos SQLAlchemy 2.0 — mapeamento 1:1 ao schema Oracle da especificação
do projeto (Intranet Hospitalar Decós Corporativa), com as extensões
documentadas em `faq.py` e `setor.py`.

Todos os models são importados aqui para garantir que o metadata do
SQLAlchemy conheça as tabelas (e as relações entre elas) antes de
`Base.metadata.create_all()` ser chamado em `app.main`.
"""

from app.models.aviso import AvisoModel
from app.models.documento import DocumentoModel
from app.models.enums import Perfil, Prioridade, StatusUsuario, TipoDocumento
from app.models.faq import FaqModel
from app.models.setor import SetorModel
from app.models.usuario import UsuarioModel

__all__ = [
    "AvisoModel",
    "DocumentoModel",
    "FaqModel",
    "Perfil",
    "Prioridade",
    "SetorModel",
    "StatusUsuario",
    "TipoDocumento",
    "UsuarioModel",
]
