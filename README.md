# BookList

Application de suivi de lecture : bibliothèque, statuts (à lire, en cours, terminé,
abandonné), notes et citations, sagas complétées via Wikidata, objectifs et défis,
statistiques et bilan annuel à partager, scan de code-barres, import Goodreads et
StoryGraph, rappels de lecture, installation en PWA. Offre gratuite et abonnement Premium
(Stripe).

Construit sur le socle [`starter-nextjs`](https://github.com/Mts76000/starter-nextjs) :
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · PostgreSQL + Drizzle ORM ·
better-auth · Resend + react-email · Umami · Vitest + Playwright. Tout ce qui vient du socle
(auth, format API, sécurité, tests, CI) reste identique au starter ; ce README ne détaille
que ce que BookList ajoute ou change. Les principes de conception et les dérogations
assumées au starter sont dans [AGENTS.md](./AGENTS.md).

## Lancer le projet en local

Prérequis : Node.js 24 ou plus, Docker.

```bash
npm install
docker compose up -d postgres postgres-test
cp .env.example .env.local && cp .env.test.example .env.test
# éditer .env.local avec vos vraies clés (Google OAuth, Resend, Turnstile...)
npm run db:migrate
npm run db:seed
npm run dev
```

L'application est servie sur [http://localhost:3000](http://localhost:3000). Pour les
comptes créés par le seed, voir [Seed](#seed).

## Variables d'environnement

`lib/env.ts` valide toutes ces variables au démarrage (Zod) et plante immédiatement si une
variable obligatoire manque. `.env.example` les liste dans le même ordre que le starter, les
variables propres à BookList regroupées à la fin.

### Socle (starter)

| Variable                                                  | Où l'obtenir                                                                                                                          |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                            | Postgres local (Docker, voir ci-dessous) ou Coolify en prod                                                                           |
| `BETTER_AUTH_SECRET`                                      | `openssl rand -base64 32`                                                                                                             |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`               | [Google Cloud Console → Identifiants OAuth](https://console.cloud.google.com/apis/credentials)                                        |
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID`                            | Dashboard Umami self-hosted (`stats.mathis-lamotte.fr`, domaine en dur dans `lib/umami.ts`)                                           |
| `RESEND_API_KEY`                                          | [resend.com/api-keys](https://resend.com/api-keys)                                                                                    |
| `CONTACT_EMAIL`                                           | Adresse admin (from + to des notifications)                                                                                           |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | [Cloudflare Dashboard → Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile)                                               |
| `CRON_SECRET`                                             | `openssl rand -hex 32`                                                                                                                |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`     | Optionnel en dev. Requis en prod pour un rate limiting partagé entre instances (sinon fallback mémoire, non fiable en multi-instance) |
| `NEXT_PUBLIC_IS_PREVIEW`                                  | À mettre à `true` uniquement sur l'environnement de préproduction Coolify                                                             |
| `NEXT_PUBLIC_BUYMEACOFFEE_SLUG`                           | Optionnel. Slug de la page buymeacoffee.com                                                                                           |
| `NEXT_PUBLIC_PWA_INSTALL_PROMPT_ENABLED`                  | Optionnel. `true` pour afficher la popup « Installer l'application »                                                                  |

### Spécifiques à BookList

| Variable                                            | Rôle                                                                                                                                |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `GOOGLE_BOOKS_API_KEY`                              | Recherche de livres. Optionnelle en dev, **indispensable en production** : sans clé, le quota anonyme de Google est vite épuisé.    |
| `HARDCOVER_API_TOKEN`                               | Optionnelle. Source supplémentaire de couvertures et de nombres de pages. Jeton personnel Hardcover, à renouveler chaque année.     |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`        | Abonnement Premium (voir [Stripe](#stripe)). Sans elles, les boutons d'abonnement sont désactivés.                                  |
| `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`       | Identifiants des deux prix Stripe (2,99 €/mois et 24 €/an). L'essai de 14 jours est fixé par le code au paiement, pas sur les prix. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Rappels de lecture (notifications push). Paire générée par `npx web-push generate-vapid-keys`. Sans elles, l'option est masquée.    |

### Délivrabilité email (Resend)

Configurer les enregistrements DNS **SPF**, **DKIM** et **DMARC** du domaine d'envoi dans le
dashboard Resend avant la mise en prod, sous peine de finir en spam.

En développement, sans `RESEND_API_KEY` valide, l'envoi échoue sans bloquer et le lien
(vérification email, reset password, changement d'email) est loggé dans la console de
`npm run dev` : copiez-le depuis là pour tester le flow.

## Base de données — dev, test, prod

- **Dev** : Postgres local via Docker (`postgres`, port **5436**).
- **Test** : base **dédiée et séparée** (`postgres-test`, port **5435**), jamais partagée
  avec dev/prod. `tests/setup.ts` refuse de démarrer si `DATABASE_URL` ne contient pas
  « test ».
- **Prod** : Postgres Coolify, URL interne fournie par Coolify (jamais committée).

Les ports sont décalés par rapport au starter (5434/5433) pour ne pas entrer en conflit avec
les autres projets locaux (voir `docker-compose.yml`).

### Scripts

```bash
npm run db:generate   # génère une migration à partir du schéma Drizzle
npm run db:migrate    # applique les migrations
npm run db:push       # push direct du schéma (dev rapide, sans migration versionnée)
npm run db:studio     # explorateur Drizzle Studio
npm run db:seed       # comptes démo + admin (voir ci-dessous)
npm run db:reset      # reset complet (drop + migrate + seed)
```

### Seed

`npm run db:seed` est relançable : chaque compte est supprimé puis recréé, avec des dates
recalculées pour finir aujourd'hui. Mot de passe `test1234` pour tous :

| Compte                     | Contenu                                                                    |
| -------------------------- | -------------------------------------------------------------------------- |
| `demo@booklist.fr`         | Camille, trois ans d'historique, Premium offert un an (toutes les options) |
| `demo-gratuit@booklist.fr` | Lucas, inscrit depuis le début de l'année, compte gratuit                  |
| `admin@booklist.fr`        | Back-office. **Jamais créé en production.**                                |

Les couvertures sont cherchées sur Google Books et Open Library, puis mises en cache dans
`drizzle/demo-covers.json` (versionné) : une relance ne réinterroge les API que pour les
livres encore sans couverture.

En production, les comptes démo se créent depuis le terminal du conteneur dans Coolify, avec
un mot de passe choisi (le script refuse `test1234` en production) :

```bash
SEED_PASSWORD='un-mot-de-passe-solide' node drizzle/seed.mjs
```

L'image n'a ni `tsx` ni les dépendances de dev : le Dockerfile y place le script déjà compilé
(`npm run db:seed:bundle`).

## Tests

```bash
npm run test              # unit (Vitest)
npm run test:coverage     # unit + couverture
npm run test:integration  # intégration, contre la base de test
npm run test:e2e          # e2e (Playwright, NODE_ENV=test donc .env.test)
npm run test:e2e:ui       # e2e en mode UI interactif
```

Avant tout commit ou déploiement :

```bash
npm run check   # format:check → lint → typecheck → test
```

`npm run check` ne lance que les tests unitaires : intégration et Playwright sont à lancer
séparément (la CI les exécute).

En local, Playwright réutilise un serveur déjà démarré sur le port 3000. Si ce serveur tourne
depuis un moment, les limiteurs de débit de l'inscription et de la connexion (compteurs en
mémoire) peuvent être épuisés : les tests échouent alors sur « Trop de tentatives » sans
rapport avec le code. Couper le serveur avant de lancer la suite suffit.

## Déploiement (Coolify)

- **Build pack « Dockerfile »**, pas Nixpacks : le `Dockerfile` produit une image
  `standalone` sur Node 24, alors que Nixpacks retombe sur Node 18, que `package.json`
  n'autorise pas.
- **Ne pas définir `NODE_ENV` dans les variables Coolify.** Next.js le positionne lui-même ;
  le forcer à `development` fait échouer `next build` au prérendu de `/_global-error`
  (`Cannot read properties of null (reading 'useContext')`). Ne pas recopier telle quelle la
  ligne `NODE_ENV` de `.env.example`.
- **Migrations appliquées au démarrage du conteneur** (différence avec le starter, voir le
  `CMD` du `Dockerfile`) : celles déjà appliquées sont ignorées, et une migration en échec
  bloque le démarrage. Une migration doit donc rester compatible avec la version précédente
  du code, qui tourne encore pendant le déploiement (ajouter une colonne plutôt que la
  renommer). Relance manuelle : `node drizzle/migrate.ts` dans le terminal du conteneur.
- `GET /api/health` vérifie l'app et la connexion BDD (utilisé par le `HEALTHCHECK` Docker).
- Aucun fichier `.env` en production : toutes les variables sont injectées par Coolify.

### Tâches planifiées

À créer dans les Scheduled Tasks de Coolify, chacune en `POST` avec l'en-tête
`Authorization: Bearer <CRON_SECRET>` :

| Route                              | Fréquence         | Rôle                                                                                |
| ---------------------------------- | ----------------- | ----------------------------------------------------------------------------------- |
| `/api/cron/cleanup-expired-tokens` | une fois/jour     | Supprime les jetons et sessions expirés (socle).                                    |
| `/api/cron/purge-search-cache`     | une fois/jour     | Purge les recherches Google Books et les correspondances Wikidata expirées.         |
| `/api/cron/reading-reminders`      | chaque soir       | Envoie les rappels de lecture (nécessite les clés VAPID).                           |
| `/api/cron/enrich-library`         | toutes les 10 min | Complète couvertures, pages et résumés manquants des bibliothèques, par lots de 30. |

### Stripe

1. Produit « BookList Premium » avec deux prix récurrents (2,99 €/mois et 24 €/an), dont les
   identifiants vont dans `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_YEARLY`.
2. Webhook vers `<APP_URL>/api/webhooks/stripe`, abonné à `checkout.session.completed` et
   `customer.subscription.created/updated/deleted` ; son secret va dans
   `STRIPE_WEBHOOK_SECRET`.
3. Portail client activé.
4. En production, préférer une clé restreinte (`rk_live_…`) à la clé secrète : elle n'ouvre
   pas les opérations qui font sortir des fonds.

### Mise en production

1. Variables de `.env.example` renseignées dans Coolify (sauf `NODE_ENV`), avec
   `NEXT_PUBLIC_APP_URL` sur le domaine définitif : il sert aux adresses canoniques, au
   sitemap et aux images de partage.
2. Stripe configuré en mode réel (voir ci-dessus).
3. Tâches planifiées créées.
4. Site déclaré dans Google Search Console, avec le sitemap `<APP_URL>/sitemap.xml`.

## Qualité / CI

- ESLint (+ `eslint-plugin-jsx-a11y`) + Prettier + Husky + lint-staged + commitlint (commits
  conventionnels).
- CI GitHub Actions (`.github/workflows/ci.yml`) : lint, typecheck, build, `npm audit`, tests
  unit/intégration/e2e, seuil de couverture, scan de secrets (gitleaks).
- Dependabot pour les mises à jour de dépendances.

### Override esbuild

`package.json` force toutes les dépendances sur `esbuild@0.28.2`. Sans cela, `npm ci` échoue
sur `Expected "0.18.20" but got "0.28.2"` : `drizzle-kit` tire `@esbuild-kit/esm-loader`
(déprécié) qui embarque son propre esbuild, dont le script d'installation vérifie un binaire
natif partagé entre versions. L'erreur n'apparaît qu'à l'installation propre, donc surtout au
build Docker. L'override disparaîtra quand `drizzle-kit` abandonnera `@esbuild-kit`.
