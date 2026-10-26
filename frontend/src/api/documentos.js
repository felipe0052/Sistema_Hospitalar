import apiClient from "./client";

export const DOCUMENTO_MAX_MB = 10;
export const EXTENSOES_DOCUMENTO = [".pdf", ".docx"];

export async function listarDocumentos(filtros = {}) {
  const params = Object.fromEntries(
    Object.entries(filtros).filter(([, v]) => v !== "" && v !== null && v !== undefined),
  );
  const { data } = await apiClient.get("/documentos", { params });
  return data;
}

export async function listarCategoriasDocumentos() {
  const { data } = await apiClient.get("/documentos/categorias");
  return data;
}

export async function listarVersoesDocumento(id) {
  const { data } = await apiClient.get(`/documentos/${id}/versoes`);
  return data;
}

export async function enviarDocumento({ arquivo, titulo, tipo, categoria, descricao, palavras_chave }) {
  const form = new FormData();
  form.append("arquivo", arquivo);
  form.append("titulo", titulo);
  form.append("tipo", tipo);
  if (categoria) form.append("categoria", categoria);
  if (descricao) form.append("descricao", descricao);
  if (palavras_chave) form.append("palavras_chave", palavras_chave);

  // Content-Type nulo para o browser definir o boundary do multipart
  const { data } = await apiClient.post("/documentos", form, {
    headers: { "Content-Type": null },
    timeout: 60000,
  });
  return data;
}

export async function excluirDocumento(id) {
  await apiClient.delete(`/documentos/${id}`);
}

/** Baixa o arquivo (com o token, se houver) e abre/salva no navegador. */
export async function baixarDocumento(doc) {
  const { data } = await apiClient.get(`/documentos/${doc.id_doc}/arquivo`, {
    responseType: "blob",
    timeout: 60000,
  });
  const url = URL.createObjectURL(new Blob([data], { type: doc.mime_type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = doc.nome_arquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
