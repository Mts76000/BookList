# Politique de sécurité

## Signaler une vulnérabilité

Si vous découvrez une faille de sécurité, merci de **ne pas** ouvrir d'issue publique.
Contactez-nous directement à l'adresse définie dans `CONTACT_EMAIL` (voir `.env.example`), en
décrivant :

- La nature de la vulnérabilité et son impact potentiel.
- Les étapes pour la reproduire.
- Toute preuve de concept (sans l'exploiter au-delà de ce qui est nécessaire à la démonstration).

Nous accusons réception sous 72h et vous tenons informé de l'avancement de la correction.
Merci de nous laisser un délai raisonnable pour corriger avant toute divulgation publique.

## Périmètre

- Authentification et gestion de session (better-auth).
- Routes API (`app/api/**`) et leurs autorisations (`lib/permissions.ts`).
- Gestion des secrets et variables d'environnement (`lib/env.ts`).
- Dépendances tierces (voir `npm audit` et le workflow CI).

## Bonnes pratiques déjà en place

- Mots de passe hashés par better-auth, jamais stockés en clair.
- Sessions invalidées au changement de mot de passe, révocation à distance possible.
- Rate limiting sur les routes sensibles (login, register, forgot-password).
- Anti-bot Cloudflare Turnstile sur l'inscription.
- Aucune stack trace ni détail interne exposé au client (`lib/api-response.ts`).
- Headers de sécurité HTTP (CSP, HSTS, X-Frame-Options, etc.) dans `next.config.ts`.
- Scan de secrets (gitleaks) et audit de dépendances en CI.
