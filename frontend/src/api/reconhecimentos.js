import apiClient from "./client";

export const TIPOS_RECONHECIMENTO = [
  { value: "PROMOCAO", label: "Promoção" },
  { value: "DESTAQUE", label: "Destaque" },
  { value: "TEMPO_DE_CASA", label: "Tempo de casa" },
  { value: "AGRADECIMENTO", label: "Agradecimento" },
];

export const ROTULO_TIPO_RECONHECIMENTO = Object.fromEntries(
  TIPOS_RECONHECIMENTO.map((t) => [t.value, t.label]),
);

export const ROTULO_STATUS_INDICACAO = {
  PENDENTE: "Pendente",
  APROVADA: "Aprovada",
  RECUSADA: "Recusada",
};

export async function listarReconhecimentos(filtros = {}) {
  const { data } = await apiClient.get("/reconhecimentos", { params: filtros });
  return data;
}

export async function obterReconhecimento(id) {
  const { data } = await apiClient.get(`/reconhecimentos/${id}`);
  return data;
}

export async function criarReconhecimento(dados) {
  const { data } = await apiClient.post("/reconhecimentos", dados);
  return data;
}

export async function atualizarReconhecimento(id, dados) {
  const { data } = await apiClient.put(`/reconhecimentos/${id}`, dados);
  return data;
}

export async function excluirReconhecimento(id) {
  await apiClient.delete(`/reconhecimentos/${id}`);
}

export async function criarIndicacao(dados) {
  const { data } = await apiClient.post("/indicacoes", dados);
  return data;
}

export async function listarMinhasIndicacoes() {
  const { data } = await apiClient.get("/indicacoes/minhas");
  return data;
}

export async function listarIndicacoes(filtros = {}) {
  const { data } = await apiClient.get("/indicacoes", { params: filtros });
  return data;
}

export async function recusarIndicacao(id) {
  const { data } = await apiClient.post(`/indicacoes/${id}/recusar`);
  return data;
}
