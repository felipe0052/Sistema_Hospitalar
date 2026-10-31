import React, { useCallback, useEffect, useState } from "react";
import {
  alterarAtivoAcessoRapido,
  atualizarAcessoRapido,
  criarAcessoRapido,
  excluirAcessoRapido,
  listarAcessosRapidosAdmin,
  reordenarAcessosRapidos,
} from "../../api/acessosRapidos";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  ErrorBanner,
  Input,
  Modal,
  Select,
  Skeleton,
  Table,
  useToast,
} from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";

const OPCOES_ICONE = [
  { value: "compass", label: "Bússola (Padrão)" },
  { value: "chat", label: "Comunicação / E-mail" },
  { value: "calendar", label: "Calendário / Ponto" },
  { value: "folder", label: "Documentos / Educação" },
  { value: "users", label: "Pessoas / RH" },
  { value: "building", label: "Institucional / Hospital" },
  { value: "shield", label: "Segurança / Qualidade" },
  { value: "layers", label: "Sistemas / Integração" },
];

export default function AdminAcessoRapido() {
  const { autenticado, isAdmin } = useAuth();
  const podeGerir = autenticado && isAdmin;
  const { sucesso, erro: toastErro } = useToast();

  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState("");

  // Modal Criar / Editar
  const [modalOpen, setModalOpen] = useState(false);
  const [itemEditando, setItemEditando] = useState(null);
  const [formTitulo, setFormTitulo] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formDescricao, setFormDescricao] = useState("");
  const [formIcone, setFormIcone] = useState("compass");
  const [formOrdem, setFormOrdem] = useState(1);
  const [formAtivo, setFormAtivo] = useState(true);
  const [errosForm, setErrosForm] = useState({});
  const [salvando, setSalvando] = useState(false);

  // Exclusão
  const [itemExcluindo, setItemExcluindo] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  const carregarItens = useCallback(async () => {
    setCarregando(true);
    setErroLista("");
    try {
      const lista = await listarAcessosRapidosAdmin();
      setItens(Array.isArray(lista) ? lista : []);
    } catch (err) {
      setErroLista(err?.mensagem || "Não foi possível carregar os links de acesso rápido.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarItens();
  }, [carregarItens]);

  function abrirModalNovo() {
    setItemEditando(null);
    setFormTitulo("");
    setFormUrl("https://");
    setFormDescricao("");
    setFormIcone("compass");
    setFormOrdem(itens.length + 1);
    setFormAtivo(true);
    setErrosForm({});
    setModalOpen(true);
  }

  function abrirModalEditar(item) {
    setItemEditando(item);
    setFormTitulo(item.titulo || "");
    setFormUrl(item.url || "");
    setFormDescricao(item.descricao || "");
    setFormIcone(item.icone || "compass");
    setFormOrdem(Number(item.ordem) || 0);
    setFormAtivo(Boolean(item.ativo));
    setErrosForm({});
    setModalOpen(true);
  }

  function validarFormulario() {
    const novosErros = {};
    const tituloLimpo = formTitulo.trim();
    const urlLimpa = formUrl.trim();

    if (!tituloLimpo || tituloLimpo.length < 2) {
      novosErros.titulo = "Informe um título com pelo menos 2 caracteres.";
    }
    if (!urlLimpa) {
      novosErros.url = "A URL é obrigatória.";
    } else if (!/^https?:\/\/.+/i.test(urlLimpa)) {
      novosErros.url = "A URL deve começar com http:// ou https://.";
    }

    setErrosForm(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  async function handleSubmitForm(e) {
    e.preventDefault();
    if (!validarFormulario()) return;

    setSalvando(true);
    try {
      const payload = {
        titulo: formTitulo.trim(),
        url: formUrl.trim(),
        descricao: formDescricao.trim() || null,
        icone: formIcone || "compass",
        ordem: Number(formOrdem) || 0,
        ativo: Boolean(formAtivo),
      };

      if (itemEditando) {
        await atualizarAcessoRapido(itemEditando.id, payload);
        sucesso(`Link "${payload.titulo}" atualizado com sucesso.`);
      } else {
        await criarAcessoRapido(payload);
        sucesso(`Link "${payload.titulo}" cadastrado com sucesso.`);
      }
      setModalOpen(false);
      await carregarItens();
    } catch (err) {
      if (err?.erros && Object.keys(err.erros).length > 0) {
        setErrosForm(err.erros);
      }
      toastErro(err?.mensagem || "Não foi possível salvar o link de acesso rápido.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleToggleAtivo(item) {
    try {
      const atualizado = await alterarAtivoAcessoRapido(item.id, !item.ativo);
      sucesso(
        `Link "${item.titulo}" ${atualizado.ativo ? "ativado" : "desativado"} com sucesso.`,
      );
      await carregarItens();
    } catch (err) {
      toastErro(err?.mensagem || "Não foi possível alterar o status do link.");
    }
  }

  async function handleMoverOrdem(index, direcao) {
    const destino = index + direcao;
    if (destino < 0 || destino >= itens.length) return;
    const novaLista = [...itens];
    const [movido] = novaLista.splice(index, 1);
    novaLista.splice(destino, 0, movido);

    try {
      const ids = novaLista.map((item) => item.id);
      const atualizados = await reordenarAcessosRapidos(ids);
      setItens(Array.isArray(atualizados) ? atualizados : novaLista);
      sucesso("Ordem dos links atualizada.");
    } catch (err) {
      toastErro(err?.mensagem || "Não foi possível reordenar os links.");
    }
  }

  async function handleConfirmarExclusao() {
    if (!itemExcluindo) return;
    setExcluindo(true);
    try {
      await excluirAcessoRapido(itemExcluindo.id);
      sucesso(`Link "${itemExcluindo.titulo}" excluído com sucesso.`);
      setItemExcluindo(null);
      await carregarItens();
    } catch (err) {
      toastErro(err?.mensagem || "Não foi possível excluir o link.");
      setItemExcluindo(null);
    } finally {
      setExcluindo(false);
    }
  }

  const colunas = [
    {
      key: "ordem",
      header: "Ordem",
      render: (item) => {
        const index = itens.findIndex((i) => i.id === item.id);
        return (
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-[#475569] w-6 text-center">{item.ordem}</span>
            {podeGerir && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={index <= 0}
                  onClick={() => handleMoverOrdem(index, -1)}
                  aria-label={`Mover ${item.titulo} para cima`}
                  className="px-1.5 py-0.5 text-xs rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={index === -1 || index >= itens.length - 1}
                  onClick={() => handleMoverOrdem(index, 1)}
                  aria-label={`Mover ${item.titulo} para baixo`}
                  className="px-1.5 py-0.5 text-xs rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  ↓
                </button>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "titulo",
      header: "Título",
      render: (item) => (
        <div>
          <span className="font-semibold text-[#1e293b] block">{item.titulo}</span>
          {item.descricao && (
            <span className="text-xs text-[#64748b] block">{item.descricao}</span>
          )}
        </div>
      ),
    },
    {
      key: "url",
      header: "URL Externa",
      render: (item) => (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-[#0d9488] hover:underline break-all"
        >
          {item.url}
        </a>
      ),
    },
    {
      key: "ativo",
      header: "Status",
      render: (item) => (
        <div className="flex items-center gap-2">
          <Badge variant={item.ativo ? "success" : "default"}>
            {item.ativo ? "Ativo" : "Inativo"}
          </Badge>
          {podeGerir && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleToggleAtivo(item)}
              aria-label={item.ativo ? `Desativar ${item.titulo}` : `Ativar ${item.titulo}`}
            >
              {item.ativo ? "Desativar" : "Ativar"}
            </Button>
          )}
        </div>
      ),
    },
    ...(podeGerir
      ? [
          {
            key: "acoes",
            header: "Ações",
            render: (item) => (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => abrirModalEditar(item)}
                  aria-label={`Editar ${item.titulo}`}
                >
                  Editar
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setItemExcluindo(item)}
                  aria-label={`Excluir ${item.titulo}`}
                >
                  Excluir
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1e293b]">Acesso Rápido (Links Externos)</h1>
          <p className="text-sm text-[#64748b] mt-0.5">
            Gerencie os sites e sistemas externos exibidos no botão flutuante de Acesso Rápido para todos os colaboradores logados
          </p>
        </div>
        {podeGerir ? (
          <Button variant="primary" onClick={abrirModalNovo}>
            + Novo Link Externo
          </Button>
        ) : (
          <Badge variant="leitura">Modo Somente Visualização</Badge>
        )}
      </div>

      {erroLista ? (
        <ErrorBanner message={erroLista} onRetry={carregarItens} />
      ) : carregando ? (
        <Card className="space-y-3" aria-busy="true">
          <Skeleton height="36px" width="100%" />
          <Skeleton height="44px" width="100%" />
          <Skeleton height="44px" width="100%" />
        </Card>
      ) : (
        <Table
          columns={colunas}
          data={itens}
          rowKey="id"
          emptyMessage="Nenhum link de acesso rápido cadastrado."
        />
      )}

      <Modal
        open={modalOpen}
        onClose={salvando ? undefined : () => setModalOpen(false)}
        title={
          itemEditando ? `Editar Link — ${itemEditando.titulo}` : "Novo Link de Acesso Rápido"
        }
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setModalOpen(false)}
              disabled={salvando}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSubmitForm} loading={salvando}>
              {itemEditando ? "Salvar Alterações" : "Cadastrar Link"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmitForm} className="space-y-4" noValidate>
          <Input
            label="Título"
            required
            value={formTitulo}
            onChange={(e) => {
              setFormTitulo(e.target.value);
              if (errosForm.titulo) setErrosForm((p) => ({ ...p, titulo: "" }));
            }}
            placeholder="Ex.: E-mail Corporativo, Sistema de Ponto..."
            error={errosForm.titulo}
          />

          <Input
            label="URL (http:// ou https://)"
            required
            value={formUrl}
            onChange={(e) => {
              setFormUrl(e.target.value);
              if (errosForm.url) setErrosForm((p) => ({ ...p, url: "" }));
            }}
            placeholder="https://sistema.decos.com.br"
            error={errosForm.url}
          />

          <Input
            label="Descrição (opcional)"
            value={formDescricao}
            onChange={(e) => setFormDescricao(e.target.value)}
            placeholder="Breve descrição exibida abaixo do título"
            error={errosForm.descricao}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Ícone"
              value={formIcone}
              onChange={(e) => setFormIcone(e.target.value)}
              options={OPCOES_ICONE}
            />

            <Input
              label="Ordem de exibição"
              type="number"
              min="0"
              value={String(formOrdem)}
              onChange={(e) => setFormOrdem(Number(e.target.value) || 0)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-[#1e293b] cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={formAtivo}
              onChange={(e) => setFormAtivo(e.target.checked)}
              className="rounded border-slate-300"
            />
            <span>Exibir este link no menu de Acesso Rápido (Ativo)</span>
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(itemExcluindo)}
        title="Excluir Link de Acesso Rápido"
        message={`Confirma a exclusão do link "${itemExcluindo?.titulo}"?`}
        confirmLabel="Excluir Link"
        variant="danger"
        loading={excluindo}
        onConfirm={handleConfirmarExclusao}
        onCancel={() => setItemExcluindo(null)}
      />
    </div>
  );
}
