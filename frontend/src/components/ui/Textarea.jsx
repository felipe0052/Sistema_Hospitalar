import React, { forwardRef, useId } from "react";
import "./Input.css";
import "./Textarea.css";

export const Textarea = forwardRef(function Textarea(
  { label, id, required = false, error = "", helperText = "", className = "", ...rest },
  ref,
) {
  const generatedId = useId();
  const textareaId = id || `textarea-${generatedId}`;
  const errorId = `${textareaId}-error`;
  const helperId = `${textareaId}-helper`;

  return (
    <div className={`ui-field ${className}`.trim()}>
      {label && (
        <label htmlFor={textareaId} className="ui-field__label">
          <span>{label}</span>
          {required && (
            <span className="ui-field__required" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        className={`ui-textarea ${error ? "ui-textarea--error" : ""}`.trim()}
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

export default Textarea;
