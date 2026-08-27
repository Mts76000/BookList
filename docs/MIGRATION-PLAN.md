# BookList v2 — migration sur le starter Next.js

Portage de BookList (Next.js + NextAuth + Prisma) sur le socle `starter-nextjs`
(better-auth + Drizzle). **Le projet s'adapte à la template, jamais l'inverse** : tout ce
que la template fournit déjà remplace l'implémentation BookList équivalente. Seuls le style
visuel et la logique métier de BookList sont conservés.

Branche : `feat/migration-starter-template` sur le repo `Mts76000/BookList`.
Merge dans `main` uniquement après validation.

## Décisions actées

| Sujet                 | Décision                                                                                                                                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mots de passe         | Hashs bcrypt importés tels quels ; `password.verify` custom dans better-auth détecte `$2a/$2b`, vérifie en bcrypt, puis re-hash en scrypt à la première connexion réussie. Aucun utilisateur ne perd son accès. |
| Migration BDD         | Script ETL vers une base neuve au schéma Drizzle. L'ancienne base reste intacte. Testé sur un dump de prod avant toute exécution réelle.                                                                        |
| Design                | Palette « Carnet de lecture » de BookList conservée, mais câblée sur les noms de tokens de la template. Les composants `components/ui/` héritent du look BookList.                                              |
| Suppression de compte | Anonymisation (comportement BookList) conservée — dérogation explicite à la règle hard delete de la template, documentée dans le `AGENTS.md` du projet.                                                         |
| Briques auth          | Google OAuth **+** vérification email obligatoire **+** Turnstile **+** rate limit Upstash : les quatre activés.                                                                                                |
| Comptes migrés        | `emailVerified = true` pour ne bloquer personne.                                                                                                                                                                |
| PWA                   | Serwist et la page `~offline` de BookList réintégrés dans la template.                                                                                                                                          |
| Admin                 | Périmètre complet : liste/fiche utilisateur, actions de gestion, statistiques globales, consultation de l'audit log.                                                                                            |
| Scope métier          | Tout BookList est porté, rien n'est abandonné.                                                                                                                                                                  |

## Phase 0 — Socle (fait)

- `BookList-v2/` = clone du repo BookList, branche `feat/migration-starter-template`,
  contenu remplacé par la template. Les anciens commits restent dans l'historique.
- Reste à faire dans cette phase : identité du projet (`package.json`, `README.md`,
  `NEXT_PUBLIC_APP_NAME`, `.env.example`, `CLAUDE.md`/`AGENTS.md` projet), ports Postgres de
  la template (5434 dev / 5433 test) pour cohabiter avec BookList v1 sur 5432, `npm install`,
  `npm run check` au vert.

## Phase 1 — Design system

- `app/globals.css` : palette crème/terracotta + Fraunces/Geist de BookList, exposée sous
  les tokens de la template (`--color-primary`, `--color-card`, `--radius-*`…), plus les
  classes utilitaires `.btn-primary`, `.card`, `.input-field`, `.badge`, `.glass`,
  `.noise-overlay`.
- Adaptation des composants `components/ui/` fournis (button, field, toast, skeleton,
  pagination, google-button, turnstile-widget) au rendu BookList.
- `app/layout.tsx` : polices, métadonnées, JSON-LD et manifest de BookList.

## Phase 2 — Schéma Drizzle

- `drizzle/schema/books.ts` : `book`, `comment`, `reading_activity`, `reading_session`,
  enum `book_status` (`TO_READ | READING | FINISHED`), avec les index et contraintes
  d'unicité équivalents à Prisma (`unique(userId, isbn)`, `unique(userId, date)`…).
- Champs métier ajoutés à `user` : `initialBooksRead`, `hasSeenOnboarding`,
  `isAnonymized`, `anonymizedAt`, exposés via `additionalFields` de better-auth.
- Génération de la migration, `db:push` local, port du seed `prisma/seed.ts` vers
  `drizzle/seed.ts` (même compte de démo, mêmes données de démonstration).

## Phase 3 — Auth

- `lib/auth.ts` : vérificateur bcrypt custom, Google OAuth, vérification email, Turnstile.
- `proxy.ts` : préfixes protégés `/dashboard`, `/books`, `/profile`, `/admin`.
- Écrans auth de BookList portés sur les routes de la template (`/login`, `/register`,
  `/forgot-password`, `/reset-password`, `/verify-email`), avec redirections permanentes
  depuis les anciennes URLs `/auth/*` pour ne casser aucun lien existant.
- Suppression de compte : anonymisation, en transaction, tracée dans l'audit log.

## Phase 4 — API métier au format template

Toutes les routes réécrites avec `apiSuccess` / `apiError` / `withApiErrorHandling`,
`requireAuth()`, `validateBody()` (Zod) et le rate limiting de la template :
`/api/books`, `/api/books/[id]`, `/api/books/[id]/comments`, `/api/books/search`,
`/api/books/import`, `/api/reading-activity`, `/api/user/profile`, `/api/user/onboarding`,
`/api/user/account`. Les validations maison de `src/lib/validation.ts` deviennent des
schémas Zod. Les appels `fetch` côté client sont adaptés à la nouvelle enveloppe de réponse.

## Phase 5 — Pages et composants métier

- Pages : accueil, `dashboard`, `books`, `books/[id]`, `books/add`, `books/import`,
  `profile`, `install`, `~offline`.
- Composants : `BarcodeScanner`, `BookCover`, `BookDetails`, `BooksFilter`,
  `ContributionGraph`, `AddReadingActivity`, `Onboarding`, `Navigation`, `ProfileView`,
  `CookieConsent`.
- Pages légales : les quatre pages françaises de BookList (mentions légales, confidentialité,
  conditions, cookies) remplacent les trois pages génériques de la template.
- Serwist réintégré (`next.config.ts`, `app/sw.ts`, route `serwist/[path]`).

## Phase 6 — Back-office admin

- `app/admin/` protégé par `requireRole("admin")` côté serveur (le middleware ne fait que la
  vérification optimiste de cookie).
- Tableau de bord : nombre d'utilisateurs, inscriptions récentes, total de livres, livres
  ajoutés sur 30 jours, utilisateurs actifs.
- Liste paginée et recherche d'utilisateurs (composant `<Pagination />` de la template),
  fiche détaillée par utilisateur.
- Actions : promouvoir/rétrograder admin, révoquer les sessions, anonymiser un compte.
  Chaque action passe par `logAuditEvent()`. Garde-fou : un admin ne peut ni se retirer son
  propre rôle ni supprimer son propre compte depuis l'admin.
- Écran de consultation de l'audit log, filtrable par utilisateur et par action.

## Phase 7 — Migration des données

- Script `drizzle/migrate-from-booklist-v1.ts` : lit l'ancienne base (`LEGACY_DATABASE_URL`),
  écrit dans la nouvelle en transaction, idempotent, et produit un rapport de comptage
  avant/après par table.
- Mapping : `User` → `user` + `account` (provider `credential`, hash bcrypt conservé),
  `emailVerified = true`, `role = "user"` sauf `contact@mathis-lamotte.fr` promu `admin` ;
  `Book`, `Comment`, `ReadingActivity`, `ReadingSession` repris à l'identique, identifiants
  cuid conservés pour ne casser aucune URL.
- Les comptes déjà anonymisés (`isAnonymized = true`) sont migrés tels quels.
- **Prérequis : un dump `pg_dump` de la prod fourni par Mathis.** Rapport de migration
  présenté avant toute exécution en production.

## Phase 8 — Tests, sécurité, documentation

- Tests unitaires BookList portés (`csv`, `genres`, validation) + nouveaux tests sur le
  mapping ETL et les permissions admin.
- Tests d'intégration sur les routes livres et admin, parcours e2e Playwright.
- `next.config.ts` : la CSP de BookList (Google Books, ZXing, Turnstile, Umami) fusionnée
  avec la configuration de la template.
- `README.md`, `AGENTS.md` projet, `CHANGELOG.md` mis à jour.

## Phase 9 — Bascule

`npm run check` + build + revue visuelle dans le navigateur, puis merge dans `main` après
validation, et exécution de l'ETL contre la prod.
