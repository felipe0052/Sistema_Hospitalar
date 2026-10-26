import apiClient from "./client";
import { MOCK_ANIVERSARIANTES } from "../mocks/portal";

const useMocks = String(import.meta.env?.VITE_USE_MOCKS).toLowerCase() === "true";

export async function listarAniversariantesMes(mes) {
  if (useMocks) {
    return MOCK_ANIVERSARIANTES.filter((a) => a.mes === mes);
  }
  const { data } = await apiClient.get("/aniversariantes", { params: { mes } });
  return data;
}

export default listarAniversariantesMes;
