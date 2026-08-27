import { type TextareaHTMLAttributes, forwardRef, useId } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  /** Masque le libellé visuellement en le laissant lisible par les lecteurs d'écran. */
  hideLabel?: boolean;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hideLabel, error, id, className = "", ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const errorId = `${textareaId}-error`;

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={textareaId}
          className={hideLabel ? "sr-only" : "text-sm font-medium tracking-tight text-stone-700"}
        >
          {label}
        </label>
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`border-border bg-card text-card-foreground focus:border-accent-400 focus:ring-accent-400/15 w-full resize-none rounded-[var(--radius-sm)] border px-4 py-3 text-base shadow-[0_1px_2px_rgba(36,29,21,0.03)] transition-all duration-200 ease-out placeholder:text-stone-400 focus:ring-4 focus:outline-none ${error ? "border-destructive" : ""} ${className}`}
          {...props}
        />
        {error ? (
          <p id={errorId} className="text-destructive text-xs" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";
