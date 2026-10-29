# Acessibilidade — Semana 5 (S5-T5)

> **Status: auditoria automática NÃO executada.** Lighthouse e axe DevTools exigem um navegador e não foram rodados nesta entrega. Este arquivo registra o que foi aplicado no código e o checklist para a auditoria. Meta: Acessibilidade ≥ 95 em todas as páginas, sem erros críticos no axe.

## Aplicado nas telas novas

| Tela / componente | Cuidados implementados |
|---|---|
| Sino de notificações (`NotificacoesSino`) | `aria-label="Notificações, N não lidas"`, `aria-expanded`/`aria-haspopup`, Esc e clique fora fecham, itens são `<button>` navegáveis por Tab, tipo da notificação em texto para leitores de tela (`sr-only`), marcador de não lida com `aria-label` |
| Reconhecimentos | abas com `role="tablist"`/`tab` e `aria-selected`, avatar decorativo com `aria-hidden`, campos com `<label>` e mensagens de erro com `role="alert"`, modais com foco preso e Esc (componente `Modal`) |
| Notificações / Integrações | cabeçalhos hierárquicos (`h1`), resumos de sincronização com `role="status"`/`role="alert"`, botões com estado de carregamento (`aria-busy`) |
| Nova versão de POP | campo de arquivo rotulado, erro inline com `role="alert"`, banner de versão arquivada com `role="alert"` |

## Checklist para a auditoria (a executar)

- [ ] Lighthouse (Acessibilidade ≥ 95) em: `/`, `/avisos`, `/eventos`, `/documentos`, `/diretorio`, `/faq`, `/reconhecimentos`, `/notificacoes`, `/perfil/integracoes`.
- [ ] axe DevTools sem violações críticas nas telas novas e no dropdown de notificações aberto.
- [ ] Navegação integral por teclado (Tab, Shift+Tab, Enter, Esc em modais e no dropdown).
- [ ] Indicador de foco visível (`:focus-visible`) em todos os controles novos.
- [ ] Contraste mínimo 4,5:1: conferir os textos `#94a3b8` (tempo relativo nas notificações) e `#64748b` sobre fundo claro; ajustar se o axe apontar.
- [ ] Leitor de tela (NVDA): sino, abas de Reconhecimentos e resumo da sincronização.

## Resultado

_Preencher após a execução: pontuação Lighthouse por página e violações do axe (com link das issues)._
