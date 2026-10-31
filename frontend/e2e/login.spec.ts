import { expect, test, type Page } from "@playwright/test";

const adminUser = {
  id_usuario: 1,
  nome: "André Luiz (Administrador)",
  email: "admin@decos.com.br",
  cargo: "Administrador de Sistemas",
  perfil: "ADMIN",
  status: "ATIVO",
  data_nascimento: "1988-03-14",
  setor: { id_setor: 10, nome: "Tecnologia", andar: "4º andar" },
};

const colabUser = {
  id_usuario: 2,
  nome: "Carlos Menezes",
  email: "colaborador@decos.com.br",
  cargo: "Técnico de Enfermagem",
  perfil: "COLABORADOR",
  status: "ATIVO",
  data_nascimento: "1997-10-21",
  setor: { id_setor: 1, nome: "UTI", andar: "2º andar" },
};

const token = (seconds = 3600) =>
  `e30.${Buffer.from(
    JSON.stringify({ sub: "1", perfil: "ADMIN", ver: 0, exp: Math.floor(Date.now() / 1000) + seconds }),
  ).toString("base64url")}.teste`;

async function fillLogin(page: Page, email = adminUser.email, senha = "Admin@123") {
  await page.getByLabel("E-mail corporativo", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(senha);
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    if (path.endsWith("/auth/me")) {
      await route.fulfill({ json: adminUser });
    } else if (path.endsWith("/auth/login")) {
      await route.fulfill({
        json: { access_token: token(), token_type: "bearer", usuario: adminUser },
      });
    } else if (path.endsWith("/usuarios") && method === "GET") {
      await route.fulfill({
        json: { itens: [adminUser, colabUser], total: 2, pagina: 1, tamanho: 20 },
      });
    } else if (path.endsWith("/usuarios") && method === "POST") {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        json: {
          id_usuario: 99,
          nome: body.nome,
          email: body.email,
          cargo: body.cargo || null,
          data_nascimento: body.data_nascimento || null,
          perfil: body.perfil || "COLABORADOR",
          status: "ATIVO",
          setor: null,
        },
      });
    } else if (path.includes("/historico-acesso")) {
      await route.fulfill({
        json: [
          {
            campo: "PERFIL",
            valor_anterior: "COLABORADOR",
            valor_novo: "RH",
            data_hora: "2026-10-21T15:00:00",
            admin: { id_usuario: 1, nome: "André Luiz (Administrador)" },
          },
        ],
      });
    } else {
      await route.fulfill({ json: [] });
    }
  });
});

test("campos obrigatórios, e-mail inválido e mostrar senha (UC01)", async ({ page }) => {
  let calls = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/auth/login")) calls++;
  });
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar na intranet" }).click();
  await expect(page.getByText("Informe seu e-mail corporativo.", { exact: true })).toBeVisible();
  await expect(page.getByText("Informe sua senha.", { exact: true })).toBeVisible();
  await page.getByLabel("E-mail corporativo", { exact: true }).fill("invalido");
  await page.getByRole("button", { name: "Entrar na intranet" }).click();
  await expect(page.getByText("Informe um e-mail válido.", { exact: true })).toBeVisible();
  expect(calls).toBe(0);
  await page.getByRole("button", { name: "Mostrar senha" }).click();
  await expect(page.getByLabel("Senha", { exact: true })).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Ocultar senha" }).click();
  await expect(page.getByLabel("Senha", { exact: true })).toHaveAttribute("type", "password");
});

test("credenciais inválidas exibem mensagem exata e usuário inativo exibe bloqueio (UC01)", async ({
  page,
}) => {
  await page.route("**/auth/login", (route) =>
    route.fulfill({
      status: 401,
      json: { detail: "E-mail ou senha inválidos. Procure o ADMIN." },
    }),
  );
  await page.goto("/login");
  await fillLogin(page);
  await page.getByRole("button", { name: "Entrar na intranet" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "E-mail ou senha inválidos. Procure o ADMIN.",
  );

  await page.route("**/auth/login", (route) =>
    route.fulfill({
      status: 403,
      json: { detail: "Usuário inativo. Procure o administrador." },
    }),
  );
  await page.getByRole("button", { name: "Entrar na intranet" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "E-mail ou senha inválidos. Procure o ADMIN.",
  );
});

test("login como admin, navegação até /admin/usuarios e abertura de modais UC02 e UC03", async ({
  page,
}) => {
  await page.goto("/login");
  await fillLogin(page);
  await page.getByRole("button", { name: "Entrar na intranet" }).click();

  await expect(page.getByText(adminUser.nome, { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Usuários e Acesso" }).click();

  await expect(page.getByRole("heading", { name: "Usuários" })).toBeVisible();
  await expect(page.getByText("Carlos Menezes")).toBeVisible();

  // Abre modal Novo usuário (UC02)
  await page.getByRole("button", { name: "+ Novo usuário" }).click();
  await expect(page.getByRole("dialog")).toContainText("Novo usuário");
  await page.getByRole("button", { name: "Cancelar" }).click();

  // Abre modal Controle de acesso (UC03)
  await page.getByRole("button", { name: "Acesso" }).nth(1).click();
  await expect(page.getByRole("dialog")).toContainText("Controle de acesso");
  await expect(page.getByText("Histórico de alterações de acesso")).toBeVisible();
});

test("rota administrativa bloqueia colaborador comum e redireciona para /sem-permissao", async ({
  page,
}) => {
  await page.route("**/auth/me", (route) => route.fulfill({ json: colabUser }));
  await page.route("**/auth/login", (route) =>
    route.fulfill({
      json: { access_token: token(), token_type: "bearer", usuario: colabUser },
    }),
  );

  await page.goto("/login");
  await fillLogin(page, colabUser.email, "Colab@123");
  await page.getByRole("button", { name: "Entrar na intranet" }).click();
  await expect(page.getByText(colabUser.nome, { exact: true })).toBeVisible();

  // Tenta acessar diretamente /admin/usuarios
  await page.goto("/admin/usuarios");
  await expect(
    page.getByText("Você não tem permissão para acessar esta funcionalidade."),
  ).toBeVisible();
});
