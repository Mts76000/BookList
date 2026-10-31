import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { TRIAL_DAYS } from "@/lib/plans";

/**
 * Mène à la page Premium du compte, où l'on choisit sa formule avant de démarrer l'essai
 * dans Stripe Checkout.
 */
export function TrialButton({ className = "" }: { className?: string }) {
  return (
    <Link href="/account/premium" className={buttonClasses("primary", className)}>
      Essayer gratuitement {TRIAL_DAYS} jours
    </Link>
  );
}
