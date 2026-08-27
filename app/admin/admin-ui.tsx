import Link from "next/link";

/**
 * Tuile de chiffre clé. Le nombre domine, le libellé le qualifie, et une précision
 * facultative évite d'avoir à ouvrir un autre écran pour comprendre ce qu'il recouvre.
 */
export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "neutral" | "accent";
}) {
  return (
    <div className="card p-4 sm:p-5">
      <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">{label}</p>
      <p
        className={`mt-1 font-serif text-3xl tabular-nums ${tone === "accent" ? "text-accent-600" : "text-stone-900"}`}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-stone-400">{hint}</p> : null}
    </div>
  );
}

/**
 * En-tête d'écran avec fil d'Ariane. L'administration a trois niveaux (vue d'ensemble,
 * liste, fiche) : sans lui, on ne sait plus d'où l'on vient une fois sur une fiche.
 */
export function AdminPageHeader({
  title,
  subtitle,
  breadcrumb,
  actions,
}: {
  title: string;
  subtitle?: string;
  breadcrumb?: { href: string; label: string }[];
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav aria-label="Fil d'Ariane" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-stone-500">
            {breadcrumb.map((step) => (
              <li key={step.href} className="flex items-center gap-1">
                <Link href={step.href} className="hover:text-accent-600 hover:underline">
                  {step.label}
                </Link>
                <span aria-hidden="true">/</span>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-serif text-2xl break-words text-stone-900">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-stone-500">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
    </div>
  );
}

/** Pastille de rôle, pour repérer un administrateur d'un coup d'œil dans une liste. */
export function RoleBadge({ role }: { role: string }) {
  return role === "admin" ? (
    <span className="badge bg-accent-100 text-accent-800">Administrateur</span>
  ) : (
    <span className="badge bg-stone-100 text-stone-600">Utilisateur</span>
  );
}

/** État d'un compte : supprimé, en attente de vérification, ou actif. */
export function StatusBadge({
  isAnonymized,
  emailVerified,
}: {
  isAnonymized: boolean;
  emailVerified: boolean;
}) {
  if (isAnonymized) return <span className="badge bg-stone-100 text-stone-500">Supprimé</span>;
  if (!emailVerified) return <span className="badge bg-amber-100 text-amber-600">Non vérifié</span>;
  return <span className="badge bg-moss-100 text-moss-800">Actif</span>;
}
