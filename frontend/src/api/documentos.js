import apiClient, { lerUsuarioSalvo } from "./client";
import { DOCUMENTOS_MOCK_INICIAL } from "../mocks/documentos";

export const DOCUMENTO_MAX_MB = 20;
export const EXTENSOES_DOCUMENTO = [".pdf", ".docx"];

const useMocks = String(import.meta.env?.VITE_USE_MOCKS).toLowerCase() === "true";

let documentosMemoria = [...DOCUMENTOS_MOCK_INICIAL];
let proximoIdDocMock = 200;
const arquivosBlobMemoria = new Map();

function semAcentos(str = "") {
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizarPalavrasChave(valor) {
  if (!valor) return [];
  if (Array.isArray(valor)) {
    return valor.map((v) => String(v).trim()).filter(Boolean);
  }
  return String(valor)
    .replace(/;/g, ",")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
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

function gerarPdfMockBlob(doc) {
  const tituloAscii = semAcentos(doc?.titulo || "Documento Hospital Decos").toUpperCase();
  const descAscii = semAcentos(doc?.descricao || "Procedimento Operacional Padrao");
  const conteudo = [
    "%PDF-1.4",
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${tituloAscii.length + descAscii.length + 120} >> stream`,
    `BT /F1 12 Tf 50 760 Td (${tituloAscii.slice(0, 75)}) Tj 0 -24 Td /F1 10 Tf (${descAscii.slice(0, 90)}) Tj ET`,
    "endstream endobj",
    "trailer << /Root 1 0 R >>",
    "%%EOF",
  ].join("\n");
  return new Blob([conteudo], { type: "application/pdf" });
}

export async function listarDocumentos(filtros = {}) {
  if (useMocks) {
    let lista = [...documentosMemoria];

    if (!filtros.incluir_inativas) {
      lista = lista.filter((d) => d.ativo !== false);
    }

    if (filtros.tipo) {
      lista = lista.filter((d) => d.tipo === String(filtros.tipo).toUpperCase());
    }

    if (filtros.categoria) {
      const catNorm = semAcentos(filtros.categoria);
      lista = lista.filter((d) => semAcentos(d.categoria) === catNorm);
    }

    if (filtros.palavra_chave) {
      const pNorm = semAcentos(filtros.palavra_chave);
      lista = lista.filter((d) =>
        (d.palavras_chave || []).some((kw) => semAcentos(kw).includes(pNorm)),
      );
    }

    if (filtros.busca && String(filtros.busca).trim()) {
      const q = semAcentos(filtros.busca.trim());
      lista = lista.filter((d) => {
        const emTitulo = semAcentos(d.titulo).includes(q);
        const emDesc = semAcentos(d.descricao).includes(q);
        const emTags = (d.palavras_chave || []).some((kw) => semAcentos(kw).includes(q));
        return emTitulo || emDesc || emTags;
      });
    }

    lista.sort((a, b) => new Date(b.data_upload) - new Date(a.data_upload));

    const pagina = Number(filtros.pagina) || 1;
    const tamanho = Number(filtros.tamanho) || 20;
    const inicio = (pagina - 1) * tamanho;
    return {
      itens: lista.slice(inicio, inicio + tamanho),
      total: lista.length,
      pagina,
      tamanho,
    };
  }

  const { data } = await apiClient.get("/documentos", {
    params: limparParametros(filtros),
  });
  return data;
}

export async function listarCategoriasDocumentos() {
  if (useMocks) {
    const map = new Map();
    documentosMemoria.forEach((d) => {
      if (d.categoria && d.categoria.trim()) {
        const k = semAcentos(d.categoria.trim());
        if (!map.has(k)) map.set(k, d.categoria.trim());
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, val]) => val);
  }

  const { data } = await apiClient.get("/documentos/categorias");
  return data;
}

export const listarCategorias = listarCategoriasDocumentos;

export async function obterDocumento(id) {
  if (useMocks) {
    const doc = documentosMemoria.find((d) => Number(d.id_doc) === Number(id));
    if (!doc) {
      const err = new Error("Documento não encontrado.");
      err.status = 404;
      err.mensagem = err.message;
      throw err;
    }
    return doc;
  }

  const { data } = await apiClient.get(`/documentos/${id}`);
  return data;
}

export async function listarVersoesDocumento(id) {
  if (useMocks) {
    const doc = documentosMemoria.find((d) => Number(d.id_doc) === Number(id));
    if (!doc) return [];
    return documentosMemoria
      .filter((d) => d.tipo === doc.tipo && semAcentos(d.titulo) === semAcentos(doc.titulo))
      .sort((a, b) => (b.versao || 1) - (a.versao || 1));
  }

  const { data } = await apiClient.get(`/documentos/${id}/versoes`);
  return data;
}

export async function obterBlobArquivoDocumento(idOuDoc, { download = false } = {}) {
  const id = typeof idOuDoc === "object" && idOuDoc !== null ? idOuDoc.id_doc : idOuDoc;
  const docObj = typeof idOuDoc === "object" && idOuDoc !== null ? idOuDoc : null;

  if (useMocks) {
    const doc = docObj || (await obterDocumento(id));
    const salvo = arquivosBlobMemoria.get(Number(id));
    if (salvo) {
      return { blob: salvo, mimeType: doc.mime_type, nomeArquivo: doc.nome_arquivo };
    }
    if (doc.mime_type === "application/pdf") {
      return {
        blob: gerarPdfMockBlob(doc),
        mimeType: "application/pdf",
        nomeArquivo: doc.nome_arquivo,
      };
    }
    const docxBlob = new Blob(["PK\x03\x04 Mock DOCX Hospital Decos"], {
      type: doc.mime_type,
    });
    return { blob: docxBlob, mimeType: doc.mime_type, nomeArquivo: doc.nome_arquivo };
  }

  const response = await apiClient.get(`/documentos/${id}/arquivo`, {
    params: download ? { download: true } : {},
    responseType: "blob",
    timeout: 60000,
  });

  let nomeArquivo = docObj?.nome_arquivo;
  const disposition = response.headers?.["content-disposition"];
  if (!nomeArquivo && disposition) {
    const matchUtf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (matchUtf8) {
      try {
        nomeArquivo = decodeURIComponent(matchUtf8[1]);
      } catch {
        nomeArquivo = matchUtf8[1];
      }
    } else {
      const matchAscii = disposition.match(/filename="?([^";]+)"?/i);
      if (matchAscii) {
        nomeArquivo = matchAscii[1];
      }
    }
  }

  return {
    blob: response.data,
    mimeType: response.headers?.["content-type"] || "application/octet-stream",
    nomeArquivo: nomeArquivo || "documento",
  };
}

export async function baixarDocumento(doc) {
  const { data } = await apiClient.get(`/documentos/${doc.id_doc}/arquivo`, {
    params: { download: true },
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

export async function criarDocumento(formData, onUploadProgress) {
  if (useMocks) {
    const usuario = lerUsuarioSalvo();
    const titulo = String(formData.get("titulo") || "").trim();
    const tipo = String(formData.get("tipo") || "POP").toUpperCase();
    const categoria = String(formData.get("categoria") || "").trim() || null;
    const descricao = String(formData.get("descricao") || "").trim() || null;
    const palavrasChave = normalizarPalavrasChave(formData.get("palavras_chave"));
    const arquivo = formData.get("arquivo");

    if (onUploadProgress) {
      onUploadProgress({ loaded: 100, total: 100 });
    }

    const idDoc = ++proximoIdDocMock;
    const nomeArquivo = arquivo?.name || "documento.pdf";
    const isDocx = nomeArquivo.toLowerCase().endsWith(".docx");
    const mimeType = isDocx
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : "application/pdf";
    const tamanhoBytes = arquivo?.size || 256000;

    if (arquivo instanceof Blob) {
      arquivosBlobMemoria.set(idDoc, arquivo);
    }

    const novo = {
      id_doc: idDoc,
      titulo,
      tipo,
      categoria,
      descricao,
      palavras_chave: palavrasChave,
      nome_arquivo: nomeArquivo,
      mime_type: mimeType,
      tamanho_bytes: tamanhoBytes,
      versao: 1,
      ativo: true,
      data_upload: new Date().toISOString(),
      data_atualizacao: null,
      autor: usuario
        ? { id_usuario: usuario.id_usuario, nome: usuario.nome }
        : { id_usuario: 1, nome: "Administração" },
      url_visualizar: `/api/v1/documentos/${idDoc}/arquivo`,
      url_download: `/api/v1/documentos/${idDoc}/arquivo?download=true`,
    };
    documentosMemoria = [novo, ...documentosMemoria];
    return novo;
  }

  const { data } = await apiClient.post("/documentos", formData, {
    headers: { "Content-Type": null },
    onUploadProgress,
    timeout: 60000,
  });
  return data;
}

export async function enviarDocumento({ arquivo, titulo, tipo, categoria, descricao, palavras_chave }) {
  const form = new FormData();
  if (arquivo) form.append("arquivo", arquivo);
  if (titulo) form.append("titulo", titulo);
  if (tipo) form.append("tipo", tipo);
  if (categoria) form.append("categoria", categoria);
  if (descricao) form.append("descricao", descricao);
  if (palavras_chave) form.append("palavras_chave", palavras_chave);

  return criarDocumento(form);
}

export async function atualizarDocumento(id, formData, onUploadProgress) {
  if (useMocks) {
    const idx = documentosMemoria.findIndex((d) => Number(d.id_doc) === Number(id));
    if (idx === -1) {
      const err = new Error("Documento não encontrado.");
      err.status = 404;
      err.mensagem = err.message;
      throw err;
    }

    if (onUploadProgress) {
      onUploadProgress({ loaded: 100, total: 100 });
    }

    const atual = documentosMemoria[idx];
    const arquivo = formData.get("arquivo");
    let nomeArquivo = atual.nome_arquivo;
    let mimeType = atual.mime_type;
    let tamanhoBytes = atual.tamanho_bytes;

    if (arquivo && arquivo.name) {
      nomeArquivo = arquivo.name;
      mimeType = nomeArquivo.toLowerCase().endsWith(".docx")
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/pdf";
      tamanhoBytes = arquivo.size || tamanhoBytes;
      if (arquivo instanceof Blob) {
        arquivosBlobMemoria.set(Number(id), arquivo);
      }
    }

    const atualizado = {
      ...atual,
      titulo: String(formData.get("titulo") || atual.titulo).trim(),
      tipo: String(formData.get("tipo") || atual.tipo).toUpperCase(),
      categoria: String(formData.get("categoria") || "").trim() || null,
      descricao: String(formData.get("descricao") || "").trim() || null,
      palavras_chave: normalizarPalavrasChave(formData.get("palavras_chave")),
      nome_arquivo: nomeArquivo,
      mime_type: mimeType,
      tamanho_bytes: tamanhoBytes,
      data_atualizacao: new Date().toISOString(),
    };
    documentosMemoria[idx] = atualizado;
    return atualizado;
  }

  const { data } = await apiClient.put(`/documentos/${id}`, formData, {
    headers: { "Content-Type": null },
    onUploadProgress,
    timeout: 60000,
  });
  return data;
}

export async function excluirDocumento(id) {
  if (useMocks) {
    documentosMemoria = documentosMemoria.filter((d) => Number(d.id_doc) !== Number(id));
    arquivosBlobMemoria.delete(Number(id));
    return;
  }

  await apiClient.delete(`/documentos/${id}`);
}
