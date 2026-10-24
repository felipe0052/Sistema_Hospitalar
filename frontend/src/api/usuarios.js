import apiClient, { lerTokenSalvo } from "./client";
import { USUARIOS_MOCK } from "../mocks/usuarios";

const useMocks = String(import.meta.env?.VITE_USE_MOCKS).toLowerCase() === "true";

function filtrarUsuariosMock(filtros = {}) {
  let lista = [...USUARIOS_MOCK];
  if (filtros.busca) {
    const q = filtros.busca.toLowerCase();
    lista = lista.filter(
      (u) => u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }
  if (filtros.id_setor) {
    lista = lista.filter((u) => String(u.setor?.id_setor) === String(filtros.id_setor));
  }
  if (filtros.perfil) {
    lista = lista.filter((u) => u.perfil === filtros.perfil);
  }
  if (filtros.status) {
    lista = lista.filter((u) => u.status === filtros.status);
  }
  return {
    itens: lista,
    total: lista.length,
    pagina: filtros.pagina || 1,
    tamanho: filtros.tamanho || 20,
  };
}

export async function listarUsuarios(filtros = {}) {
  if (useMocks || !lerTokenSalvo()) {
    return filtrarUsuariosMock(filtros);
  }

  const { data } = await apiClient.get("/usuarios", { params: filtros });
  return data;
}

export async function obterUsuario(id) {
  const { data } = await apiClient.get(`/usuarios/${id}`);
  return data;
}

export async function criarUsuario(dados) {
  const { data } = await apiClient.post("/usuarios", dados);
  return data;
}

export async function atualizarUsuario(id, dados) {
  const { data } = await apiClient.put(`/usuarios/${id}`, dados);
  return data;
}

export async function redefinirSenha(id, nova_senha) {
  await apiClient.patch(`/usuarios/${id}/senha`, { nova_senha });
}

export async function alterarAcesso(id, dados) {
  const { data } = await apiClient.patch(`/usuarios/${id}/acesso`, dados);
  return data;
}

export async function listarHistoricoAcesso(id) {
  const { data } = await apiClient.get(`/usuarios/${id}/historico-acesso`);
  return data;
}
