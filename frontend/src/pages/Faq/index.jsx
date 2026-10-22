import React, { useState } from "react";
import { Button, Card, EmptyState, SearchInput } from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";
import { MOCK_FAQS } from "../../mocks/portal";

export default function Faq() {
  const { temPerfil } = useAuth();
  const [busca, setBusca] = useState("");
  const podeGerir = temPerfil("ADMIN", "RH");

  const gruposFiltrados = MOCK_FAQS.map((g) => ({
    ...g,
    perguntas: g.perguntas.filter(
      (p) =>
        !busca ||
        p.pergunta.toLowerCase().includes(busca.toLowerCase()) ||
        p.resposta.toLowerCase().includes(busca.toLowerCase()),
    ),
  })).filter((g) => g.perguntas.length > 0);

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1e293b]">FAQ — Central de Ajuda</h1>
          <p className="text-sm text-[#64748b] mt-0.5">
            Perguntas frequentes sobre processos internos, RH e normas hospitalares
          </p>
        </div>
        {podeGerir && <Button variant="primary">+ Adicionar Novo</Button>}
      </div>

      <div className="max-w-md">
        <SearchInput
          value={busca}
          onChange={setBusca}
          placeholder="Pesquisar dúvida frequente..."
        />
      </div>

      {gruposFiltrados.length === 0 ? (
        <Card>
          <EmptyState
            title={
              busca
                ? "Nenhuma pergunta encontrada"
                : "Nenhuma pergunta frequente disponível"
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {gruposFiltrados.map((grupo) => (
            <Card key={grupo.categoria} className="space-y-3">
              <h2 className="text-base font-bold text-[#800020]">{grupo.categoria}</h2>
              <div className="space-y-2.5">
                {grupo.perguntas.map((item) => (
                  <div
                    key={item.id_faq}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1"
                  >
                    <div className="text-sm font-semibold text-[#1e293b]">
                      {item.pergunta}
                    </div>
                    <div className="text-xs text-[#475569] leading-relaxed">
                      {item.resposta}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
