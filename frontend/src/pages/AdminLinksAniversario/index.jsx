import React, { useCallback, useEffect, useState } from "react";
import {
  atualizarLinkAniversario,
  criarLinkAniversario,
  excluirLinkAniversario,
  listarLinksAniversarioAdmin,
} from "../../api/linksAniversario";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  ErrorBanner,
  Input,
  Modal,
  Skeleton,
  Table,
  useToast,
} from "../../components/ui";

export default function AdminLinksAniversario() {
  const { sucesso, erro: toastErro } = useToast();

  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [itemEditando, setItemEditando] = useState(null);
  const [formTitulo, setFormTitulo] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formAtivo, setFormAtivo] = useState(true);
  const [errosForm, setErrosForm] = useState({});
  const [salvando, setSalvando] = useState(false);

  const [itemExcluindo, setItemExcluindo] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  const carregarItens = useCallback(async () => {
    setCarregando(true);
    setErroLista("");
    try {
      const lista = await listarLinksAniversarioAdmin();
      setItens(Array.isArray(lista) ? lista : []);
    } catch (err) {
      setErroLista(err?.mensagem || "Não foi possível carregar os links do pop-up de aniversário.");
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
    setFormAtivo(true);
    setErrosForm({});
    setModalOpen(true);
  }

  function abrirModalEditar(item) {
    setItemEditando(item);
    setFormTitulo(item.titulo || "");
    setFormUrl(item.url || "");
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
        ativo: Boolean(formAtivo),
      };

      if (itemEditando) {
        await atualizarLinkAniversario(itemEditando.id, payload);
        sucesso(`Link "${payload.titulo}" atualizado com sucesso.`);
      } else {
        await criarLinkAniversario(payload);
        sucesso(`Link "${payload.titulo}" cadastrado com sucesso.`);
      }
      setModalOpen(false);
      await carregarItens();
    } catch (err) {
      if (err?.erros && Object.keys(err.erros).length > 0) {
        setErrosForm(err.erros);
      }
      toastErro(err?.mensagem || "Não foi possível salvar o link.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleConfirmarExclusao() {
    if (!itemExcluindo) return;
    setExcluindo(true);
    try {
      await excluirLinkAniversario(itemExcluindo.id);
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
      key: "titulo",
      header: "Título",
      render: (item) => <span className="font-semibold text-[#1e293b]">{item.titulo}</span>,
    },
    {
      key: "url",
      header: "Site",
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
        <Badge variant={item.ativo ? "success" : "default"}>{item.ativo ? "Ativo" : "Inativo"}</Badge>
      ),
    },
    {
      key: "acoes",
      header: "Ações",
      render: (item) => (
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => abrirModalEditar(item)}>
            Editar
          </Button>
          <Button variant="danger" size="sm" onClick={() => setItemExcluindo(item)}>
            Excluir
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1e293b]">Links do Pop-up de Aniversário</h1>
          <p className="text-sm text-[#64748b] mt-0.5">
            Cadastre os sites que aparecem como botões no pop-up de parabéns do aniversariante
          </p>
        </div>
        <Button variant="primary" onClick={abrirModalNovo}>
          + Novo Link
        </Button>
      </div>

      {erroLista ? (
        <ErrorBanner message={erroLista} onRetry={carregarItens} />
      ) : carregando ? (
        <Card className="space-y-3" aria-busy="true">
          <Skeleton height="36px" width="100%" />
          <Skeleton height="44px" width="100%" />
        </Card>
      ) : (
        <Table
          columns={colunas}
          data={itens}
          rowKey="id"
          emptyMessage="Nenhum link cadastrado para o pop-up de aniversário."
        />
      )}

      <Modal
        open={modalOpen}
        onClose={salvando ? undefined : () => setModalOpen(false)}
        title={itemEditando ? `Editar Link — ${itemEditando.titulo}` : "Novo Link do Pop-up"}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={salvando}>
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
            label="Título do botão"
            required
            value={formTitulo}
            onChange={(e) => {
              setFormTitulo(e.target.value);
              if (errosForm.titulo) setErrosForm((p) => ({ ...p, titulo: "" }));
            }}
            placeholder="Ex.: Resgatar brinde de aniversário"
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
            placeholder="https://site.com.br"
            error={errosForm.url}
          />

          <label className="flex items-center gap-2 text-sm text-[#1e293b] cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={formAtivo}
              onChange={(e) => setFormAtivo(e.target.checked)}
              className="rounded border-slate-300"
            />
            <span>Mostrar este link no pop-up (Ativo)</span>
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(itemExcluindo)}
        title="Excluir Link"
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
