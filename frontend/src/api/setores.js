import apiClient from "./client";
import { SETORES_MOCK } from "../mocks/setores";

const useMocks = String(import.meta.env?.VITE_USE_MOCKS).toLowerCase() === "true";

let setoresMemoria = SETORES_MOCK.map((s) => ({
  ...s,
  ramais: (s.ramais || []).map((r) => ({ ...r })),
}));
let proximoIdSetorMock = 50;
let proximoIdRamalMock = 200;

function semAcentos(str = "") {
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function limparParametros(filtros = {}) {
  const params = {};
  Object.entries(filtros).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      params[k] = v;
    }
  });
  return params;
}

export async function listarSetores(filtros = {}) {
  if (useMocks) {
    let lista = [...setoresMemoria];

    if (filtros.andar) {
      const andarNorm = semAcentos(filtros.andar);
      lista = lista.filter((s) => semAcentos(s.andar) === andarNorm);
    }

    if (filtros.busca && String(filtros.busca).trim()) {
      const q = semAcentos(filtros.busca.trim());
      lista = lista.filter(
        (s) =>
          semAcentos(s.nome).includes(q) ||
          semAcentos(s.andar).includes(q) ||
          (s.ramais || []).some(
            (r) => semAcentos(r.numero).includes(q) || semAcentos(r.descricao).includes(q),
          ),
      );
    }

    return lista.sort((a, b) => semAcentos(a.nome).localeCompare(semAcentos(b.nome)));
  }

  const { data } = await apiClient.get("/setores", {
    params: limparParametros(filtros),
  });
  return data;
}

export async function obterSetor(id) {
  if (useMocks) {
    const setor = setoresMemoria.find((s) => Number(s.id_setor) === Number(id));
    if (!setor) {
      const err = new Error("Setor não encontrado.");
      err.status = 404;
      err.mensagem = err.message;
      throw err;
    }
    return setor;
  }

  const { data } = await apiClient.get(`/setores/${id}`);
  return data;
}

function validarSetorMock(dados, ignorarIdSetor = null) {
  const nomeNorm = semAcentos(dados.nome || "").trim();
  const nomeDup = setoresMemoria.find(
    (s) => Number(s.id_setor) !== Number(ignorarIdSetor) && semAcentos(s.nome) === nomeNorm,
  );
  if (nomeDup) {
    const err = new Error("Já existe um setor cadastrado com este nome.");
    err.status = 409;
    err.mensagem = err.message;
    err.erros = { nome: err.message };
    throw err;
  }

  const vistos = new Set();
  for (const r of dados.ramais || []) {
    const num = String(r.numero || "").trim();
    if (vistos.has(num)) {
      const msg = `O número de ramal ${num} foi informado mais de uma vez.`;
      const err = new Error(msg);
      err.status = 409;
      err.mensagem = msg;
      err.erros = { ramais: msg };
      throw err;
    }
    vistos.add(num);

    for (const s of setoresMemoria) {
      if (Number(s.id_setor) === Number(ignorarIdSetor)) continue;
      const ramalOutro = (s.ramais || []).find((rm) => rm.numero === num);
      if (ramalOutro) {
        const msg = `O ramal ${num} já está vinculado ao setor ${s.nome}.`;
        const err = new Error(msg);
        err.status = 409;
        err.mensagem = msg;
        err.erros = { ramais: msg };
        throw err;
      }
    }
  }
}

export async function criarSetor(dados) {
  if (useMocks) {
    validarSetorMock(dados);
    const novo = {
      id_setor: ++proximoIdSetorMock,
      nome: String(dados.nome || "").trim(),
      andar: dados.andar ? String(dados.andar).trim() : null,
      ramais: (dados.ramais || []).map((r) => ({
        id_ramal: ++proximoIdRamalMock,
        numero: String(r.numero).trim(),
        descricao: r.descricao ? String(r.descricao).trim() : null,
      })),
      total_usuarios: 0,
    };
    setoresMemoria = [...setoresMemoria, novo];
    return novo;
  }

  const { data } = await apiClient.post("/setores", dados);
  return data;
}

export async function atualizarSetor(id, dados) {
  if (useMocks) {
    const idx = setoresMemoria.findIndex((s) => Number(s.id_setor) === Number(id));
    if (idx === -1) {
      const err = new Error("Setor não encontrado.");
      err.status = 404;
      err.mensagem = err.message;
      throw err;
    }
    validarSetorMock(dados, id);
    const atualizado = {
      ...setoresMemoria[idx],
      nome: String(dados.nome || "").trim(),
      andar: dados.andar ? String(dados.andar).trim() : null,
      ramais: (dados.ramais || []).map((r) => ({
        id_ramal: ++proximoIdRamalMock,
        numero: String(r.numero).trim(),
        descricao: r.descricao ? String(r.descricao).trim() : null,
      })),
    };
    setoresMemoria[idx] = atualizado;
    return atualizado;
  }

  const { data } = await apiClient.put(`/setores/${id}`, dados);
  return data;
}

export async function excluirSetor(id) {
  if (useMocks) {
    const setor = setoresMemoria.find((s) => Number(s.id_setor) === Number(id));
    if (setor && setor.total_usuarios > 0) {
      const err = new Error("Existem usuários vinculados a este setor");
      err.status = 409;
      err.mensagem = err.message;
      throw err;
    }
    setoresMemoria = setoresMemoria.filter((s) => Number(s.id_setor) !== Number(id));
    return;
  }

  await apiClient.delete(`/setores/${id}`);
}

export default listarSetores;
