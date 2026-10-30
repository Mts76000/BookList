import Link from "next/link";
import { CheckCircle, Circle } from "@phosphor-icons/react/ssr";

export interface GettingStartedStep {
  label: string;
  href: string;
  done: boolean;
}

/**
 * Premiers pas, pour découvrir l'essentiel sans chercher. Disparaît une fois tout fait :
 * ce n'est pas un écran de plus, juste un fil à suivre les premiers jours.
 */
export function GettingStarted({ steps }: { steps: GettingStartedStep[] }) {
  const doneCount = steps.filter((step) => step.done).length;
  if (doneCount === steps.length) return null;

  return (
    <section className="card mb-8 p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-medium text-stone-900">Pour bien démarrer</h2>
        <p className="text-xs text-stone-500 tabular-nums">
          {doneCount} / {steps.length}
        </p>
      </div>
      <ul className="mt-3 space-y-1">
        {steps.map((step) => (
          <li key={step.label}>
            <Link
              href={step.href}
              className={`-mx-2 flex min-h-11 items-center gap-3 rounded-[var(--radius-sm)] px-2 text-sm transition-colors ${
                step.done ? "text-stone-400" : "text-stone-800 hover:bg-stone-50"
              }`}
            >
              {step.done ? (
                <CheckCircle
                  className="text-moss-500 h-5 w-5 shrink-0"
                  weight="fill"
                  aria-hidden="true"
                />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-stone-300" aria-hidden="true" />
              )}
              <span className={step.done ? "line-through" : ""}>{step.label}</span>
              <span className="sr-only">{step.done ? " (fait)" : ""}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
