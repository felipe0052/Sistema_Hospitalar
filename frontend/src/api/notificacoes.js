import apiClient from "./client";

export async function listarNotificacoes({ pagina = 1, tamanho = 20, apenasNaoLidas = false } = {}) {
  const { data } = await apiClient.get("/notificacoes", {
    params: { pagina, tamanho, apenas_nao_lidas: apenasNaoLidas || undefined },
  });
  return data;
}

export async function contarNaoLidas() {
  const { data } = await apiClient.get("/notificacoes/nao-lidas/contagem");
  return Number(data?.total) || 0;
}

export async function marcarNotificacaoLida(id) {
  await apiClient.post(`/notificacoes/${id}/lida`);
}

export async function marcarTodasNotificacoesLidas() {
  await apiClient.post("/notificacoes/marcar-todas-lidas");
}

const ROTAS_CONTEUDO = {
  NOTICIA: (id) => `/avisos/${id}`,
  EVENTO: (id) => `/eventos/${id}`,
  EVENTO_DO_DIA: (id) => `/eventos/${id}`,
  RECONHECIMENTO: (id) => `/reconhecimentos/${id}`,
};

/** Confirma se o conteúdo da notificação ainda existe (404 = removido/expirado). */
export async function conteudoDisponivel(notificacao) {
  const rota = ROTAS_CONTEUDO[notificacao.tipo];
  if (!rota) return true;
  try {
    await apiClient.get(rota(notificacao.id_referencia));
    return true;
  } catch (err) {
    if (err?.status === 404) return false;
    return true; // outra falha (rede etc.): deixa navegar e a tela de destino trata
  }
}

export const TIPOS_NOTIFICACAO = {
  NOTICIA: { icone: "📰", rotulo: "Notícia" },
  EVENTO: { icone: "📅", rotulo: "Novo evento" },
  EVENTO_DO_DIA: { icone: "⏰", rotulo: "Evento de hoje" },
  RECONHECIMENTO: { icone: "🏆", rotulo: "Reconhecimento" },
};
