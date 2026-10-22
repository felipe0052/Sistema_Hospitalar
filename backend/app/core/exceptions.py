from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class AppError(Exception):
    """Exceção base padronizada da aplicação (§4 do Contexto Global)."""

    status_code: int = status.HTTP_400_BAD_REQUEST

    def __init__(self, detail: str, erros: dict[str, str] | None = None, status_code: int | None = None):
        super().__init__(detail)
        self.detail = detail
        self.erros = erros
        if status_code is not None:
            self.status_code = status_code


class RegraNegocio(AppError):
    status_code = status.HTTP_400_BAD_REQUEST


class NaoAutorizado(AppError):
    status_code = status.HTTP_401_UNAUTHORIZED


class Proibido(AppError):
    status_code = status.HTTP_403_FORBIDDEN


class NaoEncontrado(AppError):
    status_code = status.HTTP_404_NOT_FOUND


class Conflito(AppError):
    status_code = status.HTTP_409_CONFLICT


def _traduzir_mensagem_validacao(err: dict) -> str:
    tipo = err.get("type", "")
    msg = str(err.get("msg", ""))
    ctx = err.get("ctx", {}) or {}

    if msg.startswith("Value error, "):
        return msg.replace("Value error, ", "", 1)

    if tipo == "missing":
        return "Este campo é obrigatório."
    if tipo == "string_too_short":
        min_len = ctx.get("min_length", 1)
        if min_len <= 1:
            return "Este campo é obrigatório."
        return f"Deve ter pelo menos {min_len} caracteres."
    if tipo == "string_too_long":
        max_len = ctx.get("max_length", "")
        return f"Deve ter no máximo {max_len} caracteres."
    if "value is not a valid email" in msg.lower() or tipo.startswith("value_error"):
        if "email" in msg.lower() or "e-mail" in msg.lower():
            return "Informe um e-mail corporativo válido."
        return msg
    if tipo in ("date_from_datetime_parsing", "date_parsing"):
        return "Data inválida. Use o formato AAAA-MM-DD."
    if tipo == "enum" or tipo == "literal_error":
        return "Valor inválido para este campo."
    if tipo in ("int_parsing", "float_parsing"):
        return "Informe um número válido."

    return msg or "Valor inválido."


def registrar_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
        conteudo: dict = {"detail": exc.detail}
        if exc.erros:
            conteudo["erros"] = exc.erros
        return JSONResponse(status_code=exc.status_code, content=conteudo)

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
        erros: dict[str, str] = {}
        for err in exc.errors():
            loc = [str(p) for p in err.get("loc", []) if p not in ("body", "query", "path")]
            campo = loc[-1] if loc else "geral"
            if campo not in erros:
                erros[campo] = _traduzir_mensagem_validacao(err)

        detail = next(iter(erros.values()), "Dados obrigatórios ausentes ou em formato inválido.")
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "detail": detail,
                "erros": erros,
            },
        )
