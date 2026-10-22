import React, { useEffect, useRef, useState } from "react";
import { useDebounce } from "../../hooks/useDebounce";
import "./SearchInput.css";

export function SearchInput({
  value = "",
  onChange,
  onSearch,
  placeholder = "Pesquisar...",
  debounceMs = 400,
  ariaLabel = "Campo de busca",
  className = "",
}) {
  const [interno, setInterno] = useState(value);
  const debounced = useDebounce(interno, debounceMs);
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;
  const lastEmittedRef = useRef(value);

  // Sincroniza se o valor controlado externo mudar
  useEffect(() => {
    setInterno(value);
    lastEmittedRef.current = value;
  }, [value]);

  // Emite busca debounced apenas quando o termo mudar de fato
  useEffect(() => {
    if (debounced !== lastEmittedRef.current) {
      lastEmittedRef.current = debounced;
      if (onSearchRef.current) {
        onSearchRef.current(debounced);
      }
    }
  }, [debounced]);

  function handleChange(e) {
    const novo = e.target.value;
    setInterno(novo);
    if (onChange) onChange(novo);
  }

  function handleClear() {
    setInterno("");
    lastEmittedRef.current = "";
    if (onChange) onChange("");
    if (onSearchRef.current) {
      onSearchRef.current("");
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      handleClear();
    }
  }

  return (
    <div className={`ui-search ${className}`.trim()}>
      <svg
        aria-hidden="true"
        className="ui-search__icon"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="search"
        value={interno}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="ui-search__input"
      />
      {Boolean(interno) && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Limpar busca"
          className="ui-search__clear"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default SearchInput;
