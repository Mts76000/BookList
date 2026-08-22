# BookList

Application de suivi de lecture personnelle : bibliothèque, statuts (à lire / en cours / terminé), notes, statistiques de lecture, scan de code-barres et installation en PWA.

Stack : Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 · Prisma 7 (PostgreSQL) · NextAuth · Serwist (PWA).

## Prérequis

- Node.js `^20.19.0`, `^22.12.0` ou `>=24.0.0` (voir `engines` dans `package.json`)
- Docker (pour la base PostgreSQL locale), ou un PostgreSQL déjà accessible

## Installation

```bash
npm install
```

`npm install` déclenche automatiquement `prisma generate` (hook `postinstall`).

## Configuration

Copiez le fichier d'exemple puis complétez-le :

```bash
cp .env.example .env.local
```

Variables principales (`.env.local`) :

| Variable | Description |
|---|---|
| `DATABASE_URL` | URL de connexion PostgreSQL |
| `NEXTAUTH_SECRET` | Clé de session — générez-la avec `openssl rand -base64 32` |
| `NEXTAUTH_URL` | URL de l'app (`http://localhost:3000` en local) |
| `GOOGLE_BOOKS_API_KEY` | Optionnel — évite les erreurs 429 de l'API Google Books lors de la recherche de livres |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Optionnel — envoi d'email pour la réinitialisation de mot de passe |

## Base de données

### Démarrer PostgreSQL en local (Docker)

```bash
docker compose up -d
```

Cela lance un PostgreSQL sur `localhost:5432` avec les identifiants déjà présents dans `.env.example` (`booklist` / `booklist_password`).

### Appliquer les migrations

```bash
npx prisma migrate dev
```

### Créer un utilisateur de test avec des données fake (seed)

```bash
npm run seed
```

Ce script (`prisma/seed.ts`) crée :
- un utilisateur de test — **email : `test@booklist.fr`**, **mot de passe : `test1234`**
- une quinzaine de livres (terminés, en cours, à lire) avec couvertures, notes, dates de lecture, genres
- ~60 jours d'activité de lecture aléatoire (pour peupler le graphe de contribution)
- quelques commentaires/notes personnelles sur des livres

Le script est idempotent (`upsert`) : vous pouvez le relancer sans dupliquer les données.

### Autres commandes Prisma utiles

```bash
npx prisma studio          # explorateur de données dans le navigateur
npx prisma migrate reset   # reset complet de la base + migrations + seed
npx prisma generate        # régénère le client Prisma après une modif du schema
```

## Développement

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000). Connectez-vous avec le compte de seed (`test@booklist.fr` / `test1234`) ou créez un compte via `/auth/signup`.

## Qualité / build

```bash
npm run lint     # ESLint
npm test         # Vitest
npm run build    # build de production (inclut le typecheck)
npm run start    # sert le build de production
```

## Structure du projet

```
src/app/            Pages et routes (App Router) : dashboard, books, profile, auth, api/...
src/components/      Composants React partagés
src/lib/             Utilitaires (auth, prisma, ...)
prisma/schema.prisma Schéma de données
prisma/seed.ts       Script de seed (données de démo)
```

## Déploiement

Le projet est prévu pour être déployé avec les variables d'environnement injectées directement (pas de fichier `.env` en production, cf. `prisma.config.ts`). Toute plateforme supportant Next.js + PostgreSQL convient (Vercel + base managée, Coolify, etc.).
