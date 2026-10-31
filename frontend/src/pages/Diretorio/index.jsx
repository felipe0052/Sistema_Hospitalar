import React, { useCallback, useEffect, useMemo, useState } from "react";
import { listarDiretorio, listarRamaisPorAndar } from "../../api/diretorio";
import { listarSetores } from "../../api/setores";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Modal,
  Pagination,
  SearchInput,
  Select,
  Skeleton,
  Table,
  useToast,
} from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";

const SETORES_CHAVE = [
  "UTI",
  "Pronto-Socorro",
  "Centro Cirúrgico",
  "Pediatria",
  "Recepção",
  "Farmácia",
  "Administração",
];

const OPCOES_ANDAR = [
  { value: "", label: "Todos os andares" },
  { value: "Térreo", label: "Térreo" },
  { value: "1º andar", label: "1º andar" },
  { value: "2º andar", label: "2º andar" },
  { value: "3º andar", label: "3º andar" },
  { value: "4º andar", label: "4º andar" },
  { value: "5º andar", label: "5º andar" },
];

function obterIniciais(nome = "") {
  return String(nome)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join("");
}

async function copiarTextoAreaTransferencia(texto) {
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      /* fallback abaixo */
    }
  }
  const textarea = document.createElement("textarea");
  textarea.value = texto;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
  return true;
}

export default function Diretorio() {
  const { autenticado } = useAuth();
  const { sucesso } = useToast();

  // Abas: "colaboradores" (UC10) ou "ramais" (Guia de Ramais por Andar)
  const [abaAtiva, setAbaAtiva] = useState("colaboradores");

  // Lista de setores reais para filtros dropdown e atalhos rápidos
  const [setoresOpcoes, setSetoresOpcoes] = useState([]);

  // Estado da Aba 1: Colaboradores (UC10)
  const [buscaColaborador, setBuscaColaborador] = useState("");
  const [filtroSetorId, setFiltroSetorId] = useState("");
  const [filtroAndarColab, setFiltroAndarColab] = useState("");
  const [pagina, setPagina] = useState(1);
  const tamanhoPagina = 20;

  const [colaboradores, setColaboradores] = useState([]);
  const [totalColaboradores, setTotalColaboradores] = useState(0);
  const [carregandoColab, setCarregandoColab] = useState(true);
  const [erroColab, setErroColab] = useState("");
  const [colaboradorDetalhe, setColaboradorDetalhe] = useState(null);

  // Estado da Aba 2: Guia de Ramais por Andar
  const [buscaRamal, setBuscaRamal] = useState("");
  const [filtroAndarRamal, setFiltroAndarRamal] = useState("");
  const [gruposAndar, setGruposAndar] = useState([]);
  const [carregandoRamais, setCarregandoRamais] = useState(true);
  const [erroRamais, setErroRamais] = useState("");

  useEffect(() => {
    listarSetores()
      .then((lista) => setSetoresOpcoes(Array.isArray(lista) ? lista : []))
      .catch(() => setSetoresOpcoes([]));
  }, []);

  const carregarColaboradores = useCallback(async () => {
    setCarregandoColab(true);
    setErroColab("");
    try {
      const resp = await listarDiretorio({
        busca: buscaColaborador.trim() || undefined,
        id_setor: filtroSetorId ? Number(filtroSetorId) : undefined,
        andar: filtroAndarColab || undefined,
        pagina,
        tamanho: tamanhoPagina,
      });
      setColaboradores(Array.isArray(resp?.itens) ? resp.itens : []);
      setTotalColaboradores(typeof resp?.total === "number" ? resp.total : 0);
    } catch (err) {
      setErroColab(err?.mensagem || "Não foi possível carregar o diretório de colaboradores.");
    } finally {
      setCarregandoColab(false);
    }
  }, [buscaColaborador, filtroSetorId, filtroAndarColab, pagina]);

  const carregarGuiaRamais = useCallback(async () => {
    setCarregandoRamais(true);
    setErroRamais("");
    try {
      const resp = await listarRamaisPorAndar({
        busca: buscaRamal.trim() || undefined,
        andar: filtroAndarRamal || undefined,
      });
      setGruposAndar(Array.isArray(resp) ? resp : []);
    } catch (err) {
      setErroRamais(err?.mensagem || "Não foi possível carregar o guia de ramais por andar.");
    } finally {
      setCarregandoRamais(false);
    }
  }, [buscaRamal, filtroAndarRamal]);

  useEffect(() => {
    carregarColaboradores();
  }, [carregarColaboradores]);

  useEffect(() => {
    carregarGuiaRamais();
  }, [carregarGuiaRamais]);

  const opcoesSelectSetor = useMemo(
    () => [
      { value: "", label: "Todos os setores" },
      ...setoresOpcoes.map((s) => ({
        value: String(s.id_setor),
        label: s.andar ? `${s.nome} (${s.andar})` : s.nome,
      })),
    ],
    [setoresOpcoes],
  );

  function selecionarAtalhoSetor(nomeSetor) {
    setPagina(1);
    if (!nomeSetor) {
      setFiltroSetorId("");
      return;
    }
    const encontrado = setoresOpcoes.find(
      (s) => s.nome.toLowerCase() === nomeSetor.toLowerCase(),
    );
    if (encontrado) {
      const idStr = String(encontrado.id_setor);
      setFiltroSetorId((atual) => (atual === idStr ? "" : idStr));
    }
  }

  async function handleCopiarRamal(numero, contexto = "") {
    await copiarTextoAreaTransferencia(String(numero));
    sucesso(
      contexto
        ? `Ramal ${numero} (${contexto}) copiado para a área de transferência!`
        : `Ramal ${numero} copiado para a área de transferência!`,
    );
  }

  async function handleCopiarEmail(email, nome = "") {
    await copiarTextoAreaTransferencia(String(email));
    sucesso(
      nome
        ? `E-mail de ${nome} (${email}) copiado!`
        : `E-mail ${email} copiado para a área de transferência!`,
    );
  }

  const colunasColaboradores = [
    {
      key: "nome",
      header: "Colaborador",
      render: (colab) => (
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="w-9 h-9 rounded-full bg-[#fff5f5] border border-[#f1c5cf] text-[#800020] font-bold text-xs flex items-center justify-center flex-shrink-0"
          >
            {obterIniciais(colab.nome)}
          </div>
          <div>
            <button
              type="button"
              onClick={() => setColaboradorDetalhe(colab)}
              className="text-sm font-bold text-[#1e293b] hover:text-[#800020] text-left cursor-pointer"
            >
              {colab.nome}
            </button>
            <div className="text-xs text-[#64748b]">{colab.cargo || "Colaborador"}</div>
          </div>
        </div>
      ),
    },
    {
      key: "setor",
      header: "Setor",
      render: (colab) =>
        colab.setor?.nome ? (
          <Badge variant="info">{colab.setor.nome}</Badge>
        ) : (
          <span className="text-xs italic text-[#64748b]">Setor não informado</span>
        ),
    },
    {
      key: "andar",
      header: "Andar",
      render: (colab) =>
        colab.setor?.andar ? (
          <span className="text-xs font-medium text-[#334155]">{colab.setor.andar}</span>
        ) : (
          <span className="text-xs italic text-[#94a3b8]">Setor não informado</span>
        ),
    },
    {
      key: "ramais",
      header: "Ramal(is)",
      render: (colab) =>
        Array.isArray(colab.ramais) && colab.ramais.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {colab.ramais.map((num) => (
              <button
                key={num}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopiarRamal(num, colab.setor?.nome);
                }}
                title={`Clique para copiar o ramal ${num}`}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#fff5f5] text-[#800020] border border-[#f1c5cf] hover:bg-[#f3dfe5] transition cursor-pointer"
              >
                <span>☎ {num}</span>
              </button>
            ))}
          </div>
        ) : (
          <span className="text-xs italic text-[#64748b]">Setor não informado</span>
        ),
    },
    ...(autenticado
      ? [
          {
            key: "email",
            header: "E-mail Corporativo",
            render: (colab) => (
              <span className="text-xs text-[#475569] font-medium">{colab.email || "—"}</span>
            ),
          },
        ]
      : []),
    {
      key: "acoes",
      header: "Contato",
      render: (colab) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setColaboradorDetalhe(colab)}
          aria-label={`Ver detalhes de contato de ${colab.nome}`}
        >
          Ver detalhes
        </Button>
      ),
    },
  ];

  const totalPaginas = Math.max(1, Math.ceil(totalColaboradores / tamanhoPagina));

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* Cabeçalho e Abas */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1e293b]">Diretório e Ramais</h1>
          <p className="text-sm text-[#64748b] mt-0.5">
            Localize colaboradores ativos, e-mails corporativos e o guia telefônico organizado por setor e andar (UC10)
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Visualizações do Diretório"
          className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200"
        >
          <button
            type="button"
            role="tab"
            aria-selected={abaAtiva === "colaboradores"}
            onClick={() => setAbaAtiva("colaboradores")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              abaAtiva === "colaboradores"
                ? "bg-[#800020] text-white shadow-sm"
                : "text-[#475569] hover:text-[#1e293b]"
            }`}
          >
            👥 Colaboradores ({totalColaboradores})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={abaAtiva === "ramais"}
            onClick={() => setAbaAtiva("ramais")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              abaAtiva === "ramais"
                ? "bg-[#800020] text-white shadow-sm"
                : "text-[#475569] hover:text-[#1e293b]"
            }`}
          >
            ☎️ Guia de Ramais por Andar
          </button>
        </div>
      </div>

      {/* ================= ABA 1: COLABORADORES (UC10) ================= */}
      {abaAtiva === "colaboradores" && (
        <div className="space-y-4">
          <Card className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_240px_220px] gap-3">
              <SearchInput
                value={buscaColaborador}
                onChange={(val) => {
                  setBuscaColaborador(val);
                  setPagina(1);
                }}
                placeholder="Buscar colaborador por nome ou cargo..."
                ariaLabel="Buscar colaborador por nome ou cargo"
              />
              <Select
                aria-label="Filtrar por setor"
                value={filtroSetorId}
                onChange={(e) => {
                  setFiltroSetorId(e.target.value);
                  setPagina(1);
                }}
                options={opcoesSelectSetor}
              />
              <Select
                aria-label="Filtrar por andar"
                value={filtroAndarColab}
                onChange={(e) => {
                  setFiltroAndarColab(e.target.value);
                  setPagina(1);
                }}
                options={OPCOES_ANDAR}
              />
            </div>

            {/* Atalhos rápidos para setores-chave */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
              <span className="text-xs font-semibold text-[#64748b] mr-1">
                Filtro rápido:
              </span>
              <button
                type="button"
                onClick={() => selecionarAtalhoSetor("")}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                  !filtroSetorId
                    ? "bg-[#800020] text-white"
                    : "bg-slate-100 text-[#475569] hover:bg-slate-200"
                }`}
              >
                Todos
              </button>
              {SETORES_CHAVE.map((nomeSetor) => {
                const setorObj = setoresOpcoes.find(
                  (s) => s.nome.toLowerCase() === nomeSetor.toLowerCase(),
                );
                const selecionado =
                  setorObj && String(setorObj.id_setor) === String(filtroSetorId);
                return (
                  <button
                    key={nomeSetor}
                    type="button"
                    onClick={() => selecionarAtalhoSetor(nomeSetor)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                      selecionado
                        ? "bg-[#800020] text-white"
                        : "bg-slate-100 text-[#475569] hover:bg-slate-200"
                    }`}
                  >
                    {nomeSetor}
                  </button>
                );
              })}
            </div>
          </Card>

          {erroColab ? (
            <ErrorBanner message={erroColab} onRetry={carregarColaboradores} />
          ) : carregandoColab ? (
            <Card className="space-y-3" aria-busy="true">
              <Skeleton height="38px" width="100%" />
              <Skeleton height="48px" width="100%" />
              <Skeleton height="48px" width="100%" />
              <Skeleton height="48px" width="100%" />
              <Skeleton height="48px" width="100%" />
            </Card>
          ) : colaboradores.length === 0 ? (
            <Card>
              <EmptyState
                title="Nenhum funcionário encontrado"
                description="Tente ajustar os termos da pesquisa ou remover os filtros selecionados."
              />
            </Card>
          ) : (
            <>
              <Table
                columns={colunasColaboradores}
                data={colaboradores}
                rowKey="id_usuario"
                emptyMessage="Nenhum funcionário encontrado"
              />
              {totalPaginas > 1 && (
                <div className="flex justify-end">
                  <Pagination
                    page={pagina}
                    totalPages={totalPaginas}
                    onPageChange={setPagina}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ================= ABA 2: GUIA DE RAMAIS POR ANDAR ================= */}
      {abaAtiva === "ramais" && (
        <div className="space-y-5">
          <Card className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1 min-w-[260px]">
              <SearchInput
                value={buscaRamal}
                onChange={setBuscaRamal}
                placeholder="Localizar setor, ponto de atendimento ou número de ramal (ex.: 2101, UTI)..."
                ariaLabel="Buscar setor ou número de ramal"
              />
            </div>
            <div className="w-full sm:w-64">
              <Select
                aria-label="Filtrar guia de ramais por andar"
                value={filtroAndarRamal}
                onChange={(e) => setFiltroAndarRamal(e.target.value)}
                options={OPCOES_ANDAR}
              />
            </div>
          </Card>

          {erroRamais ? (
            <ErrorBanner message={erroRamais} onRetry={carregarGuiaRamais} />
          ) : carregandoRamais ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-busy="true">
              {[1, 2, 3, 4].map((n) => (
                <Card key={n} className="space-y-3">
                  <Skeleton height="24px" width="45%" />
                  <Skeleton height="36px" width="100%" />
                  <Skeleton height="36px" width="100%" />
                </Card>
              ))}
            </div>
          ) : gruposAndar.length === 0 ? (
            <Card>
              <EmptyState
                title="Nenhum funcionário encontrado"
                description="Nenhum setor ou ramal corresponde aos filtros informados."
              />
            </Card>
          ) : (
            <div className="space-y-6">
              {gruposAndar.map((grupo) => (
                <section
                  key={grupo.andar}
                  aria-label={`Ramais do ${grupo.andar}`}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2.5 border-b border-slate-200 pb-2">
                    <span className="px-3 py-1 rounded-lg bg-[#800020] text-white text-xs font-bold uppercase tracking-wide">
                      {grupo.andar}
                    </span>
                    <span className="text-xs text-[#64748b] font-medium">
                      {grupo.setores.length}{" "}
                      {grupo.setores.length === 1 ? "setor" : "setores"} neste andar
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {grupo.setores.map((setor) => (
                      <Card key={setor.id_setor} className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-base font-bold text-[#1e293b]">{setor.nome}</h3>
                          <Badge variant="default">{grupo.andar}</Badge>
                        </div>

                        <div className="space-y-2">
                          {(setor.ramais || []).map((r) => (
                            <div
                              key={r.numero}
                              className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-slate-50 border border-slate-100"
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-[#334155] truncate">
                                  {r.descricao || setor.nome}
                                </div>
                                <div className="text-xs font-bold text-[#800020]">
                                  Ramal {r.numero}
                                </div>
                              </div>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleCopiarRamal(r.numero, setor.nome)}
                                aria-label={`Copiar ramal ${r.numero} do setor ${setor.nome}`}
                              >
                                Copiar
                              </Button>
                            </div>
                          ))}
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL DE DETALHES DO COLABORADOR ================= */}
      <Modal
        open={Boolean(colaboradorDetalhe)}
        onClose={() => setColaboradorDetalhe(null)}
        title="Detalhes de Contato do Colaborador"
        size="md"
        footer={
          <>
            {colaboradorDetalhe?.ramais?.length > 0 && (
              <Button
                variant="secondary"
                onClick={() =>
                  handleCopiarRamal(
                    colaboradorDetalhe.ramais[0],
                    colaboradorDetalhe.setor?.nome,
                  )
                }
              >
                Copiar Ramal ({colaboradorDetalhe.ramais[0]})
              </Button>
            )}
            {autenticado && colaboradorDetalhe?.email && (
              <Button
                variant="primary"
                onClick={() =>
                  handleCopiarEmail(colaboradorDetalhe.email, colaboradorDetalhe.nome)
                }
              >
                Copiar E-mail
              </Button>
            )}
          </>
        }
      >
        {colaboradorDetalhe && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
              <div
                aria-hidden="true"
                className="w-14 h-14 rounded-full bg-[#fff5f5] border border-[#f1c5cf] text-[#800020] font-bold text-lg flex items-center justify-center flex-shrink-0"
              >
                {obterIniciais(colaboradorDetalhe.nome)}
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1e293b]">
                  {colaboradorDetalhe.nome}
                </h3>
                <p className="text-sm text-[#64748b]">
                  {colaboradorDetalhe.cargo || "Colaborador"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-xs font-semibold text-[#64748b] uppercase">Setor</div>
                <div className="font-bold text-[#1e293b] mt-0.5">
                  {colaboradorDetalhe.setor?.nome || "Setor não informado"}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="text-xs font-semibold text-[#64748b] uppercase">Andar</div>
                <div className="font-bold text-[#1e293b] mt-0.5">
                  {colaboradorDetalhe.setor?.andar || "Setor não informado"}
                </div>
              </div>
            </div>

            {autenticado && colaboradorDetalhe.email && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="text-xs font-semibold text-[#64748b] uppercase">
                  E-mail Corporativo
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[#1e293b]">
                    {colaboradorDetalhe.email}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      handleCopiarEmail(colaboradorDetalhe.email, colaboradorDetalhe.nome)
                    }
                  >
                    Copiar E-mail
                  </Button>
                </div>
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="text-xs font-semibold text-[#64748b] uppercase">
                Ramais do Setor
              </div>
              {Array.isArray(colaboradorDetalhe.ramais) &&
              colaboradorDetalhe.ramais.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {colaboradorDetalhe.ramais.map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() =>
                        handleCopiarRamal(num, colaboradorDetalhe.setor?.nome)
                      }
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#f1c5cf] text-xs font-bold text-[#800020] hover:bg-[#fff5f5] transition cursor-pointer"
                    >
                      <span>☎ Ramal {num}</span>
                      <span className="text-[11px] font-normal text-[#64748b]">
                        (Copiar)
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-sm italic text-[#64748b]">Setor não informado</div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
