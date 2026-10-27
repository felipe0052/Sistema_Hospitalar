import apiClient from "./client";
import { FAQ_MOCK_INICIAL } from "../mocks/faq";

const useMocks = String(import.meta.env?.VITE_USE_MOCKS).toLowerCase() === "true";

let faqsMemoria = [...FAQ_MOCK_INICIAL];
let proximoIdFaqMock = 100;

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

export async function listarFaqs(filtros = {}) {
  if (useMocks) {
    let lista = [...faqsMemoria];

    if (filtros.categoria) {
      const catNorm = semAcentos(filtros.categoria);
      lista = lista.filter((f) => semAcentos(f.categoria) === catNorm);
    }

    if (filtros.busca && String(filtros.busca).trim()) {
      const q = semAcentos(filtros.busca.trim());
      lista = lista.filter(
        (f) => semAcentos(f.pergunta).includes(q) || semAcentos(f.resposta).includes(q),
      );
    }

    const gruposMap = new Map();
    lista.forEach((item) => {
      const chave = semAcentos(item.categoria);
      if (!gruposMap.has(chave)) {
        gruposMap.set(chave, { categoria: item.categoria, perguntas: [] });
      }
      gruposMap.get(chave).perguntas.push(item);
    });

    return Array.from(gruposMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, grupo]) => ({
        categoria: grupo.categoria,
        perguntas: grupo.perguntas.sort(
          (a, b) => (a.ordem || 0) - (b.ordem || 0) || a.id_faq - b.id_faq,
        ),
      }));
  }

  const { data } = await apiClient.get("/faq", {
    params: limparParametros(filtros),
  });
  return data;
}

export async function listarCategoriasFaq() {
  if (useMocks) {
    const map = new Map();
    faqsMemoria.forEach((f) => {
      if (f.categoria && f.categoria.trim()) {
        const k = semAcentos(f.categoria.trim());
        if (!map.has(k)) map.set(k, f.categoria.trim());
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, val]) => val);
  }

  const { data } = await apiClient.get("/faq/categorias");
  return data;
}

export async function criarFaq(dados) {
  if (useMocks) {
    const novo = {
      id_faq: ++proximoIdFaqMock,
      pergunta: String(dados.pergunta || "").trim(),
      resposta: String(dados.resposta || "").trim(),
      categoria: String(dados.categoria || "").trim(),
      ordem: Number(dados.ordem) || 0,
    };
    faqsMemoria = [...faqsMemoria, novo];
    return novo;
  }

  const { data } = await apiClient.post("/faq", dados);
  return data;
}

export async function atualizarFaq(id, dados) {
  if (useMocks) {
    const idx = faqsMemoria.findIndex((f) => Number(f.id_faq) === Number(id));
    if (idx === -1) {
      const err = new Error("Pergunta frequente não encontrada.");
      err.status = 404;
      err.mensagem = err.message;
      throw err;
    }
    const atualizado = {
      ...faqsMemoria[idx],
      pergunta: String(dados.pergunta || "").trim(),
      resposta: String(dados.resposta || "").trim(),
      categoria: String(dados.categoria || "").trim(),
      ordem: Number(dados.ordem) || 0,
    };
    faqsMemoria[idx] = atualizado;
    return atualizado;
  }

  const { data } = await apiClient.put(`/faq/${id}`, dados);
  return data;
}

export async function excluirFaq(id) {
  if (useMocks) {
    faqsMemoria = faqsMemoria.filter((f) => Number(f.id_faq) !== Number(id));
    return;
  }

  await apiClient.delete(`/faq/${id}`);
}
