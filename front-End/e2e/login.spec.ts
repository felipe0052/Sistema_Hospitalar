import { expect, test, type Page } from "@playwright/test";
const user = { id_usuario: 1, nome: "Colaborador Teste", email: "teste@decos.com.br", cargo: "Enfermagem", id_setor: null, setor: null, data_nascimento: null, data_criacao: "2026-01-01" };
const token = (seconds = 3600) => `e30.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + seconds })).toString("base64url")}.teste`;
async function fill(page: Page) {
  await page.getByLabel("E-mail corporativo", { exact: true }).fill(user.email);
  await page.getByLabel("Senha", { exact: true }).fill("Senha1234");
}
test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/**", async route => {
    const path = new URL(route.request().url()).pathname;
    await route.fulfill({ json: path.endsWith("/auth/me") ? user : path.endsWith("/auth/login") ? { access_token: token(), token_type: "bearer", usuario: user } : [] });
  });
});
test("campos obrigatórios, e-mail inválido e mostrar senha", async ({ page }) => {
  let calls = 0;
  page.on("request", request => { if (request.url().endsWith("/auth/login")) calls++; });
  await page.goto("/");
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
test("credenciais inválidas não abrem a intranet", async ({ page }) => {
  await page.route("**/auth/login", route => route.fulfill({ status: 401, json: { detail: "Email ou senha inválidos" } }));
  await page.goto("/"); await fill(page);
  await page.getByRole("button", { name: "Entrar na intranet" }).click();
  await expect(page.getByRole("alert")).toContainText("E-mail ou senha inválidos");
  await expect(page.getByRole("button", { name: "Sair", exact: true })).toHaveCount(0);
});
test("falha de conexão permite tentar novamente", async ({ page }) => {
  await page.route("**/auth/login", route => route.abort());
  await page.goto("/"); await fill(page);
  await page.getByRole("button", { name: "Entrar na intranet" }).click();
  await expect(page.getByRole("alert")).toContainText("Não foi possível conectar");
  await expect(page.getByRole("button", { name: "Entrar na intranet" })).toBeEnabled();
});
test("entrada, recarga, lembrar e-mail e saída", async ({ page }) => {
  await page.goto("/"); await fill(page);
  await page.getByLabel("Lembrar meu e-mail", { exact: true }).check();
  await page.getByLabel("Senha", { exact: true }).press("Enter");
  await expect(page.getByRole("button", { name: "Sair", exact: true })).toBeVisible();
  await expect(page.getByText(user.nome, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Sair", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bom ter você aqui." })).toBeVisible();
  await expect(page.getByLabel("E-mail corporativo", { exact: true })).toHaveValue(user.email);
  await expect(page.getByLabel("Senha", { exact: true })).toHaveValue("");
  expect(await page.evaluate(() => sessionStorage.getItem("decos.auth.token"))).toBeNull();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain("Senha1234");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Bom ter você aqui." })).toBeVisible();
});
test("token expirado ou rejeitado pelo servidor não restaura a sessão", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(value => sessionStorage.setItem("decos.auth.token", value), token(-60));
  await page.reload();
  await expect(page.getByRole("status")).toContainText("Sua sessão expirou");
  await page.route("**/auth/me", route => route.fulfill({ status: 401, json: { detail: "Inválido" } }));
  await page.evaluate(value => sessionStorage.setItem("decos.auth.token", value), token());
  await page.reload();
  await expect(page.getByRole("status")).toContainText("Sua sessão expirou");
  await expect(page.getByRole("button", { name: "Sair", exact: true })).toHaveCount(0);
});
test("sessão expira com a página aberta", async ({ page }) => {
  await page.route("**/auth/login", route => route.fulfill({ json: { access_token: token(2), usuario: user } }));
  await page.goto("/"); await fill(page);
  await page.getByRole("button", { name: "Entrar na intranet" }).click();
  await expect(page.getByRole("button", { name: "Sair", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bom ter você aqui." })).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole("status")).toContainText("Sua sessão expirou");
});
test("previne envio duplicado enquanto autentica", async ({ page }) => {
  let calls = 0;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/auth/login", async route => { calls++; await gate; await route.fulfill({ status: 401, json: {} }); });
  await page.goto("/"); await fill(page);
  await page.getByRole("button", { name: "Entrar na intranet" }).click();
  await expect(page.getByRole("button", { name: "Entrando…" })).toBeDisabled();
  expect(calls).toBe(1); release();
  await expect(page.getByRole("alert")).toBeVisible();
});
test("celular sem rolagem horizontal e ajuda de acesso", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Entrar na intranet" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Esqueci minha senha" }).click();
  await expect(page.getByText("Precisa recuperar seu acesso?", { exact: true })).toBeVisible();
});
