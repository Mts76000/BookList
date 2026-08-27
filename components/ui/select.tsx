import { type SelectHTMLAttributes, forwardRef, useId } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  /** Masque le libellé visuellement en le laissant lisible par les lecteurs d'écran. */
  hideLabel?: boolean;
  error?: string;
}

// Le chevron est une image de fond en data URI plutôt qu'une icône superposée : cela évite
// un élément absolu à positionner et laisse le select natif gérer son ouverture, y compris
// sur mobile où le sélecteur système est bien plus confortable qu'une liste personnalisée.
const CHEVRON =
  "url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%238a7a63%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22M6%208l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')";

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hideLabel, error, id, className = "", children, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const errorId = `${selectId}-error`;

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={selectId}
          className={hideLabel ? "sr-only" : "text-sm font-medium tracking-tight text-stone-700"}
        >
          {label}
        </label>
        <select
          ref={ref}
          id={selectId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          style={{ backgroundImage: CHEVRON }}
          className={`border-border bg-card text-card-foreground focus:border-accent-400 focus:ring-accent-400/15 cursor-pointer appearance-none rounded-[var(--radius-sm)] border bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat px-4 py-3 pr-10 text-sm shadow-[0_1px_2px_rgba(36,29,21,0.03)] transition-all duration-200 ease-out focus:ring-4 focus:outline-none ${error ? "border-destructive" : ""} ${className}`}
          {...props}
        >
          {children}
        </select>
        {error ? (
          <p id={errorId} className="text-destructive text-xs" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
Select.displayName = "Select";
