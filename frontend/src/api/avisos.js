import apiClient, { lerTokenSalvo, lerUsuarioSalvo } from "./client";
import { AVISOS_MOCK_INICIAL } from "../mocks/avisos";

const useMocks = String(import.meta.env?.VITE_USE_MOCKS).toLowerCase() === "true";

let avisosMemoria = [...AVISOS_MOCK_INICIAL];
let proximoIdMock = 100;

function removerTagsHtml(texto = "") {
  return String(texto)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ehExpiradoMock(aviso) {
  if (!aviso.data_expiracao) return false;
  const hojeIso = new Date().toISOString().slice(0, 10);
  return String(aviso.data_expiracao) < hojeIso;
}

function filtrarAvisosMock(filtros = {}, gestao = false) {
  const incluirExpirados = gestao && Boolean(filtros.incluir_expirados);
  let lista = avisosMemoria.map((a) => ({
    ...a,
    expirado: ehExpiradoMock(a),
  }));

  if (!incluirExpirados) {
    lista = lista.filter((a) => !a.expirado);
  }

  if (filtros.categoria) {
    lista = lista.filter((a) => a.categoria === filtros.categoria);
  }

  if (filtros.destaque !== undefined && filtros.destaque !== null) {
    lista = lista.filter((a) => Boolean(a.destaque) === Boolean(filtros.destaque));
  }

  if (filtros.busca) {
    const q = String(filtros.busca).toLowerCase();
    lista = lista.filter(
      (a) =>
        a.titulo.toLowerCase().includes(q) ||
        String(a.conteudo || a.resumo || "")
          .toLowerCase()
          .includes(q),
    );
  }

  lista.sort((a, b) => new Date(b.data_publicacao) - new Date(a.data_publicacao));

  const pagina = Number(filtros.pagina) || 1;
  const tamanho = Number(filtros.tamanho) || 20;
  const inicio = (pagina - 1) * tamanho;
  const itens = lista.slice(inicio, inicio + tamanho);

  return {
    itens,
    total: lista.length,
    pagina,
    tamanho,
  };
}

export async function listarAvisos(filtros = {}) {
  if (useMocks) {
    return filtrarAvisosMock(filtros, false);
  }

  const { data } = await apiClient.get("/avisos", { params: filtros });
  return data;
}

export async function listarAvisosGestao(filtros = {}) {
  if (useMocks || !lerTokenSalvo()) {
    return filtrarAvisosMock(filtros, true);
  }

  const { data } = await apiClient.get("/avisos/gestao", { params: filtros });
  return data;
}

export async function obterAviso(id) {
  if (useMocks) {
    const encontrado = avisosMemoria.find((a) => Number(a.id_aviso) === Number(id));
    if (!encontrado) {
      const err = new Error("Aviso não encontrado.");
      err.status = 404;
      err.mensagem = err.message;
      throw err;
    }
    return {
      ...encontrado,
      expirado: ehExpiradoMock(encontrado),
    };
  }

  const { data } = await apiClient.get(`/avisos/${id}`);
  return data;
}

export async function criarAviso(dados) {
  if (useMocks) {
    const usuario = lerUsuarioSalvo();
    const novo = {
      id_aviso: ++proximoIdMock,
      titulo: dados.titulo,
      conteudo: dados.conteudo,
      resumo: removerTagsHtml(dados.conteudo).slice(0, 200),
      categoria: dados.categoria || "COMUNICADO",
      destaque: Boolean(dados.destaque),
      data_publicacao: new Date().toISOString(),
      data_expiracao: dados.data_expiracao || null,
      data_atualizacao: null,
      expirado: false,
      autor: usuario
        ? { id_usuario: usuario.id_usuario, nome: usuario.nome }
        : { id_usuario: 1, nome: "Administração" },
    };
    avisosMemoria = [novo, ...avisosMemoria];
    return novo;
  }

  const { data } = await apiClient.post("/avisos", dados);
  return data;
}

export async function atualizarAviso(id, dados) {
  if (useMocks) {
    const idx = avisosMemoria.findIndex((a) => Number(a.id_aviso) === Number(id));
    if (idx === -1) {
      const err = new Error("Aviso não encontrado.");
      err.status = 404;
      err.mensagem = err.message;
      throw err;
    }
    const atualizado = {
      ...avisosMemoria[idx],
      titulo: dados.titulo,
      conteudo: dados.conteudo,
      resumo: removerTagsHtml(dados.conteudo).slice(0, 200),
      categoria: dados.categoria,
      destaque: Boolean(dados.destaque),
      data_expiracao: dados.data_expiracao || null,
      data_atualizacao: new Date().toISOString(),
    };
    atualizado.expirado = ehExpiradoMock(atualizado);
    avisosMemoria[idx] = atualizado;
    return atualizado;
  }

  const { data } = await apiClient.put(`/avisos/${id}`, dados);
  return data;
}

export async function excluirAviso(id) {
  if (useMocks) {
    avisosMemoria = avisosMemoria.filter((a) => Number(a.id_aviso) !== Number(id));
    return;
  }

  await apiClient.delete(`/avisos/${id}`);
}
