import React, { forwardRef, useId } from "react";
import "./Input.css";
import "./Select.css";

export const Select = forwardRef(function Select(
  { label, id, required = false, error = "", options = [], placeholder, children, className = "", ...rest },
  ref,
) {
  const generatedId = useId();
  const selectId = id || `select-${generatedId}`;
  const errorId = `${selectId}-error`;

  return (
    <div className={`ui-field ${className}`.trim()}>
      {label && (
        <label htmlFor={selectId} className="ui-field__label">
          <span>{label}</span>
          {required && (
            <span className="ui-field__required" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={`ui-select ${error ? "ui-select--error" : ""}`.trim()}
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
        {children}
      </select>
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
    </div>
  );
});

export default Select;
