import apiClient from "./client";
import { MOCK_ANIVERSARIANTES } from "../mocks/portal";
import { USUARIOS_MOCK } from "../mocks/usuarios";

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

function extrairAniversariantesDeUsuariosMock(hoje) {
  const celebrantes = [];
  const diaHoje = hoje.getDate();
  const mesHoje = hoje.getMonth() + 1;
  const idsJaIncluidos = new Set();

  USUARIOS_MOCK.forEach((u) => {
    if (u.status === "ATIVO" && u.data_nascimento) {
      const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(u.data_nascimento).trim());
      if (match) {
        const dia = Number(match[3]);
        const mes = Number(match[2]);
        idsJaIncluidos.add(u.id_usuario);
        celebrantes.push({
          id_usuario: u.id_usuario,
          nome: u.nome,
          cargo: u.cargo || "Colaborador",
          setor: u.setor ? { id_setor: u.setor.id_setor, nome: u.setor.nome } : null,
          dia,
          mes,
          aniversario_hoje: dia === diaHoje && mes === mesHoje,
        });
      }
    }
  });

  // Complementa com MOCK_ANIVERSARIANTES para nomes adicionais que não colidam
  MOCK_ANIVERSARIANTES.forEach((m) => {
    if (!idsJaIncluidos.has(m.id_usuario)) {
      celebrantes.push(m);
    }
  });

  return celebrantes;
}

export async function listarAniversariantes(filtrosOuMes = {}) {
  const filtros =
    typeof filtrosOuMes === "number" ? { mes: filtrosOuMes } : { ...(filtrosOuMes || {}) };

  const hoje = new Date();
  const mesAlvo = filtros.mes ? Number(filtros.mes) : hoje.getMonth() + 1;

  if (useMocks) {
    const todosMock = extrairAniversariantesDeUsuariosMock(hoje);
    let lista = todosMock.filter((a) => Number(a.mes) === mesAlvo);

    if (filtros.dia !== undefined && filtros.dia !== null && filtros.dia !== "") {
      lista = lista.filter((a) => Number(a.dia) === Number(filtros.dia));
    }

    if (filtros.id_setor !== undefined && filtros.id_setor !== null && filtros.id_setor !== "") {
      lista = lista.filter(
        (a) => a.setor && Number(a.setor.id_setor) === Number(filtros.id_setor),
      );
    }

    if (filtros.busca && String(filtros.busca).trim()) {
      const q = semAcentos(filtros.busca.trim());
      lista = lista.filter((a) => semAcentos(a.nome).includes(q));
    }

    return [...lista].sort(
      (a, b) => Number(a.dia) - Number(b.dia) || semAcentos(a.nome).localeCompare(semAcentos(b.nome)),
    );
  }

  const { data } = await apiClient.get("/aniversariantes", {
    params: limparParametros({
      mes: mesAlvo,
      dia: filtros.dia,
      id_setor: filtros.id_setor,
      busca: filtros.busca,
    }),
  });
  return data;
}

export async function listarAniversariantesMes(mes, filtrosExtras = {}) {
  return listarAniversariantes({ ...filtrosExtras, mes });
}

export default listarAniversariantes;
