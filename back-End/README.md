# Intranet Hospitalar Decós Corporativa — Back-end

API REST em **FastAPI**, com **Arquitetura em Camadas** (routers → services →
repositories → models), para o MVP 1.0 da Intranet Hospitalar Decós:
comunicação interna & engajamento, central de documentos & FAQ, e diretório
& ramais.

## Stack

- **Linguagem:** Python 3.11+
- **Framework:** FastAPI (rotas assíncronas suportadas pelo framework)
- **Validação/Serialização:** Pydantic v2
- **ORM:** SQLAlchemy 2.0 (modelos mapeados 1:1 ao schema Oracle da especificação)
- **Banco de dados:** Oracle DB em produção (`oracledb`, thin mode); SQLite por
  padrão em desenvolvimento local, já que a especificação trata a liberação de
  credenciais Oracle como um passo futuro de handover (seção 5 do documento).
- **Autenticação:** login próprio (tabela `USUARIOS`) com hash bcrypt (`passlib`)
  + JWT (`python-jose`).
- **Documentação:** Swagger em `/docs`, Redoc em `/redoc`.

## Arquitetura em camadas

```
app/
├── main.py                    # Entry point FastAPI, middlewares, exception handlers
├── core/
│   ├── config.py              # Variáveis de ambiente e conexão com o banco
│   └── security.py            # Hash bcrypt e geração/validação de JWT
├── db/
│   ├── session.py             # Engine e SessionMaker do SQLAlchemy
│   └── models.py              # Modelos das tabelas Oracle SQL
├── schemas/
│   ├── usuario.py             # Schemas Pydantic (inclui Setor)
│   ├── aviso.py
│   └── documento.py           # Inclui Faq (ver "Extensões" abaixo)
├── repositories/               # Acesso direto ao banco (queries/CRUD)
│   ├── usuario_repository.py
│   ├── aviso_repository.py
│   └── documento_repository.py
├── services/                   # Regras de negócio
│   ├── auth_service.py
│   ├── usuario_service.py
│   ├── aviso_service.py
│   └── documento_service.py
└── api/
    └── v1/
        ├── api.py              # Roteador principal agrupando as rotas
        └── endpoints/
            ├── auth.py
            ├── usuarios.py     # Aniversariantes, contatos/ramais, setores
            ├── avisos.py       # Mural, eventos, comunicados
            └── documentos.py   # POPs e FAQ
```

Cada endpoint delega para um *service* (regra de negócio), que por sua vez
delega para um *repository* (acesso a dado via SQLAlchemy) — nenhuma rota
consulta o banco diretamente.

## Setup

```bash
cd back-End
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# (opcional) popular dados de demonstração
python -m app.scripts.seed

uvicorn app.main:app --reload --port 8000
```

Para usar Oracle, defina em `.env`:

```
DATABASE_URL=oracle+oracledb://usuario:senha@host:1521/?service_name=NOME_SERVICO
```

## Endpoints

### Autenticação & Organização
- `POST /api/v1/auth/login` — login, retorna JWT + dados do usuário
- `POST /api/v1/auth/registrar` — cadastro de colaborador
- `GET /api/v1/usuarios/contatos` — guia de colaboradores/ramais, filtros `id_setor` e `busca`
- `GET /api/v1/usuarios/aniversariantes` — aniversariantes, filtros `mes`, `dia` e `id_setor`
- `GET /api/v1/usuarios/setores` — lista de setores (apoio a filtros do front-end)

### Comunicação
- `GET /api/v1/avisos` — avisos/comunicados, mais recentes primeiro, filtro `categoria`
- `POST /api/v1/avisos` — criação de aviso (autenticado)
- `GET /api/v1/avisos/eventos` — avisos com categoria `Evento`

### Documentos
- `GET /api/v1/documentos` — POPs, filtros `categoria` e `busca` (palavra-chave no título)
- `POST /api/v1/documentos` — cadastro de documento (autenticado)
- `DELETE /api/v1/documentos/{id_doc}` — remoção (autenticado)
- `GET /api/v1/documentos/faq` — perguntas e respostas frequentes
- `POST /api/v1/documentos/faq` — cadastro de item de FAQ (autenticado)

## Extensões além do schema da especificação

O documento de escopo não define tabela própria para FAQ, nem uma coluna de
"andar" em `SETORES` (apesar do texto mencionar diretório "por setor e
andar"). Para fechar o MVP sem reinterpretar o schema oficial, foram
adicionados:

- `FaqModel` → tabela `FAQS` (`ID_FAQ`, `PERGUNTA`, `RESPOSTA`, `CATEGORIA`, `DATA_CRIACAO`)
- `SetorModel.andar` → coluna `SETORES.ANDAR`
