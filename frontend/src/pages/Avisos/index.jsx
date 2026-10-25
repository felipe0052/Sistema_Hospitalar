import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  atualizarAviso,
  criarAviso,
  excluirAviso,
  listarAvisos,
  listarAvisosGestao,
  obterAviso,
} from "../../api/avisos";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  Input,
  Modal,
  Pagination,
  SearchInput,
  Select,
  Skeleton,
  Textarea,
  useToast,
} from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";

const CATEGORIAS_CHIPS = [
  { value: "", label: "Todas" },
  { value: "NOTICIA", label: "Notícias" },
  { value: "COMUNICADO", label: "Comunicados" },
  { value: "PROMOCAO", label: "Promoções" },
  { value: "MUDANCA_SETOR", label: "Mudanças de Setor" },
];

const OPCOES_CATEGORIA_SELECT = [
  { value: "COMUNICADO", label: "Comunicado" },
  { value: "NOTICIA", label: "Notícia" },
  { value: "PROMOCAO", label: "Promoção" },
  { value: "MUDANCA_SETOR", label: "Mudança de Setor" },
];

const CATEGORIA_LABELS = {
  NOTICIA: "Notícia",
  COMUNICADO: "Comunicado",
  PROMOCAO: "Promoção",
  MUDANCA_SETOR: "Mudança de Setor",
};

const CATEGORIA_BADGE_VARIANT = {
  NOTICIA: "primary",
  COMUNICADO: "info",
  PROMOCAO: "ativo",
  MUDANCA_SETOR: "warning",
};

export function formatarDataHoraAviso(iso) {
  if (!iso) return "—";
  try {
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return String(iso);
    const data = dt.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const hora = dt.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${data} às ${hora}`;
  } catch {
    return String(iso);
  }
}

function sanitizarHtmlSeguroFront(html = "") {
  return String(html)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

function obterHojeIsoLocal() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export default function Avisos() {
  const { id: idParam } = useParams();
  const navigate = useNavigate();
  const { autenticado, temPerfil } = useAuth();
  const podeGerir = autenticado && temPerfil("ADMIN", "RH", "MARKETING");
  const { sucesso, erro: toastErro } = useToast();

  // Filtros e paginação do mural
  const [busca, setBusca] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState("");
  const [incluirExpirados, setIncluirExpirados] = useState(false);
  const [pagina, setPagina] = useState(1);
  const tamanho = 12;

  // Dados da listagem e destaques
  const [avisos, setAvisos] = useState([]);
  const [destaques, setDestaques] = useState([]);
  const [total, setTotal] = useState(0);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [erroLista, setErroLista] = useState("");

  // Dados da visão de detalhe (/avisos/:id)
  const [avisoDetalhe, setAvisoDetalhe] = useState(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [erroDetalhe, setErroDetalhe] = useState("");

  // Modal Criar/Editar Aviso (UC04)
  const [modalFormOpen, setModalFormOpen] = useState(false);
  const [avisoEditando, setAvisoEditando] = useState(null);
  const [formDados, setFormDados] = useState({
    titulo: "",
    categoria: "COMUNICADO",
    conteudo: "",
    destaque: false,
    data_expiracao: "",
  });
  const [errosForm, setErrosForm] = useState({});
  const [salvandoForm, setSalvandoForm] = useState(false);
  const conteudoRef = useRef(null);

  // Confirmação de exclusão
  const [avisoExcluindo, setAvisoExcluindo] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  const carregarMural = useCallback(async () => {
    setCarregandoLista(true);
    setErroLista("");
    try {
      const params = {
        busca: busca || undefined,
        categoria: categoriaAtiva || undefined,
        pagina,
        tamanho,
      };

      const promessaLista =
        podeGerir && incluirExpirados
          ? listarAvisosGestao({ ...params, incluir_expirados: true })
          : listarAvisos(params);

      const promessaDestaques = listarAvisos({ destaque: true, tamanho: 5 });

      const [resLista, resDestaques] = await Promise.all([promessaLista, promessaDestaques]);
      setAvisos(resLista.itens || []);
      setTotal(resLista.total || 0);
      setDestaques(resDestaques.itens || []);
    } catch (err) {
      setErroLista(err?.mensagem || "Não foi possível carregar os avisos do mural.");
    } finally {
      setCarregandoLista(false);
    }
  }, [busca, categoriaAtiva, incluirExpirados, pagina, podeGerir, tamanho]);

  const carregarDetalhe = useCallback(async (idAviso) => {
    setCarregandoDetalhe(true);
    setErroDetalhe("");
    try {
      const dados = await obterAviso(idAviso);
      setAvisoDetalhe(dados);
    } catch (err) {
      setErroDetalhe(err?.mensagem || "Aviso não encontrado ou expirado.");
      setAvisoDetalhe(null);
    } finally {
      setCarregandoDetalhe(false);
    }
  }, []);

  useEffect(() => {
    if (idParam) {
      carregarDetalhe(idParam);
    } else {
      carregarMural();
    }
  }, [idParam, carregarDetalhe, carregarMural]);

  const handleBusca = useCallback((termo) => {
    setBusca((atual) => {
      if (atual !== termo) setPagina(1);
      return termo;
    });
  }, []);

  function abrirModalNovo() {
    setAvisoEditando(null);
    setFormDados({
      titulo: "",
      categoria: "COMUNICADO",
      conteudo: "",
      destaque: false,
      data_expiracao: "",
    });
    setErrosForm({});
    setModalFormOpen(true);
  }

  async function abrirModalEditar(avisoAlvo) {
    setErrosForm({});
    try {
      // Se o card na listagem só tiver o resumo, busca o conteúdo completo antes de editar
      const completo =
        avisoAlvo.conteudo !== undefined ? avisoAlvo : await obterAviso(avisoAlvo.id_aviso);
      setAvisoEditando(completo);
      setFormDados({
        titulo: completo.titulo || "",
        categoria: completo.categoria || "COMUNICADO",
        conteudo: completo.conteudo || "",
        destaque: Boolean(completo.destaque),
        data_expiracao: completo.data_expiracao ? String(completo.data_expiracao).slice(0, 10) : "",
      });
      setModalFormOpen(true);
    } catch (err) {
      toastErro(err?.mensagem || "Não foi possível carregar os dados do aviso para edição.");
    }
  }

  function inserirTagConteudo(tagAbre, tagFecha = "") {
    const el = conteudoRef.current;
    const atual = formDados.conteudo || "";
    if (!el) {
      setFormDados((prev) => ({
        ...prev,
        conteudo: `${atual}${tagAbre}texto${tagFecha}`,
      }));
      return;
    }
    const start = el.selectionStart ?? atual.length;
    const end = el.selectionEnd ?? atual.length;
    const selecionado = atual.slice(start, end) || "texto";
    const novoTexto = `${atual.slice(0, start)}${tagAbre}${selecionado}${tagFecha}${atual.slice(end)}`;
    setFormDados((prev) => ({ ...prev, conteudo: novoTexto }));
    setErrosForm((prev) => ({ ...prev, conteudo: undefined, geral: undefined }));
  }

  async function salvarAviso(e) {
    if (e) e.preventDefault();
    const problemas = {};
    const tituloLimpo = formDados.titulo.trim();
    const conteudoLimpo = formDados.conteudo.trim();
    const textoSemTags = conteudoLimpo.replace(/<[^>]*>/g, "").trim();

    if (!tituloLimpo || tituloLimpo.length < 3) {
      problemas.titulo = "Informe o título do aviso (mínimo de 3 caracteres).";
    } else if (tituloLimpo.length > 200) {
      problemas.titulo = "O título deve ter no máximo 200 caracteres.";
    }

    if (!conteudoLimpo || !textoSemTags) {
      problemas.conteudo = "Informe o conteúdo do aviso.";
    }

    if (formDados.data_expiracao) {
      const hojeIso = obterHojeIsoLocal();
      if (formDados.data_expiracao < hojeIso) {
        problemas.data_expiracao = "A data de expiração não pode ser anterior à data atual";
      }
    }

    if (Object.keys(problemas).length > 0) {
      setErrosForm(problemas);
      return;
    }

    setSalvandoForm(true);
    setErrosForm({});
    try {
      const payload = {
        titulo: tituloLimpo,
        categoria: formDados.categoria,
        conteudo: conteudoLimpo,
        destaque: Boolean(formDados.destaque),
        data_expiracao: formDados.data_expiracao || null,
      };

      if (avisoEditando) {
        const atualizado = await atualizarAviso(avisoEditando.id_aviso, payload);
        sucesso("Aviso atualizado com sucesso!");
        if (idParam && Number(idParam) === Number(avisoEditando.id_aviso)) {
          setAvisoDetalhe(atualizado);
        }
      } else {
        await criarAviso(payload);
        sucesso("Aviso publicado no mural com sucesso!");
      }

      setModalFormOpen(false);
      if (!idParam) {
        await carregarMural();
      }
    } catch (err) {
      if (err?.erros && Object.keys(err.erros).length > 0) {
        setErrosForm(err.erros);
      } else {
        setErrosForm({ geral: err?.mensagem || "Não foi possível salvar o aviso." });
      }
    } finally {
      setSalvandoForm(false);
    }
  }

  async function confirmarExclusao() {
    if (!avisoExcluindo) return;
    setExcluindo(true);
    try {
      await excluirAviso(avisoExcluindo.id_aviso);
      sucesso("Aviso excluído com sucesso!");
      const excluidoId = avisoExcluindo.id_aviso;
      setAvisoExcluindo(null);
      if (idParam && Number(idParam) === Number(excluidoId)) {
        navigate("/avisos");
      } else {
        await carregarMural();
      }
    } catch (err) {
      toastErro(err?.mensagem || "Erro ao excluir o aviso.");
    } finally {
      setExcluindo(false);
    }
  }

  // ─── VISÃO DE DETALHE (/avisos/:id) ──────────────────────────────────────
  if (idParam) {
    return (
      <div className="p-6 space-y-5 max-w-[1000px] mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="secondary" size="sm" onClick={() => navigate("/avisos")}>
            ← Voltar ao mural
          </Button>
          {podeGerir && avisoDetalhe && (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => abrirModalEditar(avisoDetalhe)}
              >
                Editar aviso
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setAvisoExcluindo(avisoDetalhe)}
              >
                Excluir
              </Button>
            </div>
          )}
        </div>

        {carregandoDetalhe && (
          <Card className="space-y-4">
            <Skeleton width="140px" height="1.5rem" />
            <Skeleton width="75%" height="2rem" />
            <Skeleton width="240px" height="1rem" />
            <Skeleton width="100%" height="8rem" />
          </Card>
        )}

        {!carregandoDetalhe && erroDetalhe && (
          <ErrorBanner
            message={erroDetalhe}
            onRetry={() => carregarDetalhe(idParam)}
          />
        )}

        {!carregandoDetalhe && !erroDetalhe && avisoDetalhe && (
          <Card className="space-y-5 p-6">
            <div className="space-y-3 border-b border-slate-100 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={CATEGORIA_BADGE_VARIANT[avisoDetalhe.categoria] || "default"}>
                  {CATEGORIA_LABELS[avisoDetalhe.categoria] || avisoDetalhe.categoria}
                </Badge>
                {avisoDetalhe.destaque && <Badge variant="primary">★ Destaque</Badge>}
                {avisoDetalhe.expirado && <Badge variant="inativo">Expirado</Badge>}
              </div>

              <h1 className="text-2xl font-bold text-[#1e293b] leading-snug">
                {avisoDetalhe.titulo}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-[#64748b]">
                <span>
                  Publicado em <strong>{formatarDataHoraAviso(avisoDetalhe.data_publicacao)}</strong>
                </span>
                <span>
                  Por <strong>{avisoDetalhe.autor?.nome || "Comunicação Institucional"}</strong>
                </span>
                {avisoDetalhe.data_expiracao && (
                  <span>
                    Vigência até{" "}
                    <strong>
                      {new Date(`${avisoDetalhe.data_expiracao}T00:00:00`).toLocaleDateString(
                        "pt-BR",
                      )}
                    </strong>
                  </span>
                )}
              </div>
            </div>

            <div
              className="prose prose-sm max-w-none text-sm text-[#334155] leading-relaxed space-y-3"
              dangerouslySetInnerHTML={{
                __html: sanitizarHtmlSeguroFront(
                  avisoDetalhe.conteudo?.includes("<")
                    ? avisoDetalhe.conteudo
                    : `<p>${String(avisoDetalhe.conteudo || "").replace(/\n/g, "<br>")}</p>`,
                ),
              }}
            />
          </Card>
        )}

        {/* Modais compartilhados de edição e exclusão */}
        {renderModaisGestao()}
      </div>
    );
  }

  // ─── Função auxiliar para renderizar Modais de Gestão (UC04) ─────────────
  function renderModaisGestao() {
    return (
      <>
        <Modal
          open={modalFormOpen}
          onClose={salvandoForm ? undefined : () => setModalFormOpen(false)}
          title={avisoEditando ? "Editar aviso" : "+ Adicionar Novo Aviso"}
          size="lg"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setModalFormOpen(false)}
                disabled={salvandoForm}
              >
                Cancelar
              </Button>
              <Button variant="primary" onClick={salvarAviso} loading={salvandoForm}>
                {avisoEditando ? "Salvar alterações" : "Publicar aviso"}
              </Button>
            </>
          }
        >
          <form onSubmit={salvarAviso} noValidate className="space-y-4">
            {errosForm.geral && (
              <div
                role="alert"
                className="p-3 rounded-lg text-xs font-medium bg-[#fff3f4] text-[#b4233e] border border-[#f1c5cf]"
              >
                {errosForm.geral}
              </div>
            )}

            <Input
              label="Título"
              required
              placeholder="Ex.: Atualização do protocolo assistencial da CCIH"
              value={formDados.titulo}
              error={errosForm.titulo}
              onChange={(e) => {
                setFormDados((prev) => ({ ...prev, titulo: e.target.value }));
                setErrosForm((prev) => ({ ...prev, titulo: undefined, geral: undefined }));
              }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Categoria"
                required
                value={formDados.categoria}
                error={errosForm.categoria}
                options={OPCOES_CATEGORIA_SELECT}
                onChange={(e) =>
                  setFormDados((prev) => ({ ...prev, categoria: e.target.value }))
                }
              />

              <Input
                label="Data de expiração (opcional)"
                type="date"
                value={formDados.data_expiracao}
                error={errosForm.data_expiracao}
                helperText="Deixe em branco para manter o aviso sem prazo de expiração."
                onChange={(e) => {
                  setFormDados((prev) => ({ ...prev, data_expiracao: e.target.value }));
                  setErrosForm((prev) => ({
                    ...prev,
                    data_expiracao: undefined,
                    geral: undefined,
                  }));
                }}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#334155]">
                  Formatação rápida (HTML permitido)
                </span>
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => inserirTagConteudo("<strong>", "</strong>")}
                    className="px-2 py-1 text-xs font-bold rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[#1e293b]"
                    title="Negrito"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => inserirTagConteudo("<em>", "</em>")}
                    className="px-2 py-1 text-xs italic rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[#1e293b]"
                    title="Itálico"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => inserirTagConteudo("<p>", "</p>")}
                    className="px-2 py-1 text-xs rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[#1e293b]"
                    title="Parágrafo"
                  >
                    Parágrafo
                  </button>
                  <button
                    type="button"
                    onClick={() => inserirTagConteudo("<ul><li>", "</li></ul>")}
                    className="px-2 py-1 text-xs rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[#1e293b]"
                    title="Lista"
                  >
                    • Lista
                  </button>
                </div>
              </div>

              <Textarea
                ref={conteudoRef}
                label="Conteúdo"
                required
                rows={6}
                placeholder="Digite o conteúdo completo do comunicado ou notícia..."
                helperText="Suporta formatação com tags <p>, <strong>, <em>, <ul>, <li>, <br> e <a>."
                value={formDados.conteudo}
                error={errosForm.conteudo}
                onChange={(e) => {
                  setFormDados((prev) => ({ ...prev, conteudo: e.target.value }));
                  setErrosForm((prev) => ({ ...prev, conteudo: undefined, geral: undefined }));
                }}
              />
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={formDados.destaque}
                onChange={(e) =>
                  setFormDados((prev) => ({ ...prev, destaque: e.target.checked }))
                }
                className="w-4 h-4 accent-[#800020] rounded"
              />
              <span className="text-sm font-medium text-[#1e293b]">
                Destacar no mural e na tela inicial (Dashboard)
              </span>
            </label>
          </form>
        </Modal>

        <ConfirmDialog
          open={Boolean(avisoExcluindo)}
          title="Excluir aviso"
          message={`Tem certeza que deseja excluir permanentemente o aviso "${avisoExcluindo?.titulo || ""}"? Esta ação não poderá ser desfeita.`}
          confirmLabel="Excluir aviso"
          variant="danger"
          loading={excluindo}
          onCancel={() => setAvisoExcluindo(null)}
          onConfirm={confirmarExclusao}
        />
      </>
    );
  }

  // ─── VISÃO DO MURAL (/avisos) ────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1e293b]">Notícias e Comunicados</h1>
          <p className="text-sm text-[#64748b] mt-0.5">
            Mural de avisos corporativos, mudanças de setor, promoções e comunicados do Hospital Decós
          </p>
        </div>
        {podeGerir && (
          <Button variant="primary" onClick={abrirModalNovo}>
            + Adicionar Novo
          </Button>
        )}
      </div>

      {/* Faixa de Avisos em Destaque */}
      {!carregandoLista && !erroLista && destaques.length > 0 && !busca && !categoriaAtiva && (
        <section aria-label="Avisos em destaque" className="space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#800020]">
              ★ Avisos em Destaque
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {destaques.slice(0, 3).map((dest) => (
              <Card
                key={`dest-${dest.id_aviso}`}
                className="border-2 border-[#800020]/30 bg-gradient-to-br from-[#fff5f6] to-white flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="primary">Destaque</Badge>
                      <Badge variant={CATEGORIA_BADGE_VARIANT[dest.categoria] || "default"}>
                        {CATEGORIA_LABELS[dest.categoria] || dest.categoria}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-[#64748b]">
                      {formatarDataHoraAviso(dest.data_publicacao)}
                    </span>
                  </div>
                  <Link
                    to={`/avisos/${dest.id_aviso}`}
                    className="block text-base font-bold text-[#800020] hover:underline leading-snug"
                  >
                    {dest.titulo}
                  </Link>
                  <p className="text-xs text-[#475569] leading-relaxed line-clamp-3">
                    {dest.resumo}
                  </p>
                </div>
                <div className="pt-2 border-t border-[#f1c5cf]/50 flex items-center justify-between text-xs text-[#64748b]">
                  <span>Por {dest.autor?.nome || "Administração"}</span>
                  <Link
                    to={`/avisos/${dest.id_aviso}`}
                    className="font-semibold text-[#800020] hover:underline"
                  >
                    Ler completo →
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Barra de Filtros: Chips de Categoria + Busca + Toggle de Expirados (Admin/Gestão) */}
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Filtrar avisos por categoria"
            className="flex flex-wrap items-center gap-2"
          >
            {CATEGORIAS_CHIPS.map((chip) => {
              const ativo = categoriaAtiva === chip.value;
              return (
                <button
                  key={chip.value || "TODAS"}
                  type="button"
                  role="tab"
                  aria-selected={ativo}
                  onClick={() => {
                    setCategoriaAtiva(chip.value);
                    setPagina(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    ativo
                      ? "bg-[#800020] text-white shadow-sm"
                      : "bg-slate-100 text-[#475569] hover:bg-slate-200"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          {podeGerir && (
            <label className="flex items-center gap-2 text-xs font-medium text-[#334155] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={incluirExpirados}
                onChange={(e) => {
                  setIncluirExpirados(e.target.checked);
                  setPagina(1);
                }}
                className="w-4 h-4 accent-[#800020] rounded"
              />
              <span>Exibir avisos expirados</span>
            </label>
          )}
        </div>

        <div className="max-w-md">
          <SearchInput
            value={busca}
            onChange={handleBusca}
            onSearch={handleBusca}
            placeholder="Buscar avisos por título ou palavra-chave..."
            ariaLabel="Buscar avisos e comunicados"
          />
        </div>
      </Card>

      {/* Estado de Erro */}
      {erroLista && <ErrorBanner message={erroLista} onRetry={carregarMural} />}

      {/* Estado Carregando (Skeleton) */}
      {!erroLista && carregandoLista && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <Card key={n} className="space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton width="90px" height="1.25rem" />
                <Skeleton width="120px" height="1rem" />
              </div>
              <Skeleton width="85%" height="1.5rem" />
              <Skeleton width="100%" height="3rem" />
              <Skeleton width="50%" height="1rem" />
            </Card>
          ))}
        </div>
      )}

      {/* Estado Vazio */}
      {!erroLista && !carregandoLista && avisos.length === 0 && (
        <Card>
          <EmptyState
            title="Não há avisos no momento"
            description="Quando novos comunicados ou notícias forem publicados, eles aparecerão aqui."
          />
        </Card>
      )}

      {/* Grade de Cards de Avisos */}
      {!erroLista && !carregandoLista && avisos.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {avisos.map((aviso) => (
              <Card
                key={aviso.id_aviso}
                className={`space-y-3 flex flex-col justify-between transition-shadow hover:shadow-md ${
                  aviso.destaque ? "border-[#800020]/30" : ""
                }`}
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={CATEGORIA_BADGE_VARIANT[aviso.categoria] || "default"}>
                        {CATEGORIA_LABELS[aviso.categoria] || aviso.categoria}
                      </Badge>
                      {aviso.destaque && <Badge variant="primary">Destaque</Badge>}
                      {aviso.expirado && <Badge variant="inativo">Expirado</Badge>}
                    </div>
                    <span className="text-xs text-[#64748b]">
                      {formatarDataHoraAviso(aviso.data_publicacao)}
                    </span>
                  </div>

                  <h2 className="text-base font-bold text-[#1e293b] leading-snug">
                    <Link
                      to={`/avisos/${aviso.id_aviso}`}
                      className="hover:text-[#800020] transition-colors"
                    >
                      {aviso.titulo}
                    </Link>
                  </h2>

                  <p className="text-sm text-[#475569] leading-relaxed">{aviso.resumo}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748b]">
                  <span>Por {aviso.autor?.nome || "Administração"}</span>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/avisos/${aviso.id_aviso}`}
                      className="font-semibold text-[#800020] hover:underline mr-1"
                    >
                      Ver detalhes
                    </Link>
                    {podeGerir && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          aria-label={`Editar aviso ${aviso.titulo}`}
                          onClick={() => abrirModalEditar(aviso)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          aria-label={`Excluir aviso ${aviso.titulo}`}
                          onClick={() => setAvisoExcluindo(aviso)}
                        >
                          Excluir
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Pagination
            pagina={pagina}
            tamanho={tamanho}
            total={total}
            onPageChange={setPagina}
          />
        </div>
      )}

      {renderModaisGestao()}
    </div>
  );
}
