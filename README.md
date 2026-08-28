# BookList

Application personnelle de suivi de lecture : bibliothèque, statuts (à lire / en cours /
terminé), notes et commentaires, statistiques de lecture, scan de code-barres, import CSV
et installation en PWA.

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

| Variable               | Description                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| `GOOGLE_BOOKS_API_KEY` | Optionnelle — augmente le quota de l'API Google Books utilisée par la recherche de livres. |

## Base de données

Le schéma vit dans `drizzle/schema/`, les migrations dans `drizzle/migrations/`.

```bash
npm run db:generate   # génère une migration à partir du schéma
npm run db:migrate    # applique les migrations
npm run db:push       # pousse le schéma sans migration (dev uniquement)
npm run db:studio     # explorateur de données
npm run db:seed       # données de démonstration
npm run db:reset      # remise à zéro complète
```

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
projet produit une image `standalone` sur Node 22 ; Nixpacks, lui, retombe sur Node 18, que
`package.json` n'autorise pas.

**Ne pas définir `NODE_ENV` dans les variables de la plateforme.** Next.js le positionne
lui-même. Le forcer à `development` fait échouer `next build` au prérendu de
`/_global-error`, sur une erreur `Cannot read properties of null (reading 'useContext')` qui
ne dit rien de sa cause réelle.

Le Dockerfile résiste néanmoins à un `NODE_ENV=production` injecté par la plateforme : son
`npm ci --include=dev` force l'installation des devDependencies, sans lesquelles TypeScript
et Tailwind manqueraient au build, et le script `prepare` tolère l'absence de husky.
