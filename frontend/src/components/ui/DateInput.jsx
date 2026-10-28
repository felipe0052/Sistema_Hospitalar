import React, { forwardRef, useEffect, useId, useRef, useState } from "react";
import "./Input.css";
import "./DateInput.css";

function isoParaBr(iso = "") {
  if (!iso) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso).trim());
  if (match) {
    const [, ano, mes, dia] = match;
    return `${dia}/${mes}/${ano}`;
  }
  return String(iso);
}

function brParaIso(br = "") {
  if (!br) return "";
  const match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(String(br).trim());
  if (match) {
    const [, dia, mes, ano] = match;
    return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  }
  return "";
}

function mascararData(texto = "") {
  const digitos = String(texto).replace(/\D/g, "").slice(0, 8);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}

export const DateInput = forwardRef(function DateInput(
  {
    label,
    id,
    name,
    value = "",
    onChange,
    required = false,
    error = "",
    helperText = "",
    placeholder = "dd / mm / aaaa",
    className = "",
    disabled = false,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id || `date-input-${generatedId}`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;
  const nativePickerRef = useRef(null);

  const [textoExibicao, setTextoExibicao] = useState(() => {
    if (!value) return "";
    if (String(value).includes("-")) return isoParaBr(value);
    return mascararData(value);
  });

  // Sincroniza se o valor externo mudar (ex: abrir modal de edição ou limpar formulário)
  useEffect(() => {
    if (!value) {
      setTextoExibicao("");
    } else if (String(value).includes("-")) {
      setTextoExibicao(isoParaBr(value));
    } else {
      setTextoExibicao(mascararData(value));
    }
  }, [value]);

  function dispararChange(valorFinalIso, valorExibicao) {
    if (typeof onChange === "function") {
      onChange({
        target: {
          name,
          value: valorFinalIso,
          displayValue: valorExibicao,
        },
      });
    }
  }

  function handleTextoChange(e) {
    const formatado = mascararData(e.target.value);
    setTextoExibicao(formatado);

    if (formatado.length === 10) {
      const iso = brParaIso(formatado);
      dispararChange(iso || formatado, formatado);
    } else if (formatado.length === 0) {
      dispararChange("", "");
    } else {
      // Valor em digitação intermediária
      dispararChange(formatado, formatado);
    }
  }

  function handleNativePickerChange(e) {
    const iso = e.target.value; // Formato YYYY-MM-DD
    if (iso) {
      const br = isoParaBr(iso);
      setTextoExibicao(br);
      dispararChange(iso, br);
    } else {
      setTextoExibicao("");
      dispararChange("", "");
    }
  }

  function abrirCalendario() {
    if (disabled) return;
    if (nativePickerRef.current) {
      try {
        if (typeof nativePickerRef.current.showPicker === "function") {
          nativePickerRef.current.showPicker();
          return;
        }
      } catch {
        /* Fallback para navegadores que não suportam showPicker() */
      }
      nativePickerRef.current.click();
    }
  }

  const isoParaNative = String(value).includes("-") ? value : brParaIso(textoExibicao);

  return (
    <div className={`ui-field ${className}`.trim()}>
      {label && (
        <label htmlFor={inputId} className="ui-field__label">
          <span>{label}</span>
          {required && (
            <span className="ui-field__required" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <div className="ui-date-input__wrapper">
        <input
          ref={ref}
          id={inputId}
          name={name}
          type="text"
          inputMode="numeric"
          maxLength={10}
          disabled={disabled}
          required={required}
          value={textoExibicao}
          onChange={handleTextoChange}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={`ui-input ui-date-input__field ${error ? "ui-input--error" : ""}`.trim()}
          {...rest}
        />

        {/* Input date nativo oculto mas acionável pelo botão ou clique */}
        <input
          ref={nativePickerRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          disabled={disabled}
          value={isoParaNative || ""}
          onChange={handleNativePickerChange}
          className="ui-date-input__native-picker"
        />

        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={abrirCalendario}
          className="ui-date-input__icon-btn"
          title="Abrir seletor de data"
          aria-label="Abrir seletor de data"
        >
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </button>
      </div>

      {error && (
        <p id={errorId} className="ui-field__error" role="alert">
          <svg
            aria-hidden="true"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </p>
      )}

      {!error && helperText && (
        <p id={helperId} className="ui-field__helper">
          {helperText}
        </p>
      )}
    </div>
  );
});

export default DateInput;
