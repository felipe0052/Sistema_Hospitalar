import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  atualizarDocumento,
  criarDocumento,
  excluirDocumento,
  listarCategoriasDocumentos,
  listarDocumentos,
  obterBlobArquivoDocumento,
} from "../../api/documentos";
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

const CHIPS_TIPO = [
  { value: "", label: "Todos" },
  { value: "POP", label: "POPs" },
  { value: "DOCUMENTO", label: "Documentos" },
];

const OPCOES_TIPO_SELECT = [
  { value: "POP", label: "POP (Procedimento Operacional Padrão)" },
  { value: "DOCUMENTO", label: "Documento Institucional" },
];

const CATEGORIAS_SUGERIDAS_PADRAO = [
  "Enfermagem",
  "Farmácia",
  "Pronto-Socorro",
  "UTI",
  "Centro Cirúrgico",
  "Laboratório",
  "Administrativo",
  "RH",
  "Tecnologia",
];

function formatarTamanhoBytes(bytes) {
  const num = Number(bytes) || 0;
  if (num < 1024) return `${num} B`;
  const kb = num / 1024;
  if (kb < 1024) return `${kb.toFixed(1).replace(".", ",")} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2).replace(".", ",")} MB`;
}

function formatarDataDocumento(iso) {
  if (!iso) return "—";
  try {
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return String(iso);
    return dt.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return String(iso);
  }
}

function ehArquivoPdf(doc) {
  if (!doc) return false;
  const mime = String(doc.mime_type || "").toLowerCase();
  const nome = String(doc.nome_arquivo || "").toLowerCase();
  return mime.includes("pdf") || nome.endsWith(".pdf");
}

export default function Documentos() {
  const { autenticado, isAdmin } = useAuth();
  const podeGerir = autenticado && isAdmin;
  const { sucesso, erro: toastErro, info: toastInfo } = useToast();

  // Filtros e paginação
  const [busca, setBusca] = useState("");
  const [tipoAtivo, setTipoAtivo] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState("");
  const [pagina, setPagina] = useState(1);
  const tamanho = 12;

  // Dados da listagem e categorias
  const [documentos, setDocumentos] = useState([]);
  const [total, setTotal] = useState(0);
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState("");

  // Visualizador embutido em tela cheia (PDF) e controle de download
  const [docVisualizando, setDocVisualizando] = useState(null);
  const [blobUrlVisualizador, setBlobUrlVisualizador] = useState("");
  const [carregandoVisualizador, setCarregandoVisualizador] = useState(false);
  const [baixandoId, setBaixandoId] = useState(null);

  // Modal de Cadastro / Edição (UC06)
  const [modalFormOpen, setModalFormOpen] = useState(false);
  const [docEditando, setDocEditando] = useState(null);
  const [formTitulo, setFormTitulo] = useState("");
  const [formTipo, setFormTipo] = useState("POP");
  const [formCategoria, setFormCategoria] = useState("");
  const [formDescricao, setFormDescricao] = useState("");
  const [formTags, setFormTags] = useState([]);
  const [tagDigitando, setTagDigitando] = useState("");
  const [formArquivo, setFormArquivo] = useState(null);
  const [arrastandoArquivo, setArrastandoArquivo] = useState(false);
  const [errosForm, setErrosForm] = useState({});
  const [salvandoForm, setSalvandoForm] = useState(false);
  const [progressoUpload, setProgressoUpload] = useState(0);
  const [confirmSubstituirOpen, setConfirmSubstituirOpen] = useState(false);
  const inputFileRef = useRef(null);

  // Modal de Confirmação de Exclusão
  const [docExcluindo, setDocExcluindo] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  const carregarCategorias = useCallback(async () => {
    try {
      const lista = await listarCategoriasDocumentos();
      setCategorias(Array.isArray(lista) ? lista : []);
    } catch {
      /* Mantém categorias anteriores em caso de falha silenciosa */
    }
  }, []);

  const carregarDocumentos = useCallback(async () => {
    setCarregando(true);
    setErroLista("");
    try {
      const resp = await listarDocumentos({
        busca: busca.trim() || undefined,
        tipo: tipoAtivo || undefined,
        categoria: categoriaAtiva || undefined,
        pagina,
        tamanho,
      });
      setDocumentos(resp?.itens || []);
      setTotal(resp?.total || 0);
    } catch (err) {
      setErroLista(err?.mensagem || "Não foi possível carregar os documentos e POPs.");
    } finally {
      setCarregando(false);
    }
  }, [busca, tipoAtivo, categoriaAtiva, pagina, tamanho]);

  useEffect(() => {
    carregarCategorias();
  }, [carregarCategorias]);

  useEffect(() => {
    carregarDocumentos();
  }, [carregarDocumentos]);

  // Limpa ObjectURL ao fechar o visualizador
  useEffect(() => {
    return () => {
      if (blobUrlVisualizador) {
        URL.revokeObjectURL(blobUrlVisualizador);
      }
    };
  }, [blobUrlVisualizador]);

  function fecharVisualizador() {
    if (blobUrlVisualizador) {
      URL.revokeObjectURL(blobUrlVisualizador);
    }
    setBlobUrlVisualizador("");
    setDocVisualizando(null);
    setCarregandoVisualizador(false);
  }

  async function acionarDownloadArquivo(doc, mostrarOrientacaoDocx = false) {
    setBaixandoId(doc.id_doc);
    try {
      const { blob } = await obterBlobArquivoDocumento(doc.id_doc, { download: true });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = doc.nome_arquivo || `${doc.titulo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 5000);

      if (mostrarOrientacaoDocx) {
        toastInfo(
          "Arquivos Word (DOCX) são baixados diretamente para abertura no editor de textos.",
        );
      } else {
        sucesso(`Download de "${doc.nome_arquivo}" iniciado.`);
      }
    } catch (err) {
      toastErro(err?.mensagem || "Não foi possível baixar o arquivo.");
    } finally {
      setBaixandoId(null);
    }
  }

  async function handleVisualizar(doc) {
    if (!ehArquivoPdf(doc)) {
      await acionarDownloadArquivo(doc, true);
      return;
    }

    setDocVisualizando(doc);
    setCarregandoVisualizador(true);
    try {
      const { blob } = await obterBlobArquivoDocumento(doc.id_doc, { download: false });
      const pdfBlob =
        blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" });
      const url = URL.createObjectURL(pdfBlob);
      setBlobUrlVisualizador(url);
    } catch (err) {
      toastErro(err?.mensagem || "Não foi possível abrir o visualizador do documento.");
      setDocVisualizando(null);
    } finally {
      setCarregandoVisualizador(false);
    }
  }

  function abrirModalNovo() {
    setDocEditando(null);
    setFormTitulo("");
    setFormTipo("POP");
    setFormCategoria("");
    setFormDescricao("");
    setFormTags([]);
    setTagDigitando("");
    setFormArquivo(null);
    setErrosForm({});
    setProgressoUpload(0);
    setModalFormOpen(true);
  }

  function abrirModalEditar(doc) {
    setDocEditando(doc);
    setFormTitulo(doc.titulo || "");
    setFormTipo(doc.tipo || "POP");
    setFormCategoria(doc.categoria || "");
    setFormDescricao(doc.descricao || "");
    setFormTags(Array.isArray(doc.palavras_chave) ? [...doc.palavras_chave] : []);
    setTagDigitando("");
    setFormArquivo(null);
    setErrosForm({});
    setProgressoUpload(0);
    setModalFormOpen(true);
  }

  function adicionarTagInput(valorBruto) {
    const partes = String(valorBruto || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (partes.length === 0) return;

    setFormTags((atuais) => {
      const existentesLower = new Set(atuais.map((a) => a.toLowerCase()));
      const novas = [...atuais];
      partes.forEach((p) => {
        if (!existentesLower.has(p.toLowerCase())) {
          existentesLower.add(p.toLowerCase());
          novas.push(p);
        }
      });
      return novas;
    });
    setTagDigitando("");
  }

  function handleKeyDownTag(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      adicionarTagInput(tagDigitando);
    } else if (e.key === "Backspace" && !tagDigitando && formTags.length > 0) {
      setFormTags((atuais) => atuais.slice(0, -1));
    }
  }

  function removerTag(tagRemover) {
    setFormTags((atuais) => atuais.filter((t) => t !== tagRemover));
  }

  function validarESelecionarArquivo(file) {
    if (!file) return;
    const nome = String(file.name || "").toLowerCase();
    if (!nome.endsWith(".pdf") && !nome.endsWith(".docx")) {
      setErrosForm((prev) => ({
        ...prev,
        arquivo: "Formato não aceito. Selecione apenas arquivos .pdf ou .docx.",
      }));
      return;
    }
    const maxBytes = 20 * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrosForm((prev) => ({
        ...prev,
        arquivo: "O arquivo excede o tamanho máximo permitido de 20 MB.",
      }));
      return;
    }
    setErrosForm((prev) => ({ ...prev, arquivo: "" }));
    setFormArquivo(file);
  }

  function validarFormulario() {
    const novosErros = {};
    const tituloLimpo = formTitulo.trim();
    if (!tituloLimpo) {
      novosErros.titulo = "Este campo é obrigatório.";
    } else if (tituloLimpo.length < 3) {
      novosErros.titulo = "O título deve ter pelo menos 3 caracteres.";
    }

    if (!formTipo) {
      novosErros.tipo = "Selecione o tipo do documento.";
    }

    if (!docEditando && !formArquivo) {
      novosErros.arquivo = "Anexe um arquivo PDF ou DOCX.";
    }

    setErrosForm(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  async function executarEnvioFormulario() {
    setConfirmSubstituirOpen(false);
    setSalvandoForm(true);
    setProgressoUpload(10);

    const tagsFinais = [...formTags];
    if (tagDigitando.trim()) {
      tagDigitando
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .forEach((t) => {
          if (!tagsFinais.some((ex) => ex.toLowerCase() === t.toLowerCase())) {
            tagsFinais.push(t);
          }
        });
    }

    const formData = new FormData();
    formData.append("titulo", formTitulo.trim());
    formData.append("tipo", formTipo);
    if (formCategoria.trim()) formData.append("categoria", formCategoria.trim());
    if (formDescricao.trim()) formData.append("descricao", formDescricao.trim());
    if (tagsFinais.length > 0) formData.append("palavras_chave", tagsFinais.join(", "));
    if (formArquivo) formData.append("arquivo", formArquivo);

    const callbackProgresso = (evento) => {
      if (evento?.total) {
        const pct = Math.min(98, Math.round((evento.loaded * 100) / evento.total));
        setProgressoUpload(pct);
      }
    };

    try {
      if (docEditando) {
        await atualizarDocumento(docEditando.id_doc, formData, callbackProgresso);
        sucesso("Documento atualizado com sucesso.");
      } else {
        await criarDocumento(formData, callbackProgresso);
        sucesso("Documento cadastrado e disponibilizado na central.");
      }
      setProgressoUpload(100);
      setModalFormOpen(false);
      await Promise.all([carregarDocumentos(), carregarCategorias()]);
    } catch (err) {
      if (err?.erros && Object.keys(err.erros).length > 0) {
        setErrosForm(err.erros);
      }
      toastErro(err?.mensagem || "Erro ao salvar o documento.");
    } finally {
      setSalvandoForm(false);
      setProgressoUpload(0);
    }
  }

  function handleSubmitForm(e) {
    e.preventDefault();
    if (!validarFormulario()) return;

    // Na edição, se o administrador selecionou um novo arquivo, pede confirmação da substituição
    if (docEditando && formArquivo) {
      setConfirmSubstituirOpen(true);
      return;
    }

    executarEnvioFormulario();
  }

  async function handleConfirmarExclusao() {
    if (!docExcluindo) return;
    setExcluindo(true);
    try {
      await excluirDocumento(docExcluindo.id_doc);
      sucesso("Documento excluído com sucesso.");
      setDocExcluindo(null);
      await Promise.all([carregarDocumentos(), carregarCategorias()]);
    } catch (err) {
      toastErro(err?.mensagem || "Não foi possível excluir o documento.");
    } finally {
      setExcluindo(false);
    }
  }

  const temFiltroAtivo = Boolean(busca.trim() || tipoAtivo || categoriaAtiva);
  const sugestoesCategorias = Array.from(
    new Set([...CATEGORIAS_SUGERIDAS_PADRAO, ...categorias]),
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1e293b]">Central de Documentos & POPs</h1>
          <p className="text-sm text-[#64748b] mt-0.5">
            Repositório central de Procedimentos Operacionais Padrão, protocolos clínicos e normas institucionais
          </p>
        </div>
        {podeGerir && (
          <Button variant="primary" onClick={abrirModalNovo}>
            + Adicionar Novo
          </Button>
        )}
      </div>

      {/* Barra de Busca e Filtros Combinados (UC07) */}
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex-1 min-w-[260px]">
            <SearchInput
              value={busca}
              onChange={(val) => {
                setBusca(val);
                setPagina(1);
              }}
              placeholder="Pesquisar por título, descrição ou palavra-chave (ex.: curativo, cateter, portaria 344)..."
              ariaLabel="Pesquisar POPs e documentos"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por tipo">
            {CHIPS_TIPO.map((chip) => {
              const ativo = tipoAtivo === chip.value;
              return (
                <button
                  key={chip.value || "todos"}
                  type="button"
                  onClick={() => {
                    setTipoAtivo(chip.value);
                    setPagina(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                    ativo
                      ? "bg-[#800020] text-white shadow-xs"
                      : "bg-slate-100 text-[#475569] hover:bg-slate-200"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chips de Categorias carregadas dinamicamente */}
        {categorias.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <span className="text-xs font-semibold text-[#64748b] mr-1">Categoria:</span>
            <button
              type="button"
              onClick={() => {
                setCategoriaAtiva("");
                setPagina(1);
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                !categoriaAtiva
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-[#475569] hover:bg-slate-200"
              }`}
            >
              Todas ({categorias.length})
            </button>
            {categorias.map((cat) => {
              const ativa = categoriaAtiva === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setCategoriaAtiva(ativa ? "" : cat);
                    setPagina(1);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                    ativa
                      ? "bg-[#800020] text-white"
                      : "bg-slate-100 text-[#475569] hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              );
            })}

            {temFiltroAtivo && (
              <button
                type="button"
                onClick={() => {
                  setBusca("");
                  setTipoAtivo("");
                  setCategoriaAtiva("");
                  setPagina(1);
                }}
                className="ml-auto text-xs font-semibold text-[#800020] hover:underline cursor-pointer"
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </Card>

      {/* Estados da listagem: Erro, Carregando, Vazio ou Grid de Documentos */}
      {erroLista ? (
        <ErrorBanner message={erroLista} onRetry={carregarDocumentos} />
      ) : carregando ? (
        <div className="space-y-3" aria-busy="true">
          {[1, 2, 3, 4].map((n) => (
            <Card key={n} className="space-y-3">
              <Skeleton height="18px" width="35%" />
              <Skeleton height="14px" width="80%" />
              <Skeleton height="14px" width="55%" />
            </Card>
          ))}
        </div>
      ) : documentos.length === 0 ? (
        <Card>
          <EmptyState
            title={
              temFiltroAtivo
                ? "Nenhum documento encontrado. Revise os termos da pesquisa."
                : "Nenhum documento cadastrado"
            }
            description={
              temFiltroAtivo
                ? "Tente buscar por outro termo ou remover os filtros de tipo e categoria selecionados."
                : "Quando novos POPs ou documentos institucionais forem publicados, eles aparecerão aqui."
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {documentos.map((doc) => {
            const isPdf = ehArquivoPdf(doc);
            const dataRef = doc.data_atualizacao || doc.data_upload;
            return (
              <Card
                key={doc.id_doc}
                className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-slate-300 transition"
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Ícone do formato (PDF / DOCX) */}
                  <div
                    className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 font-bold text-xs border ${
                      isPdf
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}
                    title={isPdf ? "Documento PDF" : "Documento Word (DOCX)"}
                  >
                    <span>{isPdf ? "PDF" : "DOCX"}</span>
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={doc.tipo === "POP" ? "primary" : "info"}>
                        {doc.tipo}
                      </Badge>
                      {doc.categoria && <Badge variant="default">{doc.categoria}</Badge>}
                      <span className="text-xs text-[#64748b]">
                        Atualizado em {formatarDataDocumento(dataRef)} ·{" "}
                        {formatarTamanhoBytes(doc.tamanho_bytes)}
                      </span>
                    </div>

                    <h2 className="text-base font-bold text-[#1e293b] break-words">
                      {doc.titulo}
                    </h2>

                    {doc.descricao && (
                      <p className="text-xs text-[#475569] leading-relaxed">
                        {doc.descricao}
                      </p>
                    )}

                    {/* Palavras-chave (chips clicáveis) */}
                    {Array.isArray(doc.palavras_chave) && doc.palavras_chave.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {doc.palavras_chave.map((kw) => (
                          <button
                            key={kw}
                            type="button"
                            onClick={() => {
                              setBusca(kw);
                              setPagina(1);
                            }}
                            title={`Filtrar por palavra-chave "${kw}"`}
                            className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-[#800020]/10 hover:text-[#800020] text-[11px] font-medium text-[#475569] transition cursor-pointer"
                          >
                            #{kw}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Ações: Visualizar, Baixar e Gestão Admin */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleVisualizar(doc)}
                  >
                    {isPdf ? "Visualizar" : "Abrir DOCX"}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={baixandoId === doc.id_doc}
                    onClick={() => acionarDownloadArquivo(doc, false)}
                  >
                    Baixar
                  </Button>
                  {podeGerir && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => abrirModalEditar(doc)}
                        aria-label={`Editar ${doc.titulo}`}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setDocExcluindo(doc)}
                        aria-label={`Excluir ${doc.titulo}`}
                      >
                        Excluir
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}

          <Pagination
            page={pagina}
            pageSize={tamanho}
            total={total}
            onPageChange={setPagina}
          />
        </div>
      )}

      {/* Visualizador Embutido de PDF em Tela Cheia (S3-T4) */}
      <Modal
        open={Boolean(docVisualizando)}
        onClose={fecharVisualizador}
        title={docVisualizando ? docVisualizando.titulo : "Visualizador de Documento"}
        size="lg"
        footer={
          docVisualizando && (
            <>
              <Button variant="secondary" onClick={fecharVisualizador}>
                Fechar
              </Button>
              <Button
                variant="primary"
                loading={baixandoId === docVisualizando.id_doc}
                onClick={() => acionarDownloadArquivo(docVisualizando, false)}
              >
                Baixar PDF ({formatarTamanhoBytes(docVisualizando.tamanho_bytes)})
              </Button>
            </>
          )
        }
      >
        {carregandoVisualizador ? (
          <div className="py-12 space-y-3">
            <Skeleton height="24px" width="50%" />
            <Skeleton height="420px" width="100%" />
          </div>
        ) : blobUrlVisualizador ? (
          <div className="w-full h-[72vh] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
            <iframe
              src={blobUrlVisualizador}
              title={docVisualizando?.titulo || "Visualizador PDF"}
              className="w-full h-full border-0"
            />
          </div>
        ) : null}
      </Modal>

      {/* Modal Administrativo: Novo / Editar Documento (UC06) */}
      <Modal
        open={modalFormOpen}
        onClose={salvandoForm ? undefined : () => setModalFormOpen(false)}
        title={docEditando ? "Editar Documento / POP" : "Cadastrar Novo Documento / POP"}
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
            <Button
              variant="primary"
              onClick={handleSubmitForm}
              loading={salvandoForm}
            >
              {docEditando ? "Salvar Alterações" : "Publicar Documento"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmitForm} className="space-y-4" noValidate>
          <Input
            label="Título do Documento / POP"
            required
            value={formTitulo}
            onChange={(e) => {
              setFormTitulo(e.target.value);
              if (errosForm.titulo) setErrosForm((p) => ({ ...p, titulo: "" }));
            }}
            placeholder="Ex.: POP-ENF-002 — Curativo em Acesso Venoso Central"
            error={errosForm.titulo}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Tipo"
              required
              value={formTipo}
              onChange={(e) => setFormTipo(e.target.value)}
              options={OPCOES_TIPO_SELECT}
              error={errosForm.tipo}
            />

            <div className="space-y-1">
              <Input
                label="Categoria"
                list="datalist-categorias-documentos"
                value={formCategoria}
                onChange={(e) => setFormCategoria(e.target.value)}
                placeholder="Ex.: Enfermagem, Farmácia, Administrativo"
                error={errosForm.categoria}
              />
              <datalist id="datalist-categorias-documentos">
                {sugestoesCategorias.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
          </div>

          <Textarea
            label="Descrição"
            rows={3}
            value={formDescricao}
            onChange={(e) => setFormDescricao(e.target.value)}
            placeholder="Resumo objetivo do procedimento operacional padrão ou norma institucional..."
            error={errosForm.descricao}
          />

          {/* Palavras-chave com chips dinâmicos (Enter) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#334155]">
              Palavras-chave (pressione Enter ou vírgula para adicionar)
            </label>
            <div className="p-2.5 rounded-xl border border-slate-300 bg-white focus-within:border-[#800020] flex flex-wrap items-center gap-1.5">
              {formTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#800020]/10 text-[#800020]"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removerTag(tag)}
                    aria-label={`Remover palavra-chave ${tag}`}
                    className="hover:text-red-700 font-bold cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagDigitando}
                onChange={(e) => setTagDigitando(e.target.value)}
                onKeyDown={handleKeyDownTag}
                onBlur={() => adicionarTagInput(tagDigitando)}
                placeholder={
                  formTags.length === 0
                    ? "Ex.: curativo, cateter, uti..."
                    : "Adicionar outra tag..."
                }
                className="flex-1 min-w-[160px] text-sm outline-none bg-transparent text-[#1e293b]"
              />
            </div>
            {errosForm.palavras_chave && (
              <p className="text-xs text-red-600 font-medium">{errosForm.palavras_chave}</p>
            )}
          </div>

          {/* Área de Upload Drag & Drop (.pdf / .docx) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#334155]">
              Arquivo do Documento {docEditando ? "(opcional para substituir o atual)" : "*"}
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setArrastandoArquivo(true);
              }}
              onDragLeave={() => setArrastandoArquivo(false)}
              onDrop={(e) => {
                e.preventDefault();
                setArrastandoArquivo(false);
                const file = e.dataTransfer?.files?.[0];
                if (file) validarESelecionarArquivo(file);
              }}
              onClick={() => inputFileRef.current?.click()}
              className={`p-5 rounded-xl border-2 border-dashed text-center cursor-pointer transition ${
                arrastandoArquivo
                  ? "border-[#800020] bg-[#800020]/5"
                  : errosForm.arquivo
                    ? "border-red-400 bg-red-50/40"
                    : "border-slate-300 hover:border-[#800020] bg-slate-50"
              }`}
            >
              <input
                ref={inputFileRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => validarESelecionarArquivo(e.target.files?.[0])}
                className="hidden"
              />
              {formArquivo ? (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[#1e293b]">
                    Arquivo selecionado: {formArquivo.name}
                  </p>
                  <p className="text-xs text-[#64748b]">
                    Tamanho: {formatarTamanhoBytes(formArquivo.size)} · Clique para trocar
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-[#334155]">
                    Arraste e solte o arquivo aqui ou <span className="text-[#800020] font-semibold underline">clique para selecionar</span>
                  </p>
                  <p className="text-xs text-[#64748b]">
                    Formatos aceitos: PDF e DOCX (tamanho máximo de 20 MB)
                  </p>
                  {docEditando && (
                    <p className="text-xs text-[#475569] pt-1">
                      Arquivo atual: <strong>{docEditando.nome_arquivo}</strong> ({formatarTamanhoBytes(docEditando.tamanho_bytes)})
                    </p>
                  )}
                </div>
              )}
            </div>
            {errosForm.arquivo && (
              <p className="text-xs text-red-600 font-medium" role="alert">
                ⚠ {errosForm.arquivo}
              </p>
            )}
          </div>

          {/* Barra de Progresso de Upload */}
          {salvandoForm && progressoUpload > 0 && (
            <div className="space-y-1" aria-live="polite">
              <div className="flex justify-between text-xs font-medium text-[#475569]">
                <span>Enviando arquivo para o armazenamento seguro...</span>
                <span>{progressoUpload}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-[#800020] transition-all duration-200"
                  style={{ width: `${progressoUpload}%` }}
                />
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* Confirmação de substituição de arquivo na edição */}
      <ConfirmDialog
        open={confirmSubstituirOpen}
        title="Substituir arquivo existente?"
        message={`Ao confirmar, o arquivo anterior (${docEditando?.nome_arquivo}) será permanentemente substituído por "${formArquivo?.name}". Deseja continuar?`}
        confirmLabel="Sim, substituir arquivo"
        variant="primary"
        loading={salvandoForm}
        onConfirm={executarEnvioFormulario}
        onCancel={() => setConfirmSubstituirOpen(false)}
      />

      {/* Confirmação de exclusão de documento */}
      <ConfirmDialog
        open={Boolean(docExcluindo)}
        title="Excluir Documento / POP"
        message={`Tem certeza que deseja excluir permanentemente "${docExcluindo?.titulo}" e remover o arquivo do servidor?`}
        confirmLabel="Excluir Documento"
        variant="danger"
        loading={excluindo}
        onConfirm={handleConfirmarExclusao}
        onCancel={() => setDocExcluindo(null)}
      />
    </div>
  );
}
