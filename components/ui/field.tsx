"use client";

import { type InputHTMLAttributes, forwardRef, useId, useState } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, error, helperText, id, className = "", type, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;
    const [isRevealed, setIsRevealed] = useState(false);
    const isPassword = type === "password";

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-foreground text-sm font-medium">
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={isPassword && isRevealed ? "text" : type}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={`border-border bg-card text-card-foreground placeholder:text-muted-foreground focus-visible:outline-ring h-10 w-full rounded-md border px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 ${isPassword ? "pr-10" : ""} ${error ? "border-destructive" : ""} ${className}`}
            {...props}
          />
          {isPassword ? (
            <button
              type="button"
              onClick={() => setIsRevealed((prev) => !prev)}
              aria-label={isRevealed ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-10 items-center justify-center"
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
