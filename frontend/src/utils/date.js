/**
 * Utilitários para formatação padronizada de datas no padrão brasileiro DD/MM/YYYY.
 */

/**
 * Formata qualquer valor de data (string ISO, Date, timestamp ou YYYY-MM-DD)
 * para o formato estrito DD/MM/YYYY.
 *
 * @param {string | number | Date | null | undefined} valor
 * @returns {string} Data no formato DD/MM/YYYY ou "—" se nulo/inválido.
 */
export function formatarData(valor) {
  if (!valor) return "—";

  if (typeof valor === "string") {
    const limpo = valor.trim();
    const matchBr = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(limpo);
    if (matchBr) {
      const [, dia, mes, ano] = matchBr;
      return `${dia.padStart(2, "0")}/${mes.padStart(2, "0")}/${ano}`;
    }
    const matchSimples = /^(\d{4})-(\d{2})-(\d{2})/.exec(limpo);
    if (matchSimples && limpo.length === 10) {
      const [, ano, mes, dia] = matchSimples;
      return `${dia}/${mes}/${ano}`;
    }
  }

  try {
    const dt = valor instanceof Date ? valor : new Date(valor);
    if (Number.isNaN(dt.getTime())) return String(valor);
    const dia = String(dt.getDate()).padStart(2, "0");
    const mes = String(dt.getMonth() + 1).padStart(2, "0");
    const ano = dt.getFullYear();
    return `${dia}/${mes}/${ano}`;
  } catch {
    return String(valor);
  }
}

/**
 * Formata data e hora para o padrão DD/MM/YYYY às HH:mm (ou DD/MM/YYYY HH:mm).
 *
 * @param {string | number | Date | null | undefined} valor
 * @param {string} separador Texto entre a data e o horário (padrão: " às ")
 * @returns {string} Data e hora formatadas ou "—".
 */
export function formatarDataHora(valor, separador = " às ") {
  if (!valor) return "—";
  try {
    const dt = valor instanceof Date ? valor : new Date(valor);
    if (Number.isNaN(dt.getTime())) return String(valor);
    const dia = String(dt.getDate()).padStart(2, "0");
    const mes = String(dt.getMonth() + 1).padStart(2, "0");
    const ano = dt.getFullYear();
    const hora = String(dt.getHours()).padStart(2, "0");
    const min = String(dt.getMinutes()).padStart(2, "0");
    return `${dia}/${mes}/${ano}${separador}${hora}:${min}`;
  } catch {
    return String(valor);
  }
}

export default formatarData;
