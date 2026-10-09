# Intranet Hospitalar Decós Corporativa

Sistema de intranet para comunicação interna, central de documentos/FAQ e
diretório de colaboradores, dividido em back-end (API) e front-end (SPA).

## Estrutura do repositório

```
.
├── back-End/   # API REST em FastAPI (Python)
└── front-End/  # SPA em React + Vite + Tailwind CSS
```

## Back-end (`back-End/`)

API REST em **FastAPI**, com arquitetura em camadas
(routers → services → repositories → models).

- **Linguagem:** Python 3.11+
- **Framework:** FastAPI
- **Validação/Serialização:** Pydantic v2
- **ORM:** SQLAlchemy 2.0
- **Banco de dados:** SQLite em desenvolvimento, Oracle DB em produção
- **Autenticação:** login próprio (tabela `USUARIOS`) com bcrypt + JWT
- **Documentação da API:** Swagger em `/docs`, Redoc em `/redoc`

### Como rodar

```bash
cd back-End
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

uvicorn app.main:app --reload --port 8000
```

Mais detalhes em [`back-End/README.md`](back-End/README.md).

## Front-end (`front-End/`)

SPA em **React 19 + Vite + Tailwind CSS v4**.

### Como rodar

```bash
cd front-End
pnpm install
pnpm dev
```

O servidor de desenvolvimento sobe em `http://localhost:5173` por padrão.

Mais detalhes em [`front-End/AGENTS.md`](front-End/AGENTS.md).
