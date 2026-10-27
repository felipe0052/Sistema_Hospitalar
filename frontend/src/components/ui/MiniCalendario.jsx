import React, { useMemo, useState } from "react";

const NOMES_MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const DIAS = ["D", "S", "T", "Q", "Q", "S", "S"];

/**
 * Mini calendário mensal. `marcados` é um Set de números de dia (1–31) do mês exibido.
 * `marcadosEventos` idem para eventos. `dia` selecionado é controlado por quem usa (onSelecionarDia recebe o dia ou null).
 */
export function MiniCalendario({ ano, mes, marcados = new Set(), marcadosEventos = new Set(), diaSelecionado = null, onSelecionarDia }) {
  const [hoje] = useState(() => new Date());
  const celulas = useMemo(() => {
    const vazios = new Date(ano, mes - 1, 1).getDay();
    const total = new Date(ano, mes, 0).getDate();
    return [...Array(vazios).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  }, [ano, mes]);
  const ehMesAtual = hoje.getFullYear() === ano && hoje.getMonth() + 1 === mes;

  return (
    <div>
      <div className="text-xs font-bold text-[#1e293b] text-center mb-2">
        {NOMES_MESES[mes - 1]} de {ano}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {DIAS.map((d, i) => (
          <div key={i} className="text-[10px] font-bold text-[#94a3b8]">
            {d}
          </div>
        ))}
        {celulas.map((dia, i) => {
          if (dia === null) return <div key={`v${i}`} />;
          const temAniv = marcados.has(dia);
          const temEvento = marcadosEventos.has(dia);
          const marcado = temAniv || temEvento;
          const hojeCel = ehMesAtual && hoje.getDate() === dia;
          const selecionado = diaSelecionado === dia;
          return (
            <button
              key={dia}
              type="button"
              disabled={!marcado}
              onClick={() => onSelecionarDia?.(selecionado ? null : dia)}
              aria-label={`Dia ${dia}${temAniv ? ", com aniversariantes" : ""}${temEvento ? ", com eventos" : ""}`}
              aria-pressed={selecionado}
              className={`relative h-8 rounded-lg text-[11px] font-semibold transition-colors ${
                selecionado
                  ? "bg-[#800020] text-white"
                  : hojeCel
                    ? "bg-[#fff5f6] text-[#800020] ring-1 ring-[#800020]"
                    : marcado
                      ? "bg-white text-[#1e293b] border border-[#f1c5cf] hover:border-[#800020]"
                      : "text-[#64748b] cursor-default"
              }`}
            >
              {dia}
              {marcado && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5"
                >
                  {temAniv && (
                    <span className={`w-1 h-1 rounded-full ${selecionado ? "bg-white" : "bg-amber-500"}`} />
                  )}
                  {temEvento && (
                    <span className={`w-1 h-1 rounded-full ${selecionado ? "bg-white" : "bg-[#800020]"}`} />
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex justify-center gap-3 mt-2 text-[10px] text-[#64748b]">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Aniversários
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#800020]" /> Eventos
        </span>
      </div>
    </div>
  );
}

export default MiniCalendario;
