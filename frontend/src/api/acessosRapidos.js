import apiClient from "./client";

const useMocks = String(import.meta.env?.VITE_USE_MOCKS).toLowerCase() === "true";

let acessosMemoria = [];
let proximoIdMock = 1;

export async function listarAcessosRapidos() {
  if (useMocks) {
    return acessosMemoria
      .filter((item) => Boolean(item.ativo))
      .sort((a, b) => a.ordem - b.ordem || a.id - b.id);
  }
  const { data } = await apiClient.get("/acessos-rapidos");
  return data;
}

export async function listarAcessosRapidosAdmin() {
  if (useMocks) {
    return [...acessosMemoria].sort((a, b) => a.ordem - b.ordem || a.id - b.id);
  }
  const { data } = await apiClient.get("/acessos-rapidos/admin");
  return data;
}

export async function criarAcessoRapido(dados) {
  if (useMocks) {
    const novo = {
      id: ++proximoIdMock,
      titulo: String(dados.titulo || "").trim(),
      url: String(dados.url || "").trim(),
      descricao: dados.descricao ? String(dados.descricao).trim() : null,
      icone: dados.icone || "compass",
      ordem: Number(dados.ordem) || acessosMemoria.length + 1,
      ativo: dados.ativo !== false,
    };
    acessosMemoria = [...acessosMemoria, novo];
    return novo;
  }
  const { data } = await apiClient.post("/acessos-rapidos", dados);
  return data;
}

export async function atualizarAcessoRapido(id, dados) {
  if (useMocks) {
    const idx = acessosMemoria.findIndex((item) => Number(item.id) === Number(id));
    if (idx === -1) {
      const err = new Error("Acesso rápido não encontrado.");
      err.status = 404;
      err.mensagem = err.message;
      throw err;
    }
    const atualizado = {
      ...acessosMemoria[idx],
      titulo: String(dados.titulo || "").trim(),
      url: String(dados.url || "").trim(),
      descricao: dados.descricao ? String(dados.descricao).trim() : null,
      icone: dados.icone || "compass",
      ordem: Number(dados.ordem) || 0,
      ativo: Boolean(dados.ativo),
    };
    acessosMemoria[idx] = atualizado;
    return atualizado;
  }
  const { data } = await apiClient.put(`/acessos-rapidos/${id}`, dados);
  return data;
}

export async function alterarAtivoAcessoRapido(id, ativo) {
  if (useMocks) {
    const idx = acessosMemoria.findIndex((item) => Number(item.id) === Number(id));
    if (idx === -1) {
      const err = new Error("Acesso rápido não encontrado.");
      err.status = 404;
      err.mensagem = err.message;
      throw err;
    }
    const novoAtivo = ativo === undefined ? !acessosMemoria[idx].ativo : Boolean(ativo);
    acessosMemoria[idx] = { ...acessosMemoria[idx], ativo: novoAtivo };
    return acessosMemoria[idx];
  }
  const body = ativo === undefined ? undefined : { ativo: Boolean(ativo) };
  const { data } = await apiClient.patch(`/acessos-rapidos/${id}/ativo`, body);
  return data;
}

export async function reordenarAcessosRapidos(ids) {
  if (useMocks) {
    acessosMemoria = acessosMemoria.map((item) => {
      const pos = ids.findIndex((id) => Number(id) === Number(item.id));
      return pos !== -1 ? { ...item, ordem: pos + 1 } : item;
    });
    return [...acessosMemoria].sort((a, b) => a.ordem - b.ordem || a.id - b.id);
  }
  const { data } = await apiClient.put("/acessos-rapidos/ordem", { ids });
  return data;
}

export async function excluirAcessoRapido(id) {
  if (useMocks) {
    acessosMemoria = acessosMemoria.filter((item) => Number(item.id) !== Number(id));
    return;
  }
  await apiClient.delete(`/acessos-rapidos/${id}`);
}

export default listarAcessosRapidos;
