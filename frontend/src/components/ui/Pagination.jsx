import React from "react";
import "./Pagination.css";

export function Pagination({ pagina = 1, tamanho = 20, total = 0, onPageChange }) {
  const totalPaginas = Math.max(1, Math.ceil(total / tamanho));
  if (total <= 0) return null;

  const inicio = (pagina - 1) * tamanho + 1;
  const fim = Math.min(total, pagina * tamanho);

  return (
    <nav className="ui-pagination" aria-label="Paginação">
      <span>
        Exibindo <strong>{inicio}</strong>–<strong>{fim}</strong> de <strong>{total}</strong> registros
      </span>
      <div className="ui-pagination__controls">
        <button
          type="button"
          className="ui-pagination__btn"
          disabled={pagina <= 1}
          onClick={() => onPageChange && onPageChange(pagina - 1)}
          aria-label="Página anterior"
        >
          Anterior
        </button>
        {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            type="button"
            className={`ui-pagination__btn ${p === pagina ? "ui-pagination__btn--active" : ""}`.trim()}
            aria-current={p === pagina ? "page" : undefined}
            onClick={() => onPageChange && onPageChange(p)}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          className="ui-pagination__btn"
          disabled={pagina >= totalPaginas}
          onClick={() => onPageChange && onPageChange(pagina + 1)}
          aria-label="Próxima página"
        >
          Próxima
        </button>
      </div>
    </nav>
  );
}

export default Pagination;
