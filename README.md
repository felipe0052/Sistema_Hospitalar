# 🏥 Intranet Hospitalar Decós Corporativa — Squad 49

![Status do Projeto](https://img.shields.io/badge/Status-MVP%20Conclu%C3%ADdo%20(v1.0--mvp)-success?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Oracle](https://img.shields.io/badge/Oracle%20Database-23ai%20Free-F80000?style=for-the-badge&logo=oracle&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)

Plataforma web corporativa desenvolvida pelo **Squad 49** para o **Hospital Decós**, projetada para centralizar a comunicação interna, a gestão e consulta de Procedimentos Operacionais Padrão (POPs), a agenda institucional, a central de dúvidas (FAQ) e o diretório de colaboradores e ramais telefônicos organizados por setor e andar.

---

## 📌 1. Apresentação e Proposta de Valor

### O Problema
A comunicação interna hospitalar sofria com alta fragmentação: comunicados importantes se perdiam em grupos de mensagens e murais físicos (afetando especialmente equipes de plantão noturno e de fim de semana), POPs extensos em PDF ficavam dispersos em pastas de rede sem controle claro de vigência, listas de ramais impressas encontravam-se desatualizadas e o setor de RH recebia diariamente dúvidas repetitivas sobre normas, férias e benefícios.

### A Solução
A **Intranet Hospitalar Decós Corporativa** unifica a rotina informacional dos colaboradores administrativos e assistenciais em um portal único, rápido, seguro e acessível:
- **Fonte única de verdade para protocolos assistenciais e administrativos:** Repositório de POPs e documentos com busca instantânea, controle automático de versão vigente e leitor de PDF integrado.
- **Comunicação direcionada e engajamento:** Mural de avisos com controle de expiração e destaques corporativos, agenda de treinamentos/eventos com calendário interativo e mural de aniversariantes do mês.
- **Agilidade operacional no atendimento:** Diretório de colaboradores ativos e guia rápido de ramais agrupado por andar e setor hospitalar.
- **Governança e Segurança (RBAC):** Controle de acesso baseado em 4 perfis (`ADMIN`, `RH`, `MARKETING` e `COLABORADOR`), além de suporte a navegação em **Modo Leitura (Visitante)** para consulta rápida nos terminais do hospital.

---

## 📊 2. Status do Projeto e Progresso das Entregas

O planejamento do projeto está estruturado em **6 semanas**, dividido entre **Prioridade 1 (MVP — Semanas 1 a 4)** e **Prioridade 2 (Extras e IA — Semanas 5 e 6)**.

> **Status Atual:** ✅ **Semanas 1 a 4 concluídas e homologadas (`v1.0-mvp`)** — 100% dos 12 Casos de Uso (`UC01` a `UC12`) e requisitos de segurança (`RNF03`) implementados e validados com 57 testes automatizados no back-end.

| Fase / Semana | Escopo Principal | Casos de Uso / Entregáveis | Status |
| :--- | :--- | :--- | :---: |
| **Semana 1** | Infraestrutura Docker, DDL Oracle 23ai (8 tabelas + views + seeds), Autenticação JWT, Gestão de Usuários e Auditoria, Base React e Design System | `UC01`, `UC02`, `UC03`, Catálogo `/_componentes` | ✅ **Concluída** |
| **Semana 2** | Mural de Avisos e Notícias Corporativas, Agenda de Eventos (Lista e Calendário), API e Tela do Dashboard Integrado, Consultas Analíticas | `UC04`, `UC05`, `UC12`, Dashboard (`/`) | ✅ **Concluída** |
| **Semana 3** | Central de Documentos e POPs (`StorageService`, Magic Bytes, Versionamento, Visualizador PDF), Central de Ajuda (FAQ) e Gestão de Setores e Ramais | `UC06`, `UC07`, `UC08`, `UC09`, Coleção Postman | ✅ **Concluída** |
| **Semana 4** | Diretório de Colaboradores e Guia de Ramais por Andar, Aniversariantes do Mês, Blindagem de Segurança (Rate Limit, RBAC, Headers), Docker Full-Stack e QA | `UC10`, `UC11`, `RNF03`, Homologação `v1.0-mvp` | ✅ **Concluída** |
| **Semana 5** | *Extras Parte 1:* Mural de Reconhecimentos, Contador de Avisos Não Lidos, Avisos Urgentes, Extração de Texto e Indexação Vetorial (`Oracle VECTOR`) + Sugestão de Metadados com IA | Evoluções da Entrega Parcial (Prioridade 2) | 🔜 *Próxima Fase (Roadmap)* |
| **Semana 6** | *Extras Parte 2:* Assistente de IA (RAG) para POPs com citação de fonte, guardrails e fallback, Autocomplete de busca, Carrossel de Urgentes e Entrega Final | Assistente RAG, Polimento e Release `v2.0` | 📅 *Planejada (Roadmap)* |

---

## ⚙️ 3. Funcionalidades e Módulos Implementados

Abaixo estão detalhados todos os recursos que **já estão implementados e operacionais** no sistema:

### 🔐 3.1. Autenticação, Controle de Acesso (RBAC) e Modo Visitante (`UC01`, `UC02`, `UC03`)
- **Autenticação JWT (`POST /api/v1/auth/login` e `GET /api/v1/auth/me`):** Senhas criptografadas com `bcrypt`, tokens assinados com `HS256` e validação automática de sessão ativa a cada requisição e ao focar a janela.
- **Revogação Instantânea de Sessão (`VERSAO_TOKEN`):** Qualquer redefinição de senha, inativação de conta ou alteração de perfil incrementa a versão do token no banco, invalidando imediatamente tokens antigos.
- **Proteção contra Força Bruta (`RNF03`):** Controle de tentativas inválidas de login por IP/e-mail com bloqueio temporário automático (`HTTP 429 Too Many Requests` após 5 falhas em 15 minutos).
- **Modo Leitura / Visitante (`modoLeitura`):** Terminais sem usuário logado podem consultar os painéis informativos do Portal do Colaborador em modo somente visualização (identificado pelo badge *"Modo Leitura"* no cabeçalho), com botão rápido de *"Entrar / Login"* e ocultação total de botões administrativos.
- **Gestão de Usuários e Auditoria (`/admin/usuarios`):**
  - Cadastro e edição de usuários (`ADMIN` e `RH`), filtros combinados por busca textual, setor, perfil e status.
  - Controle estrito de acesso (exclusivo `ADMIN`) para alternar perfis (`ADMIN`, `COLABORADOR`, `RH`, `MARKETING`) e status (`ATIVO`, `INATIVO`), com trava contra auto-inativação ou auto-rebaixamento do próprio administrador.
  - **Trilha de Auditoria (`HISTORICO_ACESSO`):** Registro completo de data/hora, administrador responsável, campo modificado (`PERFIL` ou `STATUS`), valor anterior e novo valor.

### 🏠 3.2. Dashboard Corporativo Integrado (`/`)
- Saudação dinâmica personalizada conforme o período do dia (*Bom dia / Boa tarde / Boa noite*) e data atual por extenso.
- **Endpoint Consolidado (`GET /api/v1/dashboard`):** Carrega em uma única chamada os **Avisos em Destaque** (até 5), **Últimos Comunicados** (5), **Próximos Eventos** (5), **Aniversariantes do Dia** e o **Total de Aniversariantes do Mês**, com *Skeletons* independentes por bloco.

### 📢 3.3. Mural de Avisos e Notícias (`/avisos` e `/avisos/:id` — `UC04`, `UC05`)
- Listagem de comunicados vigentes (`DATA_EXPIRACAO IS NULL OR DATA_EXPIRACAO >= HOJE`), seção de Destaques no topo, busca em tempo real com *debounce* e filtro rápido por categorias (`NOTICIA`, `COMUNICADO`, `PROMOCAO`, `MUDANCA_SETOR`, `DESTAQUE_CORPORATIVO`).
- **Gestão de Publicações (`ADMIN`, `RH`, `MARKETING`):** Modal de criação/edição com sanitização de HTML segura, marcação de destaque, validação de data de expiração e modo de gestão (`GET /api/v1/avisos/gestao?incluir_expirados=true`) que identifica comunicados expirados.

### 📅 3.4. Agenda e Mural de Eventos (`/eventos` — `UC12`)
- **Dupla Visualização:** Alternância entre **Modo Lista** (exibindo apenas eventos futuros a partir da data atual) e **Modo Calendário Mensal** (grade interativa com marcadores de eventos por dia e componente `MiniCalendario`).
- Filtros por categoria (`TREINAMENTO`, `ACAO_INTERNA`, `INSTITUCIONAL`, `OUTRO`), setor organizador e termo de busca.
- Modal de detalhes do evento e gestão completa (criação, edição e exclusão com confirmação) para `ADMIN` e `MARKETING`.

### 📄 3.5. Central de Documentos e POPs (`/documentos` — `UC06`, `UC07`)
- **Upload Seguro (`StorageService`):** Validação dupla por extensão (`.pdf`, `.docx`) e assinatura de bytes (**Magic Bytes**: `%PDF` e `PK\x03\x04`), limite de `20 MB` (`HTTP 413`), rejeição de executáveis/formatos inválidos (`HTTP 415`), proteção contra *Path Traversal* e armazenamento isolado com chaves UUID (`documentos/<uuid4>.<ext>`).
- **Versionamento Automático e Histórico:** O envio de um novo documento com mesmo tipo e título cria automaticamente uma nova versão (`VERSAO + 1`), define-a como ativa (`ATIVO = 'S'`) e arquiva a anterior (`ATIVO = 'N'`). Gestores (`ADMIN` e `RH`) contam com filtro de versões inativas e modal de **Histórico de Versões** (`/api/v1/documentos/{id}/versoes`).
- **Visualizador Embutido e Download:** Leitura de PDFs em modal de tela cheia (`Content-Disposition: inline`) e download direto para PDF/DOCX (`?download=true`).
- Pesquisa textual sem diferenciar maiúsculas ou acentos em título, categoria, descrição e palavras-chave (chips interativos).

### ❓ 3.6. Central de Ajuda / FAQ (`/faq` — `UC09`)
- Perguntas e respostas agrupadas alfabeticamente por categoria (`Benefícios`, `Escalas`, `Férias`, `Normas Hospitalares`, etc.) e ordenadas pelo campo `ORDEM`.
- Interface em acordeão acessível (`aria-expanded`) com busca instantânea em perguntas e respostas e grifo automático (`<mark>`) dos termos pesquisados.
- Cadastro, edição, ordenação e exclusão de perguntas para `ADMIN` e `RH`.

### 🏢 3.7. Gestão Administrativa de Setores e Ramais (`/admin/setores` — `UC08`)
- Listagem de setores com andar, badges de ramais vinculados e contagem em tempo real de colaboradores alocados (`total_usuarios`).
- Modal dinâmico permitindo cadastrar ou editar um setor com **múltiplos ramais** (validação de 3 a 10 dígitos numéricos e unicidade global de ramal e nome de setor).
- Proteção de integridade referencial: bloqueia a exclusão de setores que possuam usuários vinculados (`HTTP 409 Conflict`).

### ☎️ 3.8. Diretório de Colaboradores e Guia de Ramais (`/diretorio` — `UC10`)
- **Aba Colaboradores:** Consulta paginada restrita exclusivamente a colaboradores com status `ATIVO` (via `VW_DIRETORIO`), filtros rápidos por setores hospitalares (UTI, Pronto-Socorro, Centro Cirúrgico, Pediatria, Farmácia, Recepção, Administração), andar e busca por nome/cargo. Trata colaboradores sem lotação com o aviso *"Setor não informado"* e oferece modal de detalhes com botões **"Copiar Ramal"** e **"Copiar E-mail"**.
- **Aba Guia de Ramais:** Mapa telefônico estruturado por andar (`Térreo`, `1º andar`, `2º andar`...) e setor, com descrição do ponto de atendimento e cópia rápida em um clique.

### 🎂 3.9. Mural de Aniversariantes do Mês (`/aniversariantes` — `UC11`)
- Navegação entre todos os meses do ano, filtro por dia específico (1 a 31), filtro por setor, busca por nome e atalho rápido **"Hoje"**.
- **Destaque do Dia:** Moldura comemorativa e badge *"Aniversariante do dia!"* para os colegas que celebram na data corrente.
- **Privacidade por Design (`UC11`):** Apenas colaboradores `ATIVO` são exibidos, e tanto a API quanto o front-end jamais expõem o ano de nascimento ou a idade.

### 🎨 3.10. Experiência de Interface, Temas e Biblioteca de Componentes
- **Tema Claro e Escuro (`Light / Dark Mode`):** Gerenciado pelo hook `useTheme` e `styles/dark.css`, com botão de alternância no `Header`, persistência em `localStorage` (`decos.theme`) e sincronização instantânea entre abas.
- **Botão Flutuante de Acesso Rápido (`QuickAccessFab`):** Menu FAB no canto inferior direito para salto imediato entre as 7 áreas principais do Portal do Colaborador, com fechamento automático por `ESC` ou clique externo.
- **Design System Próprio (`src/components/ui/` e `/_componentes`):** Biblioteca padronizada contendo `Button`, `Input`, `Textarea`, `Select`, `DateInput` (seletor de data customizado), `SearchInput`, `Modal`, `ConfirmDialog`, `Table`, `Pagination`, `Badge`, `Card`, `Skeleton`, `EmptyState`, `ErrorBanner`, `Toast` e `MiniCalendario`.

---

## 🛠️ 4. Stack Tecnológica

### Front-end (`Sistema_Hospitalar/frontend`)
- **Core:** React 19 + Vite 8 + TypeScript / JSX
- **Roteamento & HTTP:** React Router DOM v7 + Axios (com interceptors de JWT e tradução padronizada de erros)
- **Estilização:** Tailwind CSS v4 + CSS Custom Properties (`variables.css`, `dark.css`, `global.css`) seguindo a paleta corporativa bordô/vinho (`#800020`) do Hospital Decós
- **Qualidade & Testes E2E:** TypeScript (`tsc --noEmit`), `oxfmt` e Playwright (`@playwright/test`)

### Back-end (`Sistema_Hospitalar/backend`)
- **Framework:** Python 3.12 + FastAPI + Uvicorn (Swagger UI em `/docs` e ReDoc em `/redoc`)
- **ORM & Banco:** SQLAlchemy 2.x (tipagem moderna `Mapped[...]`) + driver `python-oracledb` (modo *thin*, sem necessidade de Oracle Instant Client)
- **Validação & Configuração:** Pydantic v2 + `pydantic-settings` + `email-validator`
- **Segurança:** `bcrypt` (hashing de senhas), `PyJWT` (tokens `HS256`), Middleware de Security Headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) e Rate Limiter em memória
- **Manipulação de Arquivos:** `python-multipart`, `pypdf`, `python-docx` e camada `StorageService` (`LocalStorage`)
- **Qualidade & Testes:** `pytest` + `httpx` (`TestClient`) + `Ruff` (linter e formatador)

### Banco de Dados & Infraestrutura (`Sistema_Hospitalar/database` & Docker)
- **Banco Principal:** **Oracle Database 23ai Free** (`gvenzl/oracle-free:23-slim`) configurado com `NLS_COMP=LINGUISTIC` e `NLS_SORT=BINARY_AI` (buscas insensíveis a maiúsculas e acentuação) e timezone `America/Sao_Paulo`.
- **Fallback Local / Testes:** Suporte transparente a **SQLite** com funções customizadas registradas na conexão (`SEM_ACENTOS` e `LIKE` linguístico) para execução de testes automatizados e desenvolvimento rápido quando o Docker não estiver ativo.
- **Containerização:** `docker-compose.yml` orquestrando `oracle`, `backend` (Python 3.12-slim com usuário não-root `appuser`) e `frontend`, acompanhado dos scripts `iniciar.sh` e `parar.sh`.

---

## 📂 5. Estrutura de Pastas

O espaço de trabalho está organizado da seguinte forma, tendo o repositório principal da aplicação dentro de `Sistema_Hospitalar/`:

```text
Projeto Squad 49/
├── README.md                           # Documentação principal do projeto
├── Planejamento/                       # Planejamento técnico das 6 semanas e contexto global
│   ├── 00_CONTEXTO_GLOBAL.md           # Fonte única de verdade técnica (arquitetura, DDL, contratos)
│   ├── README.md                       # Cronograma, regras de Git e divisão do Squad 49
│   └── SEMANA_1.md ... SEMANA_6.md     # Especificação detalhada das tarefas por semana
├── Documentos/                         # Artefatos de especificação, casos de uso, backlog e logos
└── Sistema_Hospitalar/                 # Repositório principal da aplicação (Monorepo Full-Stack)
    ├── docker-compose.yml              # Orquestração: Oracle 23ai Free + Back-end + Front-end
    ├── iniciar.sh                      # Script inteligente de inicialização (Docker, --dev ou SQLite)
    ├── parar.sh                        # Script de encerramento seguro dos serviços
    ├── README.md                       # Guia do repositório da aplicação
    ├── database/
    │   ├── init/                       # Executados automaticamente na 1ª subida do container Oracle
    │   │   ├── 01_ddl_mvp.sql          # Criação das 8 tabelas do MVP e constraints
    │   │   ├── 02_indices_views.sql    # Índices de performance e view VW_DIRETORIO
    │   │   └── 03_seed_base.sql        # Massa inicial: 10 setores, ramais, avisos, eventos e FAQs
    │   ├── migrations_*.sql            # Scripts incrementais (versionamento de POPs e categorias)
    │   └── 99_reset.sql                # Script manual para DROP total de tabelas e views
    ├── docs/
    │   ├── banco.md                    # Diagrama ER e dicionário resumido das tabelas
    │   ├── consultas.md                # Consultas analíticas SQL e planos de execução
    │   ├── deploy.md                   # Guia de arquitetura de implantação
    │   ├── api/colecao.json            # Coleção Postman/Insomnia com todos os endpoints da API
    │   ├── exemplos-pops/              # 7 arquivos reais de POPs/documentos hospitalares (PDF/DOCX)
    │   └── qa/                         # Roteiro de testes (roteiro_mvp.md) e Relatório de Homologação
    ├── backend/                        # API REST em Python 3.12 + FastAPI
    │   ├── Dockerfile                  # Container de produção (usuário não-root)
    │   ├── .env.example                # Modelo de variáveis de ambiente do back-end
    │   ├── requirements.txt            # Dependências Python
    │   ├── pyproject.toml              # Configuração do Pytest e Ruff
    │   ├── scripts/
    │   │   ├── seed_usuarios.py        # Popula setores, 5 contas de perfil e 25 colaboradores ativos
    │   │   └── seed_documentos.py      # Popula os POPs hospitalares de exemplo no storage e banco
    │   ├── app/
    │   │   ├── main.py                 # Entrypoint FastAPI, middlewares de segurança, CORS e routers
    │   │   ├── core/                   # config.py, database.py, security.py, deps.py, exceptions.py
    │   │   ├── models/                 # Models SQLAlchemy 2.0 (Usuario, Setor, Ramal, Aviso, etc.)
    │   │   ├── schemas/                # Contratos Pydantic v2 de entrada/saída e paginação
    │   │   ├── services/               # Camada de regras de negócio isolada por domínio
    │   │   ├── routers/                # Endpoints REST sob /api/v1 (10 routers + healthcheck)
    │   │   └── storage/                # StorageService e LocalStorage para arquivos PDF/DOCX
    │   └── tests/                      # 11 arquivos de teste (57 testes automatizados com Pytest)
    └── frontend/                       # SPA em React 19 + Vite 8
        ├── Dockerfile                  # Container de build e execução do front-end
        ├── .env.example                # Modelo de variáveis de ambiente (VITE_API_URL, VITE_USE_MOCKS)
        ├── package.json                # Dependências e scripts npm
        ├── playwright.config.ts        # Configuração de testes E2E com Playwright
        ├── e2e/                        # Testes ponta a ponta (login.spec.ts)
        └── src/
            ├── api/                    # Cliente Axios (client.js) e módulos de serviço por recurso
            ├── contexts/               # AuthContext.jsx (sessão, expiração e modo leitura)
            ├── hooks/                  # useAuth, useFetch, useDebounce, useTheme
            ├── components/
            │   ├── layout/             # AppLayout, Sidebar, Header, QuickAccessFab
            │   └── ui/                 # 16 componentes reutilizáveis do Design System
            ├── pages/                  # 13 páginas (Dashboard, Avisos, Eventos, Documentos, etc.)
            ├── routes/                 # AppRoutes, PrivateRoute, PermissaoRoute, AdminRoute
            ├── mocks/                  # Dados mockados padronizados para fallback de desenvolvimento
            └── styles/                 # variables.css, global.css e dark.css
```

---

## 🚀 6. Como Executar o Projeto Localmente

### 6.1. Pré-requisitos
- **Docker** e **Docker Compose** (para o banco Oracle Database 23ai Free ou execução full-stack containerizada)
- **Python 3.12+** (para execução local do back-end)
- **Node.js 20+** e **npm** (para execução local do front-end)

---

### 6.2. Opção A — Inicialização Rápida com Script Automatizado (`iniciar.sh`)

Na pasta `Sistema_Hospitalar/`, o projeto conta com scripts utilitários que detectam automaticamente o ambiente:

```bash
cd Sistema_Hospitalar

# 1. Modo Docker Completo (sobe Oracle + Back-end + Front-end em containers):
./iniciar.sh

# 2. Modo Desenvolvimento Híbrido (sobe o Oracle no Docker e roda Back-end e Front-end localmente):
./iniciar.sh --dev

# Para encerrar todos os serviços e pausar os containers com segurança:
./parar.sh
```
> **Nota:** Caso o Docker não esteja instalado ou em execução na máquina, o `./iniciar.sh` inicia automaticamente o Back-end em **modo fallback SQLite (`hospital.db`)** junto com o Front-end local.

---

### 6.3. Opção B — Passo a Passo Manual (Desenvolvimento Local)

#### Passo 1 — Subir o Banco de Dados Oracle 23ai no Docker
```bash
cd Sistema_Hospitalar
docker compose up -d oracle
```
- Na primeira execução, o container executa automaticamente os scripts de `database/init/` (`01_ddl_mvp.sql`, `02_indices_views.sql` e `03_seed_base.sql`).
- Para acompanhar até o banco ficar saudável (`healthy`): `docker compose ps` ou `docker logs -f intranet-decos-oracle`.
- **Dados de conexão (DBeaver / SQL Developer):** Host `localhost`, Porta `1521`, Service Name `FREEPDB1`, Usuário `decos`, Senha `decos123`.

#### Passo 2 — Configurar e Iniciar o Back-end (FastAPI)
Em um terminal na pasta `Sistema_Hospitalar/backend`:
```bash
cd Sistema_Hospitalar/backend

# Criar e ativar o ambiente virtual Python
python3 -m venv .venv
source .venv/bin/activate

# Instalar as dependências
pip install -r requirements.txt

# Configurar as variáveis de ambiente
cp .env.example .env
```

Verifique o arquivo `.env` (por padrão já aponta para o Oracle local em `oracle+oracledb://decos:decos123@localhost:1521/?service_name=FREEPDB1`). Em seguida, popule os usuários e documentos de teste e inicie o servidor:

```bash
# Popular os 5 usuários de teste + 25 colaboradores fictícios
python -m scripts.seed_usuarios

# (Opcional) Popular os 7 POPs/documentos hospitalares de exemplo em PDF e DOCX
python -m scripts.seed_documentos

# Iniciar a API em modo hot-reload na porta 8000
uvicorn app.main:app --reload --port 8000
```
- **API Base:** `http://localhost:8000/api/v1`
- **Documentação Interativa (Swagger UI):** `http://localhost:8000/docs`
- **Healthcheck:** `http://localhost:8000/api/v1/health`

#### Passo 3 — Configurar e Iniciar o Front-end (React + Vite)
Em um segundo terminal na pasta `Sistema_Hospitalar/frontend`:
```bash
cd Sistema_Hospitalar/frontend

# Configurar as variáveis de ambiente
cp .env.example .env

# Instalar as dependências e iniciar o servidor Vite
npm install
npm run dev
```
- **Aplicação Web:** Acesse `http://localhost:5173` no navegador.

---

### 6.4. Credenciais de Teste (Criadas pelo Seed)

O script `python -m scripts.seed_usuarios` cria automaticamente os perfis abaixo para validação de todas as regras de negócio e permissões:

| Perfil | E-mail | Senha | Status | Permissões Principais |
| :--- | :--- | :--- | :---: | :--- |
| **Administrador** | `admin@decos.com.br` | `Admin@123` | `ATIVO` | Acesso irrestrito: usuários, controle de acesso/auditoria, setores/ramais, documentos/POPs, FAQ, avisos e eventos |
| **RH** | `rh@decos.com.br` | `Rh@12345` | `ATIVO` | Cadastro/edição de colaboradores comuns, publicação de avisos, gestão de documentos/POPs e gestão de FAQ |
| **Marketing** | `marketing@decos.com.br` | `Mkt@12345` | `ATIVO` | Publicação e gestão de avisos/notícias corporativas e agenda de eventos |
| **Colaborador** | `colaborador@decos.com.br` | `Colab@123` | `ATIVO` | Consulta ao Dashboard, avisos, eventos, diretório, ramais, aniversariantes, POPs e FAQ |
| **Inativo (Teste)** | `inativo@decos.com.br` | `Inativo@123` | `INATIVO` | Bloqueado no login (`HTTP 403`) e oculto no diretório e aniversariantes |

---

## 🧪 7. Como Rodar os Testes e Verificações de Qualidade

### 7.1. Testes Automatizados e Linter do Back-end (`pytest` + `ruff`)
A suíte de testes do back-end conta com **57 testes automatizados** distribuídos em 11 módulos (`test_auth.py`, `test_usuarios.py`, `test_avisos.py`, `test_eventos.py`, `test_dashboard.py`, `test_documentos.py`, `test_faq.py`, `test_setores.py`, `test_diretorio.py`, `test_aniversariantes.py` e `test_seguranca_mvp.py`), executando em banco isolado em memória sem depender de container externo:

```bash
cd Sistema_Hospitalar/backend
source .venv/bin/activate

# Executar toda a suíte de testes automatizados
pytest -v

# Executar um módulo de teste específico (ex.: auditoria de segurança do MVP)
pytest tests/test_seguranca_mvp.py -v

# Verificar qualidade e formatação do código Python (Ruff)
ruff check .
ruff format --check .
```

### 7.2. Verificação de Tipos, Build e Testes E2E do Front-end
Na pasta `Sistema_Hospitalar/frontend`:

```bash
cd Sistema_Hospitalar/frontend

# Checagem estática de tipos (TypeScript)
npm run typecheck
# (ou npm run lint)

# Verificar/aplicar formatação com oxfmt
npm run format

# Gerar build de produção para validar empacotamento no Vite
npm run build

# Executar testes End-to-End (Playwright)
npx playwright install chromium
npm run test:e2e
```

---

## 👥 8. Equipe — Squad 49

Projeto desenvolvido pelo **Squad 49** no âmbito do programa **RiseUp — Residência em Software & IA**, em parceria com o **Hospital Decós**.

### Estrutura de Engenharia do Squad (8 Integrantes)

| Frente de Atuação | Responsabilidades no Projeto |
| :--- | :--- |
| **Engenharia de Banco de Dados & Infraestrutura (1)** | Modelagem relacional Oracle 23ai (`01_ddl_mvp.sql`), índices e view `VW_DIRETORIO`, consultas analíticas (`docs/consultas.md`), seeds, orquestração Docker Compose e scripts de automação. |
| **Engenharia de Back-end (2–3)** | Arquitetura em camadas com FastAPI + SQLAlchemy 2.0, autenticação JWT/RBAC, proteção anti-força bruta, `StorageService` com validação de Magic Bytes e versionamento de POPs, e suíte de 57 testes com `pytest`. |
| **Engenharia de Front-end & UX/UI (4)** | Prototipagem no Figma, Design System próprio (`src/components/ui/`), suporte a Tema Claro/Escuro, Modo Leitura, `QuickAccessFab`, acessibilidade e integração das 13 páginas em React 19 + Vite. |
| **Qualidade de Software (QA) & Documentação (1)** | Elaboração da coleção de API (`docs/api/colecao.json`), massa de POPs hospitalares de exemplo, roteiro de testes dos 12 Casos de Uso (`docs/qa/roteiro_mvp.md`) e Relatório de Homologação (`docs/qa/relatorio_mvp_aprovado.md`). |

### Integrantes do Squad 49
- **André Felipe** — Tech Lead / Full-Stack & DevOps
- **Milton Felipe Oliveira Alves** — Engenharia de Back-end & Front-end (Autenticação, RBAC e Arquitetura)
- *Demais integrantes do Squad 49 (Banco de Dados, Back-end, Front-end e QA)*

---

## 📚 Documentação Complementar

- 📄 [**Contexto Técnico Global (`Planejamento/00_CONTEXTO_GLOBAL.md`)**](file:///home/felipe/Documentos/Projeto%20Squad%2049/Planejamento/00_CONTEXTO_GLOBAL.md)
- 🗓️ [**Cronograma e Planejamento das Semanas (`Planejamento/README.md`)**](file:///home/felipe/Documentos/Projeto%20Squad%2049/Planejamento/README.md)
- 🗄️ [**Documentação do Banco de Dados e Diagrama ER (`Sistema_Hospitalar/docs/banco.md`)**](file:///home/felipe/Documentos/Projeto%20Squad%2049/Sistema_Hospitalar/docs/banco.md)
- 🔍 [**Catálogo de Consultas SQL (`Sistema_Hospitalar/docs/consultas.md`)**](file:///home/felipe/Documentos/Projeto%20Squad%2049/Sistema_Hospitalar/docs/consultas.md)
- ✅ [**Relatório de Homologação do MVP (`Sistema_Hospitalar/docs/qa/relatorio_mvp_aprovado.md`)**](file:///home/felipe/Documentos/Projeto%20Squad%2049/Sistema_Hospitalar/docs/qa/relatorio_mvp_aprovado.md)
