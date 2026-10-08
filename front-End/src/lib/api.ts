const API_BASE_URL = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000";

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
  data_publicacao: string;
  id_autor: number | null;
}

export interface DocumentoOut {
  id_doc: number;
  titulo: string;
  categoria: string | null;
  url_arquivo: string;
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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ? JSON.stringify(body.detail) : `Erro ${res.status} em ${path}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
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

export function getAvisos(categoria?: string): Promise<AvisoOut[]> {
  return request(`/api/v1/avisos${qs({ categoria })}`);
}

export function getEventos(): Promise<AvisoOut[]> {
  return request("/api/v1/avisos/eventos");
}

export function createAviso(
  payload: { titulo: string; conteudo: string; categoria?: string },
  token: string,
): Promise<AvisoOut> {
  return request("/api/v1/avisos", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
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

export function createDocumento(
  payload: { titulo: string; categoria?: string; url_arquivo: string },
  token: string,
): Promise<DocumentoOut> {
  return request("/api/v1/documentos", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

export function getFaq(categoria?: string): Promise<FaqOut[]> {
  return request(`/api/v1/documentos/faq${qs({ categoria })}`);
}
