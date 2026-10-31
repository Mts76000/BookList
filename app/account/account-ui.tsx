import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/ssr";

/** En-tête des sous-pages du compte : retour à la vue d'ensemble, titre et description. */
export function AccountSubpageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header className="mb-6">
      <Link
        href="/account"
        className="-ml-1 inline-flex min-h-11 items-center gap-1 px-1 text-sm font-medium text-stone-500 transition hover:text-stone-900"
      >
        <CaretLeft className="h-4 w-4" aria-hidden="true" />
        Compte
      </Link>
      <h1 className="mt-1 font-serif text-3xl text-stone-900">{title}</h1>
      {description && <p className="mt-1 text-sm text-stone-500">{description}</p>}
    </header>
  );
}

/** Jauge d'un plafond du compte gratuit (livres, citations). */
export function UsageMeter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const ratio = Math.min(used / limit, 1);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-stone-700">{label}</span>
        <span className="text-stone-500 tabular-nums">
          {Math.min(used, limit)} / {limit}
        </span>
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-200/70"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={Math.min(used, limit)}
      >
        <div
          className={`h-full rounded-full ${ratio >= 1 ? "bg-destructive" : ratio >= 0.8 ? "bg-accent-600" : "bg-accent-400"}`}
          style={{ width: `${Math.max(ratio * 100, used > 0 ? 2 : 0)}%` }}
        />
      </div>
    </div>
  );
}
