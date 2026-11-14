import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listarAniversariantes } from "../../api/aniversariantes";
import {
  atualizarConfiguracaoAniversario,
  atualizarLinkAniversario,
  criarLinkAniversario,
  excluirLinkAniversario,
  listarLinksAniversarioAdmin,
  obterConfiguracaoAniversario,
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

const MENSAGEM_PADRAO =
  "O Hospital Decós parabeniza você pelo seu aniversário! Agradecemos por sua dedicação diária no cuidado aos pacientes e no fortalecimento da nossa equipe. Desejamos um novo ciclo repleto de saúde, conquistas e alegrias!";
const TITULO_PADRAO = "🎉 Feliz aniversário, {nome}!";
const ASSINATURA_PADRAO = "— Equipe de Gestão de Pessoas • Hospital Decós";

export default function AdminAniversariantes() {
  const { sucesso, erro: toastErro } = useToast();

  // Estados dos Links
  const [links, setLinks] = useState([]);
  const [carregandoLinks, setCarregandoLinks] = useState(true);
  const [erroLinks, setErroLinks] = useState("");

  const [modalLinkOpen, setModalLinkOpen] = useState(false);
  const [linkEditando, setLinkEditando] = useState(null);
  const [formTitulo, setFormTitulo] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formAtivo, setFormAtivo] = useState(true);
  const [errosForm, setErrosForm] = useState({});
  const [salvandoLink, setSalvandoLink] = useState(false);

  const [linkExcluindo, setLinkExcluindo] = useState(null);
  const [excluindoLink, setExcluindoLink] = useState(false);

  // Estados da Mensagem de Aniversário
  const [tituloMensagem, setTituloMensagem] = useState(TITULO_PADRAO);
  const [textoMensagem, setTextoMensagem] = useState(MENSAGEM_PADRAO);
  const [assinaturaMensagem, setAssinaturaMensagem] = useState(ASSINATURA_PADRAO);
  const [carregandoConfig, setCarregandoConfig] = useState(true);
  const [salvandoConfig, setSalvandoConfig] = useState(false);
  const [erroConfig, setErroConfig] = useState("");

  // Resumo de Aniversariantes
  const [aniversariantesHoje, setAniversariantesHoje] = useState([]);
  const [totalMes, setTotalMes] = useState(0);

  // Carregar Links
  const carregarLinks = useCallback(async () => {
    setCarregandoLinks(true);
    setErroLinks("");
    try {
      const lista = await listarLinksAniversarioAdmin();
      setLinks(Array.isArray(lista) ? lista : []);
    } catch (err) {
      setErroLinks(err?.mensagem || "Não foi possível carregar os links de aniversário.");
    } finally {
      setCarregandoLinks(false);
    }
  }, []);

  // Carregar Configuração da Mensagem
  const carregarConfiguracao = useCallback(async () => {
    setCarregandoConfig(true);
    setErroConfig("");
    try {
      const conf = await obterConfiguracaoAniversario();
      if (conf) {
        setTituloMensagem(conf.titulo || TITULO_PADRAO);
        setTextoMensagem(conf.mensagem || MENSAGEM_PADRAO);
        setAssinaturaMensagem(conf.assinatura || ASSINATURA_PADRAO);
      }
    } catch (err) {
      setErroConfig(err?.mensagem || "Não foi possível carregar a mensagem de aniversário.");
    } finally {
      setCarregandoConfig(false);
    }
  }, []);

  // Carregar Aniversariantes do Mês para Resumo
  const carregarResumoAniversariantes = useCallback(async () => {
    try {
      const hoje = new Date();
      const mesAtual = hoje.getMonth() + 1;
      const diaAtual = hoje.getDate();
      const lista = await listarAniversariantes({ mes: mesAtual });
      if (Array.isArray(lista)) {
        setTotalMes(lista.length);
        setAniversariantesHoje(
          lista.filter(
            (a) =>
              Boolean(a.aniversario_hoje) ||
              (Number(a.dia) === diaAtual && Number(a.mes) === mesAtual),
          ),
        );
      }
    } catch {
      // Ignora erro no widget secundário
    }
  }, []);

  useEffect(() => {
    carregarLinks();
    carregarConfiguracao();
    carregarResumoAniversariantes();
  }, [carregarLinks, carregarConfiguracao, carregarResumoAniversariantes]);

  // Ações da Mensagem
  async function handleSalvarMensagem(e) {
    e.preventDefault();
    if (!textoMensagem.trim() || textoMensagem.trim().length < 5) {
      toastErro("A mensagem deve conter pelo menos 5 caracteres.");
      return;
    }

    setSalvandoConfig(true);
    try {
      await atualizarConfiguracaoAniversario({
        titulo: tituloMensagem.trim() || TITULO_PADRAO,
        mensagem: textoMensagem.trim(),
        assinatura: assinaturaMensagem.trim() || ASSINATURA_PADRAO,
      });
      sucesso("Mensagem de aniversário atualizada com sucesso!");
    } catch (err) {
      toastErro(err?.mensagem || "Não foi possível salvar a mensagem.");
    } finally {
      setSalvandoConfig(false);
    }
  }

  function handleRestaurarPadrao() {
    setTituloMensagem(TITULO_PADRAO);
    setTextoMensagem(MENSAGEM_PADRAO);
    setAssinaturaMensagem(ASSINATURA_PADRAO);
  }

  // Ações dos Links
  function abrirModalNovoLink() {
    setLinkEditando(null);
    setFormTitulo("");
    setFormUrl("https://");
    setFormAtivo(true);
    setErrosForm({});
    setModalLinkOpen(true);
  }

  function abrirModalEditarLink(item) {
    setLinkEditando(item);
    setFormTitulo(item.titulo || "");
    setFormUrl(item.url || "");
    setFormAtivo(Boolean(item.ativo));
    setErrosForm({});
    setModalLinkOpen(true);
  }

  function validarFormLink() {
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

  async function handleSubmitLink(e) {
    e.preventDefault();
    if (!validarFormLink()) return;

    setSalvandoLink(true);
    try {
      const payload = {
        titulo: formTitulo.trim(),
        url: formUrl.trim(),
        ativo: Boolean(formAtivo),
      };

      if (linkEditando) {
        await atualizarLinkAniversario(linkEditando.id, payload);
        sucesso(`Link "${payload.titulo}" atualizado com sucesso.`);
      } else {
        await criarLinkAniversario(payload);
        sucesso(`Link "${payload.titulo}" cadastrado com sucesso.`);
      }
      setModalLinkOpen(false);
      await carregarLinks();
    } catch (err) {
      if (err?.erros && Object.keys(err.erros).length > 0) {
        setErrosForm(err.erros);
      }
      toastErro(err?.mensagem || "Não foi possível salvar o link.");
    } finally {
      setSalvandoLink(false);
    }
  }

  async function handleConfirmarExclusaoLink() {
    if (!linkExcluindo) return;
    setExcluindoLink(true);
    try {
      await excluirLinkAniversario(linkExcluindo.id);
      sucesso(`Link "${linkExcluindo.titulo}" excluído com sucesso.`);
      setLinkExcluindo(null);
      await carregarLinks();
    } catch (err) {
      toastErro(err?.mensagem || "Não foi possível excluir o link.");
      setLinkExcluindo(null);
    } finally {
      setExcluindoLink(false);
    }
  }

  const colunasLinks = [
    {
      key: "titulo",
      header: "Título",
      render: (item) => <span className="font-semibold text-[#1e293b]">{item.titulo}</span>,
    },
    {
      key: "url",
      header: "Link de Acesso",
      render: (item) => (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-[#0d9488] hover:underline break-all"
        >
          {item.url} ↗
        </a>
      ),
    },
    {
      key: "ativo",
      header: "Status",
      render: (item) => (
        <Badge variant={item.ativo ? "success" : "default"}>
          {item.ativo ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
    {
      key: "acoes",
      header: "Ações",
      render: (item) => (
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => abrirModalEditarLink(item)}>
            Editar
          </Button>
          <Button variant="danger" size="sm" onClick={() => setLinkExcluindo(item)}>
            Excluir
          </Button>
        </div>
      ),
    },
  ];

  const linksAtivos = links.filter((l) => Boolean(l.ativo));
  const previewTitulo = (tituloMensagem || TITULO_PADRAO).replace(/\{nome\}/gi, "Maria");

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Cabeçalho da página */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1e293b]">Gestão de Aniversariantes</h1>
          <p className="text-sm text-[#64748b] mt-0.5">
            Configure a mensagem e os links/vouchers exibidos no pop-up do aniversariante em um único lugar
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/aniversariantes">
            <Button variant="secondary" size="sm">
              🎂 Ver Mural de Aniversariantes →
            </Button>
          </Link>
          <Button variant="primary" size="sm" onClick={abrirModalNovoLink}>
            + Novo Link / Voucher
          </Button>
        </div>
      </div>

      {/* Cards de Métricas / Resumo Rápido */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="flex items-center justify-between p-4">
          <div>
            <div className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">
              Aniversariantes Hoje
            </div>
            <div className="text-2xl font-bold text-[#800020] mt-1">
              {aniversariantesHoje.length}
            </div>
            <div className="text-[11px] text-[#64748b] mt-0.5">
              {aniversariantesHoje.length === 1
                ? "1 colaborador comemorando hoje"
                : `${aniversariantesHoje.length} colaboradores comemorando`}
            </div>
          </div>
          <span className="text-3xl" aria-hidden="true">🎂</span>
        </Card>

        <Card className="flex items-center justify-between p-4">
          <div>
            <div className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">
              Total no Mês
            </div>
            <div className="text-2xl font-bold text-[#1e293b] mt-1">{totalMes}</div>
            <div className="text-[11px] text-[#64748b] mt-0.5">
              Colaboradores aniversariantes neste mês
            </div>
          </div>
          <span className="text-3xl" aria-hidden="true">🎉</span>
        </Card>

        <Card className="flex items-center justify-between p-4">
          <div>
            <div className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">
              Vouchers e Links Ativos
            </div>
            <div className="text-2xl font-bold text-[#0d9488] mt-1">
              {linksAtivos.length}
            </div>
            <div className="text-[11px] text-[#64748b] mt-0.5">
              Exibidos no pop-up do aniversariante
            </div>
          </div>
          <span className="text-3xl" aria-hidden="true">🎁</span>
        </Card>
      </div>

      {/* Seção 1: Mensagem e Preview do Pop-up */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulário de Edição da Mensagem */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-[#1e293b]">Mensagem de Aniversário</h2>
              <p className="text-xs text-[#64748b] mt-0.5">
                Texto de felicitações exibido quando o colaborador entra no sistema no dia do seu aniversário
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleRestaurarPadrao}>
              Restaurar Padrão
            </Button>
          </div>

          {erroConfig ? (
            <ErrorBanner message={erroConfig} onRetry={carregarConfiguracao} />
          ) : carregandoConfig ? (
            <div className="space-y-3" aria-busy="true">
              <Skeleton height="36px" width="100%" />
              <Skeleton height="100px" width="100%" />
              <Skeleton height="36px" width="100%" />
            </div>
          ) : (
            <form onSubmit={handleSalvarMensagem} className="space-y-4">
              <Input
                label="Título do Pop-up"
                value={tituloMensagem}
                onChange={(e) => setTituloMensagem(e.target.value)}
                placeholder="Ex.: 🎉 Feliz aniversário, {nome}!"
                helperText="Use {nome} onde deseja que apareça o primeiro nome do colaborador."
                required
              />

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#334155]">
                  Texto da Mensagem de Parabéns <span className="text-[#b4233e]">*</span>
                </label>
                <textarea
                  rows={5}
                  value={textoMensagem}
                  onChange={(e) => setTextoMensagem(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#800020]/20 focus:border-[#800020]"
                  placeholder="Escreva aqui a mensagem calorosa de aniversário..."
                  required
                />
                <span className="text-[11px] text-[#64748b]">
                  {textoMensagem.length} caracteres
                </span>
              </div>

              <Input
                label="Assinatura / Rodapé Institucional"
                value={assinaturaMensagem}
                onChange={(e) => setAssinaturaMensagem(e.target.value)}
                placeholder="Ex.: — Equipe de Gestão de Pessoas • Hospital Decós"
              />

              <div className="pt-2 flex justify-end">
                <Button variant="primary" loading={salvandoConfig}>
                  Salvar Mensagem
                </Button>
              </div>
            </form>
          )}
        </Card>

        {/* Pré-visualização do Pop-up ao Vivo */}
        <Card className="space-y-4 bg-slate-50/60 border-slate-200">
          <div className="pb-3 border-b border-slate-200">
            <h2 className="text-base font-bold text-[#1e293b]">Pré-visualização do Pop-up</h2>
            <p className="text-xs text-[#64748b] mt-0.5">
              Simulação de como o colaborador verá a janela de aniversário ao fazer login
            </p>
          </div>

          <div className="p-4 bg-white rounded-xl shadow-md border border-slate-200 max-w-md mx-auto space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-[#1e293b]">{previewTitulo}</h3>
              <span className="text-slate-400 text-sm font-bold">✕</span>
            </div>

            <p className="text-xs leading-relaxed text-[#334155] whitespace-pre-line">
              {textoMensagem || MENSAGEM_PADRAO}
            </p>

            {assinaturaMensagem && (
              <p className="text-[11px] font-semibold text-[#0d9488]">
                {assinaturaMensagem}
              </p>
            )}

            {linksAtivos.length > 0 && (
              <div className="pt-2 space-y-1.5 border-t border-slate-100">
                <p className="text-[11px] font-semibold text-[#334155]">Preparamos algo para você:</p>
                <div className="flex flex-wrap gap-1.5">
                  {linksAtivos.map((link) => (
                    <span
                      key={link.id}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[#800020] text-white shadow-xs inline-flex items-center gap-1 cursor-default"
                    >
                      {link.titulo} ↗
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#800020] text-white shadow-xs">
                Obrigado!
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Seção 2: Gerenciamento de Links / Vouchers */}
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-[#1e293b]">Links, Vouchers e Benefícios</h2>
            <p className="text-xs text-[#64748b] mt-0.5">
              Cadastre sites, formulários de folga de aniversário, brindes e vantagens que aparecem como botões no pop-up
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={abrirModalNovoLink}>
            + Novo Link / Voucher
          </Button>
        </div>

        {erroLinks ? (
          <ErrorBanner message={erroLinks} onRetry={carregarLinks} />
        ) : carregandoLinks ? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton height="36px" width="100%" />
            <Skeleton height="44px" width="100%" />
          </div>
        ) : (
          <Table
            columns={colunasLinks}
            data={links}
            rowKey="id"
            emptyMessage="Nenhum link ou voucher cadastrado para o pop-up de aniversário."
          />
        )}
      </Card>

      {/* Modal de Criação / Edição de Link */}
      <Modal
        open={modalLinkOpen}
        onClose={salvandoLink ? undefined : () => setModalLinkOpen(false)}
        title={linkEditando ? `Editar Link — ${linkEditando.titulo}` : "Novo Link / Voucher do Pop-up"}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalLinkOpen(false)} disabled={salvandoLink}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSubmitLink} loading={salvandoLink}>
              {linkEditando ? "Salvar Alterações" : "Cadastrar Link"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmitLink} className="space-y-4" noValidate>
          <Input
            label="Título do botão"
            required
            value={formTitulo}
            onChange={(e) => {
              setFormTitulo(e.target.value);
              if (errosForm.titulo) setErrosForm((p) => ({ ...p, titulo: "" }));
            }}
            placeholder="Ex.: Resgatar voucher do aniversariante"
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
            placeholder="https://exemplo.com.br/voucher"
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

      {/* Confirmação de Exclusão de Link */}
      <ConfirmDialog
        open={Boolean(linkExcluindo)}
        title="Excluir Link"
        message={`Confirma a exclusão do link "${linkExcluindo?.titulo}"?`}
        confirmLabel="Excluir Link"
        variant="danger"
        loading={excluindoLink}
        onConfirm={handleConfirmarExclusaoLink}
        onCancel={() => setLinkExcluindo(null)}
      />
    </div>
  );
}
