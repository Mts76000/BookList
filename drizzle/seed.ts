import { config } from "dotenv";
config({ path: process.env.NODE_ENV === "test" ? ".env.test" : ".env.local", quiet: true });

import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { createLocalAccountIssuer } from "better-auth/db";
import * as schema from "./schema";

const SEED_EMAIL = "test@booklist.fr";
const SEED_PASSWORD = "test1234";
const ADMIN_EMAIL = "admin@booklist.fr";

// Annoté explicitement pour que `status` soit vu comme la valeur d'enum et non comme string.
const books: Omit<typeof schema.book.$inferInsert, "userId">[] = [
  {
    title: "Le Petit Prince",
    author: "Antoine de Saint-Exupéry",
    isbn: "9782070612758",
    description:
      "Un pilote d'avion, en panne dans le désert du Sahara, rencontre un petit garçon venu d'une autre planète. Une histoire poétique et philosophique sous forme de conte pour enfants.",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9782070612758-L.jpg",
    pageCount: 96,
    genre: "Conte, Philosophie",
    publishedDate: "1943",
    userRating: 5,
    userStartDate: new Date("2024-01-05"),
    userEndDate: new Date("2024-01-06"),
    status: "FINISHED",
  },
  {
    title: "L'Étranger",
    author: "Albert Camus",
    isbn: "9782070360024",
    description:
      "Meursault, un jeune homme indifférent, commet un meurtre absurde sur une plage d'Alger. Le récit de son procès et de sa condamnation met en lumière l'absurdité de la condition humaine.",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9782070360024-L.jpg",
    pageCount: 186,
    genre: "Roman, Philosophie",
    publishedDate: "1942",
    userRating: 4,
    userStartDate: new Date("2024-02-10"),
    userEndDate: new Date("2024-02-14"),
    status: "FINISHED",
  },
  {
    title: "Dune",
    author: "Frank Herbert",
    isbn: "9782266320481",
    description:
      "Sur la planète désertique Arrakis, le jeune Paul Atréides est pris dans un jeu politique mortel pour le contrôle de l'épice, la substance la plus précieuse de l'univers.",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9782266320481-L.jpg",
    pageCount: 896,
    genre: "Science-Fiction",
    publishedDate: "1965",
    userRating: 5,
    userStartDate: new Date("2024-03-01"),
    userEndDate: new Date("2024-03-20"),
    status: "FINISHED",
  },
  {
    title: "1984",
    author: "George Orwell",
    isbn: "9782070368228",
    description:
      "Dans un monde totalitaire, Winston Smith tente de résister au Parti et à Big Brother. Un roman visionnaire sur la surveillance et la manipulation de la vérité.",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9782070368228-L.jpg",
    pageCount: 438,
    genre: "Dystopie, Science-Fiction",
    publishedDate: "1949",
    userRating: 5,
    userStartDate: new Date("2024-04-12"),
    userEndDate: new Date("2024-04-22"),
    status: "FINISHED",
  },
  {
    title: "Harry Potter à l'école des sorciers",
    author: "J.K. Rowling",
    isbn: "9782070584628",
    description:
      "Le jour de ses onze ans, Harry Potter découvre qu'il est sorcier. Il entre à Poudlard et plonge dans un monde de magie, d'amitié et de dangers.",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9782070584628-L.jpg",
    pageCount: 320,
    genre: "Fantasy, Jeunesse",
    publishedDate: "1997",
    userRating: 4,
    userStartDate: new Date("2024-05-01"),
    userEndDate: new Date("2024-05-08"),
    status: "FINISHED",
  },
  {
    title: "Les Misérables",
    author: "Victor Hugo",
    isbn: "9782253096344",
    description:
      "L'épopée de Jean Valjean, ancien bagnard en quête de rédemption dans la France du XIXe siècle. Une fresque sociale majeure sur la justice, l'amour et la liberté.",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9782253096344-L.jpg",
    pageCount: 1664,
    genre: "Roman historique",
    publishedDate: "1862",
    userRating: 5,
    userStartDate: new Date("2024-06-01"),
    userEndDate: new Date("2024-07-15"),
    status: "FINISHED",
  },
  {
    title: "Sapiens : Une brève histoire de l'humanité",
    author: "Yuval Noah Harari",
    isbn: "9782226257017",
    description:
      "De la révolution cognitive à la révolution biotechnologique, l'histoire de notre espèce comme vous ne l'avez jamais lue.",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9782226257017-L.jpg",
    pageCount: 512,
    genre: "Essai, Histoire",
    publishedDate: "2015",
    userRating: 4,
    userStartDate: new Date("2024-08-05"),
    userEndDate: new Date("2024-08-25"),
    status: "FINISHED",
  },
  {
    title: "Le Seigneur des Anneaux",
    author: "J.R.R. Tolkien",
    isbn: "9782267046892",
    description:
      "Frodon le hobbit doit détruire l'Anneau Unique dans les flammes de la Montagne du Destin pour sauver la Terre du Milieu des ténèbres de Sauron.",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9782267046892-L.jpg",
    pageCount: 1216,
    genre: "Fantasy",
    publishedDate: "1954",
    userRating: 5,
    userStartDate: new Date("2024-09-01"),
    userEndDate: new Date("2024-10-10"),
    status: "FINISHED",
  },
  {
    title: "Projet Hail Mary",
    author: "Andy Weir",
    isbn: "9782820543271",
    description:
      "Ryland Grace se réveille seul sur un vaisseau spatial, sans souvenir de sa mission. Il doit sauver l'humanité d'une extinction imminente.",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9782820543271-L.jpg",
    pageCount: 480,
    genre: "Science-Fiction",
    publishedDate: "2021",
    userRating: 5,
    userStartDate: new Date("2024-11-01"),
    userEndDate: new Date("2024-11-12"),
    status: "FINISHED",
  },
  {
    title: "Fahrenheit 451",
    author: "Ray Bradbury",
    isbn: "9782072534065",
    description:
      "Dans une société où les livres sont interdits et brûlés, le pompier Guy Montag commence à remettre en question sa mission.",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9782072534065-L.jpg",
    pageCount: 224,
    genre: "Dystopie, Science-Fiction",
    publishedDate: "1953",
    userRating: 4,
    userStartDate: new Date("2024-12-01"),
    userEndDate: new Date("2024-12-05"),
    status: "FINISHED",
  },
  // Books in progress
  {
    title: "Fondation",
    author: "Isaac Asimov",
    isbn: "9782070360536",
    description:
      "Hari Seldon prédit la chute de l'Empire Galactique. Pour raccourcir l'ère de barbarie qui suivra, il crée la Fondation aux confins de la galaxie.",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9782070360536-L.jpg",
    pageCount: 416,
    genre: "Science-Fiction",
    publishedDate: "1951",
    userRating: null,
    userStartDate: new Date("2025-08-01"),
    userEndDate: null,
    status: "READING",
  },
  {
    title: "La Peste",
    author: "Albert Camus",
    isbn: "9782070360420",
    description:
      "À Oran, une épidémie de peste isole la ville du monde extérieur. Le docteur Rieux lutte contre le fléau avec courage et humanité.",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9782070360420-L.jpg",
    pageCount: 320,
    genre: "Roman, Philosophie",
    publishedDate: "1947",
    userRating: null,
    userStartDate: new Date("2025-08-05"),
    userEndDate: null,
    status: "READING",
  },
  // Books to read
  {
    title: "Neuromancien",
    author: "William Gibson",
    isbn: "9782290055168",
    description:
      "Case, un ancien hacker déchu, se voit offrir une dernière chance : pirater la plus puissante intelligence artificielle jamais créée.",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9782290055168-L.jpg",
    pageCount: 384,
    genre: "Cyberpunk, Science-Fiction",
    publishedDate: "1984",
    userRating: null,
    userStartDate: null,
    userEndDate: null,
    status: "TO_READ",
  },
  {
    title: "De la Terre à la Lune",
    author: "Jules Verne",
    isbn: "9782253012375",
    description:
      "Après la guerre de Sécession, le Gun-Club de Baltimore décide d'envoyer un boulet habité vers la Lune.",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9782253012375-L.jpg",
    pageCount: 352,
    genre: "Science-Fiction, Aventure",
    publishedDate: "1865",
    userRating: null,
    userStartDate: null,
    userEndDate: null,
    status: "TO_READ",
  },
  {
    title: "Méditations",
    author: "Marc Aurèle",
    isbn: "9782080700162",
    description:
      "Les réflexions personnelles de l'empereur romain Marc Aurèle sur la philosophie stoïcienne, la vertu et la nature humaine.",
    coverUrl: "https://covers.openlibrary.org/b/isbn/9782080700162-L.jpg",
    pageCount: 222,
    genre: "Philosophie",
    publishedDate: "180",
    userRating: null,
    userStartDate: null,
    userEndDate: null,
    status: "TO_READ",
  },
];

const COMMENTS = [
  "Un chef-d'oeuvre absolu, à relire régulièrement.",
  "L'écriture est magnifique, chaque phrase est ciselée.",
  "Un peu long au milieu mais la fin est incroyable.",
  "Je comprends pourquoi c'est un classique.",
  "Recommandé par un ami, je n'ai pas été déçu.",
];

/** Date du jour décalée de `daysAgo` jours, au format `YYYY-MM-DD` attendu par la colonne. */
function dayOffset(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

/**
 * Pseudo-aléatoire déterministe : le même jour produit toujours la même valeur. Avec
 * Math.random(), relancer le seed ajoutait à chaque fois les jours d'activité que le tirage
 * précédent n'avait pas retenus, jusqu'à finir par remplir les 60 jours.
 */
function noise(day: number): number {
  const x = Math.sin(day * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export async function runSeed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set.");

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });

  console.log("Seeding database...");

  // Le compte est écrit directement plutôt que via l'API d'inscription de better-auth :
  // celle-ci déclencherait un email de vérification et une notification admin bien réels
  // à chaque exécution du seed. Le hachage reste celui de better-auth (hashPassword), donc
  // le mot de passe est vérifiable normalement à la connexion.
  const existing = await db.query.user.findFirst({ where: eq(schema.user.email, SEED_EMAIL) });
  const userId = existing?.id ?? randomUUID();

  if (!existing) {
    await db.insert(schema.user).values({
      id: userId,
      name: "Lecteur Test",
      email: SEED_EMAIL,
      emailVerified: true,
      role: "user",
      initialBooksRead: 42,
      hasSeenOnboarding: true,
    });
    // `issuer` n'est pas décoratif : depuis better-auth 1.7 la connexion cherche le compte
    // par (providerId, issuer, accountId), et un issuer manquant fait échouer l'auth avec un
    // « User not found » trompeur. Pour les comptes locaux, c'est "local:credential".
    await db.insert(schema.account).values({
      id: randomUUID(),
      accountId: userId,
      providerId: "credential",
      issuer: createLocalAccountIssuer("credential"),
      userId,
      password: await hashPassword(SEED_PASSWORD),
    });
    console.log(`User created: ${SEED_EMAIL} (id: ${userId})`);
  } else {
    console.log(`User already present: ${SEED_EMAIL} (id: ${userId})`);
  }

  // Compte administrateur, pour pouvoir ouvrir le back-office en développement. Même mot de
  // passe que le compte de démonstration.
  const existingAdmin = await db.query.user.findFirst({
    where: eq(schema.user.email, ADMIN_EMAIL),
  });
  if (!existingAdmin) {
    const adminId = randomUUID();
    await db.insert(schema.user).values({
      id: adminId,
      name: "Admin BookList",
      email: ADMIN_EMAIL,
      emailVerified: true,
      role: "admin",
    });
    await db.insert(schema.account).values({
      id: randomUUID(),
      accountId: adminId,
      providerId: "credential",
      issuer: createLocalAccountIssuer("credential"),
      userId: adminId,
      password: await hashPassword(SEED_PASSWORD),
    });
    console.log(`Admin created: ${ADMIN_EMAIL} (id: ${adminId})`);
  }

  await db
    .insert(schema.book)
    .values(books.map((b) => ({ ...b, userId })))
    .onConflictDoNothing({ target: [schema.book.userId, schema.book.isbn] });
  console.log(`${books.length} books seeded`);

  // ~60 jours d'activité aléatoire, pour peupler le graphe de contribution.
  const activities = Array.from({ length: 60 }, (_, i) => i)
    .filter((daysAgo) => noise(daysAgo) < 0.7)
    .map((daysAgo) => ({
      id: randomUUID(),
      userId,
      date: dayOffset(daysAgo),
      pagesRead: Math.floor(noise(daysAgo + 1000) * 50) + 10,
    }));

  await db
    .insert(schema.readingActivity)
    .values(activities)
    .onConflictDoNothing({ target: [schema.readingActivity.userId, schema.readingActivity.date] });
  console.log(`${activities.length} reading activities seeded`);

  const seededBooks = await db.query.book.findMany({
    where: eq(schema.book.userId, userId),
    limit: COMMENTS.length,
  });
  const existingComments = await db.query.comment.findMany({
    where: eq(schema.comment.userId, userId),
    limit: 1,
  });

  if (existingComments.length === 0) {
    await db.insert(schema.comment).values(
      seededBooks.map((b, i) => ({
        id: randomUUID(),
        content: COMMENTS[i],
        bookId: b.id,
        userId,
      })),
    );
    console.log(`${seededBooks.length} comments seeded`);
  }

  console.log("\n--- Seed complete ---");
  console.log(`Email: ${SEED_EMAIL} (utilisateur) / ${ADMIN_EMAIL} (admin)`);
  console.log(`Password: ${SEED_PASSWORD}`);
  await pool.end();
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  runSeed().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
