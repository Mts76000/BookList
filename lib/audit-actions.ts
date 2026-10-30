/**
 * Libellés lisibles des actions journalisées.
 *
 * Le journal stocke des identifiants techniques (`admin.change_role`) : les afficher tels
 * quels dans l'interface oblige à les déchiffrer. Cette table est partagée par le journal
 * d'audit et la fiche utilisateur, pour qu'un même événement s'y nomme pareil.
 */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "user.change_password": "Changement de mot de passe",
  "user.delete_account": "Suppression de compte",
  "admin.change_role": "Changement de rôle",
  "admin.delete_account": "Suppression de compte par un administrateur",
  "admin.revoke_sessions": "Révocation des sessions",
  "admin.grant_premium": "Premium offert",
  "admin.revoke_premium": "Premium offert retiré",
  "admin.cancel_subscription": "Résiliation de l'abonnement par un administrateur",
  "admin.resume_subscription": "Réactivation de l'abonnement par un administrateur",
  "admin.change_plan": "Changement de formule par un administrateur",
  "admin.extend_trial": "Prolongation de l'essai",
  "admin.refund_payment": "Remboursement",
  "admin.create_promotion_code": "Création d'un code promo",
  "admin.toggle_promotion_code": "Activation ou désactivation d'un code promo",
  "billing.trial_started": "Début de l'essai gratuit de Premium",
  "billing.premium_started": "Début de l'abonnement Premium",
  "billing.premium_ended": "Fin de l'abonnement Premium",
};

/** Actions d'administration, distinguées visuellement de celles d'un utilisateur. */
export function isAdminAction(action: string): boolean {
  return action.startsWith("admin.");
}

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}
