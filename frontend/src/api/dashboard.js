import apiClient from "./client";
import { listarAvisos } from "./avisos";
import { listarEventos } from "./eventos";
import { MOCK_ANIVERSARIANTES } from "../mocks/portal";

const useMocks = String(import.meta.env?.VITE_USE_MOCKS).toLowerCase() === "true";

export async function obterDashboard() {
  if (useMocks) {
    const [destaquesRes, ultimosRes, eventosLista] = await Promise.all([
      listarAvisos({ destaque: true, tamanho: 5 }),
      listarAvisos({ tamanho: 5 }),
      listarEventos(),
    ]);
    return {
      avisos_destaque: (destaquesRes.itens || []).slice(0, 5),
      ultimos_avisos: (ultimosRes.itens || []).slice(0, 5),
      proximos_eventos: (eventosLista || []).slice(0, 5),
      aniversariantes_hoje: MOCK_ANIVERSARIANTES.filter((a) => a.aniversario_hoje),
      total_aniversariantes_mes: MOCK_ANIVERSARIANTES.length,
    };
  }

  const { data } = await apiClient.get("/dashboard");
  return data;
}

export default obterDashboard;
