import React from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Card } from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";
import { MOCK_ANIVERSARIANTES, MOCK_AVISOS, MOCK_EVENTOS } from "../../mocks/portal";

const CATEGORIA_LABELS = {
  NOTICIA: "Notícia",
  COMUNICADO: "Comunicado",
  PROMOCAO: "Promoção",
  MUDANCA_SETOR: "Mudança de Setor",
};

export default function Dashboard() {
  const { usuario, autenticado, temPerfil } = useAuth();
  const destaque = MOCK_AVISOS.find((a) => a.destaque) || MOCK_AVISOS[0];
  const ultimosAvisos = MOCK_AVISOS.slice(0, 4);
  const proximosEventos = MOCK_EVENTOS.slice(0, 4);
  const aniversariantesHoje = MOCK_ANIVERSARIANTES.filter((a) => a.aniversario_hoje);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1e293b]">
            Olá, {usuario?.nome?.split(" ")[0] || "Colaborador"}
          </h1>
          <p className="text-sm text-[#64748b] mt-0.5">
            Bem-vindo à Intranet Corporativa do Hospital Decós
          </p>
        </div>
        {autenticado && temPerfil("ADMIN", "RH") && (
          <Link to="/admin/usuarios">
            <Button variant="primary">Gerenciar Usuários e Acesso</Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Coluna Esquerda: Destaque + Últimos Avisos */}
        <div className="space-y-5">
          {destaque && (
            <Card
              className="text-white border-[#800020]"
              style={{ background: "var(--bordeaux-gradient)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white">
                  ★ Destaque Institucional
                </span>
                <span className="text-xs text-white/80">
                  {CATEGORIA_LABELS[destaque.categoria] || destaque.categoria}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white leading-snug">
                {destaque.titulo}
              </h2>
              <p className="text-sm text-white/85 mt-2 leading-relaxed">
                {destaque.resumo}
              </p>
            </Card>
          )}

          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#1e293b]">
              Últimos Avisos e Comunicados
            </h2>
            <Link
              to="/avisos"
              className="text-xs font-semibold text-[#800020] hover:underline"
            >
              Ver todos os avisos →
            </Link>
          </div>

          <div className="space-y-3">
            {ultimosAvisos.map((aviso) => (
              <Card key={aviso.id_aviso} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={aviso.destaque ? "primary" : "default"}>
                    {CATEGORIA_LABELS[aviso.categoria] || aviso.categoria}
                  </Badge>
                  <span className="text-xs text-[#64748b]">
                    {new Date(aviso.data_publicacao).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#1e293b]">{aviso.titulo}</h3>
                <p className="text-xs text-[#64748b] leading-relaxed">{aviso.resumo}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Coluna Direita: Próximos Eventos + Aniversariantes de Hoje */}
        <div className="space-y-5">
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#1e293b]">Próximos Eventos</h2>
              <Link
                to="/eventos"
                className="text-xs font-semibold text-[#800020] hover:underline"
              >
                Ver agenda
              </Link>
            </div>
            <div className="space-y-3">
              {proximosEventos.map((ev) => {
                const dt = new Date(ev.data_inicio);
                return (
                  <div
                    key={ev.id_evento}
                    className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-none last:pb-0"
                  >
                    <div className="w-11 py-1 rounded-lg bg-[#fff5f5] text-[#800020] text-center flex-shrink-0">
                      <div className="text-base font-black leading-none">
                        {String(dt.getDate()).padStart(2, "0")}
                      </div>
                      <div className="text-[10px] font-bold uppercase">
                        {dt.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-[#1e293b] leading-snug">
                        {ev.titulo}
                      </div>
                      <div className="text-[11px] text-[#64748b] mt-0.5">
                        {ev.local}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#1e293b]">Aniversariantes do Dia</h2>
              <Link
                to="/aniversariantes"
                className="text-xs font-semibold text-[#800020] hover:underline"
              >
                Ver mês ({MOCK_ANIVERSARIANTES.length})
              </Link>
            </div>
            {aniversariantesHoje.length === 0 ? (
              <p className="text-xs text-[#64748b]">Nenhum aniversariante hoje.</p>
            ) : (
              <div className="space-y-2.5">
                {aniversariantesHoje.map((aniv) => (
                  <div
                    key={aniv.id_usuario}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[#fff5f5]"
                  >
                    <div>
                      <div className="text-xs font-bold text-[#1e293b]">{aniv.nome}</div>
                      <div className="text-[11px] text-[#64748b]">
                        {aniv.cargo} · {aniv.setor?.nome || "Setor não informado"}
                      </div>
                    </div>
                    <Badge variant="primary">🎂 Hoje</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
