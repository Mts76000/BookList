import Link from "next/link";
import { LockSimple } from "@phosphor-icons/react/ssr";
import { TrialButton } from "@/components/trial-button";
import { buttonClasses } from "@/components/ui/button";

interface PremiumTeaserProps {
  title: string;
  description: string;
  /** L'essai gratuit est encore disponible : on le propose directement, sans détour. */
  trialAvailable: boolean;
  className?: string;
}

/**
 * Encart de fonctionnalité Premium verrouillée, placé sous un aperçu partiel. Propose l'essai
 * gratuit en un clic quand il est disponible, sinon renvoie vers l'offre.
 */
export function PremiumTeaser({
  title,
  description,
  trialAvailable,
  className = "",
}: PremiumTeaserProps) {
  return (
    <div
      className={`card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 ${className}`}
    >
      <div className="flex items-start gap-4">
        <span className="bg-accent-50 text-accent-700 flex size-10 shrink-0 items-center justify-center rounded-full">
          <LockSimple size={18} aria-hidden="true" />
        </span>
        <div>
          <p className="font-medium text-stone-900">{title}</p>
          <p className="text-sm text-stone-500">{description}</p>
        </div>
      </div>
      {trialAvailable ? (
        <div className="flex shrink-0 flex-col items-stretch gap-1 sm:items-end">
          <TrialButton className="w-full sm:w-auto" />
          <p className="text-center text-xs text-stone-400 sm:text-right">
            Aucun prélèvement pendant l&apos;essai
          </p>
        </div>
      ) : (
        <Link
          href="/account#premium"
          className={buttonClasses("secondary", "w-full shrink-0 sm:w-auto")}
        >
          Découvrir Premium
        </Link>
      )}
    </div>
  );
}
