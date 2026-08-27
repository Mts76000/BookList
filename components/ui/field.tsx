"use client";

import { type InputHTMLAttributes, forwardRef, useId, useState } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Masque le libellé visuellement en le laissant lisible par les lecteurs d'écran. */
  hideLabel?: boolean;
  error?: string;
  helperText?: string;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, hideLabel, error, helperText, id, className = "", type, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;
    const [isRevealed, setIsRevealed] = useState(false);
    const isPassword = type === "password";

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className={hideLabel ? "sr-only" : "text-sm font-medium tracking-tight text-stone-700"}
        >
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={isPassword && isRevealed ? "text" : type}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={`border-border bg-card text-card-foreground focus:border-accent-400 focus:ring-accent-400/15 w-full rounded-[var(--radius-sm)] border px-4 py-3 text-base shadow-[0_1px_2px_rgba(36,29,21,0.03)] transition-all duration-200 ease-out placeholder:text-stone-400 focus:ring-4 focus:outline-none ${isPassword ? "pr-12" : ""} ${error ? "border-destructive" : ""} ${className}`}
            {...props}
          />
          {isPassword ? (
            <button
              type="button"
              onClick={() => setIsRevealed((prev) => !prev)}
              aria-label={isRevealed ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              className="text-muted-foreground hover:text-accent-600 absolute inset-y-0 right-0 flex w-12 items-center justify-center transition-colors"
            >
              {isRevealed ? (
                <EyeSlash size={18} aria-hidden="true" />
              ) : (
                <Eye size={18} aria-hidden="true" />
              )}
            </button>
          ) : null}
        </div>
        {helperText && !error ? (
          <p id={helperId} className="text-muted-foreground text-xs">
            {helperText}
          </p>
        ) : null}
        {error ? (
          <p id={errorId} className="text-destructive text-xs" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
Field.displayName = "Field";
