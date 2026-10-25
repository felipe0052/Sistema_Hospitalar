import apiClient from "./client";
import { EVENTOS_MOCK_INICIAL } from "../mocks/eventos";
import { SETORES_MOCK } from "../mocks/setores";

const useMocks = String(import.meta.env?.VITE_USE_MOCKS).toLowerCase() === "true";

let eventosMemoria = [...EVENTOS_MOCK_INICIAL];
let proximoEventoIdMock = 100;

function filtrarEventosMock(filtros = {}) {
  let lista = [...eventosMemoria];
  const temFiltroData = Boolean(
    filtros.mes || filtros.ano || filtros.data_de || filtros.data_ate,
  );

  if (!temFiltroData) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    lista = lista.filter((e) => new Date(e.data_inicio) >= hoje);
  } else {
    if (filtros.mes || filtros.ano) {
      const anoAlvo = Number(filtros.ano) || new Date().getFullYear();
      const mesAlvo = filtros.mes ? Number(filtros.mes) : null;
      lista = lista.filter((e) => {
        const dt = new Date(e.data_inicio);
        if (dt.getFullYear() !== anoAlvo) return false;
        if (mesAlvo && dt.getMonth() + 1 !== mesAlvo) return false;
        return true;
      });
    }
    if (filtros.data_de) {
      const dtDe = new Date(`${filtros.data_de}T00:00:00`);
      lista = lista.filter((e) => new Date(e.data_inicio) >= dtDe);
    }
    if (filtros.data_ate) {
      const dtAte = new Date(`${filtros.data_ate}T23:59:59`);
      lista = lista.filter((e) => new Date(e.data_inicio) <= dtAte);
    }
  }

  if (filtros.categoria) {
    lista = lista.filter((e) => e.categoria === filtros.categoria);
  }

  if (filtros.id_setor) {
    lista = lista.filter((e) => Number(e.setor?.id_setor) === Number(filtros.id_setor));
  }

  if (filtros.busca) {
    const q = String(filtros.busca).toLowerCase();
    lista = lista.filter(
      (e) =>
        e.titulo.toLowerCase().includes(q) ||
        String(e.local || "")
          .toLowerCase()
          .includes(q) ||
        String(e.descricao || "")
          .toLowerCase()
          .includes(q),
    );
  }

  lista.sort((a, b) => new Date(a.data_inicio) - new Date(b.data_inicio));
  return lista;
}

export async function listarEventos(filtros = {}) {
  if (useMocks) {
    return filtrarEventosMock(filtros);
  }

  const { data } = await apiClient.get("/eventos", { params: filtros });
  return data;
}

export async function obterEvento(id) {
  if (useMocks) {
    const ev = eventosMemoria.find((e) => Number(e.id_evento) === Number(id));
    if (!ev) {
      const err = new Error("Evento não encontrado.");
      err.status = 404;
      err.mensagem = err.message;
      throw err;
    }
    return ev;
  }

  const { data } = await apiClient.get(`/eventos/${id}`);
  return data;
}

export async function criarEvento(dados) {
  if (useMocks) {
    const setorObj = dados.id_setor
      ? SETORES_MOCK.find((s) => Number(s.id_setor) === Number(dados.id_setor))
      : null;
    const novo = {
      id_evento: ++proximoEventoIdMock,
      titulo: dados.titulo,
      descricao: dados.descricao || null,
      categoria: dados.categoria || "OUTRO",
      data_inicio: dados.data_inicio,
      data_fim: dados.data_fim || null,
      local: dados.local || null,
      setor: setorObj ? { id_setor: setorObj.id_setor, nome: setorObj.nome } : null,
    };
    eventosMemoria = [...eventosMemoria, novo];
    return novo;
  }

  const { data } = await apiClient.post("/eventos", dados);
  return data;
}

export async function atualizarEvento(id, dados) {
  if (useMocks) {
    const idx = eventosMemoria.findIndex((e) => Number(e.id_evento) === Number(id));
    if (idx === -1) {
      const err = new Error("Evento não encontrado.");
      err.status = 404;
      err.mensagem = err.message;
      throw err;
    }
    const setorObj = dados.id_setor
      ? SETORES_MOCK.find((s) => Number(s.id_setor) === Number(dados.id_setor))
      : null;
    const atualizado = {
      ...eventosMemoria[idx],
      titulo: dados.titulo,
      descricao: dados.descricao || null,
      categoria: dados.categoria,
      data_inicio: dados.data_inicio,
      data_fim: dados.data_fim || null,
      local: dados.local || null,
      setor: setorObj ? { id_setor: setorObj.id_setor, nome: setorObj.nome } : null,
    };
    eventosMemoria[idx] = atualizado;
    return atualizado;
  }

  const { data } = await apiClient.put(`/eventos/${id}`, dados);
  return data;
}

export async function excluirEvento(id) {
  if (useMocks) {
    eventosMemoria = eventosMemoria.filter((e) => Number(e.id_evento) !== Number(id));
    return;
  }

  await apiClient.delete(`/eventos/${id}`);
}
