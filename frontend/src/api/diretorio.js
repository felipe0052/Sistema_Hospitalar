import apiClient from "./client";
import { DIRETORIO_COLABORADORES_MOCK } from "../mocks/diretorio";
import { SETORES_MOCK } from "../mocks/setores";

const useMocks = String(import.meta.env?.VITE_USE_MOCKS).toLowerCase() === "true";

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

function ordemAndar(andar = "") {
  const norm = semAcentos(andar).trim();
  if (!norm || norm === "andar nao informado") return 999;
  if (norm.includes("terreo")) return 0;
  const m = norm.match(/(\d+)/);
  if (m) return Number(m[1]);
  return 100;
}

export async function listarDiretorio(filtros = {}) {
  const pagina = Number(filtros.pagina) > 0 ? Number(filtros.pagina) : 1;
  const tamanho = Number(filtros.tamanho) > 0 ? Number(filtros.tamanho) : 20;

  if (useMocks) {
    let lista = [...DIRETORIO_COLABORADORES_MOCK];

    if (filtros.id_setor) {
      lista = lista.filter(
        (u) => u.setor && Number(u.setor.id_setor) === Number(filtros.id_setor),
      );
    }

    if (filtros.andar && String(filtros.andar).trim()) {
      const andarNorm = semAcentos(filtros.andar.trim());
      lista = lista.filter((u) => u.setor && semAcentos(u.setor.andar) === andarNorm);
    }

    if (filtros.busca && String(filtros.busca).trim()) {
      const q = semAcentos(filtros.busca.trim());
      lista = lista.filter(
        (u) => semAcentos(u.nome).includes(q) || semAcentos(u.cargo || "").includes(q),
      );
    }

    lista.sort((a, b) => semAcentos(a.nome).localeCompare(semAcentos(b.nome)));

    const total = lista.length;
    const inicio = (pagina - 1) * tamanho;
    const itens = lista.slice(inicio, inicio + tamanho);

    return {
      itens,
      total,
      pagina,
      tamanho,
    };
  }

  const { data } = await apiClient.get("/diretorio", {
    params: limparParametros({
      busca: filtros.busca,
      id_setor: filtros.id_setor,
      andar: filtros.andar,
      pagina,
      tamanho,
    }),
  });
  return data;
}

export async function listarRamaisPorAndar(filtros = {}) {
  if (useMocks) {
    let setores = [...SETORES_MOCK];

    if (filtros.andar && String(filtros.andar).trim()) {
      const andarNorm = semAcentos(filtros.andar.trim());
      setores = setores.filter((s) => semAcentos(s.andar) === andarNorm);
    }

    if (filtros.busca && String(filtros.busca).trim()) {
      const q = semAcentos(filtros.busca.trim());
      setores = setores.filter(
        (s) =>
          semAcentos(s.nome).includes(q) ||
          semAcentos(s.andar).includes(q) ||
          (s.ramais || []).some(
            (r) => semAcentos(r.numero).includes(q) || semAcentos(r.descricao).includes(q),
          ),
      );
    }

    const gruposMap = new Map();
    setores.forEach((s) => {
      const chaveAndar = (s.andar || "").trim() || "Andar não informado";
      if (!gruposMap.has(chaveAndar)) {
        gruposMap.set(chaveAndar, []);
      }
      gruposMap.get(chaveAndar).push({
        id_setor: s.id_setor,
        nome: s.nome,
        ramais: (s.ramais || []).map((r) => ({
          numero: r.numero,
          descricao: r.descricao || null,
        })),
      });
    });

    const andaresOrdenados = Array.from(gruposMap.keys()).sort(
      (a, b) => ordemAndar(a) - ordemAndar(b) || semAcentos(a).localeCompare(semAcentos(b)),
    );

    return andaresOrdenados.map((andar) => ({
      andar,
      setores: gruposMap
        .get(andar)
        .sort((a, b) => semAcentos(a.nome).localeCompare(semAcentos(b.nome))),
    }));
  }

  const { data } = await apiClient.get("/diretorio/ramais", {
    params: limparParametros({
      busca: filtros.busca,
      andar: filtros.andar,
    }),
  });
  return data;
}

export default listarDiretorio;
