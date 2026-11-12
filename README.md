# 🏥 Intranet Hospitalar Decós Corporativa — Squad 49

![Status do Projeto](https://img.shields.io/badge/Status-Fases%201%20a%205%20Conclu%C3%ADdas%20(v1.5--extras)-success?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Oracle](https://img.shields.io/badge/Oracle%20Database-23ai%20Free%20%7C%20Vector%20Search-F80000?style=for-the-badge&logo=oracle&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)

Plataforma web corporativa desenvolvida pelo **Squad 49** para o **Hospital Decós**, projetada para centralizar a comunicação interna, a gestão e consulta de Procedimentos Operacionais Padrão (POPs), a agenda institucional, a central de dúvidas (FAQ), o mural de reconhecimentos, a central de notificações, a integração opcional com o Google Agenda e o diretório de colaboradores e ramais telefônicos organizados por setor e andar.

---

## 📌 1. Apresentação e Proposta de Valor

### O Problema
A comunicação interna no ambiente hospitalar enfrentava sérios desafios operacionais e informacionais:
- **Fragmentação de comunicados:** Avisos cruciais eram disseminados em murais físicos, e-mails dispersos e aplicativos de mensagens instantâneas, prejudicando o alinhamento das equipes assistenciais e administrativas (com impacto severo nos plantões noturnos e de fins de semana).
- **Descentralização de protocolos e POPs:** Procedimentos Operacionais Padrão ficavam espalhados em pastas de rede sem controle claro de versão vigente, gerando risco de aplicação de condutas desatualizadas no atendimento ao paciente.
- **Dificuldade de contato e localização rápida:** Listas de ramais impressas tornavam-se obsoletas rapidamente, dificultando o acionamento célere de equipes entre andares e setores críticos (UTI, Centro Cirúrgico, Pronto-Socorro).
- **Sobrecarga de demandas repetitivas no RH:** Dúvidas corriqueiras sobre escalas, férias, holerites e benefícios consumiam tempo expressivo da equipe de Gestão de Pessoas.

### A Solução
A **Intranet Hospitalar Decós Corporativa** centraliza o ecossistema de informações do hospital em uma aplicação web moderna, segura, responsiva e de alta performance:
- **Repositório Confiável de Protocolos e POPs:** Upload com validação de formato e assinatura de bytes (Magic Bytes), controle rigoroso de versões ativas e arquivadas, leitor embutido de PDF e preparação para busca semântica por Inteligência Artificial (Oracle Vector Search).
- **Comunicação Unificada e Engajamento:** Mural de notícias e comunicados com categorização, avisos urgentes em destaque, agenda de eventos institucionais com calendário interativo, central de notificações em tempo real e mural de reconhecimentos corporativos entre colegas.
- **Agilidade Operacional no Atendimento:** Diretório completo de colaboradores ativos com busca instantânea e guia telefônico de ramais estruturado por andar e setor hospitalar.
- **Governança, Privacidade e Segurança (RBAC):** Controle de acesso baseado em 4 perfis (`ADMIN`, `RH`, `MARKETING` e `COLABORADOR`), proteção contra ataques de força bruta, revogação instantânea de sessões e suporte transparente a **Modo Leitura (Visitante)** para terminais compartilhados no hospital.

---

## 📊 2. Status do Projeto e Progresso das Entregas

O planejamento do projeto está estruturado em **Fases sequenciais**, cobrindo desde a fundação da infraestrutura e regras centrais do MVP até as funcionalidades avançadas de engajamento, integrações e Inteligência Artificial.

> **Status Atual:** ✅ **Fases 1 a 5 concluídas e homologadas (`v1.5-extras`)** — 100% dos 12 Casos de Uso originais (`UC01` a `UC12`), requisitos de segurança (`RNF03`), ajustes pós-entrega (Modo Visitante, Pop-up de Aniversariante, Mensagem Unificada de Login, Acessos Rápidos e Reconhecimento por Setor/Individual) e os recursos avançados da Fase 5 (Reconhecimentos, Notificações, Google Agenda, Avisos Urgentes e Base Vetorial) implementados e validados com **113 testes automatizados no back-end** e testes E2E com Playwright.

| Fase | Escopo Principal | Casos de Uso / Entregáveis | Status |
| :--- | :--- | :--- | :---: |
| **Fase 1** | **Fundação e Controle de Acesso:** Infraestrutura Docker, DDL Oracle 23ai (8 tabelas + views + seeds), Autenticação JWT com revogação via `VERSAO_TOKEN`, Gestão de Usuários e Trilha de Auditoria, Base React 19 e Design System próprio. | `UC01`, `UC02`, `UC03`, Catálogo `/_componentes` | ✅ **Concluída** |
| **Fase 2** | **Comunicação Corporativa e Visão Geral:** Mural de Avisos e Notícias Corporativas, Agenda de Eventos (Lista e Calendário Mensal), Endpoint consolidado e Tela do Dashboard Integrado, Consultas Analíticas SQL. | `UC04`, `UC05`, `UC12`, Dashboard (`/`) | ✅ **Concluída** |
| **Fase 3** | **Gestão do Conhecimento e Estrutura Física:** Central de POPs e Documentos com Upload Seguro (`StorageService`, Magic Bytes, Versionamento, Leitor PDF), Central de Dúvidas (FAQ), Gestão Administrativa de Setores e múltiplos Ramais. | `UC06`, `UC07`, `UC08`, `UC09`, Coleção Postman | ✅ **Concluída** |
| **Fase 4** | **Diretório, Engajamento e Blindagem do MVP:** Diretório de Colaboradores e Guia Telefônico de Ramais por Andar, Mural de Aniversariantes com Privacidade por Design, Proteção Anti-Força Bruta (`RNF03`), Homologação e Conclusão do MVP. | `UC10`, `UC11`, `RNF03`, Release `v1.0-mvp` | ✅ **Concluída** |
| **Fase 5** | **Extras e Integrações (Parte 1):** Mural de Reconhecimentos (criação pelo RH e indicação entre colegas), Central de Notificações Internas (sino no cabeçalho, leitura persistida), Avisos Urgentes, Integração com Google Agenda (OAuth 2.0 criptografado), Pop-up de Aniversário, Gestão de Acessos Rápidos externos, DDL `04_ddl_extras.sql`, Extração de Texto e Indexação Vetorial (`Oracle VECTOR` + `sentence-transformers`). | Reconhecimentos, Notificações, Google Agenda, Acessos Rápidos, Base RAG | ✅ **Concluída** |
| **Fase 6** | **Inteligência Artificial Generativa e Entrega Final (Parte 2):** Assistente de IA Generativa com Google Gemini em arquitetura RAG para POPs hospitalares (respostas estritamente fundamentadas na base vigente, citações de página, guardrails anti-alucinação com checagem numérica e fallback gracioso), Análise e Sugestão Automática de Metadados no Upload, Acessibilidade WCAG 2.1 AA e Homologação Final. | Assistente RAG com Gemini, Análise de POPs, Release Final `v2.0` | 🔜 *Roadmap Final* |

---

## ⚙️ 3. Funcionalidades e Módulos Implementados

Abaixo estão detalhados todos os módulos e capacidades operacionais em funcionamento na aplicação:

### 🔐 3.1. Autenticação, Controle de Acesso (RBAC) e Modo Visitante (`UC01`, `UC02`, `UC03`)
- **Autenticação JWT (`POST /api/v1/auth/login` e `GET /api/v1/auth/me`):** Criptografia de senhas com algoritmo `bcrypt`, geração de tokens assinados digitalmente com `HS256` (validade de 8 horas) e validação de sessão ativa a cada requisição ou reativação de janela.
- **Revogação Instantânea de Sessão (`VERSAO_TOKEN`):** Toda alteração de perfil, inativação de conta ou redefinição de senha incrementa a versão do token no banco de dados, cancelando imediatamente o acesso de sessões antigas sem depender de expiração de cache.
- **Proteção Anti-Força Bruta (`RNF03`):** Limitador de taxa em memória por endereço IP e e-mail que impõe bloqueio temporário (`HTTP 429 Too Many Requests`) após 5 tentativas incorretas em uma janela de 15 minutos.
- **Mensagem Unificada de Segurança no Login:** Qualquer falha de login (e-mail inexistente, senha incorreta ou usuário inativo) responde com `HTTP 401` e a mensagem uniforme *"E-mail ou senha inválidos. Procure o ADMIN."*, evitando ataques de enumeração de contas.
- **Modo Leitura / Visitante (`modoLeitura`):** Terminais compartilhados no ambiente hospitalar sem autenticação acessam exclusivamente as áreas públicas de consulta (Dashboard básico, Notícias/Avisos, Eventos, Diretório com e-mails ocultos, POPs vigentes e FAQ), com ocultação estrita de formulários de escrita e bloqueio rigoroso no back-end para rotas privadas.
- **Gestão de Usuários e Trilha de Auditoria (`/admin/usuarios`):**
  - Cadastro e edição de colaboradores com filtros por setor, cargo, perfil e status (`ATIVO` / `INATIVO`).
  - Matriz de segurança com trava contra auto-inativação ou auto-rebaixamento do próprio administrador.
  - **Auditoria Imutável (`HISTORICO_ACESSO`):** Rastreamento de data/hora, administrador responsável, atributo modificado (`PERFIL` ou `STATUS`), valor anterior e novo valor.

### 🏠 3.2. Dashboard Corporativo Integrado (`/`)
- Saudação dinâmica personalizada conforme o turno do dia (*Bom dia / Boa tarde / Boa noite*) e exibição de data por extenso.
- **Endpoint Consolidado de Alta Performance (`GET /api/v1/dashboard`):** Em uma única chamada com *skeletons* de carregamento assíncronos, consolida:
  - Banner de **Avisos Urgentes** com prioridade máxima visual.
  - Carrossel de **Avisos em Destaque** (até 5 publicações).
  - Grade com os **Últimos Comunicados** (5 itens).
  - Agenda com os **Próximos Eventos Institucionais** (5 itens).
  - Bloco de **Aniversariantes do Dia** e contador total de aniversariantes do mês (visível apenas para usuários autenticados).
- **Pop-up Comemorativo de Aniversário (`AniversarioPopup`):** Modal de felicitação institucional exibido automaticamente no primeiro acesso do dia ao colaborador aniversariante, persistido em `localStorage` para não incomodar a rotina de trabalho.

### 📢 3.3. Mural de Avisos e Notícias Corporativas (`/avisos` e `/avisos/:id` — `UC04`, `UC05`)
- Listagem paginada de comunicados vigentes (`DATA_EXPIRACAO IS NULL OR DATA_EXPIRACAO >= HOJE`) com busca em tempo real (*debounce*) e filtros por categorias (`NOTICIA`, `COMUNICADO`, `PROMOCAO`, `MUDANCA_SETOR`, `DESTAQUE_CORPORATIVO`).
- **Suporte a Avisos Urgentes:** Classificação por prioridade (`NORMAL` vs `URGENTE`), destacando avisos críticos com badge visual pulsante e exibição privilegiada no topo das páginas.
- **Gestão de Conteúdo (`ADMIN`, `RH`, `MARKETING`):** Modal de criação e edição com sanitização de HTML contra vulnerabilidades XSS, controle de data de expiração e modo gerencial (`GET /api/v1/avisos/gestao?incluir_expirados=true`).
- **Gatilho de Notificação:** Publicações classificadas como `NOTICIA` disparam automaticamente uma notificação institucional para todos os colaboradores.

### 📅 3.4. Agenda e Calendário de Eventos Institucionais (`/eventos` — `UC12`)
- **Dupla Visualização Interativa:** Alternância rápida entre **Modo Lista** (cronograma linear a partir da data atual) e **Modo Calendário Mensal** (grade com marcadores por dia e componente `MiniCalendario`).
- Filtros por categoria (`TREINAMENTO`, `ACAO_INTERNA`, `INSTITUCIONAL`, `OUTRO`), setor realizador e termo de pesquisa.
- Gestão completa de eventos (criação, edição e exclusão segura) para perfis `ADMIN` e `MARKETING`.
- **Notificação de Evento Novo e Evento do Dia:** O cadastro de um evento gera notificação instantânea; além disso, na data do evento, uma notificação comemorativa de `EVENTO_DO_DIA` é disponibilizada automaticamente na central de notificações.

### 📄 3.5. Central de Documentos, Protocolos e POPs (`/documentos` — `UC06`, `UC07`)
- **Upload Seguro e Blindado (`StorageService`):** Dupla validação por extensão permitida (`.pdf`, `.docx`) e validação em baixo nível de **Magic Bytes** (`%PDF` para PDF e `PK\x03\x04` para DOCX), limite máximo de `20 MB` (`HTTP 413`), proteção contra *Path Traversal* e armazenamento com hashes UUID seguros.
- **Versionamento Automático e Histórico:** O envio de uma nova versão de um protocolo existente arquiva automaticamente a versão anterior (`STATUS_VERSAO = 'ARQUIVADO'`) e eleva a nova versão para vigência ativa (`STATUS_VERSAO = 'VIGENTE'`, `VERSAO + 1`), mantendo o histórico navegável no modal de versões (`/api/v1/documentos/{id}/versoes`).
- **Visualizador Integrado e Download:** Leitura de arquivos PDF diretamente no navegador em modal responsivo (`Content-Disposition: inline`) e opção de download de arquivos originais.
- **Busca Avançada Insensível a Maiúsculas e Acentos:** Pesquisa textual em título, código operacional (ex: `POP-ENF-001`), descrição, categoria e palavras-chave indexadas.

### ❓ 3.6. Central de Dúvidas e FAQ (`/faq` — `UC09`)
- Base de conhecimento com perguntas e respostas agrupadas por tópicos essenciais (`Benefícios`, `Escalas`, `Férias`, `Normas Hospitalares`, `Segurança do Paciente`).
- Componentes em acordeão acessíveis com busca textual instantânea e realce visual dos termos encontrados (`<mark>`).
- Painel de administração para inclusão, edição, reordenação de perguntas e exclusão (`ADMIN` e `RH`).

### 🏢 3.7. Gestão Administrativa de Setores e Ramais (`/admin/setores` — `UC08`)
- Gestão centralizada da estrutura predial e organizacional do Hospital Decós.
- Cadastro e edição de setores associados ao respectivo andar hospitalar (`Térreo`, `1º andar`, `2º andar`, etc.) e com **múltiplos ramais telefônicos** vinculados (garantindo unicidade global de ramais no hospital).
- Proteção de integridade referencial: impede a exclusão acidental de setores que possuam colaboradores vinculados (`HTTP 409 Conflict`).

### ☎️ 3.8. Diretório de Colaboradores e Guia Telefônico (`/diretorio` — `UC10`)
- **Aba Colaboradores:** Consulta paginada alimentada pela view otimizada `VW_DIRETORIO`, exibindo apenas colaboradores com status `ATIVO`, com filtros por setor, andar e busca por nome ou cargo. Conta com modal de detalhes e atalhos rápidos **"Copiar Ramal"** e **"Copiar E-mail"**. No Modo Visitante, e-mails são protegidos para resguardar a privacidade.
- **Aba Guia de Ramais:** Estrutura telefônica organizada hierarquicamente por andar e setor, com botões para cópia imediata do número do ramal.

### 🎂 3.9. Mural de Aniversariantes do Mês (`/aniversariantes` — `UC11`)
- Navegação mensal com atalho rápido para o mês corrente, filtro por dia específico (1 a 31), filtro por setor e busca nominal.
- Destaque com moldura comemorativa e selo *"Aniversariante do dia!"* para os colaboradores que festejam na data atual.
- **Privacidade por Design:** Conforme exigido pela governança de dados e pelo caso de uso `UC11`, o sistema jamais expõe o ano de nascimento ou a idade dos colaboradores. Restrito a usuários autenticados.

### 🏆 3.10. Mural de Reconhecimentos e Indicações de Colegas e Setores (`/reconhecimentos`)
- **Reconhecimentos Oficiais Concedidos pelo RH:** Publicações formais de valorização funcional tanto para **colaboradores individuais** quanto para **setores/equipes inteiras** (`ALVO_TIPO: 'COLABORADOR' | 'SETOR'`), em quatro categorias (`PROMOCAO`, `DESTAQUE`, `TEMPO_DE_CASA`, `AGRADECIMENTO`), com mensagem personalizada e destaque institucional.
- **Indicações Entre Colegas e de Equipes:** Qualquer colaborador autenticado pode submeter uma indicação de reconhecimento para valorizar o trabalho de um colega ou de um setor hospitalar completo, com justificativa fundamentada (com validação anti-autoindicação).
- **Filtros Avançados:** Filtro por público-alvo (Todos, Colaboradores, Setores), filtro por categoria de reconhecimento e filtro por setor (que reúne tanto reconhecimentos do setor quanto de colaboradores a ele vinculados).
- **Painel de Triagem do RH:** Interface exclusiva para a equipe de Gestão de Pessoas analisar indicações pendentes (individuais ou de setores), aprovando-as com pré-preenchimento automático (o que gera a publicação oficial no mural e dispara notificação) ou recusando-as com registro interno.
- **Aba "Minhas Indicações":** Espaço onde o colaborador acompanha o andamento de todas as indicações submetidas.

### 🔔 3.11. Central Unificada de Notificações Internas (`/notificacoes` e Dropdown no Header)
- Sino interativo no cabeçalho com contador dinâmico de notificações não lidas.
- Disparo automático de notificações para eventos centrais da plataforma:
  - `NOTICIA`: publicação de novo comunicado com categoria de notícia.
  - `EVENTO`: agendamento de novo treinamento ou evento institucional.
  - `EVENTO_DO_DIA`: lembrete automático gerado no dia de ocorrência de um evento.
  - `RECONHECIMENTO`: publicação de um novo reconhecimento funcional.
- **Persistência Individual de Leitura (`NOTIFICACOES_LIDAS`):** Cada colaborador possui seu próprio histórico de leitura, com botões para marcar individualmente ou acionar "Marcar todas como lidas".
- Desduplicação garantida em nível de banco de dados (`UQ_NOTIF_REFERENCIA`).

### 📅 3.12. Integração Opcional com o Google Agenda (`/perfil/integracoes`)
- Conexão OAuth 2.0 segura com a API do Google Calendar (`calendar.events`), respeitando a decisão e consentimento individual de cada colaborador.
- **Segurança de Credenciais:** O *refresh token* concedido pelo usuário é armazenado com criptografia simétrica reversível Fernet (`cryptography`), garantindo que o segredo nunca permaneça em texto puro no banco de dados.
- **Sincronização em Um Clique:** Botão "Sincronizar eventos com Google Agenda" que transfere os eventos futuros da intranet para a agenda pessoal do usuário.
- Controle rigoroso contra duplicidades na agenda através da tabela de vínculo `EVENTOS_GOOGLE`.

### 🧭 3.13. Botão Flutuante de Acesso Rápido (`QuickAccessFab`) e Gestão (`/admin/acesso-rapido`)
- Menu flutuante discreto e acessível no canto inferior direito para acesso rápido a ferramentas hospitalares externas (ex.: Prontuário Eletrônico, Portal de Exames, E-mail Corporativo, Folha de Ponto).
- **Gestão Exclusiva para Administradores (`/admin/acesso-rapido`):** Painel para cadastrar novos atalhos com validação de URL segura (`http://` ou `https://`), descrição, ícone e reordenação com botões de subir/descer prioridade.
- Atualização em tempo real: o menu recarrega os itens ativos ao ser aberto, refletindo alterações administrativas sem necessidade de recarregar a página.

### 🧠 3.14. Preparação da Base Vetorial e Inteligência Artificial RAG
- **Extração Automatizada de Conteúdo:** Serviços em Python (`pypdf` e `python-docx`) para extração de texto estruturado página a página dos arquivos PDF e DOCX enviados.
- **Geração de Embeddings Locais:** Módulo de vetorização com o modelo `all-MiniLM-L6-v2` (`sentence-transformers`), gerando vetores densos de 384 dimensões em ambiente local (sem dependência de APIs externas pagas).
- **Armazenamento Nativo em Oracle AI Vector Search:** Tabela `DOCUMENTO_TRECHOS` utilizando o tipo nativo `VECTOR(384, FLOAT32)` do Oracle Database 23ai Free, com indexação e busca por similaridade de cosseno (`VECTOR_DISTANCE(..., COSINE)`).
- **Pronto para o Assistente RAG:** Estrutura pronta para conexão com o Google Gemini na Fase 6, garantindo que o modelo consuma apenas os trechos de documentos com status `VIGENTE`.

### 🎨 3.15. Experiência de Interface, Modo Escuro e Design System
- **Tema Claro e Escuro (`Light / Dark Mode`):** Gerenciado com hook reativo `useTheme`, classes CSS dedicadas (`styles/dark.css`), sincronização entre abas do navegador e persistência no `localStorage`.
- **Paleta Visual Corporativa:** Identidade visual alinhada às diretrizes do Hospital Decós, priorizando os tons bordô/vinho corporativo (`#800020`), contrastes confortáveis e tipografia padronizada.
- **Biblioteca de 16 Componentes Modulares (`src/components/ui/`):** `Button`, `Input`, `Textarea`, `Select`, `DateInput` (seletor customizado), `SearchInput`, `Modal`, `ConfirmDialog`, `Table`, `Pagination`, `Badge`, `Card`, `Skeleton`, `EmptyState`, `ErrorBanner` e `Toast`.
- Catálogo de componentes acessível na rota `/_componentes`.

---

## 🛠️ 4. Arquitetura de Software e Stack Tecnológica

O sistema adota uma arquitetura em camadas orientada a serviços no back-end e arquitetura modular de componentes orientada a hooks no front-end:

### Front-end (`frontend/`)
- **Núcleo:** React 19 + Vite 8 + JavaScript / TypeScript.
- **Roteamento:** React Router DOM v7 (gerenciando rotas públicas, protegidas por autenticação e restritas por perfis RBAC).
- **Comunicação HTTP:** Axios configurado com cliente centralizado (`client.js`), interceptors para injeção de token JWT e padronização unificada de respostas e erros amigáveis.
- **Estilização e Layout:** Tailwind CSS v4 combinado com variáveis CSS nativas (`variables.css`, `global.css`, `dark.css`).
- **Testes & Qualidade:** Checagem de tipos estáticos (`tsc --noEmit`), formatação e validação com `oxfmt`, e testes End-to-End com Playwright (`@playwright/test`).

### Back-end (`backend/`)
- **Framework Web:** Python 3.12 + FastAPI + Uvicorn (com documentação interativa Swagger UI em `/docs` e ReDoc em `/redoc`).
- **ORM e Acesso a Dados:** SQLAlchemy 2.0 (estilo declarativo moderno `Mapped[...]`) operando com o driver `python-oracledb` em modo *thin* (sem necessidade de instalação do Oracle Instant Client).
- **Validação de Contratos:** Pydantic v2 + `pydantic-settings` para gestão robusta de variáveis de ambiente.
- **Segurança Criptográfica:** Hashing de senhas com `bcrypt`, tokens `PyJWT` (algoritmo `HS256`), criptografia simétrica `cryptography.fernet` para tokens de integrações externas e middleware de cabeçalhos de segurança HTTP.
- **Processamento de Arquivos:** `python-multipart`, `pypdf`, `python-docx` e abstração de storage isolada (`StorageService`).
- **Engenharia de IA e Vetores:** `sentence-transformers` (modelo `all-MiniLM-L6-v2`) e SDK oficial `google-genai` para integração com o Google Gemini.
- **Garantia de Qualidade:** Suíte de **106 testes automatizados** com `pytest`, cliente assíncrono `httpx` e análise estática com `Ruff`.

### Banco de Dados e Infraestrutura (`database/` & Docker)
- **Banco de Dados Principal:** **Oracle Database 23ai Free** (`gvenzl/oracle-free:23-slim`) configurado com collation insensível a maiúsculas e acentos (`NLS_COMP=LINGUISTIC`, `NLS_SORT=BINARY_AI`) e fuso horário `America/Sao_Paulo`.
- **Suporte Nativo a Vetores:** Recursos de ponta do Oracle 23ai com colunas `VECTOR(384, FLOAT32)` e funções de distância vetorial `VECTOR_DISTANCE`.
- **Fallback Local SQLite:** Mecanismo inteligente no back-end que permite desenvolvimento e execução de testes em SQLite (`hospital.db`) com registro de funções equivalentes (`SEM_ACENTOS` e busca linguística).
- **Containerização Total:** Orquestração via `docker-compose.yml` integrando banco de dados Oracle, back-end FastAPI e front-end React, com scripts de automação `iniciar.sh` e `parar.sh`.

### Modelagem do Banco de Dados (17 Tabelas + 1 View)
O esquema do banco de dados cobre todas as áreas do sistema:
1. `SETORES`: Cadastro de departamentos, andares prediais e datas de criação.
2. `RAMAIS`: Ramais telefônicos hospitalares com vínculo por chave estrangeira a setores.
3. `USUARIOS`: Contas de colaboradores com cargos, datas de nascimento, hash de senha, perfil e controle de sessão.
4. `HISTORICO_ACESSO`: Trilha imutável de auditoria administrativa de alterações de perfil e status.
5. `AVISOS`: Mural corporativo com controle de vigência, categorias, prioridades (`NORMAL`/`URGENTE`) e destaques.
6. `EVENTOS`: Cronograma de ações internas e treinamentos hospitalares.
7. `DOCUMENTOS`: Metadados e versionamento de POPs e protocolos com controle de vigência (`VIGENTE`/`ARQUIVADO`).
8. `DOCUMENTO_TRECHOS`: Fragmentos de documentos com páginas, textos e coluna vetorial `VECTOR(384, FLOAT32)`.
9. `FAQS`: Banco de dúvidas frequentes com categorias e ordenação.
10. `RECONHECIMENTOS`: Registro de homenagens e reconhecimentos emitidos pelo RH.
11. `INDICACOES_RECONHECIMENTO`: Indicações de reconhecimento submetidas por colaboradores e avaliadas pelo RH.
12. `NOTIFICACOES`: Notificações do sistema (`NOTICIA`, `EVENTO`, `EVENTO_DO_DIA`, `RECONHECIMENTO`).
13. `NOTIFICACOES_LIDAS`: Tabela de associação registrando leitura individual por colaborador.
14. `GOOGLE_AGENDA_INTEGRACOES`: Armazenamento de credenciais e tokens criptografados da integração Google.
15. `EVENTOS_GOOGLE`: Mapeamento de eventos sincronizados para o Google Calendar.
16. `ACESSOS_RAPIDOS`: Catálogo de sistemas externos gerenciados pelo administrador.
17. `LOG_IA`: Auditoria operacional de requisições de Inteligência Artificial, latências e feedbacks.
18. `ONBOARDING_ITENS`: Checklist do novo colaborador e orientações de primeiros atendimentos (gerenciados por ADMIN/RH).
19. `ONBOARDING_PROGRESSO`: Itens do onboarding concluídos por cada colaborador.
20. `ONBOARDING_CONTATOS`: Guia "quem procurar em cada situação" (responsável, setor e ramal).
- `VW_DIRETORIO`: View relacional otimizada para consulta pública e interna de colaboradores ativos e seus ramais.

---

## 📂 5. Estrutura de Pastas

A estrutura interna do repositório da aplicação está organizada de maneira clara e modular:

```text
Sistema_Hospitalar/
├── docker-compose.yml              # Orquestração de containers: Oracle 23ai Free + Back-end + Front-end
├── iniciar.sh                      # Script utilitário para subida automatizada (Docker, --dev ou SQLite)
├── parar.sh                        # Script utilitário para interrupção graciosa dos serviços
├── README.md                       # Documentação técnica e operacional completa do sistema
├── database/                       # Scripts de banco de dados, DDL, índices, seeds e migrações
│   ├── init/                       # Scripts executados automaticamente na inicialização do Oracle
│   │   ├── 01_ddl_mvp.sql          # DDL das 8 tabelas principais do MVP e constraints relacionais
│   │   ├── 02_indices_views.sql    # Índices de performance e view VW_DIRETORIO
│   │   ├── 03_seed_base.sql        # Dados semente: setores, ramais, avisos, eventos e FAQs
│   │   └── 04_ddl_extras.sql       # DDL dos Extras (Reconhecimentos, Notificações, Google, Vetores)
│   ├── migrations_acesso_rapido.sql # Migração da tabela ACESSOS_RAPIDOS
│   ├── migrations_avisos_destaque_corporativo.sql # Atualização de categorias de avisos
│   ├── migrations_documentos_versionamento.sql    # Ajustes no versionamento de POPs
│   ├── migrations_google_agenda.sql               # Migrações da integração com Google Calendar
│   ├── migrations_google_receber_todos.sql        # Ajustes de parâmetros da sincronização Google
│   ├── migrations_onboarding.sql                  # Tabelas e conteúdo inicial do Onboarding Digital
│   └── 99_reset.sql                # Script manual para DROP total e limpeza do banco
├── docs/                           # Documentação técnica, arquitetura, QA e coleções
│   ├── banco.md                    # Dicionário de dados, ER e documentação das tabelas
│   ├── consultas.md                # Consultas analíticas SQL com planos de execução e otimizações
│   ├── deploy.md                   # Guia de implantação e arquitetura de produção
│   ├── api/
│   │   └── colecao.json            # Coleção completa Postman/Insomnia de endpoints REST da API
│   ├── exemplos-pops/              # Acervo com 7 documentos e POPs hospitalares reais (PDF/DOCX)
│   └── qa/                         # Relatórios de testes, auditorias de acessibilidade e roteiros
│       ├── relatorio_mvp_aprovado.md # Homologação dos 12 Casos de Uso (MVP)
│       ├── roteiro_mvp.md          # Roteiro passo a passo de validação do MVP
│       ├── roteiro_extras.md       # Roteiro de validação da Fase 5 (Extras e Integrações)
│       └── acessibilidade_s5.md    # Diretrizes e auditoria de acessibilidade WCAG 2.1 AA
├── backend/                        # API REST em Python 3.12 + FastAPI + SQLAlchemy 2.0
│   ├── Dockerfile                  # Imagem Docker de produção em Python slim com usuário não-root
│   ├── .env.example                # Modelo de variáveis de ambiente do back-end
│   ├── requirements.txt            # Dependências principais (FastAPI, oracledb, pydantic, etc.)
│   ├── requirements-ia.txt         # Dependências de IA e vetorização (pypdf, sentence-transformers, etc.)
│   ├── pyproject.toml              # Configurações do Pytest e Ruff Linter/Formatter
│   ├── hospital.db                 # Banco de dados SQLite local (usado em modo fallback/testes)
│   ├── scripts/
│   │   ├── seed_usuarios.py        # Popula os 5 usuários de teste com hash bcrypt + 25 colaboradores
│   │   └── seed_documentos.py      # Popula documentos e POPs hospitalares no storage e banco
│   ├── app/
│   │   ├── main.py                 # Entrypoint da aplicação, middlewares, CORS e registro de rotas
│   │   ├── core/                   # Módulos centrais: config, database, security, deps, exceptions
│   │   ├── models/                 # Modelos SQLAlchemy 2.0 (17 entidades mapeadas)
│   │   ├── schemas/                # Schemas Pydantic v2 (validação de entrada/saída)
│   │   ├── services/               # Camada de lógica de negócio e regras hospitalares
│   │   │   └── ia/                 # Módulos de embeddings, extração de texto e indexador vetorial
│   │   ├── routers/                # 14 routers FastAPI mapeados sob o prefixo /api/v1
│   │   └── storage/                # StorageService e LocalStorage com validação de Magic Bytes
│   └── tests/                      # Suíte de 106 testes automatizados com Pytest (16 módulos)
└── frontend/                       # Single Page Application em React 19 + Vite 8
    ├── Dockerfile                  # Imagem Docker multi-stage para build e execução
    ├── .env.example                # Modelo de variáveis de ambiente (VITE_API_URL, VITE_USE_MOCKS)
    ├── package.json                # Dependências npm e scripts de build, lint, format e test
    ├── vite.config.ts              # Configuração do Vite e servidor de desenvolvimento
    ├── tsconfig.json               # Configurações do TypeScript
    ├── playwright.config.ts        # Configuração de testes End-to-End com Playwright
    ├── e2e/                        # Especificações de testes E2E (login.spec.ts, etc.)
    └── src/
        ├── api/                    # Cliente Axios com interceptors e módulos de integração por recurso
        ├── contexts/               # AuthContext (sessão JWT, modo leitura e controle de estado)
        ├── hooks/                  # Hooks customizados (useAuth, useFetch, useDebounce, useTheme)
        ├── components/
        │   ├── layout/             # Componentes estruturais (Header, Sidebar, AppLayout, FAB, Popups)
        │   └── ui/                 # 16 componentes do Design System (Button, Modal, Table, etc.)
        ├── pages/                  # 17 páginas da aplicação (Dashboard, Avisos, Eventos, POPs, etc.)
        ├── routes/                 # Gerenciamento de rotas públicas, privadas e RBAC
        ├── styles/                 # Folhas de estilo (variables.css, global.css, dark.css)
        └── utils/                  # Funções utilitárias (formatação de datas, sanitização, etc.)
```

---

## 🚀 6. Como Executar o Projeto Localmente

### 6.1. Pré-requisitos
- **Docker Desktop** (no Windows, certifique-se de que o Docker Desktop está aberto e rodando com integração WSL 2 ativada) ou **Docker Engine** no Linux.
- **Python 3.12+** instalado no sistema (no Windows, marque a opção *"Add python.exe to PATH"* durante a instalação).
- **Node.js 20+ (LTS)** e **npm** instalados.
- **Terminal no Windows:** Suporta **PowerShell**, **Prompt de Comando (CMD)**, **Git Bash** ou **WSL**.

---

### 6.2. Opção A — Execução Automatizada com Scripts (`iniciar.sh` / `parar.sh`) ou Docker Compose

O projeto conta com scripts utilitários inteligentes na raiz da pasta `Sistema_Hospitalar/` que detectam o ambiente automaticamente, constroem e sobem os containers, aplicam migrações e configuram contingência automática (fallback para SQLite caso o Docker esteja inativo):

#### ⚡ Método 1 — Via Scripts Automatizados (`iniciar.sh` e `parar.sh`)
*Recomendado para quem usa **Git Bash** (terminal padrão do Git no Windows), **WSL** ou **Linux/macOS**:*

> [!IMPORTANT]
> **Antes de executar os scripts, o Docker deve estar rodando:**
> - **No Windows:** Abra o aplicativo **Docker Desktop** (pelo Menu Iniciar ou atalho da área de trabalho). Aguarde alguns instantes até que o ícone da baleia na barra de tarefas (próximo ao relógio) fique estável e a interface exiba a mensagem em verde **"Engine running"**. (Você pode confirmar se está ativo abrindo um terminal e digitando `docker ps`).
> - **No Linux:** Certifique-se de que o serviço está ativo executando no terminal:
>   ```bash
>   sudo systemctl start docker
>   ```
> *(Nota: Caso o Docker não esteja em execução ao chamar `./iniciar.sh`, o script identificará a indisponibilidade e tentará iniciar automaticamente no modo de contingência local com SQLite `hospital.db`).*

Com o Docker ativo, abra o terminal na pasta `Sistema_Hospitalar` e execute:

```bash
cd Sistema_Hospitalar

# 1. Modo Docker Completo (sobe Oracle 23ai + Back-end + Front-end em containers com um único comando):
./iniciar.sh

# 2. Criar e atualizar os usuários e senhas de teste no banco de desenvolvimento:
docker compose exec backend python -m scripts.seed_usuarios

# 3. (Opcional) Popular o acervo de POPs e documentos hospitalares de exemplo:
docker compose exec backend python -m scripts.seed_documentos

# Alternativa: Modo Híbrido (sobe o Oracle no Docker e roda Back-end e Front-end locais com hot-reload):
./iniciar.sh --dev

# Para parar todos os serviços e encerrar os containers com segurança:
./parar.sh
```

> **Dica para Windows (PowerShell / CMD):** Caso o Git esteja instalado no Windows com os comandos Unix no PATH, você também pode executar os scripts diretamente no PowerShell ou CMD digitando `bash ./iniciar.sh` e `bash ./parar.sh`.

#### 🐳 Método 2 — Via Comandos Nativos do Docker Compose (PowerShell / CMD no Windows)
*Caso prefira rodar os comandos padrão do Docker diretamente no **PowerShell** ou **Prompt de Comando (CMD)** sem passar por scripts bash:*

```bash
cd Sistema_Hospitalar

# 1. Construir as imagens e iniciar todos os containers (Oracle + Back-end + Front-end):
docker compose up -d --build

# 2. Criar e atualizar os usuários e senhas de teste no banco de desenvolvimento:
docker compose exec backend python -m scripts.seed_usuarios

# 3. (Opcional) Popular o acervo de POPs e documentos hospitalares de exemplo:
docker compose exec backend python -m scripts.seed_documentos

# Para parar todos os containers preservando os dados do banco com segurança:
docker compose down
```

- **Aplicação Web (Front-end):** Acesse `http://localhost:5173` no navegador.
- **API REST (Swagger UI):** Acesse `http://localhost:8000/docs`.
- **Healthcheck da API:** `http://localhost:8000/api/v1/health`.

---

### 6.3. Opção B — Inicialização Manual Passo a Passo (Desenvolvimento Local)

Caso prefira executar o Back-end e o Front-end diretamente na sua máquina hospedeira com *hot-reload* imediato:

#### Passo 1 — Subir o Banco de Dados Oracle 23ai no Docker
Abra o terminal (PowerShell, CMD ou Git Bash):
```bash
cd Sistema_Hospitalar
docker compose up -d oracle
```
- Aguarde o container inicializar e ficar saudável (`healthy`). Verifique com: `docker compose ps`.
- **Parâmetros de Conexão (DBeaver / VS Code):** Host `localhost`, Porta `1521`, Service Name `FREEPDB1`, Usuário `decos`, Senha `decos123`.

#### Passo 2 — Configurar e Iniciar o Back-end (FastAPI)

Abra um novo terminal na pasta `Sistema_Hospitalar/backend`:

**No Windows (PowerShell):**
```powershell
cd Sistema_Hospitalar\backend

# 1. Criar o ambiente virtual Python
python -m venv .venv

# 2. Ativar o ambiente virtual no PowerShell
.\.venv\Scripts\Activate.ps1
# Nota: Se o PowerShell emitir erro sobre execução de scripts bloqueada, execute antes:
# Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# 3. Instalar as dependências do back-end e dos módulos de IA
pip install -r requirements.txt
pip install -r requirements-ia.txt

# 4. Criar o arquivo de variáveis de ambiente a partir do modelo
cp .env.example .env

# 5. Popular os usuários de teste com senhas criptografadas
python -m scripts.seed_usuarios

# 6. (Opcional) Popular documentos e POPs hospitalares de demonstração
python -m scripts.seed_documentos

# 7. Iniciar a API com recarregamento automático (hot-reload)
uvicorn app.main:app --reload --port 8000
```

**No Windows (Prompt de Comando - CMD):**
```cmd
cd Sistema_Hospitalar\backend
python -m venv .venv
.venv\Scripts\activate.bat
pip install -r requirements.txt
pip install -r requirements-ia.txt
copy .env.example .env
python -m scripts.seed_usuarios
python -m scripts.seed_documentos
uvicorn app.main:app --reload --port 8000
```

**No Linux, macOS ou Git Bash:**
```bash
cd Sistema_Hospitalar/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -r requirements-ia.txt
cp .env.example .env
python -m scripts.seed_usuarios
python -m scripts.seed_documentos
uvicorn app.main:app --reload --port 8000
```

#### Passo 3 — Configurar e Iniciar o Front-end (React + Vite)

Abra outro terminal na pasta `Sistema_Hospitalar/frontend`:

**No Windows (PowerShell / CMD / Git Bash):**
```powershell
cd Sistema_Hospitalar\frontend

# Copiar arquivo de variáveis de ambiente (.env)
cp .env.example .env
# (No CMD tradicional: copy .env.example .env)

# Instalar as dependências do projeto
npm install

# Iniciar o servidor de desenvolvimento do Vite
npm run dev
```

- Acesse a interface web em **`http://localhost:5173`**.

---

### 6.4. Credenciais de Teste (Criadas pelo Seed)

O script `python -m scripts.seed_usuarios` configura os seguintes perfis padrão para homologação das regras de negócio e controle de permissões:

| Perfil | E-mail | Senha | Status | Permissões Principais |
| :--- | :--- | :--- | :---: | :--- |
| **Administrador** | `admin@decos.com.br` | `Admin@123` | `ATIVO` | Acesso irrestrito: gestão de usuários, auditoria, setores/ramais, acessos rápidos, documentos/POPs, FAQ, avisos e eventos. |
| **RH** | `rh@decos.com.br` | `Rh@12345` | `ATIVO` | Cadastro e edição de colaboradores comuns, concessão de reconhecimentos, triagem de indicações, gestão de POPs e FAQ. |
| **Marketing** | `marketing@decos.com.br` | `Mkt@12345` | `ATIVO` | Publicação e gestão do mural de avisos/notícias e criação/gerenciamento da agenda de eventos. |

---

## 🧪 7. Testes Automatizados e Garantia de Qualidade (QA)

### 7.1. Suíte de Testes Automatizados do Back-end (`pytest`)
O sistema possui uma suíte completa com **113 testes automatizados** distribuídos em 16 módulos de teste, cobrindo regras de negócio, integridade referencial, contratos de entrada/saída, RBAC e segurança:

| Módulo de Teste | Quantidade | Escopo Validado |
| :--- | :---: | :--- |
| `test_auth.py` | 9 | Login JWT, validação de tokens, expiração, renovação e bloqueio de inativos. |
| `test_usuarios.py` | 10 | Criação, edição, validação de e-mails, filtros combinados e trilha de auditoria. |
| `test_avisos.py` | 6 | Publicação, expiração automática, avisos urgentes, destaques e sanitização HTML. |
| `test_eventos.py` | 3 | Cadastro de eventos, filtros por setor/categoria e modo calendário. |
| `test_dashboard.py` | 3 | Resposta consolidada, regras de visibilidade para deslogados e aniversariantes. |
| `test_documentos.py` | 11 | Upload seguro, Magic Bytes, versionamento automático e visualização de PDF. |
| `test_faq.py` | 2 | FAQ estruturado, ordenação customizada e busca com grifo textual. |
| `test_setores.py` | 3 | Setores prediais, múltiplos ramais, unicidade de ramal e proteção contra deleção com vínculo. |
| `test_diretorio.py` | 4 | Paginação via view `VW_DIRETORIO`, filtros por andar/setor e ocultação de e-mails para visitante. |
| `test_aniversariantes.py` | 2 | Busca por mês/dia/setor, aniversário do dia e privacidade (sem exposição de ano/idade). |
| `test_seguranca_mvp.py` | 6 | Auditoria de segurança, headers HTTP, proteção anti-bruteforce e matriz RBAC completa. |
| `test_acessos_rapidos.py` | 2 | CRUD de atalhos externos pelo ADMIN, validação de URLs HTTP/HTTPS e bloqueio não-admin. |
| `test_base_conhecimento.py` | 11 | Extração de texto (PDF/DOCX), divisão em trechos, embeddings e indexação vetorial. |
| `test_notificacoes.py` | 8 | Disparo por tipo de publicação, leitura persistida individual e bloqueio de duplicatas. |
| `test_reconhecimentos.py` | 20 | Reconhecimentos oficiais do RH (individual e por setor), indicações de colegas e setores, triagem e filtros. |
| `test_google_agenda.py` | 13 | Fluxo OAuth 2.0, criptografia de tokens, sincronização sem duplicidade e resiliência a falhas. |

Para executar toda a suíte de testes do back-end:

**No Windows (PowerShell):**
```powershell
cd Sistema_Hospitalar\backend
.\.venv\Scripts\Activate.ps1
pytest -v
```

**No Windows (CMD):**
```cmd
cd Sistema_Hospitalar\backend
.venv\Scripts\activate.bat
pytest -v
```

**No Linux, macOS ou Git Bash:**
```bash
cd Sistema_Hospitalar/backend
source .venv/bin/activate
pytest -v
```

Para verificar conformidade e linting do código Python (Ruff):
```bash
ruff check .
ruff format --check .
```

### 7.2. Testes de Qualidade, Tipos e E2E do Front-end
```bash
cd Sistema_Hospitalar/frontend

# Verificação estática de tipos TypeScript
npm run typecheck

# Formatação de código
npm run format

# Validação do empacotamento de produção no Vite
npm run build

# Execução da suíte de testes End-to-End com Playwright
npx playwright install chromium
npm run test:e2e
```

---

## 👥 8. Equipe — Squad 49

Projeto desenvolvido pelo **Squad 49** no âmbito do programa **RiseUp — Residência em Software & IA**, em parceria com o **Hospital Decós**.

### Estrutura de Engenharia do Squad (8 Integrantes)

| Frente de Atuação | Responsabilidades no Projeto |
| :--- | :--- |
| **Engenharia de Banco de Dados & Infraestrutura (1)** | Modelagem relacional Oracle 23ai (`01_ddl_mvp.sql`, `04_ddl_extras.sql`), índices, view `VW_DIRETORIO`, consultas analíticas (`docs/consultas.md`), seeds, orquestração Docker Compose e scripts de automação. |
| **Engenharia de Back-end (2–3)** | Arquitetura em camadas com FastAPI + SQLAlchemy 2.0, autenticação JWT/RBAC, proteção anti-força bruta, `StorageService` com Magic Bytes, versionamento de POPs, vetorização de trechos, integrações (Google Calendar) e suíte de 106 testes com `pytest`. |
| **Engenharia de Front-end & UX/UI (4)** | Prototipagem, Design System próprio (`src/components/ui/`), suporte a Tema Claro/Escuro, Modo Leitura, `QuickAccessFab`, acessibilidade e integração das 17 páginas da aplicação em React 19 + Vite. |
| **Qualidade de Software (QA) & Documentação (1)** | Elaboração da coleção de API (`docs/api/colecao.json`), massa de POPs hospitalares de exemplo, roteiros de testes (`docs/qa/roteiro_mvp.md`, `docs/qa/roteiro_extras.md`) e Relatório de Homologação. |

### Integrantes do Squad 49
- **André Felipe Costa Barreto** — Tech Lead / Full-Stack & DevOps
- **Milton Felipe Oliveira Alves** — Engenharia de Back-end & Front-end (Autenticação, RBAC e Arquitetura)
- **George Delgado Gioseffi da Gama** — Engenharia de Back-end & Banco de Dados
- **João Gabriel Mendonça Ribeiro** — Engenharia de Back-end & Banco de Dados
- **João Vitor Nunes Oliveira Alves** — Engenharia de Front-end, UX/UI & QA

---

## 📚 9. Documentação Complementar

- 🗄️ [**Documentação do Banco de Dados e Diagrama ER**](docs/banco.md)
- 🔍 [**Catálogo de Consultas SQL e Planos de Execução**](docs/consultas.md)
- 🚀 [**Guia de Implantação e Arquitetura de Produção**](docs/deploy.md)
- 📬 [**Coleção de Endpoints da API (Postman / Insomnia)**](docs/api/colecao.json)
- ✅ [**Relatório de Homologação do MVP (v1.0-mvp)**](docs/qa/relatorio_mvp_aprovado.md)
- 📋 [**Roteiro de Validação do MVP**](docs/qa/roteiro_mvp.md)
- 🎯 [**Roteiro de Validação dos Extras (Fase 5)**](docs/qa/roteiro_extras.md)
- ♿ [**Diretrizes e Auditoria de Acessibilidade (WCAG 2.1 AA)**](docs/qa/acessibilidade_s5.md)
- 📑 [**Acervo de POPs e Protocolos de Exemplo**](docs/exemplos-pops/)
