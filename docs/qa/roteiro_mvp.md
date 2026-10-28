# Roteiro de Homologação de QA do MVP — Intranet Hospitalar Decós Corporativa (S4-T7)

> Roteiro formal de testes funcionais, de segurança e de usabilidade cobrindo integralmente os **12 Casos de Uso (UC01 a UC12)** da Especificação Técnica do Projeto.

---

## 1. Pré-condições e Credenciais de Teste (§9 do Contexto Global)

- Ambiente integrado ativo (`docker compose up -d` ou back-end em `http://localhost:8000` + front-end em `http://localhost:5173`).
- Massa de dados inicial carregada via `database/init/` + `scripts/seed_usuarios.py` + `scripts/seed_documentos.py`.

| Perfil | E-mail | Senha | Status |
|---|---|---|---|
| **ADMIN** | `admin@decos.com.br` | `Admin@123` | `ATIVO` |
| **COLABORADOR** | `colaborador@decos.com.br` | `Colab@123` | `ATIVO` |
| **RH** | `rh@decos.com.br` | `Rh@12345` | `ATIVO` |
| **MARKETING** | `marketing@decos.com.br` | `Mkt@12345` | `ATIVO` |
| **INATIVO** | `inativo@decos.com.br` | `Inativo@123` | `INATIVO` |

---

## 2. Casos de Teste por Caso de Uso (UC01 a UC12)

### UC01 — Realizar Login e Autenticação
| ID | Cenário | Passos | Resultado Esperado |
|---|---|---|---|
| **CT-UC01-01** | Login válido com os 4 perfis ativos | 1. Acessar `/login`.<br>2. Informar credenciais válidas de Admin, RH, Marketing ou Colaborador e clicar em **Entrar**. | Redireciona para `/` (Dashboard), armazena token JWT no `localStorage` e exibe nome, cargo e badge do perfil no Header. |
| **CT-UC01-02** | Senha incorreta ou e-mail inexistente | 1. Informar e-mail válido e senha errada.<br>2. Clicar em **Entrar**. | HTTP 401 — Exibe alerta `"E-mail ou senha inválidos"` sem recarregar a página. |
| **CT-UC01-03** | Tentativa de login de usuário inativo | 1. Informar `inativo@decos.com.br` / `Inativo@123`.<br>2. Clicar em **Entrar**. | HTTP 403 — Exibe alerta `"Usuário inativo. Procure o administrador."`. |
| **CT-UC01-04** | Proteção contra força bruta (RNF03) | 1. Realizar 5 tentativas consecutivas com senha incorreta para o mesmo e-mail em menos de 15 minutos.<br>2. Tentar uma 6ª vez. | HTTP 429 — Bloqueia novas tentativas por 15 minutos com mensagem explicativa. |

---

### UC02 — Cadastrar e Editar Usuários
| ID | Cenário | Passos | Resultado Esperado |
|---|---|---|---|
| **CT-UC02-01** | Cadastro de novo colaborador | 1. Logar como `ADMIN` ou `RH` e acessar `/admin/usuarios`.<br>2. Clicar em **+ Novo usuário**, preencher nome, e-mail, senha forte, setor e salvar. | HTTP 201 — Usuário criado com perfil padrão `COLABORADOR` e status `ATIVO`; toast de sucesso exibido. |
| **CT-UC02-02** | Cadastro com e-mail duplicado | 1. Abrir modal **+ Novo usuário**.<br>2. Informar `colaborador@decos.com.br` e salvar. | HTTP 409 — Exibe mensagem inline no campo de e-mail: `"Este e-mail já pertence a outro usuário"`. |
| **CT-UC02-03** | Edição de dados cadastrais | 1. Na linha de um colaborador, clicar em **Editar**.<br>2. Alterar cargo e setor, e salvar. | HTTP 200 — Tabela atualizada com o novo cargo e setor. |

---

### UC03 — Controlar Acesso dos Usuários
| ID | Cenário | Passos | Resultado Esperado |
|---|---|---|---|
| **CT-UC03-01** | Alteração de perfil e status com auditoria | 1. Logar como `ADMIN` em `/admin/usuarios`.<br>2. Clicar em **Acesso** de um colaborador, alterar perfil para `RH` e confirmar. | HTTP 200 — `VERSAO_TOKEN` incrementada (invalida sessão anterior do alvo) e registro gravado em **Histórico de alterações** com data/hora e admin responsável. |
| **CT-UC03-02** | Bloqueio de auto-rebaixamento e auto-inativação | 1. Logado como `ADMIN`, abrir modal **Acesso** da própria conta.<br>2. Tentar remover perfil `ADMIN` ou alterar status para `INATIVO`. | Controles desabilitados na UI e API rejeita com HTTP 400 `"Você não pode remover seu próprio perfil de administrador ou inativar sua própria conta."`. |

---

### UC04 e UC05 — Publicar e Visualizar Avisos e Comunicados
| ID | Cenário | Passos | Resultado Esperado |
|---|---|---|---|
| **CT-UC04-01** | Publicação de notícia em destaque | 1. Logar como `ADMIN`, `RH` ou `MARKETING` e acessar `/avisos`.<br>2. Clicar em **+ Adicionar Novo**, preencher título, categoria `NOTICIA`, marcar **Destaque** e salvar. | HTTP 201 — Aviso publicado e visível imediatamente na faixa de Destaques de `/avisos` e no Dashboard (`/`). |
| **CT-UC04-02** | Validação de data de expiração no passado | 1. No modal de novo aviso, informar data de expiração anterior a hoje. | HTTP 400 — Exibe erro inline `"A data de expiração não pode ser anterior à data atual"`. |
| **CT-UC05-01** | Ocultação de avisos expirados no mural público | 1. Logar como `COLABORADOR` e acessar `/avisos`.<br>2. Pesquisar por aviso com data de expiração vencida. | Avisos expirados não aparecem na listagem pública (visíveis apenas para gestores com o filtro **Exibir avisos expirados**). |

---

### UC06 e UC07 — Cadastrar e Pesquisar Documentos / POPs
| ID | Cenário | Passos | Resultado Esperado |
|---|---|---|---|
| **CT-UC06-01** | Upload válido de POP em PDF/DOCX | 1. Logar como `ADMIN` em `/documentos`.<br>2. Clicar em **+ Adicionar Novo**, preencher título, tipo `POP`, categoria, tags e anexar arquivo PDF válido. | HTTP 201 — Arquivo salvo em `uploads/documentos/<uuid4>.pdf` e listado no catálogo. |
| **CT-UC06-02** | Rejeição de formato inválido / Magic Bytes | 1. Tentar enviar um arquivo `.exe` ou `.txt` renomeado para `.pdf`. | HTTP 415 — Rejeitado pela validação de assinatura binária (`%PDF` / `PK`). |
| **CT-UC06-03** | Rejeição de arquivo acima de 20 MB | 1. Enviar arquivo com tamanho superior a 20 MB. | HTTP 413 — Exibe erro informando o limite máximo de 20 MB. |
| **CT-UC07-01** | Busca sem acento, visualização embutida e download | 1. Logar como `COLABORADOR` em `/documentos`.<br>2. Pesquisar `"higienizacao"` ou `"puncao"` (sem acento).<br>3. Clicar em **Visualizar** e depois em **Baixar**. | Localiza o POP correspondente; botão **Visualizar** abre modal com PDF embutido (`Content-Disposition: inline`) e **Baixar** transfere o arquivo (`attachment`). |

---

### UC08 — Cadastrar Setores e Ramais
| ID | Cenário | Passos | Resultado Esperado |
|---|---|---|---|
| **CT-UC08-01** | Cadastro de setor com múltiplos ramais | 1. Logar como `ADMIN` em `/admin/setores`.<br>2. Clicar em **+ Novo Setor**, informar nome, andar e adicionar 2 ramais numéricos.<br>3. Salvar. | HTTP 201 — Setor e todos os seus ramais persistidos e exibidos na tabela. |
| **CT-UC08-02** | Validação de ramal numérico e unicidade entre setores | 1. Tentar cadastrar ramal com letras (`21A`) ou número já pertencente à UTI (`2101`). | Ramal com letras retorna 422; ramal já vinculado a outro setor retorna 409 informando o setor conflitante. |
| **CT-UC08-03** | Bloqueio de exclusão de setor com colaboradores | 1. Tentar excluir um setor com `total_usuarios > 0` (ex.: `UTI`). | HTTP 409 — Exibe alerta `"Existem usuários vinculados a este setor"`. |

---

### UC09 — Consultar Perguntas Frequentes (FAQ)
| ID | Cenário | Passos | Resultado Esperado |
|---|---|---|---|
| **CT-UC09-01** | Busca textual sem acento e agrupamento em acordeão | 1. Acessar `/faq`.<br>2. Pesquisar `"ferias"` ou `"adornos"`.<br>3. Clicar na pergunta para expandir. | Perguntas agrupadas por categoria em ordem alfabética; termo pesquisado destacado com `<mark>` e resposta expandida com `aria-expanded="true"`. |

---

### UC10 — Pesquisar Funcionários e Ramais no Diretório
| ID | Cenário | Passos | Resultado Esperado |
|---|---|---|---|
| **CT-UC10-01** | Busca de colaborador ativo por nome, cargo, setor e andar | 1. Acessar `/diretorio` (aba **Colaboradores**).<br>2. Buscar por nome ou cargo e testar os botões de filtro rápido (`UTI`, `Pronto-Socorro`, `Farmácia`).<br>3. Clicar em um colaborador para abrir o modal de detalhes e clicar em **Copiar Ramal** / **Copiar E-mail**. | Exibe apenas colaboradores com status `ATIVO`; modal abre com informações completas e os botões de cópia disparam toast imediato. |
| **CT-UC10-02** | Exibição de colaborador sem setor vinculado | 1. Buscar por `"Beatriz Nogueira"` (ou colaborador sem setor). | Exibe **"Setor não informado"** nas colunas de Setor, Andar e Ramal. |
| **CT-UC10-03** | Consulta ao Guia de Ramais por Andar | 1. Alternar para a aba **Guia de Ramais por Andar**.<br>2. Filtrar por andar (`Térreo`) ou número de ramal (`2101`). | Exibe os setores agrupados por andar com seus ramais, descrições e botão **Copiar** em um clique. |

---

### UC11 — Visualizar Aniversariantes do Mês
| ID | Cenário | Passos | Resultado Esperado |
|---|---|---|---|
| **CT-UC11-01** | Listagem mensal, navegação e privacidade estrita | 1. Acessar `/aniversariantes`.<br>2. Navegar entre os meses, filtrar por dia, setor e botão **Hoje**. | Cards ordenados por dia do mês, exibindo apenas `Dia DD/MM` (sem expor ano de nascimento ou idade em nenhuma hipótese). Aniversariantes do dia recebem moldura especial e badge **"Aniversariante do dia!"**. |

---

### UC12 — Visualizar e Gerenciar Próximos Eventos
| ID | Cenário | Passos | Resultado Esperado |
|---|---|---|---|
| **CT-UC12-01** | Visualização em Lista (apenas futuros) e Calendário | 1. Acessar `/eventos`.<br>2. Verificar a **Aba Lista** (padrão) e alternar para a **Aba Calendário**. | Na Aba Lista, eventos passados são ocultados automaticamente (`DATA_INICIO >= hoje`). Na Aba Calendário, todos os eventos do mês selecionado aparecem marcados nos respectivos dias. |

---

## 3. Testes de Perfis Cruzados e Resiliência de Rede

| ID | Cenário | Passos | Resultado Esperado |
|---|---|---|---|
| **CT-SEC-01** | Restrição de URL direta por Colaborador comum | 1. Logar como `COLABORADOR`.<br>2. Digitar `/admin/usuarios` ou `/admin/setores` diretamente no navegador.<br>3. Tentar enviar requisições `POST/PUT/DELETE` para endpoints administrativos. | No front-end, redireciona para `/sem-permissao` (`Você não tem permissão para acessar esta funcionalidade.`). Na API, retorna HTTP 403 `"Permissão insuficiente."` em 100% das rotas administrativas. |
| **CT-RES-01** | Queda de rede e recuperação com "Tentar novamente" | 1. Simular indisponibilidade da API.<br>2. Acessar qualquer tela do portal.<br>3. Restabelecer a API e clicar no botão **Tentar novamente** do `ErrorBanner`. | Exibe `ErrorBanner` amigável sem quebrar a tela; ao clicar em **Tentar novamente**, recarrega os dados normalmente. |
