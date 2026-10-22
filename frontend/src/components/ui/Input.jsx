import React, { forwardRef, useId } from "react";
import "./Input.css";

export const Input = forwardRef(function Input(
  { label, id, required = false, error = "", helperText = "", className = "", ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id || `input-${generatedId}`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

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
      <input
        ref={ref}
        id={inputId}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        className={`ui-input ${error ? "ui-input--error" : ""}`.trim()}
        {...rest}
      />
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

export default Input;
