import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "text" | "destructive";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  isLoading?: boolean;
}

const BASE_CLASSES =
  "inline-flex items-center justify-center gap-2 text-sm font-medium tracking-tight transition-all duration-300 ease-out focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50";

// L'élévation au survol et le passage de l'encre au terracotta sont la signature visuelle
// de BookList : l'action principale est sobre au repos et ne s'accentue qu'au contact.
const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "rounded-[var(--radius-sm)] bg-primary px-6 py-3 text-on-primary shadow-[0_1px_2px_rgba(36,29,21,0.08),0_10px_24px_-10px_rgba(36,29,21,0.55)] hover:-translate-y-0.5 hover:bg-accent-600 hover:shadow-[0_1px_2px_rgba(36,29,21,0.08),0_16px_28px_-10px_rgba(171,79,39,0.45)] active:translate-y-0 active:shadow-none",
  secondary:
    "rounded-[var(--radius-sm)] border border-stone-300 bg-transparent px-6 py-3 text-stone-700 hover:border-stone-400 hover:bg-stone-100",
  ghost: "rounded-[var(--radius-sm)] px-6 py-3 text-foreground hover:bg-muted",
  text: "gap-1 text-stone-600 underline decoration-stone-300 decoration-1 underline-offset-4 hover:text-accent-600 hover:decoration-accent-400",
  destructive:
    "rounded-[var(--radius-sm)] bg-destructive px-6 py-3 text-on-destructive hover:opacity-90",
};

/**
 * Classes d'un bouton, à appliquer à un élément qui ne peut pas en être un — typiquement un
 * <Link> de navigation, qu'il ne faut pas transformer en <button> sous peine de perdre le
 * clic milieu, l'ouverture en nouvel onglet et le menu contextuel du navigateur.
 */
export function buttonClasses(variant: Variant = "primary", className = ""): string {
  return `${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${className}`;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", isLoading, disabled, className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span
            className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
        ) : null}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
