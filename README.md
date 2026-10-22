# Intranet Hospitalar Decós Corporativa

Plataforma web corporativa (uso em desktop interno) do **Hospital Decós** para colaboradores administrativos e assistenciais. Centraliza a comunicação interna (mural de avisos, eventos, aniversariantes), central de documentos (POPs e FAQ) e diretório de colaboradores e ramais telefônicos por setor e andar.

---

## 1. Pré-requisitos

- **Docker** e **Docker Compose** (para o banco Oracle Database 23ai Free)
- **Python 3.12+** (Back-end FastAPI + SQLAlchemy 2.x)
- **Node.js 20+** e **npm** (Front-end React + Vite)

---

## 2. Estrutura do Monorepo

```text
intranet-decos/
├── docker-compose.yml          # Oracle Database 23ai Free local
├── README.md                   # Guia rápido do projeto
├── docs/
│   └── banco.md                # Diagrama ER e documentação das tabelas
├── database/
│   ├── init/                   # Scripts executados automaticamente na 1ª subida do container
│   │   ├── 01_ddl_mvp.sql      # Criação das tabelas do MVP (com 4 perfis)
│   │   ├── 02_indices_views.sql# Índices de performance e view VW_DIRETORIO
│   │   └── 03_seed_base.sql    # 10 setores + ramais, 8 avisos, 6 eventos e 12 FAQs
│   └── 99_reset.sql            # Script manual de reset (DROP de tabelas e views)
├── backend/                    # API REST em Python + FastAPI
└── frontend/                   # SPA em React (Vite) + CSS padrão
```

---

## 3. Como rodar o projeto (em menos de 10 passos)

### Passo 1 — Subir o banco de dados Oracle (Docker)
```bash
docker compose up -d
```
> Na primeira execução, o container executa automaticamente os scripts de `database/init/` em ordem alfabética. Para recriar o banco do zero: `docker compose down -v && docker compose up -d`.
> Conexão via DBeaver / SQL Developer: `localhost:1521`, Service Name `FREEPDB1`, usuário `decos`, senha `decos123`.

### Passo 2 — Configurar o ambiente do Back-end
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

### Passo 3 — Popular usuários de teste (seed)
```bash
python -m scripts.seed_usuarios
```

### Passo 4 — Iniciar o servidor Back-end
```bash
uvicorn app.main:app --reload --port 8000
```
> A documentação interativa (Swagger) estará disponível em `http://localhost:8000/docs` e o healthcheck em `http://localhost:8000/api/v1/health`.

### Passo 5 — Configurar e iniciar o Front-end
Em outro terminal:
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
> Acesse a aplicação em `http://localhost:5173`.

---

## 4. Usuários de Teste

Criados automaticamente pelo script `python -m scripts.seed_usuarios`:

| E-mail | Senha | Perfil | Status |
|---|---|---|---|
| `admin@decos.com.br` | `Admin@123` | `ADMIN` | `ATIVO` |
| `colaborador@decos.com.br` | `Colab@123` | `COLABORADOR` | `ATIVO` |
| `rh@decos.com.br` | `Rh@12345` | `RH` | `ATIVO` |
| `marketing@decos.com.br` | `Mkt@12345` | `MARKETING` | `ATIVO` |
| `inativo@decos.com.br` | `Inativo@123` | `COLABORADOR` | `INATIVO` |

> **Regra de senha:** mínimo de 8 caracteres, contendo pelo menos 1 letra e 1 número.

---

## 5. Testes e Qualidade de Código

### Back-end (`backend/`)
```bash
pytest -v
ruff check .
ruff format --check .
```

### Front-end (`frontend/`)
```bash
npm run lint
npm run build
```
