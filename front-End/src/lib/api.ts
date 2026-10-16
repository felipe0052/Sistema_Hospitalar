export const API_BASE_URL = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000";

/** Resolve uma URL de arquivo retornada pela API (ex.: `/uploads/x.pdf`)
 * contra a origem do back-end, já que ela é relativa ao servidor FastAPI,
 * não ao front-end. URLs já absolutas são retornadas como estão. */
export function resolveFileUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `${API_BASE_URL}${url}`;
}

export type Perfil = "Administrador" | "RH" | "Marketing" | "Colaborador";
export type StatusUsuario = "Ativo" | "Inativo";
export type Prioridade = "Baixa" | "Média" | "Alta";
export type TipoDocumento = "PDF" | "DOCX";

export interface SetorOut {
  id_setor: number;
  nome: string;
  ramal: string | null;
  andar: string | null;
}

export interface UsuarioOut {
  id_usuario: number;
  nome: string;
  email: string;
  id_setor: number | null;
  cargo: string | null;
  perfil: Perfil;
  status: StatusUsuario;
  senha_provisoria: boolean;
  data_nascimento: string | null;
  data_criacao: string;
  setor: SetorOut | null;
}

export interface AniversarianteOut {
  id_usuario: number;
  nome: string;
  cargo: string | null;
  data_nascimento: string | null;
  setor: SetorOut | null;
}

export interface AvisoOut {
  id_aviso: number;
  titulo: string;
  conteudo: string;
  categoria: string | null;
  prioridade: Prioridade;
  data_expiracao: string | null;
  data_publicacao: string;
  id_autor: number | null;
}

export interface DocumentoOut {
  id_doc: number;
  titulo: string;
  categoria: string | null;
  descricao: string | null;
  palavras_chave: string | null;
  tipo: TipoDocumento;
  url_arquivo: string;
  versao: string;
  data_upload: string;
}

export interface FaqOut {
  id_faq: number;
  pergunta: string;
  resposta: string;
  categoria: string | null;
  data_criacao: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  usuario: UsuarioOut;
}

/** Erros do FastAPI vêm como string simples (HTTPException) ou lista de
 * erros de validação do Pydantic (422) — normaliza os dois para texto legível. */
function formatDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map(e => (typeof e?.msg === "string" ? e.msg : JSON.stringify(e))).join("; ");
  }
  return JSON.stringify(detail);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ? formatDetail(body.detail) : `Erro ${res.status} em ${path}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function requestForm<T>(path: string, formData: FormData, token: string, method = "POST"): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ? formatDetail(body.detail) : `Erro ${res.status} em ${path}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function checkHealth(): Promise<boolean> {
  return fetch(`${API_BASE_URL}/health`)
    .then(res => res.ok)
    .catch(() => false);
}

function qs(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export function login(email: string, senha: string): Promise<TokenResponse> {
  return request("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ email, senha }) });
}

/** Cadastro de colaborador — restrito a Administrador/RH (RN09). A conta
 * nasce com `senha_provisoria=true`; o usuário troca a senha no primeiro
 * acesso (RN07). */
export function registrarUsuario(
  payload: {
    nome: string;
    email: string;
    senha: string;
    id_setor?: number;
    cargo?: string;
    perfil?: Perfil;
    data_nascimento?: string;
  },
  token: string,
): Promise<UsuarioOut> {
  return request("/api/v1/auth/registrar", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export function alterarSenha(
  payload: { senha_atual: string; nova_senha: string },
  token: string,
): Promise<UsuarioOut> {
  return request("/api/v1/auth/senha", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export function getAvisos(categoria?: string): Promise<AvisoOut[]> {
  return request(`/api/v1/avisos${qs({ categoria })}`);
}

export function getEventos(): Promise<AvisoOut[]> {
  return request("/api/v1/avisos/eventos");
}

export function createAviso(
  payload: { titulo: string; conteudo: string; categoria?: string; prioridade?: Prioridade; data_expiracao?: string },
  token: string,
): Promise<AvisoOut> {
  return request("/api/v1/avisos", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export function updateAviso(
  id_aviso: number,
  payload: Partial<{ titulo: string; conteudo: string; categoria: string; prioridade: Prioridade; data_expiracao: string }>,
  token: string,
): Promise<AvisoOut> {
  return request(`/api/v1/avisos/${id_aviso}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export function deleteAviso(id_aviso: number, token: string): Promise<void> {
  return request(`/api/v1/avisos/${id_aviso}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getAniversariantes(mes?: number, idSetor?: number): Promise<AniversarianteOut[]> {
  return request(`/api/v1/usuarios/aniversariantes${qs({ mes, id_setor: idSetor })}`);
}

export function getContatos(idSetor?: number, busca?: string): Promise<UsuarioOut[]> {
  return request(`/api/v1/usuarios/contatos${qs({ id_setor: idSetor, busca })}`);
}

export function getSetores(): Promise<SetorOut[]> {
  return request("/api/v1/usuarios/setores");
}

export function getDocumentos(categoria?: string, busca?: string): Promise<DocumentoOut[]> {
  return request(`/api/v1/documentos${qs({ categoria, busca })}`);
}

/** RN06 — o back-end agora recebe o upload como multipart/form-data (arquivo real,
 * validado quanto a tipo PDF/DOCX e tamanho máx. 10 MB), não mais uma URL em JSON. */
export function createDocumento(
  payload: { titulo: string; categoria?: string; descricao?: string; palavras_chave?: string; versao?: string },
  arquivo: File,
  token: string,
): Promise<DocumentoOut> {
  const formData = new FormData();
  formData.set("titulo", payload.titulo);
  if (payload.categoria) formData.set("categoria", payload.categoria);
  if (payload.descricao) formData.set("descricao", payload.descricao);
  if (payload.palavras_chave) formData.set("palavras_chave", payload.palavras_chave);
  formData.set("versao", payload.versao ?? "1.0");
  formData.set("arquivo", arquivo);

  return requestForm("/api/v1/documentos", formData, token);
}

export function deleteDocumento(id_doc: number, token: string): Promise<void> {
  return request(`/api/v1/documentos/${id_doc}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getFaq(categoria?: string): Promise<FaqOut[]> {
  return request(`/api/v1/documentos/faq${qs({ categoria })}`);
}
