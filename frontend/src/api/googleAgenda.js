import apiClient from "./client";

export async function obterStatusGoogle() {
  const { data } = await apiClient.get("/google-agenda/status");
  return data;
}

export async function obterUrlConexaoGoogle() {
  const { data } = await apiClient.get("/google-agenda/conectar");
  return data.url;
}

export async function desconectarGoogle() {
  await apiClient.delete("/google-agenda");
}

export async function adicionarEventoGoogle(idEvento) {
  await apiClient.post(`/google-agenda/eventos/${idEvento}`);
}

export async function removerEventoGoogle(idEvento) {
  await apiClient.delete(`/google-agenda/eventos/${idEvento}`);
}

export async function definirReceberTodosGoogle(receberTodos) {
  const { data } = await apiClient.put("/google-agenda/preferencias", { receber_todos: receberTodos });
  return data;
}

export async function sincronizarEventosGoogle() {
  const { data } = await apiClient.post("/google-agenda/sincronizar", null, { timeout: 60000 });
  return data;
}
