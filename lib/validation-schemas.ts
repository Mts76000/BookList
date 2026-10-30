import { z } from "zod";
import { parseTags } from "@/lib/book-status";

export const registerSchema = z.object({
  name: z.string().min(1, "Le nom est requis.").max(100),
  email: z.email("Adresse email invalide."),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
  tosAccepted: z.literal(true, { error: "Vous devez accepter les CGU." }),
  turnstileToken: z.string().min(1, "Vérification anti-bot manquante."),
});

export const loginSchema = z.object({
  email: z.email("Adresse email invalide."),
  password: z.string().min(1, "Le mot de passe est requis."),
  rememberMe: z.boolean().optional().default(false),
  turnstileToken: z.string().min(1, "Vérification anti-bot manquante."),
});

export const forgotPasswordSchema = z.object({
  email: z.email("Adresse email invalide."),
  turnstileToken: z.string().min(1, "Vérification anti-bot manquante."),
});

// --- Schémas métier BookList ---------------------------------------------------------

const MAX_TEXT = 500;
const MAX_DESCRIPTION = 10_000;
const MAX_URL = 2000;

/**
 * Les formulaires et l'import CSV envoient "" pour un champ laissé vide, là où la base
 * attend NULL. On normalise une bonne fois ici plutôt que dans chaque route.
 */
const emptyToNull = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" || v === undefined ? null : v), schema.nullable());

/** Texte court optionnel, borné en longueur. */
const optionalText = (max: number) => emptyToNull(z.string().max(max));

/**
 * Une couverture doit être une URL http(s) ; on réécrit systématiquement http: en https:
 * pour ne pas déclencher de contenu mixte sur une page servie en HTTPS.
 */
const coverUrlSchema = emptyToNull(
  z
    .string()
    .max(MAX_URL)
    .refine((value) => {
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    }, "URL de couverture invalide.")
    .transform((value) => value.replace(/^http:/, "https:")),
);

/**
 * Date de lecture : bornée pour rejeter aussi bien une coquille de saisie (an 20 au lieu de
 * 2020) qu'une date future. On tolère un jour d'avance pour absorber les décalages de fuseau
 * entre le navigateur de l'utilisateur et le serveur.
 */
const readingDateSchema = emptyToNull(
  z.coerce
    .date()
    .refine((d) => d >= new Date("1000-01-01"), "Date trop ancienne.")
    .refine((d) => d.getTime() <= Date.now() + 86_400_000, "Date dans le futur."),
);

export const bookStatusSchema = z.enum(["TO_READ", "READING", "FINISHED", "ABANDONED"]);

/** Champs modifiables d'un livre, tous optionnels — base des schémas création et mise à jour. */
const bookFieldsSchema = z.object({
  title: z.string().trim().min(1, "Le titre est requis.").max(MAX_TEXT),
  author: z.string().trim().min(1, "L'auteur est requis.").max(MAX_TEXT),
  isbn: emptyToNull(z.string().trim().max(32)),
  description: optionalText(MAX_DESCRIPTION),
  coverUrl: coverUrlSchema,
  pageCount: emptyToNull(z.coerce.number().int().min(0).max(100_000)),
  genre: optionalText(MAX_TEXT),
  publishedDate: optionalText(32),
  userRating: emptyToNull(
    z.coerce
      .number()
      .min(0.5, "Note entre 0,5 et 5.")
      .max(5, "Note entre 0,5 et 5.")
      .multipleOf(0.5, "Note par demi-étoile."),
  ),
  userStartDate: readingDateSchema,
  userEndDate: readingDateSchema,
  status: bookStatusSchema,
  format: emptyToNull(z.enum(["paper", "ebook", "audio"])),
  // Étagères : liste, ou chaîne séparée par des virgules (formulaire, import CSV).
  tags: z
    .union([z.array(z.string()), z.string()])
    .nullish()
    .transform((value) => {
      const tags = parseTags(value);
      return tags.length > 0 ? tags : null;
    }),
  currentPage: emptyToNull(z.coerce.number().int().min(0).max(100_000)),
  seriesName: optionalText(MAX_TEXT),
  seriesIndex: emptyToNull(z.coerce.number().int().min(0).max(1000)),
  seriesTotal: emptyToNull(z.coerce.number().int().min(1).max(1000)),
});

/** Création : titre et auteur obligatoires, le reste facultatif. */
export const createBookSchema = bookFieldsSchema.partial().required({
  title: true,
  author: true,
});

/** Mise à jour partielle : seuls les champs présents sont modifiés. */
export const updateBookSchema = bookFieldsSchema.partial();

export const commentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Le commentaire ne peut pas être vide.")
    .max(5000, "Le commentaire ne peut pas dépasser 5000 caractères."),
});

export const readingActivitySchema = z.object({
  pagesRead: z.coerce.number().int().min(0).max(100_000),
  // Jour civil `YYYY-MM-DD`. Absent, la route retient la date du jour.
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format YYYY-MM-DD.")
    .optional(),
});

/** Objectif de lecture de l'année en cours, en nombre de livres. */
export const readingGoalSchema = z.object({
  target: z.coerce
    .number()
    .int("Nombre de livres entier attendu.")
    .min(1, "Objectif d'au moins un livre.")
    .max(1000, "Objectif de 1000 livres maximum."),
});

/** Coup de cœur d'une année du bilan. */
export const yearFavoriteSchema = z.object({
  year: z.coerce.number().int().min(1900).max(3000),
  bookId: z.string().min(1, "Livre requis.").max(64),
});

export const quoteSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "La citation ne peut pas être vide.")
    .max(2000, "La citation ne peut pas dépasser 2000 caractères."),
  page: emptyToNull(z.coerce.number().int().min(0).max(100_000)),
});

export const challengeSchema = z
  .object({
    title: z.string().trim().min(1, "Donnez un nom à votre défi.").max(120),
    kind: z.enum(["books", "pages", "long_books", "genre", "author"], {
      error: "Type de défi inconnu.",
    }),
    target: z.coerce.number().int().min(1, "Objectif d'au moins 1.").max(100_000),
    filter: optionalText(200),
  })
  .refine((value) => !["genre", "author"].includes(value.kind) || !!value.filter, {
    message: "Précisez le genre ou l'auteur du défi.",
    path: ["filter"],
  });

export const pushSubscriptionSchema = z.object({
  endpoint: z.url().max(2000),
  keys: z.object({ p256dh: z.string().min(1).max(500), auth: z.string().min(1).max(500) }),
});

export const progressSchema = z.object({
  currentPage: z.coerce.number().int().min(0, "Page invalide.").max(100_000),
});

export const checkoutSchema = z.object({
  interval: z.enum(["monthly", "yearly"], { error: "Formule inconnue." }),
});

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1, "Le nom ne peut pas être vide.").max(200).optional(),
    // Livres lus avant l'inscription, saisis à l'onboarding.
    initialBooksRead: z.coerce.number().int().min(0).max(100_000).optional(),
  })
  .refine(
    (data) => data.name !== undefined || data.initialBooksRead !== undefined,
    "Aucune modification fournie.",
  );

export const importBooksSchema = z.object({
  csv: z
    .string()
    .trim()
    .min(1, "Fichier CSV requis.")
    .max(5 * 1024 * 1024, "Fichier CSV trop volumineux (5 Mo max)."),
});

/** Une saga enregistrée d'un coup : son nom et ses tomes, dans l'ordre. */
export const saveSeriesSchema = z.object({
  name: z.string().trim().min(1, "Donnez un nom à la saga.").max(MAX_TEXT),
  /** Nom actuel quand on modifie une saga existante : permet de la renommer et d'en retirer
   *  des tomes. Absent à la création. */
  previousName: z.string().trim().max(MAX_TEXT).nullish(),
  total: emptyToNull(z.coerce.number().int().min(1).max(1000)),
  volumes: z
    .array(
      z.object({
        bookId: z.string().min(1),
        seriesIndex: emptyToNull(z.coerce.number().int().min(0).max(1000)),
      }),
    )
    .min(1, "Ajoutez au moins un livre à la saga.")
    .max(200),
});

export const deleteSeriesSchema = z.object({
  name: z.string().trim().min(1).max(MAX_TEXT),
});

/** Livres d'une saga repérée, à identifier sur Wikidata. */
export const identifySeriesSchema = z.object({
  bookIds: z.array(z.string().min(1)).min(1).max(20),
});

/** Tomes manquants dont on cherche l'édition, et livres de la saga servant de référence. */
export const seriesEditionsSchema = z.object({
  titles: z.array(z.string().trim().min(1).max(MAX_TEXT)).min(1).max(20),
  author: z.string().trim().min(1).max(MAX_TEXT),
  referenceBookIds: z.array(z.string().min(1)).max(50).default([]),
});
