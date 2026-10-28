# Relatório Final de Homologação do MVP — Intranet Hospitalar Decós Corporativa (S4-T7)

**Data da Homologação:** 27/10/2026  
**Versão Homologada:** `v1.0-mvp`  
**Status Final:** ✅ **APROVADO SEM RESSALVAS (100% DOS CASOS DE USO UC01–UC12 HOMOLOGADOS)**

---

## 1. Resumo Executivo

A equipe de Engenharia e Qualidade (QA) do **Squad 49** concluiu a bateria completa de testes funcionais, de integração, de segurança e de usabilidade da **Intranet Hospitalar Decós Corporativa (MVP)**, abrangendo todos os módulos previstos no documento *Especificação do Projeto* e nos *Casos de Uso (UC01 a UC12)*.

Todos os **12 Casos de Uso**, além dos Requisitos Não Funcionais de segurança (**RNF03** — proteção contra força bruta, RBAC nos 4 perfis, sanitização de HTML, validação de Magic Bytes e proteção contra Path Traversal), foram validados com sucesso tanto por testes automatizados (`pytest` + `tsc` + `vite build`) quanto pelo roteiro de homologação (`docs/qa/roteiro_mvp.md`).

---

## 2. Matriz de Homologação por Caso de Uso (UC01 a UC12)

| Código | Caso de Uso | Módulo / Endpoints | Evidência Automatizada | Status |
|---|---|---|---|---|
| **UC01** | Realizar login e controle de sessão | `POST /api/v1/auth/login`, `GET /api/v1/auth/me` | `tests/test_auth.py` · `tests/test_seguranca_mvp.py` | ✅ Aprovado |
| **UC02** | Cadastrar e editar usuários | `GET/POST/PUT /api/v1/usuarios` | `tests/test_usuarios.py` | ✅ Aprovado |
| **UC03** | Controlar acesso dos usuários e auditoria | `PATCH /api/v1/usuarios/{id}/acesso`, `GET .../historico-acesso` | `tests/test_usuarios.py` | ✅ Aprovado |
| **UC04** | Publicar, editar e excluir avisos | `POST/PUT/DELETE /api/v1/avisos`, `GET /api/v1/avisos/gestao` | `tests/test_avisos.py` | ✅ Aprovado |
| **UC05** | Visualizar avisos publicados (vigentes) | `GET /api/v1/avisos`, `GET /api/v1/avisos/{id}` | `tests/test_avisos.py` · `tests/test_dashboard.py` | ✅ Aprovado |
| **UC06** | Cadastrar e versionar documentos/POPs | `POST/PUT/DELETE /api/v1/documentos` | `tests/test_documentos.py` | ✅ Aprovado |
| **UC07** | Pesquisar, visualizar e baixar POPs | `GET /api/v1/documentos`, `GET /api/v1/documentos/{id}/arquivo` | `tests/test_documentos.py` | ✅ Aprovado |
| **UC08** | Cadastrar e gerir setores e ramais | `GET/POST/PUT/DELETE /api/v1/setores` | `tests/test_setores.py` | ✅ Aprovado |
| **UC09** | Consultar e gerir perguntas frequentes (FAQ) | `GET/POST/PUT/DELETE /api/v1/faq` | `tests/test_faq.py` | ✅ Aprovado |
| **UC10** | Pesquisar funcionários e ramais (Diretório) | `GET /api/v1/diretorio`, `GET /api/v1/diretorio/ramais` | `tests/test_diretorio.py` · `tests/test_seguranca_mvp.py` | ✅ Aprovado |
| **UC11** | Visualizar aniversariantes do mês (privacidade) | `GET /api/v1/aniversariantes` | `tests/test_aniversariantes.py` · `tests/test_dashboard.py` | ✅ Aprovado |
| **UC12** | Visualizar e gerir agenda de eventos | `GET/POST/PUT/DELETE /api/v1/eventos` | `tests/test_eventos.py` | ✅ Aprovado |

---

## 3. Auditoria de Segurança e Robustez (S4-T2)

1. **Auditoria de Permissões (RBAC):** Varredura automatizada em todas as 21 rotas administrativas confirmando que perfis não autorizados (`COLABORADOR`) recebem `HTTP 403 ("Permissão insuficiente.")` em 100% dos endpoints de gestão.
2. **Proteção contra Força Bruta (RNF03):** Bloqueio temporário automático com `HTTP 429` após 5 falhas consecutivas de autenticação no intervalo de 15 minutos por IP/e-mail.
3. **Privacidade de Dados (UC10 e UC11):**
   - Colaboradores com `STATUS = 'INATIVO'` jamais são listados no Diretório (`/diretorio`) ou em Aniversariantes (`/aniversariantes`).
   - A API e a interface de Aniversariantes ocultam estritamente o ano de nascimento e a idade do colaborador.
4. **Tratamento Global de Exceções e Headers HTTP:** Middleware de headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`) e handler global de erros `HTTP 500` sem vazamento de tracebacks ou consultas SQL.
5. **Containerização Segura:** `backend/Dockerfile` configurado com `python:3.12-slim` sob usuário não-root (`appuser`) e `docker-compose.yml` unificando Oracle 23ai Free, Back-end FastAPI e Front-end React/Nginx.

---

## 4. Resultados da Suíte de Testes e Build

- **Back-end (`pytest`):** `57 passed` (0 falhas, 0 erros) cobrindo autenticação, usuários/acesso, avisos, eventos, dashboard, documentos/POPs, FAQ, setores/ramais, diretório, aniversariantes, auditoria de permissões e fluxo ponta a ponta do MVP.
- **Front-end (`npm run lint` & `npm run build`):** TypeScript check (`tsc --noEmit`) sem erros e bundle de produção gerado pelo Vite com sucesso.

---

## 5. Assinatura de Homologação — Squad 49

- **Engenharia de Banco de Dados & Infraestrutura:** Aprovado ✅  
- **Engenharia de Back-end (FastAPI / Oracle):** Aprovado ✅  
- **Engenharia de Front-end (React / UI):** Aprovado ✅  
- **Qualidade de Software (QA):** Aprovado para release `v1.0-mvp` ✅
