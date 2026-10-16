"""Enums de domínio compartilhados entre models, schemas e RBAC."""

from enum import Enum


class Perfil(str, Enum):
    """RN09 — perfis de acesso (RBAC)."""

    ADMINISTRADOR = "Administrador"
    RH = "RH"
    MARKETING = "Marketing"
    COLABORADOR = "Colaborador"


class StatusUsuario(str, Enum):
    """RN02 — usuários inativos não podem autenticar."""

    ATIVO = "Ativo"
    INATIVO = "Inativo"


class Prioridade(str, Enum):
    BAIXA = "Baixa"
    MEDIA = "Média"
    ALTA = "Alta"


class TipoDocumento(str, Enum):
    """RN06 — únicos tipos de arquivo aceitos no upload de documentos."""

    PDF = "PDF"
    DOCX = "DOCX"
