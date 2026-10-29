# Roteiro de Validação dos Extras — Semana 5 (S5-T9)

> Cobre versões de POP, base de conhecimento (RAG), reconhecimentos e indicações, notificações internas, avisos urgentes e Google Agenda. O QA reexecuta este roteiro na Semana 6.
>
> **Legenda da coluna "Resultado S5":** **OK (auto)** = coberto por teste automatizado (`pytest`) e/ou pelo roteiro E2E contra a API real com Oracle; **Pendente (manual)** = precisa ser conferido por uma pessoa no navegador ou com conta Google de teste.

## Credenciais

As mesmas do [roteiro do MVP](roteiro_mvp.md): `admin@decos.com.br`, `rh@decos.com.br`, `marketing@decos.com.br`, `colaborador@decos.com.br`.

## Cenários

| # | Cenário | Perfil | Resultado esperado | Resultado S5 |
|---|---|---|---|---|
| 1 | Publicar notícia (aviso `NOTICIA`) | Marketing | Aviso visível; 1 notificação `NOTICIA` | OK (auto) — `test_noticia_gera_notificacao_e_comunicado_nao`, E2E passo 8 |
| 2 | Publicar aviso `COMUNICADO` | RH | Aviso visível; nenhuma notificação | OK (auto) — mesmo teste, E2E passo 8 |
| 3 | Cadastrar evento | Admin | Evento na lista/calendário; 1 notificação `EVENTO` | OK (auto) — `test_evento_novo_gera_notificacao_evento` |
| 4 | Evento com data de hoje; vários usuários abrem o sino | Colaboradores | 1 única notificação `EVENTO_DO_DIA` | OK (auto) — `test_evento_do_dia_gera_uma_unica_notificacao...`, E2E passo 7 |
| 5 | RH cadastra reconhecimento | RH | Card no mural; 1 notificação `RECONHECIMENTO` | OK (auto) — `test_reconhecimento_gera_exatamente_uma_notificacao...`; card no mural: Pendente (manual) |
| 6 | Marketing/Colaborador tentam cadastrar reconhecimento | Marketing, Colaborador | Botão oculto; chamada direta → 403 | OK (auto) — 403 testado e no E2E passo 6; botão oculto: Pendente (manual) |
| 7 | Colaborador indica colega | Colaborador | Indicação `PENDENTE` em "Minhas indicações"; nenhuma notificação | OK (auto) — `test_colaborador_indica_colega_sem_gerar_notificacao` |
| 8 | Colaborador tenta se autoindicar | Colaborador | Erro 400 | OK (auto) — `test_autoindicacao_e_indicado_inativo_retornam_400` |
| 9 | RH cria reconhecimento a partir da indicação | RH | Indicação `APROVADA`; reconhecimento publicado e notificado | OK (auto) — `test_reconhecimento_com_id_indicacao_aprova_a_indicacao`, E2E passos 2–4 |
| 10 | RH recusa indicação | RH | Indicação `RECUSADA` visível ao indicante | OK (auto) — `test_recusar_indicacao_marca_recusada...` |
| 11 | Duplo clique em "Salvar" / repetir requisição | Marketing | Apenas 1 notificação por publicação | OK (auto) — `test_registrar_repetido_nao_duplica` + UNIQUE no banco (ORA-00001 verificado) |
| 12 | Editar notícia já publicada | Marketing | Nenhuma notificação nova | OK (auto) — `test_edicao_nao_gera_notificacao_e_exclusao_remove` |
| 13 | Clicar em cada tipo de notificação | Colaborador | Navega para o conteúdo correto; badge decrementa | Pendente (manual) — links e contagem validados via API (E2E passos 4–5) |
| 14 | Recarregar a página / novo login | Colaborador | Estado de leitura mantido | OK (auto) — estado persistido em `NOTIFICACOES_LIDAS` (`test_contagem_marcar_lida...`) |
| 15 | "Marcar todas como lidas" | Colaborador | Badge some | OK (auto) — mesmo teste; badge: Pendente (manual) |
| 16 | Conteúdo excluído após notificar | Admin → Colaborador | Notificação removida ou "conteúdo não disponível" | OK (auto) — exclusão remove a notificação; mensagem no front: Pendente (manual) |
| 17 | Conectar Google Agenda (conta de teste) / negar consentimento | Colaborador | Conectado / volta com aviso "cancelado" sem gravar nada | Pendente (manual) — exige credenciais Google Cloud e conta de teste; OAuth simulado em `test_google_agenda.py` |
| 18 | Clicar em "Sincronizar eventos" duas vezes seguidas | Colaborador | Eventos futuros criados uma única vez | OK (auto) — `test_botao_sincronizar_envia_eventos_futuros_sem_duplicar`, `test_sincronizar_simultaneo_retorna_409` |
| 19 | Alterar um evento na intranet e sincronizar de novo | Admin → Colaborador | Evento atualizado no Google, sem duplicar | OK (auto, API simulada) — atualização já propagada por `sincronizar_atualizacao`; confirmar no app Google: Pendente (manual) |
| 20 | Simular falha (rede bloqueada / token revogado) | Colaborador | Erro amigável / pedido de reconexão; calendário interno intacto | OK (auto) — `test_sincronizar_continua_apos_erro_em_um_evento`, `test_sincronizar_com_token_revogado_pede_reconexao` |
| 21 | Usuário sem integração | Colaborador | `/eventos` funciona normalmente | OK (auto) — sincronizar sem conexão retorna 400; calendário independe da integração |
| 22 | Upload e nova versão de POP | Admin | Versão anterior arquivada; nova versão `INDEXADO` | OK (auto) — `test_nova_versao_arquiva_a_anterior...`, E2E passo 9 (Oracle) |
| 23 | Regressão rápida do MVP | Todos | Nada quebrado pelos extras | OK (auto) — suíte completa `pytest` verde |

## Evidências desta rodada

- `pytest` verde, `ruff check .` limpo e front com `npm run lint` e `npm run build` sem erros.
- **Oracle 23ai real:** `04_ddl_extras.sql` aplicado sobre o banco do MVP sem perda de dados; `VECTOR_DISTANCE(... COSINE)` retornou o trecho correto e ordenou por proximidade; `UQ_NOTIF_REFERENCIA` bloqueou duplicata (`ORA-00001`).
- Roteiro E2E contra a API real: indicação → reconhecimento aprovado → notificação no sino com link correto; evento do dia gerado uma única vez; comunicado sem notificação e notícia com; aviso urgente primeiro no Dashboard; POP v1 arquivado, v2 vigente e indexado; busca vetorial sem trechos de versão arquivada.

## Pendências e decisões em aberto

- Itens "Pendente (manual)": conferência visual no navegador (cards, botões ocultos, badge do sino) e o fluxo com conta Google de teste (depende do responsável pelo projeto no Google Cloud).
- **A confirmar com o PO** (planejamento, S5-T3): se o indicado vê que foi indicado e se o indicante é avisado do resultado. Até lá, o indicante só acompanha o status em "Minhas indicações".
- **A confirmar** (S5-T4): se eventos passados também devem ir ao Google. Hoje só de hoje em diante.
- Acessibilidade WCAG AA (S5-T5): auditoria com Lighthouse/axe ainda não executada; ver [acessibilidade_s5.md](acessibilidade_s5.md).
