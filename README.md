# BookList

Application de suivi de lecture : bibliothèque, statuts (à lire, en cours, terminé,
abandonné), notes et citations, sagas complétées via Wikidata, objectifs et défis,
statistiques et bilan annuel à partager, scan de code-barres, import Goodreads et
StoryGraph, rappels de lecture, installation en PWA. Offre gratuite et abonnement Premium
(Stripe).

Cette version est construite sur le socle [`starter-nextjs`](https://github.com/Mts76000/starter-nextjs) :
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · PostgreSQL + Drizzle ORM ·
better-auth · Resend + react-email · Umami · Vitest + Playwright.

## Prérequis

- Node.js `^20.19.0`, `^22.12.0` ou `>=24.0.0`
- Docker (PostgreSQL local)

## Installation

```bash
npm install
cp .env.example .env.local   # puis complétez les valeurs
docker compose up -d          # Postgres dev (5436) + test (5435)
npm run db:migrate
npm run db:seed               # données de démonstration
npm run dev
```

L'application est servie sur [http://localhost:3000](http://localhost:3000).

## Variables d'environnement

`lib/env.ts` valide l'environnement au démarrage : une variable obligatoire manquante fait
échouer le boot immédiatement. Toutes les clés sont documentées dans `.env.example`. Les
variables propres à BookList, en plus de celles du socle :

| Variable                                            | Description                                                                                                                         |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `GOOGLE_BOOKS_API_KEY`                              | Recherche de livres. Optionnelle en dev, **indispensable en production** : sans clé, le quota anonyme de Google est vite épuisé.    |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`        | Abonnement Premium. Sans elles, les boutons d'abonnement affichent « Bientôt disponible ».                                          |
| `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`       | Identifiants des deux prix Stripe (2,99 €/mois et 24 €/an). L'essai de 14 jours est fixé par le code au paiement, pas sur les prix. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Rappels de lecture (notifications push). Paire générée par `npx web-push generate-vapid-keys`.                                      |

## Base de données

Le schéma vit dans `drizzle/schema/`, les migrations dans `drizzle/migrations/`.

```bash
npm run db:generate   # génère une migration à partir du schéma
npm run db:migrate    # applique les migrations
npm run db:push       # pousse le schéma sans migration (dev uniquement)
npm run db:studio     # explorateur de données
npm run db:seed       # données de démonstration
npm run db:seed:demo  # comptes démo : demo@booklist.fr (Premium) et demo-gratuit@booklist.fr
npm run db:reset      # remise à zéro complète
```

Les comptes démo (`npm run db:seed:demo`, mot de passe `test1234`) servent en dev et pour
les captures. Ne pas les créer en production, ou en changer le mot de passe aussitôt.

La base de test (`postgres-test`, port 5435) est séparée de la base de dev : `tests/setup.ts`
refuse de démarrer si `DATABASE_URL` ne contient pas « test ».

## Note sur l'override esbuild

`package.json` force toutes les dépendances sur `esbuild@0.28.2`. Sans cela, `npm ci` échoue
sur `Expected "0.18.20" but got "0.28.2"` : `drizzle-kit` tire `@esbuild-kit/esm-loader`
(déprécié, fusionné dans `tsx`) qui embarque son propre esbuild, dont le script
d'installation vérifie le binaire natif. Or les paquets de binaires (`@esbuild/linux-x64`…)
sont partagés entre les versions, et la vérification échoue.

L'erreur ne se manifeste qu'à l'installation propre — `npm install` incrémental y échappe —
et donc surtout au build Docker. Cet override disparaîtra le jour où `drizzle-kit`
abandonnera `@esbuild-kit`.

## Qualité

```bash
npm run check             # format:check → lint → typecheck → test
npm run test              # tests unitaires
npm run test:integration  # tests d'intégration (base de test requise)
npm run test:e2e          # parcours Playwright
```

`npm run check` doit passer avant tout commit ou déploiement. Attention : il ne lance que les
tests unitaires — les tests d'intégration et Playwright sont à lancer séparément, et la CI,
elle, les exécute.

En local, Playwright réutilise un serveur déjà démarré sur le port 3000
(`reuseExistingServer`). Si ce serveur tourne depuis un moment, les limiteurs de débit de
l'inscription et de la connexion, qui gardent leur compteur en mémoire, peuvent avoir été
épuisés par les essais précédents : les tests échouent alors sur un « Trop de tentatives »
sans rapport avec le code. Couper le serveur avant de lancer la suite suffit à repartir
d'un compteur vide.

## Déploiement

Déploiement Coolify avec les variables d'environnement injectées par la plateforme (aucun
fichier `.env` en production).

**Le build pack doit être réglé sur « Dockerfile »**, pas sur Nixpacks. Le `Dockerfile` du
projet produit une image `standalone` sur Node 24 ; Nixpacks, lui, retombe sur Node 18, que
`package.json` n'autorise pas.

**Ne pas définir `NODE_ENV` dans les variables de la plateforme.** Next.js le positionne
lui-même. Le forcer à `development` fait échouer `next build` au prérendu de
`/_global-error`, sur une erreur `Cannot read properties of null (reading 'useContext')` qui
ne dit rien de sa cause réelle.

Le Dockerfile résiste néanmoins à un `NODE_ENV=production` injecté par la plateforme : son
`npm ci --include=dev` force l'installation des devDependencies, sans lesquelles TypeScript
et Tailwind manqueraient au build, et le script `prepare` tolère l'absence de husky.

### Tâches planifiées

À créer dans les Scheduled Tasks de Coolify, chacune en `POST` avec l'en-tête
`Authorization: Bearer <CRON_SECRET>` :

| Route                              | Fréquence     | Rôle                                                                        |
| ---------------------------------- | ------------- | --------------------------------------------------------------------------- |
| `/api/cron/cleanup-expired-tokens` | une fois/jour | Supprime les jetons et sessions expirés.                                    |
| `/api/cron/purge-search-cache`     | une fois/jour | Purge les recherches Google Books et les correspondances Wikidata expirées. |
| `/api/cron/reading-reminders`      | chaque soir   | Envoie les rappels de lecture (nécessite les clés VAPID).                   |

### Mise en production

1. Variables d'environnement de `.env.example` renseignées dans Coolify, avec
   `NEXT_PUBLIC_APP_URL` sur le domaine définitif : il sert aux adresses canoniques, au
   sitemap et aux images de partage.
2. Migrations : rien à faire. Le conteneur les applique à chaque démarrage, avant de lancer
   l'application (voir le `CMD` du `Dockerfile`) ; celles déjà appliquées sont ignorées, et
   une migration en échec bloque le démarrage au lieu de servir une base à moitié migrée. Une
   migration doit donc rester compatible avec la version précédente du code, qui tourne
   encore le temps du déploiement (ajouter une colonne plutôt que la renommer). Pour la
   relancer à la main : `node drizzle/migrate.ts` dans le terminal du conteneur.
3. Stripe en mode réel : produit, deux prix, portail client et webhook vers
   `<APP_URL>/api/webhooks/stripe` (événements `checkout.session.completed` et
   `customer.subscription.created/updated/deleted`).
4. Tâches planifiées ci-dessus créées.
5. Site déclaré dans Google Search Console, avec le sitemap `<APP_URL>/sitemap.xml`.
