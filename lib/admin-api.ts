import Stripe from "stripe";
import { apiError } from "@/lib/api-response";

/**
 * Exécute une action Stripe d'administration et traduit ses refus (code promo déjà pris,
 * paiement déjà remboursé...) en erreur de validation lisible. Le message de Stripe est
 * montré tel quel : seul un administrateur le voit, et il explique précisément le refus.
 */
export async function withStripeErrors(action: () => Promise<Response>): Promise<Response> {
  try {
    return await action();
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError) {
      return apiError("VALIDATION_ERROR", `Stripe a refusé l'opération : ${err.message}`);
    }
    throw err;
  }
}
