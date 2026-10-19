# Login — Squad 49

Tela responsiva com identidade Decós, validação dos campos, mostrar/ocultar senha,
envio pelo Enter, prevenção de envio duplicado, tratamento de credenciais inválidas,
indisponibilidade e sessão expirada. A intranet só é montada depois do login.

## Executar localmente (Windows)

Em um terminal na pasta `back-End`:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m app.scripts.seed
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host localhost --port 8000
```

Em outro terminal na pasta `front-End`:

```powershell
npm install
npm run dev -- --host localhost
```

Acesse http://localhost:5173. O seed existente fornece a conta de demonstração
`mariana.ferreira@decos.com.br`, senha `decos123`. Ela é apenas para desenvolvimento.
Nenhuma conta é autenticada automaticamente e a senha não é gravada no navegador.
O endereço da API é configurável por `VITE_API_URL` (ver `.env.example`).

## Sessão e integração

- `POST /api/v1/auth/login`: autenticação real já existente.
- `GET /api/v1/auth/me`: endpoint adicionado para validar a sessão no servidor.
- O token fica em `sessionStorage`, separado por aba, e é removido ao sair.
- Recarregar a página exige validar o token com a API antes de mostrar a intranet.
- A validade do JWT é conferida na interface e no servidor; a interface retorna
  ao login ao expirar ou receber 401 em uma requisição autenticada.
- A opção "Lembrar meu e-mail" guarda somente o e-mail em `localStorage`.
- "Esqueci minha senha" orienta a procurar TI; não simula envio de recuperação.

## Validação

```powershell
# Em back-End, banco temporário em memória:
.\.venv\Scripts\python.exe -m unittest discover -s tests -v

# Em front-End:
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

Os testes de navegador simulam respostas da API para cobrir erros e expiração
de maneira determinística. Os testes Python exercitam os endpoints reais,
com banco isolado e senhas armazenadas como hash.

## Dependências do restante do squad

UC01 e as regras RN02/RN07/RN09 também dependem de status Ativo/Inativo,
perfil de permissões e identificação de primeiro acesso no banco. Esses campos
e controles não existem no backend atual e não foram inventados pela tela.
A troca obrigatória da senha inicial (UC15), recuperação por e-mail e matriz de
permissões devem ser integradas quando os respectivos módulos forem implementados.
O backend atual mantém endpoints de consulta públicos; a barreira da interface
não substitui a aplicação de autorização em cada endpoint.

O botão Sair encerra a sessão desta aba. Revogação imediata de um JWT já copiado
exige suporte adicional no backend. Para produção, planejar HTTPS, segredo de JWT
próprio, limites de tentativas e sessão via cookie HttpOnly conforme a arquitetura
de implantação definida pelo grupo.
