import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import bcrypt from "bcryptjs"

// Load env like prisma.config.ts does
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { config } = require("dotenv")
config({ path: ".env.local" })
config({ path: ".env" })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("Seeding database...")

  // Create test user
  const hashedPassword = await bcrypt.hash("test1234", 12)

  const user = await prisma.user.upsert({
    where: { email: "test@booklist.fr" },
    update: {},
    create: {
      email: "test@booklist.fr",
      password: hashedPassword,
      name: "Lecteur Test",
      hasSeenOnboarding: true,
      initialBooksRead: 42,
    },
  })

  console.log(`User created: ${user.email} (id: ${user.id})`)

  // Books data
  const books = [
    {
      title: "Le Petit Prince",
      author: "Antoine de Saint-Exupéry",
      isbn: "9782070612758",
      description: "Un pilote d'avion, en panne dans le désert du Sahara, rencontre un petit garçon venu d'une autre planète. Une histoire poétique et philosophique sous forme de conte pour enfants.",
      coverUrl: "https://covers.openlibrary.org/b/isbn/9782070612758-L.jpg",
      pageCount: 96,
      genre: "Conte, Philosophie",
      publishedDate: "1943",
      userRating: 5,
      userStartDate: new Date("2024-01-05"),
      userEndDate: new Date("2024-01-06"),
      status: "FINISHED" as const,
    },
    {
      title: "L'Étranger",
      author: "Albert Camus",
      isbn: "9782070360024",
      description: "Meursault, un jeune homme indifférent, commet un meurtre absurde sur une plage d'Alger. Le récit de son procès et de sa condamnation met en lumière l'absurdité de la condition humaine.",
      coverUrl: "https://covers.openlibrary.org/b/isbn/9782070360024-L.jpg",
      pageCount: 186,
      genre: "Roman, Philosophie",
      publishedDate: "1942",
      userRating: 4,
      userStartDate: new Date("2024-02-10"),
      userEndDate: new Date("2024-02-14"),
      status: "FINISHED" as const,
    },
    {
      title: "Dune",
      author: "Frank Herbert",
      isbn: "9782266320481",
      description: "Sur la planète désertique Arrakis, le jeune Paul Atréides est pris dans un jeu politique mortel pour le contrôle de l'épice, la substance la plus précieuse de l'univers.",
      coverUrl: "https://covers.openlibrary.org/b/isbn/9782266320481-L.jpg",
      pageCount: 896,
      genre: "Science-Fiction",
      publishedDate: "1965",
      userRating: 5,
      userStartDate: new Date("2024-03-01"),
      userEndDate: new Date("2024-03-20"),
      status: "FINISHED" as const,
    },
    {
      title: "1984",
      author: "George Orwell",
      isbn: "9782070368228",
      description: "Dans un monde totalitaire, Winston Smith tente de résister au Parti et à Big Brother. Un roman visionnaire sur la surveillance et la manipulation de la vérité.",
      coverUrl: "https://covers.openlibrary.org/b/isbn/9782070368228-L.jpg",
      pageCount: 438,
      genre: "Dystopie, Science-Fiction",
      publishedDate: "1949",
      userRating: 5,
      userStartDate: new Date("2024-04-12"),
      userEndDate: new Date("2024-04-22"),
      status: "FINISHED" as const,
    },
    {
      title: "Harry Potter à l'école des sorciers",
      author: "J.K. Rowling",
      isbn: "9782070584628",
      description: "Le jour de ses onze ans, Harry Potter découvre qu'il est sorcier. Il entre à Poudlard et plonge dans un monde de magie, d'amitié et de dangers.",
      coverUrl: "https://covers.openlibrary.org/b/isbn/9782070584628-L.jpg",
      pageCount: 320,
      genre: "Fantasy, Jeunesse",
      publishedDate: "1997",
      userRating: 4,
      userStartDate: new Date("2024-05-01"),
      userEndDate: new Date("2024-05-08"),
      status: "FINISHED" as const,
    },
    {
      title: "Les Misérables",
      author: "Victor Hugo",
      isbn: "9782253096344",
      description: "L'épopée de Jean Valjean, ancien bagnard en quête de rédemption dans la France du XIXe siècle. Une fresque sociale majeure sur la justice, l'amour et la liberté.",
      coverUrl: "https://covers.openlibrary.org/b/isbn/9782253096344-L.jpg",
      pageCount: 1664,
      genre: "Roman historique",
      publishedDate: "1862",
      userRating: 5,
      userStartDate: new Date("2024-06-01"),
      userEndDate: new Date("2024-07-15"),
      status: "FINISHED" as const,
    },
    {
      title: "Sapiens : Une brève histoire de l'humanité",
      author: "Yuval Noah Harari",
      isbn: "9782226257017",
      description: "De la révolution cognitive à la révolution biotechnologique, l'histoire de notre espèce comme vous ne l'avez jamais lue.",
      coverUrl: "https://covers.openlibrary.org/b/isbn/9782226257017-L.jpg",
      pageCount: 512,
      genre: "Essai, Histoire",
      publishedDate: "2015",
      userRating: 4,
      userStartDate: new Date("2024-08-05"),
      userEndDate: new Date("2024-08-25"),
      status: "FINISHED" as const,
    },
    {
      title: "Le Seigneur des Anneaux",
      author: "J.R.R. Tolkien",
      isbn: "9782267046892",
      description: "Frodon le hobbit doit détruire l'Anneau Unique dans les flammes de la Montagne du Destin pour sauver la Terre du Milieu des ténèbres de Sauron.",
      coverUrl: "https://covers.openlibrary.org/b/isbn/9782267046892-L.jpg",
      pageCount: 1216,
      genre: "Fantasy",
      publishedDate: "1954",
      userRating: 5,
      userStartDate: new Date("2024-09-01"),
      userEndDate: new Date("2024-10-10"),
      status: "FINISHED" as const,
    },
    {
      title: "Projet Hail Mary",
      author: "Andy Weir",
      isbn: "9782820543271",
      description: "Ryland Grace se réveille seul sur un vaisseau spatial, sans souvenir de sa mission. Il doit sauver l'humanité d'une extinction imminente.",
      coverUrl: "https://covers.openlibrary.org/b/isbn/9782820543271-L.jpg",
      pageCount: 480,
      genre: "Science-Fiction",
      publishedDate: "2021",
      userRating: 5,
      userStartDate: new Date("2024-11-01"),
      userEndDate: new Date("2024-11-12"),
      status: "FINISHED" as const,
    },
    {
      title: "Fahrenheit 451",
      author: "Ray Bradbury",
      isbn: "9782072534065",
      description: "Dans une société où les livres sont interdits et brûlés, le pompier Guy Montag commence à remettre en question sa mission.",
      coverUrl: "https://covers.openlibrary.org/b/isbn/9782072534065-L.jpg",
      pageCount: 224,
      genre: "Dystopie, Science-Fiction",
      publishedDate: "1953",
      userRating: 4,
      userStartDate: new Date("2024-12-01"),
      userEndDate: new Date("2024-12-05"),
      status: "FINISHED" as const,
    },
    // Books in progress
    {
      title: "Fondation",
      author: "Isaac Asimov",
      isbn: "9782070360536",
      description: "Hari Seldon prédit la chute de l'Empire Galactique. Pour raccourcir l'ère de barbarie qui suivra, il crée la Fondation aux confins de la galaxie.",
      coverUrl: "https://covers.openlibrary.org/b/isbn/9782070360536-L.jpg",
      pageCount: 416,
      genre: "Science-Fiction",
      publishedDate: "1951",
      userRating: null,
      userStartDate: new Date("2025-08-01"),
      userEndDate: null,
      status: "READING" as const,
    },
    {
      title: "La Peste",
      author: "Albert Camus",
      isbn: "9782070360420",
      description: "À Oran, une épidémie de peste isole la ville du monde extérieur. Le docteur Rieux lutte contre le fléau avec courage et humanité.",
      coverUrl: "https://covers.openlibrary.org/b/isbn/9782070360420-L.jpg",
      pageCount: 320,
      genre: "Roman, Philosophie",
      publishedDate: "1947",
      userRating: null,
      userStartDate: new Date("2025-08-05"),
      userEndDate: null,
      status: "READING" as const,
    },
    // Books to read
    {
      title: "Neuromancien",
      author: "William Gibson",
      isbn: "9782290055168",
      description: "Case, un ancien hacker déchu, se voit offrir une dernière chance : pirater la plus puissante intelligence artificielle jamais créée.",
      coverUrl: "https://covers.openlibrary.org/b/isbn/9782290055168-L.jpg",
      pageCount: 384,
      genre: "Cyberpunk, Science-Fiction",
      publishedDate: "1984",
      userRating: null,
      userStartDate: null,
      userEndDate: null,
      status: "TO_READ" as const,
    },
    {
      title: "De la Terre à la Lune",
      author: "Jules Verne",
      isbn: "9782253012375",
      description: "Après la guerre de Sécession, le Gun-Club de Baltimore décide d'envoyer un boulet habité vers la Lune.",
      coverUrl: "https://covers.openlibrary.org/b/isbn/9782253012375-L.jpg",
      pageCount: 352,
      genre: "Science-Fiction, Aventure",
      publishedDate: "1865",
      userRating: null,
      userStartDate: null,
      userEndDate: null,
      status: "TO_READ" as const,
    },
    {
      title: "Méditations",
      author: "Marc Aurèle",
      isbn: "9782080700162",
      description: "Les réflexions personnelles de l'empereur romain Marc Aurèle sur la philosophie stoïcienne, la vertu et la nature humaine.",
      coverUrl: "https://covers.openlibrary.org/b/isbn/9782080700162-L.jpg",
      pageCount: 222,
      genre: "Philosophie",
      publishedDate: "180",
      userRating: null,
      userStartDate: null,
      userEndDate: null,
      status: "TO_READ" as const,
    },
  ]

  for (const bookData of books) {
    const { status, ...rest } = bookData
    await prisma.book.upsert({
      where: { userId_isbn: { userId: user.id, isbn: rest.isbn! } },
      update: {},
      create: {
        ...rest,
        status,
        userId: user.id,
      },
    })
  }

  console.log(`${books.length} books created`)

  // Reading activities (last 60 days)
  const activities = []
  const today = new Date()
  for (let i = 0; i < 60; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    // ~70% chance of reading on a given day
    if (Math.random() < 0.7) {
      const pagesRead = Math.floor(Math.random() * 50) + 10
      activities.push({ pagesRead, date, userId: user.id })
    }
  }

  for (const activity of activities) {
    const dateOnly = new Date(activity.date.toISOString().split("T")[0])
    await prisma.readingActivity.upsert({
      where: {
        userId_date: {
          userId: activity.userId,
          date: dateOnly,
        },
      },
      update: {},
      create: {
        pagesRead: activity.pagesRead,
        date: dateOnly,
        userId: activity.userId,
      },
    })
  }

  console.log(`${activities.length} reading activities created`)

  // Comments on some books
  const allBooks = await prisma.book.findMany({
    where: { userId: user.id },
    take: 5,
  })

  const comments = [
    "Un chef-d'oeuvre absolu, à relire régulièrement.",
    "L'écriture est magnifique, chaque phrase est ciselée.",
    "Un peu long au milieu mais la fin est incroyable.",
    "Je comprends pourquoi c'est un classique.",
    "Recommandé par un ami, je n'ai pas été déçu.",
  ]

  for (let i = 0; i < allBooks.length; i++) {
    await prisma.comment.create({
      data: {
        content: comments[i],
        bookId: allBooks[i].id,
        userId: user.id,
      },
    })
  }

  console.log(`${allBooks.length} comments created`)

  console.log("\n--- Seed complete ---")
  console.log("Email: test@booklist.fr")
  console.log("Password: test1234")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
