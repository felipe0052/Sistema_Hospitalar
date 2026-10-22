import React from "react";
import { Badge, Button, Card, EmptyState } from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";
import { MOCK_EVENTOS } from "../../mocks/portal";

export default function Eventos() {
  const { temPerfil } = useAuth();
  const podeGerir = temPerfil("ADMIN", "MARKETING");

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1e293b]">Agenda de Eventos</h1>
          <p className="text-sm text-[#64748b] mt-0.5">
            Próximos treinamentos, ações internas e eventos institucionais do Hospital Decós
          </p>
        </div>
        {podeGerir && <Button variant="primary">+ Adicionar Novo</Button>}
      </div>

      {MOCK_EVENTOS.length === 0 ? (
        <Card>
          <EmptyState title="Não há eventos programados" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MOCK_EVENTOS.map((ev) => (
            <Card key={ev.id_evento} className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="primary">{ev.categoria}</Badge>
                <span className="text-xs font-semibold text-[#64748b]">
                  {new Date(ev.data_inicio).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <h2 className="text-base font-bold text-[#1e293b]">{ev.titulo}</h2>
              <p className="text-sm text-[#475569]">{ev.descricao}</p>
              <div className="pt-2 text-xs text-[#64748b] flex items-center justify-between">
                <span>Local: {ev.local}</span>
                {ev.setor?.nome && <span>Setor: {ev.setor.nome}</span>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
