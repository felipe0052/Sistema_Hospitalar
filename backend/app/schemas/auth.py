from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.usuario import UsuarioOut


class LoginRequest(BaseModel):
    email: EmailStr = Field(max_length=150)
    senha: str = Field(min_length=1)

    @field_validator("email", mode="before")
    @classmethod
    def _normalizar_email(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().lower()
        return v


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioOut
