import { SETORES_MOCK } from "../mocks/setores";

export async function listarSetores() {
  // Na Semana 1, a listagem de setores para o select de usuários vem dos 10 setores base do seed (A API de setores é S3-T2).
  return SETORES_MOCK;
}

export default listarSetores;
