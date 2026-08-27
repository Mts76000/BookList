<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# BookList — application de suivi de lecture

BookList est une application personnelle de suivi de lecture : bibliothèque, statuts
(à lire / en cours / terminé), notes et commentaires, statistiques, scan de code-barres,
import CSV, et installation en PWA.

Ce dépôt est **construit sur le starter `Mts76000/starter-nextjs`**. Tout ce qui vient du
starter (auth, format de réponse API, validation, sécurité, tests, CI, composants UI) doit
rester identique au starter : c'est BookList qui s'adapte au socle, jamais l'inverse. Ne
décris et n'implémente ici que les **fonctionnalités métier** de BookList et les dérogations
listées plus bas.

Le plan de migration depuis BookList v1 (NextAuth + Prisma) est suivi dans
`docs/MIGRATION-PLAN.md`.

## Dérogations assumées au starter

Ces trois écarts sont volontaires et ne doivent pas être « corrigés » vers le défaut du
starter sans validation explicite :

1. **Suppression de compte par anonymisation, et non hard delete.** BookList remplace
   l'email par `deleted-<id>@anonymized.booklist`, efface nom et données métier, et conserve
   la ligne `user` avec `isAnonymized`/`anonymizedAt`. Comportement hérité de la v1 et
   conservé pour ne pas casser les comptes déjà supprimés lors de la migration.
2. **Vérification bcrypt en plus de scrypt.** Les mots de passe de la v1 sont des hashs
   bcrypt. `lib/auth.ts` branche un `password.verify` custom qui détecte le préfixe
   `$2a$`/`$2b$`, vérifie en bcrypt, puis re-hash en scrypt à la première connexion réussie.
   À supprimer seulement quand plus aucun hash bcrypt ne subsiste en base.
3. **Serwist plutôt que le service worker minimal du starter.** BookList a besoin d'un vrai
   cache hors-ligne et d'une page `~offline`.

**Pas de redirections depuis les URLs de la v1.** Quand le socle fournit déjà une page pour
un contenu, on écrit ce contenu dans la page du socle et l'ancienne URL disparaît, sans bloc
`redirects()` : `/mentions-legales` devient `app/legal/notice`, `/auth/signin` devient
`/login`, `/profile` devient `/account`. La rupture d'URL est assumée.

Autres adaptations projet : `lib/umami.ts` pointe sur l'instance self-hosted
`stats.mathis-lamotte.fr`, et `lib/env.ts` ajoute `GOOGLE_BOOKS_API_KEY` (optionnelle) pour
la recherche de livres.

## Stack imposée (et pourquoi)

- **Next.js App Router + TypeScript strict** — architecture standard, types partout.
- **Tailwind CSS seul, jamais de lib de composants** (pas de shadcn/ui, pas de Radix). Réutilise
  les tokens (`app/globals.css`) et les composants existants dans `components/ui/` avant d'en
  créer de nouveaux.
- **PostgreSQL + Drizzle ORM** — schéma dans `drizzle/schema/`, migrations dans
  `drizzle/migrations/`.
- **better-auth** — email/password + Google OAuth, vérification email obligatoire. Voir
  `lib/auth.ts`.
- **Umami (self-hosted)** — analytics respectueux de la vie privée, actif en prod uniquement.
- **Resend + react-email** — email transactionnel, jamais bloquant en cas d'échec.
- **Vitest + Playwright** — unit/intégration/e2e.
- **Cloudflare Turnstile** — anti-bot sur l'inscription.
- **pino** — logging structuré. **date-fns** — dates.

## Format de réponse API (obligatoire sur toute nouvelle route)

Succès : `{ success: true, data, message? }` via `apiSuccess()` (`lib/api-response.ts`).
Erreur : `{ success: false, error: { code, message, details? } }` via `apiError()`.
Codes : `VALIDATION_ERROR | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | CONFLICT | RATE_LIMITED |
INTERNAL_ERROR`. Jamais de stack trace ni de détail interne exposé au client — toute route
doit être enveloppée par `withApiErrorHandling()`.

- Validation de body : `validateBody(schema, request)` (Zod) — `lib/validation.ts`.
- Pagination : `parsePaginationParams()` / `toPaginated()` — `lib/pagination.ts` +
  `<Pagination />` dans `components/ui/`.
- Opérations à écritures multiples et dépendantes : utiliser `db.transaction(async (tx) => {...})`
  (Drizzle natif, voir l'inscription dans `lib/auth.ts`/`app/api/register/route.ts` comme
  référence) — jamais de laisser une opération partiellement appliquée.
- **Soft delete vs hard delete : jamais un défaut automatique.** Chaque nouvelle entité doit
  trancher explicitement. Les tables techniques (sessions, tokens, rate limits, logs, audit
  logs, tables de liaison) sont toujours en suppression physique. Le compte utilisateur
  (`app/api/account/route.ts`) est en **hard delete** dans ce starter par défaut (voir le
  commentaire dans ce fichier) — ne pas ajouter de `deletedAt` sans un vrai besoin justifié.
- Audit log générique et réutilisable : `logAuditEvent()` (`lib/audit-log.ts`), déjà branché
  sur le changement de mot de passe et la suppression de compte — à réutiliser pour toute
  future action sensible.
- Storage : interface `StorageProvider` (`lib/storage.ts`), implémentation locale en dev
  uniquement. Ne jamais faire confiance au nom/MIME envoyé par le client (validation via
  sniffing réel du contenu).

## Autorisation

**Toute vérification d'accès dans une route ou une page passe par `requireAuth()` /
`requireRole(role)`** (`lib/permissions.ts`), jamais de vérification de session ou de rôle
dispersée ad hoc. `proxy.ts` (middleware) ne fait qu'une vérification optimiste (présence du
cookie) pour la redirection ; c'est `requireAuth()` côté serveur qui est la vérification
autoritaire (voir `app/account/page.tsx` : Server Component qui appelle `requireAuth()` avant
de rendre le composant client interactif — pattern à reproduire pour toute nouvelle page
protégée).

## Variables d'environnement

`lib/env.ts` valide `process.env` via Zod au démarrage et plante si une variable obligatoire
manque. Toute clé/secret passe par une variable d'env, jamais en dur dans le code. `.env.test`
est dédié aux tests (voir section BDD ci-dessous) ; `SCREAMING_SNAKE_CASE`, préfixe
`NEXT_PUBLIC_` réservé aux variables exposables au client. **Ne jamais importer `lib/env.ts`
dans un composant client** (`"use client"`) : il valide des secrets serveur via `process.env`
au chargement du module, ce qui casse au bundling client. Utiliser
`process.env.NEXT_PUBLIC_*` directement dans ce cas (voir `lib/auth-client.ts`).

## Base de données — dev/test/prod

- **Dev** : Postgres via `docker-compose.yml` (service `postgres`, port 5436 en local pour
  éviter les conflits avec BookList v1 et les autres projets), `DATABASE_URL` dans `.env.local`.
- **Test** : service Postgres séparé (`postgres-test`, port 5435), `DATABASE_URL` dans
  `.env.test`, jamais partagé avec dev/prod.
- **Prod** : Postgres Coolify, URL interne fournie par Coolify, jamais committée.
- Garde-fou anti-prod : `lib/db-safety.ts` (`assertTestDatabase`) refuse de lancer les tests
  si `DATABASE_URL` ne contient pas "test" — appelé dans `tests/setup.ts`.
- `npm run db:generate/migrate/push/studio/seed/reset` — voir README pour le détail.

## Back-office admin

Contrairement au starter (qui n'en génère jamais par défaut), BookList **a** un back-office
sous `app/admin/`, protégé par `requireRole("admin")` côté serveur. Il couvre : statistiques
globales, liste paginée et recherche d'utilisateurs, fiche utilisateur, actions de gestion
(rôle, révocation de sessions, anonymisation d'un compte) et consultation de l'audit log.

Toute action admin qui modifie un compte passe obligatoirement par `logAuditEvent()`. Un
admin ne peut ni se retirer son propre rôle, ni supprimer son propre compte depuis l'admin.

## Structure de dossiers

`app/`, `components/ui/` (toasts, skeleton, pagination, boutons/champs), `lib/` (helpers
génériques), `drizzle/` (schema + migrations), `emails/` (templates react-email), `tests/`
(`unit/`, `integration/`, `e2e/`).

## Principes de conception et prise de décision

- Privilégier la simplicité, la maintenabilité et la lisibilité plutôt que la
  sur-ingénierie.
- Ne pas ajouter une abstraction avant qu'elle soit réellement nécessaire.
- Ne pas ajouter de dépendance sans raison ; toute nouvelle dépendance doit être justifiée,
  et il faut préférer une dépendance déjà présente ou une solution native à un nouveau
  package pour une fonctionnalité triviale.
- Préférer des dépendances activement maintenues, largement utilisées et compatibles avec la
  stack existante.
- Réutiliser les patterns et helpers existants avant d'en créer de nouveaux.
- Toute nouvelle route API respecte automatiquement le format de réponse, la validation, la
  gestion d'erreurs et l'authentification du starter.
- Toute nouvelle entité définit explicitement : propriétaire des données, stratégie de
  suppression (soft/hard), index nécessaires, contraintes d'unicité, règles d'autorisation.
- Les opérations critiques impliquant plusieurs écritures utilisent une transaction.
- Ne jamais exposer d'informations internes, stack traces ou secrets au client.
- Préférer les Server Components et Server Actions ; Client Components uniquement si une
  interactivité navigateur est nécessaire.
- Avant de créer un nouveau composant ou helper, vérifier si un équivalent existe déjà.
- Ne pas créer de fonctionnalités métier fictives pour démontrer le starter.
- En cas d'ambiguïté, privilégier une solution simple et cohérente avec la stack existante
  plutôt qu'une nouvelle technologie.
- Si une future fonctionnalité nécessite plusieurs utilisateurs partageant des données
  (multi-tenant/B2B), utiliser un modèle Organisation/Membership plutôt que de multiplier les
  `userId` sans stratégie commune — mais ne rien implémenter de ce système par défaut.

## Convention de commits

Commits conventionnels (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, ...),
vérifiés par commitlint (`.husky/commit-msg`). `npm run check` (format:check → lint →
typecheck → test) doit passer avant tout commit ou déploiement.

**Jamais de ligne `Co-Authored-By` (ou équivalent) mentionnant un assistant IA dans les
messages de commit sur ce repo.**

## Front / UI

Pour tout travail front/UI, utiliser systématiquement les skills `taste-skill` et
`ui-ux-pro-max-skill` s'ils sont installés dans l'environnement (sinon le signaler avant de
continuer). Toujours tester le résultat dans un navigateur (`npm run dev`) avant de considérer
une tâche UI terminée.
