import apiClient from "./client";

export async function obterOnboarding() {
  const { data } = await apiClient.get("/onboarding");
  return data;
}

export async function marcarItemOnboarding(idItem, concluido) {
  const { data } = await apiClient.put(`/onboarding/itens/${idItem}/conclusao`, { concluido });
  return data;
}

export async function criarItemOnboarding(dados) {
  const { data } = await apiClient.post("/onboarding/itens", dados);
  return data;
}

export async function atualizarItemOnboarding(idItem, dados) {
  const { data } = await apiClient.put(`/onboarding/itens/${idItem}`, dados);
  return data;
}

export async function excluirItemOnboarding(idItem) {
  await apiClient.delete(`/onboarding/itens/${idItem}`);
}

export async function criarContatoOnboarding(dados) {
  const { data } = await apiClient.post("/onboarding/contatos", dados);
  return data;
}

export async function atualizarContatoOnboarding(idContato, dados) {
  const { data } = await apiClient.put(`/onboarding/contatos/${idContato}`, dados);
  return data;
}

export async function excluirContatoOnboarding(idContato) {
  await apiClient.delete(`/onboarding/contatos/${idContato}`);
}
