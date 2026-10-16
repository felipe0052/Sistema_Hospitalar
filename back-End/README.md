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
  + JWT (`python-jose`), carregando `id_usuario` e `perfil` no payload para uso
  direto pelo RBAC.
- **Documentação:** Swagger em `/docs`, Redoc em `/redoc`.

## Arquitetura em camadas

```
app/
├── main.py                    # Entry point FastAPI, middlewares, exception handlers, static /uploads
├── core/
│   ├── config.py               # Variáveis de ambiente (DB, JWT, upload)
│   ├── database.py             # Engine, SessionLocal e Base do SQLAlchemy
│   ├── security.py             # Hash bcrypt e geração/validação de JWT
│   └── deps.py                 # get_current_user, guard de senha provisória e require_perfil (RBAC)
├── models/                      # Entidades SQLAlchemy 2.0 (mapeamento 1:1 ao schema Oracle)
│   ├── enums.py                 # Perfil, StatusUsuario, Prioridade, TipoDocumento
│   ├── setor.py · usuario.py · aviso.py · documento.py · faq.py
├── schemas/                     # Schemas Pydantic v2 (Input/Output/DTOs)
│   ├── usuario.py · auth.py · aviso.py · documento.py
├── repositories/                # Acesso direto ao banco (queries/CRUD)
│   ├── usuario_repository.py · aviso_repository.py · documento_repository.py
├── services/                    # Regras de negócio
│   ├── auth_service.py · usuario_service.py · aviso_service.py · documento_service.py
└── routers/                     # Controllers e endpoints HTTP do FastAPI
    ├── __init__.py              # api_router agregador
    └── auth.py · usuarios.py · avisos.py · documentos.py
```

Cada endpoint delega para um *service* (regra de negócio), que por sua vez
delega para um *repository* (acesso a dado via SQLAlchemy) — nenhuma rota
consulta o banco diretamente. Todas as rotas são expostas sob o prefixo
`/api/v1` (definido em `core/config.py`), mantido por compatibilidade com o
front-end já integrado.

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

> O schema é criado via `Base.metadata.create_all()` (MVP acadêmico, sem
> Alembic). Como esse comando só cria tabelas ausentes — não altera tabelas
> já existentes —, se você alterar um model, apague o `.db` local (ou rode
> uma migração manual no Oracle) antes de subir o servidor de novo.

## Regras de negócio implementadas

- **RN02 — Inatividade:** usuários com `status = "Inativo"` são bloqueados no
  login (`auth_service.autenticar`) e também caem se o status mudar depois de
  emitido o token (`core/deps.get_current_user` revalida a cada requisição).
- **RN06 — Upload de POPs/documentos:** `POST /documentos` recebe
  `multipart/form-data`; o service valida `content_type` (apenas PDF ou DOCX)
  e tamanho (padrão 10 MB, configurável via `MAX_UPLOAD_SIZE_MB`) antes de
  salvar o arquivo em `UPLOAD_DIR` (servido em `/uploads`).
- **RN07 — Primeiro acesso:** `UsuarioCreate`/`AlterarSenhaRequest` exigem
  senha com 8+ caracteres, letras e números. Toda conta nasce com
  `senha_provisoria = true`; `core/deps.get_current_user_senha_definitiva`
  bloqueia (403) o acesso às demais rotas protegidas até a troca via
  `PATCH /auth/senha`.
- **RN08 — Autoria de conteúdo:** `aviso_service._pode_gerenciar` permite que
  Administrador edite/exclua qualquer aviso, enquanto RH/Marketing só podem
  gerenciar avisos cujo `id_autor` seja o próprio usuário.
- **RN09 — RBAC:** `core/deps.require_perfil(*perfis)` é a dependência
  reutilizável de guarda de rota; o JWT carrega `perfil` e `id_usuario` para
  evitar round-trip extra ao decidir permissão.

## Setup inicial dos usuários (seed)

O script `app.scripts.seed` cria usuários de demonstração já com
`senha_provisoria = false` (senha: `decos123`) para facilitar testes manuais:

| Email | Perfil |
|---|---|
| mariana.ferreira@decos.com.br | Administrador |
| carlos.mendes@decos.com.br | Colaborador |
| laura.nascimento@decos.com.br | Marketing |

## Endpoints

### Autenticação & Organização
- `POST /api/v1/auth/login` — login, retorna JWT + dados do usuário (bloqueia inativos — RN02)
- `POST /api/v1/auth/registrar` — cadastro de colaborador (valida força da senha — RN07)
- `PATCH /api/v1/auth/senha` — troca de senha (obrigatória no primeiro acesso — RN07)
- `GET /api/v1/usuarios/contatos` — guia de colaboradores/ramais, filtros `id_setor` e `busca`
- `GET /api/v1/usuarios/aniversariantes` — aniversariantes, filtros `mes`, `dia` e `id_setor`
- `GET /api/v1/usuarios/setores` — lista de setores (apoio a filtros do front-end)

### Comunicação
- `GET /api/v1/avisos` — avisos/comunicados, mais recentes primeiro, filtro `categoria`
- `POST /api/v1/avisos` — criação de aviso — Administrador, RH ou Marketing (RN08/RN09)
- `PUT /api/v1/avisos/{id_aviso}` — edição — autor, RH/Marketing, ou Administrador (RN08)
- `DELETE /api/v1/avisos/{id_aviso}` — exclusão — autor, RH/Marketing, ou Administrador (RN08)
- `GET /api/v1/avisos/eventos` — avisos com categoria `Evento`

### Documentos
- `GET /api/v1/documentos` — POPs, filtros `categoria` e `busca` (título, categoria ou palavras-chave)
- `POST /api/v1/documentos` — upload de documento (multipart/form-data) — Administrador ou RH (RN06/RN09)
- `DELETE /api/v1/documentos/{id_doc}` — remoção — Administrador ou RH
- `GET /api/v1/documentos/faq` — perguntas e respostas frequentes
- `POST /api/v1/documentos/faq` — cadastro de item de FAQ — Administrador ou RH

> ⚠️ **Breaking change para o front-end:** `POST /documentos` deixou de
> aceitar JSON com `url_arquivo` e passou a exigir `multipart/form-data` com
> o arquivo real (`arquivo`) + campos de formulário (`titulo`, `categoria`,
> `descricao`, `palavras_chave`, `versao`), por conta da validação de tipo e
> tamanho da RN06. O client em `front-End/src/lib/api.ts` precisa ser
> atualizado para enviar `FormData` nessa rota.

## Extensões além do schema da especificação

O documento de escopo não define tabela própria para FAQ, nem uma coluna de
"andar" em `SETORES` (apesar do texto mencionar diretório "por setor e
andar"). Para fechar o MVP sem reinterpretar o schema oficial, foram
adicionados:

- `FaqModel` → tabela `FAQS` (`ID_FAQ`, `PERGUNTA`, `RESPOSTA`, `CATEGORIA`, `DATA_CRIACAO`)
- `SetorModel.andar` → coluna `SETORES.ANDAR`
