# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), et ce projet suit le
[versionnement sémantique](https://semver.org/lang/fr/). Alimenté à partir des
[commits conventionnels](https://www.conventionalcommits.org/fr/).

## [Unreleased]

### Added

- **BookList v2** : portage de l'application de suivi de lecture sur le socle
  `starter-nextjs`. Bibliothèque et statuts de lecture, scan de code-barres ISBN, recherche
  Google Books, import CSV, notes personnelles, graphe d'activité de lecture, statistiques,
  accueil des nouveaux utilisateurs et PWA installable avec cache hors ligne.
- Back-office d'administration (`/admin`) : vue d'ensemble chiffrée, liste et fiche
  utilisateur, changement de rôle, révocation de sessions, suppression de compte et
  consultation du journal d'audit. Invisible (404) pour un non-administrateur.
- Offre Premium via Stripe (2,99 €/mois ou 24 €/an, essai de 14 jours) : bibliothèque au-delà
  de 50 livres ajoutés, sagas complétées, pile à lire triée selon les goûts, statistiques
  avancées, défis, jokers de série, recherche et images de citations, styles de bilan.
  Administration des abonnements, paiements, remboursements et codes promo.
- Sagas : création et modification en un écran, sagas repérées dans la bibliothèque, tomes
  manquants trouvés sur Wikidata et ajoutés dans la collection des tomes possédés.
- Objectif annuel, bilan annuel à partager, défis et badges, citations, progression par
  livre, statut Abandonné, formats et étagères, rappels de lecture (notifications push).
- Import Goodreads et StoryGraph complet, export CSV réimportable.
- Catalogue partagé devant Google Books, couvertures optimisées et mises en cache,
  couverture générée pour les livres sans image.
- Pages publiques `/tarifs` et `/alternative-goodreads`, données structurées (site, offres,
  FAQ), sitemap et robots complétés.
- Nouveau logo (l'étagère) pour l'application, le favicon, les icônes et les images de
  partage.

### Changed

- Image Docker de production sur Node 22 (LTS), comme la CI, au lieu de Node 25.
- Compte gratuit : toutes ses données restent visibles (sagas, statistiques de base,
  citations sans limite) ; Premium apporte les fonctions avancées.

- Authentification : NextAuth remplacé par better-auth, avec vérification des mots de passe
  bcrypt hérités de la v1 et bascule automatique vers scrypt à la première connexion.
- Base de données : Prisma remplacé par Drizzle. `ReadingActivity.date` devient une date
  civile au lieu d'un timestamp ramené à minuit dans le fuseau du serveur.
- Le profil utilisateur rejoint la page `/account`, seule page de réglages du produit.
- Toutes les routes API adoptent le format de réponse, la validation Zod et
  `requireAuth()` du socle.
- La suppression de compte reste une anonymisation, contrairement au hard delete du socle
  (dérogation documentée dans `AGENTS.md`).

### Removed

- Page `/install` : l'installation de la PWA se fait depuis `/account`.
- Table `ReadingSession`, que la v1 n'écrivait ni ne lisait nulle part.
- Dépendance `motion` : les micro-interactions sont en CSS.

- Socle initial : auth (better-auth, email/password + Google OAuth, vérification email,
  sessions actives), format API standardisé, transactions, audit log générique, storage
  provider abstrait, RGPD (export/suppression), analytics Umami, email transactionnel Resend,
  anti-bot Turnstile, sécurité HTTP, SEO/PWA, tests, CI.
