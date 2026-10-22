# Intranet Hospitalar Decós Corporativa — Back-end (API)

API REST em **Python 3.12 + FastAPI + SQLAlchemy 2.x** seguindo estritamente o `00_CONTEXTO_GLOBAL.md`.

## Estrutura (`app/`)

- `main.py` — Aplicação FastAPI, CORS, handlers de exceção padronizados (`{ detail, erros }`), rota `/api/v1/health` e inclusão dos routers sob `/api/v1`.
- `core/`
  - `config.py` — `Settings(BaseSettings)` lendo `.env`.
  - `database.py` — Engine SQLAlchemy, ajuste de sessão Oracle (`NLS_COMP=LINGUISTIC`, `NLS_SORT=BINARY_AI`, `TIME_ZONE='America/Sao_Paulo'`), `SessionLocal` e `get_db`.
  - `security.py` — Hash/verificação de senha com `bcrypt` e geração/decodificação de JWT HS256 (`{ sub, perfil, ver, exp }`).
  - `deps.py` — `get_current_user` (valida token, status `ATIVO` e `VERSAO_TOKEN`) e `require_roles(*perfis)`.
  - `exceptions.py` — `AppError`, `RegraNegocio` (400), `NaoAutorizado` (401), `Proibido` (403), `NaoEncontrado` (404), `Conflito` (409) e handlers para `AppError` e `RequestValidationError` (422).
- `models/` — Modelos SQLAlchemy 2.0 mapeando as 8 tabelas do MVP (`Setor`, `Ramal`, `Usuario`, `HistoricoAcesso`, `Aviso`, `Evento`, `Documento`, `Faq`).
- `schemas/` — Schemas Pydantic v2 (`auth.py`, `usuario.py`).
- `services/` — Regras de negócio (`auth_service.py`, `usuario_service.py`).
- `routers/` — Endpoints HTTP da Semana 1 (`auth.py`, `usuarios.py`).
- `scripts/seed_usuarios.py` — Cria os 10 setores base, os 5 usuários de teste obrigatórios (§9) e 25 colaboradores fictícios.
- `tests/` — Suíte automatizada com `pytest` + `TestClient` (`test_auth.py`, `test_usuarios.py`).
