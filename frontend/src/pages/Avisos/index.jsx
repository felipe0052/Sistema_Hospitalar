import React, { useState } from "react";
import { Badge, Button, Card, EmptyState, SearchInput } from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";
import { MOCK_AVISOS } from "../../mocks/portal";

const CATEGORIA_LABELS = {
  NOTICIA: "Notícia",
  COMUNICADO: "Comunicado",
  PROMOCAO: "Promoção",
  MUDANCA_SETOR: "Mudança de Setor",
};

export default function Avisos() {
  const { temPerfil } = useAuth();
  const [busca, setBusca] = useState("");
  const podePublicar = temPerfil("ADMIN", "RH", "MARKETING");

  const filtrados = MOCK_AVISOS.filter(
    (a) =>
      !busca ||
      a.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      a.resumo.toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1e293b]">Notícias e Comunicados</h1>
          <p className="text-sm text-[#64748b] mt-0.5">
            Mural de avisos corporativos, mudanças de setor, promoções e comunicados do Hospital Decós
          </p>
        </div>
        {podePublicar && <Button variant="primary">+ Adicionar Novo</Button>}
      </div>

      <div className="max-w-md">
        <SearchInput
          value={busca}
          onChange={setBusca}
          placeholder="Buscar avisos e comunicados..."
        />
      </div>

      {filtrados.length === 0 ? (
        <Card>
          <EmptyState title="Não há avisos no momento" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtrados.map((aviso) => (
            <Card key={aviso.id_aviso} className="space-y-2.5 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={aviso.destaque ? "primary" : "default"}>
                    {CATEGORIA_LABELS[aviso.categoria] || aviso.categoria}
                  </Badge>
                  <span className="text-xs text-[#64748b]">
                    {new Date(aviso.data_publicacao).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <h2 className="text-base font-bold text-[#1e293b]">{aviso.titulo}</h2>
                <p className="text-sm text-[#475569] leading-relaxed">{aviso.resumo}</p>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-[#64748b]">
                <span>Por {aviso.autor?.nome || "Administração"}</span>
                {aviso.destaque && <span className="font-semibold text-[#800020]">★ Destaque</span>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
