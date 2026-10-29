import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  DOCUMENTO_MAX_MB,
  atualizarDocumento,
  criarDocumento,
  enviarNovaVersaoDocumento,
  excluirDocumento,
  listarCategoriasDocumentos,
  listarDocumentos,
  listarVersoesDocumento,
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
import { formatarData } from "../../utils/date";

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
  return formatarData(iso);
}

const ROTULOS_INDEXACAO = {
  INDEXADO: "indexado",
  PENDENTE: "pendente",
  PROCESSANDO: "processando…",
  ERRO: "erro na indexação",
  SEM_TEXTO: "sem texto extraível",
};

function ehArquivoPdf(doc) {
  if (!doc) return false;
  const mime = String(doc.mime_type || "").toLowerCase();
  const nome = String(doc.nome_arquivo || "").toLowerCase();
  return mime.includes("pdf") || nome.endsWith(".pdf");
}

export default function Documentos() {
  const { autenticado, isAdmin, usuario } = useAuth();
  const podeGerir = autenticado && (isAdmin || usuario?.perfil === "RH");
  const { sucesso, erro: toastErro, info: toastInfo } = useToast();

  // Filtros e paginação
  const [busca, setBusca] = useState("");
  const [tipoAtivo, setTipoAtivo] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState("");
  const [verInativas, setVerInativas] = useState(false);
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

  // Modal de Histórico de Versões
  const [versoesDoc, setVersoesDoc] = useState(null);
  const [versoes, setVersoes] = useState([]);
  const [carregandoVersoes, setCarregandoVersoes] = useState(false);

  // Modal "Enviar Nova Versão" (POP existente + justificativa)
  const [docNovaVersao, setDocNovaVersao] = useState(null);
  const [novaVersaoArquivo, setNovaVersaoArquivo] = useState(null);
  const [novaVersaoJustificativa, setNovaVersaoJustificativa] = useState("");
  const [erroNovaVersao, setErroNovaVersao] = useState({});
  const [enviandoNovaVersao, setEnviandoNovaVersao] = useState(false);

  // Modal de Cadastro / Edição
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
      // Falha silenciosa no filtro
    }
  }, []);

  const carregarDocumentos = useCallback(async () => {
    setCarregando(true);
    setErroLista("");
    try {
      const res = await listarDocumentos({
        busca: busca.trim() || undefined,
        tipo: tipoAtivo || undefined,
        categoria: categoriaAtiva || undefined,
        incluir_inativas: verInativas || undefined,
        pagina,
        tamanho,
      });
      setDocumentos(res?.itens || []);
      setTotal(res?.total || 0);
    } catch (err) {
      setErroLista(err?.mensagem || "Não foi possível carregar os documentos.");
      setDocumentos([]);
      setTotal(0);
    } finally {
      setCarregando(false);
    }
  }, [busca, tipoAtivo, categoriaAtiva, verInativas, pagina]);

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
      const { blob, nomeArquivo } = await obterBlobArquivoDocumento(doc, { download: true });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = doc.nome_arquivo || nomeArquivo || `${doc.titulo}.pdf`;
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
      const { blob } = await obterBlobArquivoDocumento(doc, { download: false });
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

  async function abrirVersoes(doc) {
    setVersoesDoc(doc);
    setVersoes([]);
    setCarregandoVersoes(true);
    try {
      const dados = await listarVersoesDocumento(doc.id_doc);
      setVersoes(Array.isArray(dados) ? dados : []);
    } catch (err) {
      toastErro(err?.mensagem || "Não foi possível carregar o histórico de versões.");
    } finally {
      setCarregandoVersoes(false);
    }
  }

  function abrirNovaVersao(doc) {
    setDocNovaVersao(doc);
    setNovaVersaoArquivo(null);
    setNovaVersaoJustificativa("");
    setErroNovaVersao({});
  }

  async function enviarNovaVersao() {
    const erros = {};
    if (!novaVersaoArquivo) erros.arquivo = "Selecione o arquivo PDF ou DOCX da nova versão.";
    else if (!/\.(pdf|docx)$/i.test(novaVersaoArquivo.name)) erros.arquivo = "Envie apenas arquivos PDF ou DOCX.";
    else if (novaVersaoArquivo.size > DOCUMENTO_MAX_MB * 1024 * 1024)
      erros.arquivo = `O arquivo excede o limite de ${DOCUMENTO_MAX_MB} MB.`;
    if (!novaVersaoJustificativa.trim()) erros.justificativa = "Informe a justificativa da alteração.";
    setErroNovaVersao(erros);
    if (Object.keys(erros).length > 0) return;

    const formData = new FormData();
    formData.append("arquivo", novaVersaoArquivo);
    formData.append("justificativa", novaVersaoJustificativa.trim());

    setEnviandoNovaVersao(true);
    try {
      const criada = await enviarNovaVersaoDocumento(docNovaVersao.id_doc, formData);
      sucesso(`Versão v${criada.versao} publicada. A anterior foi arquivada.`);
      setDocNovaVersao(null);
      await carregarDocumentos();
    } catch (err) {
      if (err?.erros && Object.keys(err.erros).length > 0) setErroNovaVersao(err.erros);
      toastErro(err?.mensagem || "Não foi possível enviar a nova versão.");
    } finally {
      setEnviandoNovaVersao(false);
    }
  }

  /** Banner de versão arquivada: localiza a versão vigente do mesmo POP e a abre. */
  async function abrirVersaoVigente(doc) {
    try {
      const dados = await listarVersoesDocumento(doc.id_doc);
      const vigente = (Array.isArray(dados) ? dados : []).find((v) => v.ativo !== false);
      if (!vigente) {
        toastErro("Nenhuma versão vigente encontrada para este documento.");
        return;
      }
      fecharVisualizador();
      setVersoesDoc(null);
      await handleVisualizar(vigente);
    } catch (err) {
      toastErro(err?.mensagem || "Não foi possível abrir a versão vigente.");
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
      .replace(/;/g, ",")
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
    const maxBytes = DOCUMENTO_MAX_MB * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrosForm((prev) => ({
        ...prev,
        arquivo: `O arquivo excede o tamanho máximo permitido de ${DOCUMENTO_MAX_MB} MB.`,
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
        .replace(/;/g, ",")
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
        const criado = await criarDocumento(formData, callbackProgresso);
        sucesso(
          criado?.versao > 1
            ? `Nova versão (v${criado.versao}) publicada. A anterior foi arquivada.`
            : "Documento cadastrado e disponibilizado na central.",
        );
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
      sucesso(
        docExcluindo.ativo !== false
          ? "Versão excluída. A versão anterior voltou a ser a vigente."
          : "Versão arquivada excluída com sucesso.",
      );
      setDocExcluindo(null);
      setVersoesDoc(null);
      await Promise.all([carregarDocumentos(), carregarCategorias()]);
    } catch (err) {
      toastErro(err?.mensagem || "Não foi possível excluir o documento.");
    } finally {
      setExcluindo(false);
    }
  }

  const temFiltroAtivo = Boolean(busca.trim() || tipoAtivo || categoriaAtiva || verInativas);
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

      {/* Barra de Busca e Filtros Combinados */}
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
            />
          </div>

          <div className="w-56">
            <Select
              aria-label="Filtrar por categoria"
              value={categoriaAtiva}
              onChange={(e) => {
                setCategoriaAtiva(e.target.value);
                setPagina(1);
              }}
              options={[
                { value: "", label: "Todas as categorias" },
                ...sugestoesCategorias.map((c) => ({ value: c, label: c })),
              ]}
            />
          </div>

          {podeGerir && (
            <label className="flex items-center gap-2 text-xs font-medium text-[#475569] cursor-pointer">
              <input
                type="checkbox"
                checked={verInativas}
                onChange={(e) => {
                  setVerInativas(e.target.checked);
                  setPagina(1);
                }}
                className="rounded border-slate-300 text-[#800020] focus:ring-[#800020]"
              />
              Exibir versões arquivadas
            </label>
          )}
        </div>

        {/* Chips de Tipo (Todos, POPs, Documentos) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-semibold text-[#64748b] mr-1">Tipo:</span>
          {CHIPS_TIPO.map((chip) => {
            const ativo = tipoAtivo === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => {
                  setTipoAtivo(chip.value);
                  setPagina(1);
                }}
                className={`px-3 py-1 text-xs font-semibold rounded-full border transition cursor-pointer ${
                  ativo
                    ? "bg-[#800020] text-white border-[#800020] shadow-sm"
                    : "bg-white text-[#475569] border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                {chip.label}
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
                setVerInativas(false);
                setPagina(1);
              }}
              className="ml-auto text-xs text-[#800020] hover:underline font-semibold cursor-pointer"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </Card>

      {/* Mensagem de Erro da Listagem */}
      {erroLista && <ErrorBanner message={erroLista} onRetry={carregarDocumentos} />}

      {/* Listagem de Documentos */}
      {carregando ? (
        <div className="space-y-3">
          <Skeleton height="88px" className="rounded-xl" />
          <Skeleton height="88px" className="rounded-xl" />
          <Skeleton height="88px" className="rounded-xl" />
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
                      {doc.codigo && <Badge variant="info">{doc.codigo}</Badge>}
                      <Badge variant={doc.ativo !== false ? "ativo" : "warning"}>
                        v{doc.versao || 1}
                        {doc.ativo === false ? " • arquivada" : " • vigente"}
                      </Badge>
                      <span className="text-xs text-[#64748b]">
                        Atualizado em {formatarDataDocumento(dataRef)} ·{" "}
                        {formatarTamanhoBytes(doc.tamanho_bytes)}
                      </span>
                    </div>

                    <h2 className="text-base font-bold text-[#1e293b] break-words">
                      {doc.titulo}
                    </h2>

                    {doc.ativo === false && (
                      <div
                        role="alert"
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900"
                      >
                        <span>
                          Atenção: esta versão está arquivada e pode conter orientações desatualizadas.
                        </span>
                        <button
                          type="button"
                          onClick={() => abrirVersaoVigente(doc)}
                          className="font-semibold underline cursor-pointer"
                        >
                          Clique para abrir a versão vigente
                        </button>
                      </div>
                    )}

                    {doc.descricao && (
                      <p className="text-xs text-[#475569] leading-relaxed">
                        {doc.descricao}
                      </p>
                    )}

                    {doc.resumo && (
                      <details className="text-xs text-[#475569]">
                        <summary className="cursor-pointer font-semibold text-[#800020]">Resumo do POP</summary>
                        <p className="mt-1 leading-relaxed whitespace-pre-line">{doc.resumo}</p>
                      </details>
                    )}

                    {isAdmin && doc.status_indexacao && (
                      <p className="text-[11px] text-[#64748b]">
                        Base de conhecimento (IA):{" "}
                        <strong>{ROTULOS_INDEXACAO[doc.status_indexacao] || doc.status_indexacao}</strong>
                      </p>
                    )}

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
                      {doc.ativo !== false && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => abrirNovaVersao(doc)}
                        >
                          Nova versão
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => abrirVersoes(doc)}
                      >
                        Versões
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => abrirModalEditar(doc)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setDocExcluindo(doc)}
                      >
                        Excluir
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Paginação */}
      {total > tamanho && (
        <div className="pt-2 flex justify-center">
          <Pagination
            page={pagina}
            pageSize={tamanho}
            total={total}
            onPageChange={setPagina}
          />
        </div>
      )}

      {/* Visualizador Embutido de PDF */}
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
        {docVisualizando && docVisualizando.ativo === false && (
          <div
            role="alert"
            className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          >
            <span>Atenção: esta versão está arquivada e pode conter orientações desatualizadas.</span>
            <button
              type="button"
              onClick={() => abrirVersaoVigente(docVisualizando)}
              className="font-semibold underline cursor-pointer"
            >
              Clique para abrir a versão vigente
            </button>
          </div>
        )}
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

      {/* Modal Histórico de Versões */}
      <Modal
        open={Boolean(versoesDoc)}
        onClose={() => setVersoesDoc(null)}
        title={versoesDoc ? `Histórico de Versões — ${versoesDoc.titulo}` : "Histórico de Versões"}
        size="md"
        footer={
          <Button variant="secondary" onClick={() => setVersoesDoc(null)}>
            Fechar
          </Button>
        }
      >
        {carregandoVersoes ? (
          <div className="space-y-2 py-4">
            <Skeleton height="48px" />
            <Skeleton height="48px" />
          </div>
        ) : versoes.length === 0 ? (
          <p className="text-sm text-[#64748b] py-4 text-center">Nenhuma versão registrada.</p>
        ) : (
          <ul className="divide-y divide-slate-100 space-y-2">
            {versoes.map((v) => (
              <li key={v.id_doc} className="flex flex-wrap items-center justify-between gap-3 pt-2 text-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant={v.ativo ? "ativo" : "warning"}>
                      v{v.versao} {v.ativo ? "• Vigente" : "• Arquivada"}
                    </Badge>
                    <span className="font-semibold text-[#1e293b]">{v.nome_arquivo}</span>
                  </div>
                  <p className="text-xs text-[#64748b] mt-0.5">
                    {formatarDataDocumento(v.data_upload)} · {v.autor?.nome || "Sistema"} · {formatarTamanhoBytes(v.tamanho_bytes)}
                  </p>
                  {v.justificativa && (
                    <p className="text-xs text-[#475569] mt-0.5">Justificativa: {v.justificativa}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => handleVisualizar(v)}>
                    Consultar
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => acionarDownloadArquivo(v, false)}>
                    Baixar
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setDocExcluindo(v)}>
                    Excluir
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      {/* Modal: Enviar Nova Versão de um POP existente */}
      <Modal
        open={Boolean(docNovaVersao)}
        onClose={enviandoNovaVersao ? undefined : () => setDocNovaVersao(null)}
        title={docNovaVersao ? `Enviar nova versão — ${docNovaVersao.titulo}` : "Enviar nova versão"}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDocNovaVersao(null)} disabled={enviandoNovaVersao}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={enviarNovaVersao} loading={enviandoNovaVersao}>
              Publicar versão v{(docNovaVersao?.versao || 1) + 1}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-[#475569]">
            A versão atual (v{docNovaVersao?.versao || 1}) será arquivada e a nova passa a ser a vigente.
          </p>
          <div className="ui-field">
            <label htmlFor="nova-versao-arquivo" className="ui-field__label">
              <span>Arquivo da nova versão (PDF ou DOCX)</span>
              <span className="ui-field__required" aria-hidden="true">*</span>
            </label>
            <input
              id="nova-versao-arquivo"
              type="file"
              accept=".pdf,.docx"
              aria-invalid={Boolean(erroNovaVersao.arquivo)}
              onChange={(e) => setNovaVersaoArquivo(e.target.files?.[0] || null)}
              className="ui-input"
            />
            {erroNovaVersao.arquivo && (
              <p className="ui-field__error" role="alert">
                <span>{erroNovaVersao.arquivo}</span>
              </p>
            )}
          </div>
          <Textarea
            label="Justificativa da alteração"
            required
            rows={3}
            maxLength={500}
            value={novaVersaoJustificativa}
            error={erroNovaVersao.justificativa}
            onChange={(e) => setNovaVersaoJustificativa(e.target.value)}
            placeholder="Ex.: Atualização conforme a nova RDC / mudança no fluxo de dispensação"
          />
        </div>
      </Modal>

      {/* Modal Administrativo: Novo / Editar Documento */}
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
            helperText="Reenviar com o mesmo título e tipo gera uma nova versão automaticamente."
            error={errosForm.titulo}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Tipo de Publicação"
              required
              value={formTipo}
              onChange={(e) => {
                setFormTipo(e.target.value);
                if (errosForm.tipo) setErrosForm((p) => ({ ...p, tipo: "" }));
              }}
              options={OPCOES_TIPO_SELECT}
              error={errosForm.tipo}
            />

            <div>
              <Input
                label="Categoria Institucional"
                list="datalist-categorias-docs"
                value={formCategoria}
                onChange={(e) => {
                  setFormCategoria(e.target.value);
                  if (errosForm.categoria) setErrosForm((p) => ({ ...p, categoria: "" }));
                }}
                placeholder="Ex.: Enfermagem, Farmácia..."
                helperText="Se em branco, será sugerida pelas palavras-chave."
                error={errosForm.categoria}
              />
              <datalist id="datalist-categorias-docs">
                {sugestoesCategorias.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
          </div>

          <Textarea
            label="Descrição / Objetivo do Documento"
            rows={3}
            value={formDescricao}
            onChange={(e) => {
              setFormDescricao(e.target.value);
              if (errosForm.descricao) setErrosForm((p) => ({ ...p, descricao: "" }));
            }}
            placeholder="Resumo das diretrizes clínicas, fluxo ou objetivo geral..."
            error={errosForm.descricao}
          />

          {/* Palavras-chave */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#1e293b]">
              Palavras-chave (Tags)
            </label>
            <div className="p-2 border border-slate-200 rounded-lg flex flex-wrap items-center gap-1.5 focus-within:ring-2 focus-within:ring-[#800020]/20 focus-within:border-[#800020] bg-white">
              {formTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#800020]/10 text-[#800020]"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removerTag(tag)}
                    className="hover:text-red-700 ml-0.5 text-xs font-bold cursor-pointer"
                    aria-label={`Remover tag ${tag}`}
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
                    ? "Digite as palavras-chave separadas por vírgula ou Enter (ex.: curativo, uti)"
                    : "Adicionar mais tags..."
                }
                className="flex-1 min-w-[200px] border-none outline-none text-xs bg-transparent py-1"
              />
            </div>
          </div>

          {/* Upload com Drag and Drop */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#1e293b]">
              Arquivo Digital (PDF ou DOCX) {!docEditando && <span className="text-red-500">*</span>}
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
                validarESelecionarArquivo(file);
              }}
              onClick={() => inputFileRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-xl text-center cursor-pointer transition ${
                arrastandoArquivo
                  ? "border-[#800020] bg-[#800020]/5"
                  : errosForm.arquivo
                    ? "border-red-400 bg-red-50/30"
                    : "border-slate-300 hover:border-slate-400 bg-slate-50/50"
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
                  <p className="text-sm font-bold text-[#1e293b]">
                    📄 {formArquivo.name}
                  </p>
                  <p className="text-xs text-[#64748b]">
                    {formatarTamanhoBytes(formArquivo.size)} · Clique ou arraste para substituir
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-[#334155]">
                    Arraste e solte o arquivo aqui ou <span className="text-[#800020] font-semibold underline">clique para selecionar</span>
                  </p>
                  <p className="text-xs text-[#64748b]">
                    Formatos aceitos: PDF e DOCX (tamanho máximo de {DOCUMENTO_MAX_MB} MB)
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

      {/* Confirmação de substituição de arquivo */}
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
        title="Excluir Versão / Documento"
        message={
          docExcluindo?.ativo !== false
            ? `Tem certeza que deseja excluir a versão vigente (v${docExcluindo?.versao || 1}) de "${docExcluindo?.titulo}"? A versão anterior voltará a ser a vigente.`
            : `Tem certeza que deseja excluir permanentemente a versão v${docExcluindo?.versao || 1} de "${docExcluindo?.titulo}"?`
        }
        confirmLabel="Excluir"
        variant="danger"
        loading={excluindo}
        onConfirm={handleConfirmarExclusao}
        onCancel={() => setDocExcluindo(null)}
      />
    </div>
  );
}
