from pydantic import BaseModel, EmailStr

from app.models.enums import Perfil
from app.schemas.usuario import UsuarioOut


class LoginRequest(BaseModel):
    email: EmailStr
    senha: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioOut


class TokenPayload(BaseModel):
    """Formato do payload decodificado do JWT (RN09 — carrega `perfil` e
    `id_usuario` para uso como guard de rota)."""

    sub: EmailStr
    id_usuario: int
    perfil: Perfil
