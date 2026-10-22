## Descrição

Descreva de forma clara e objetiva o que foi implementado ou corrigido neste Pull Request.

- **Tarefa relacionada:** `S1-T...`
- **Caso(s) de Uso:** `UC01` / `UC02` / `UC03`

---

## Checklist — Definição de Pronto (DoD)

- [ ] Código no padrão do `00_CONTEXTO_GLOBAL.md` (nomes em `snake_case`, estrutura de pastas, formato padronizado de erro `{ detail, erros }`).
- [ ] Todos os critérios de aceite da tarefa foram conferidos e atendidos.
- [ ] **Back-end:** endpoint aparece no Swagger (`/docs`) com schema documentado e possui teste automatizado (`pytest`).
- [ ] **Front-end:** tela possui os estados **carregando (`Skeleton`)**, **vazio (`EmptyState`)**, **erro com botão "Tentar novamente" (`ErrorBanner`)** e validação inline nos formulários.
- [ ] **Segurança e Permissões:** botões administrativos ficam ocultos para perfis sem permissão, e o back-end bloqueia chamadas diretas com HTTP `403`.
- [ ] Saídas auxiliadas por IA foram revisadas e testadas manualmente por um integrante humano da equipe.
- [ ] PR revisado e aprovado por pelo menos 1 pessoa do time.
