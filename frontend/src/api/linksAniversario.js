import apiClient from "./client";

const useMocks = String(import.meta.env?.VITE_USE_MOCKS).toLowerCase() === "true";

let linksMemoria = [];
let proximoIdMock = 1;

export async function listarLinksAniversario() {
  if (useMocks) {
    return linksMemoria.filter((item) => Boolean(item.ativo));
  }
  const { data } = await apiClient.get("/links-aniversario");
  return data;
}

export async function listarLinksAniversarioAdmin() {
  if (useMocks) {
    return [...linksMemoria];
  }
  const { data } = await apiClient.get("/links-aniversario/admin");
  return data;
}

export async function criarLinkAniversario(dados) {
  if (useMocks) {
    const novo = {
      id: ++proximoIdMock,
      titulo: String(dados.titulo || "").trim(),
      url: String(dados.url || "").trim(),
      ativo: dados.ativo !== false,
    };
    linksMemoria = [...linksMemoria, novo];
    return novo;
  }
  const { data } = await apiClient.post("/links-aniversario", dados);
  return data;
}

export async function atualizarLinkAniversario(id, dados) {
  if (useMocks) {
    const idx = linksMemoria.findIndex((item) => Number(item.id) === Number(id));
    if (idx === -1) {
      const err = new Error("Link de aniversário não encontrado.");
      err.status = 404;
      err.mensagem = err.message;
      throw err;
    }
    const atualizado = {
      ...linksMemoria[idx],
      titulo: String(dados.titulo || "").trim(),
      url: String(dados.url || "").trim(),
      ativo: Boolean(dados.ativo),
    };
    linksMemoria[idx] = atualizado;
    return atualizado;
  }
  const { data } = await apiClient.put(`/links-aniversario/${id}`, dados);
  return data;
}

export async function excluirLinkAniversario(id) {
  if (useMocks) {
    linksMemoria = linksMemoria.filter((item) => Number(item.id) !== Number(id));
    return;
  }
  await apiClient.delete(`/links-aniversario/${id}`);
}
