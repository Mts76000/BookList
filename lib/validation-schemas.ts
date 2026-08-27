import { z } from "zod";

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

export const bookStatusSchema = z.enum(["TO_READ", "READING", "FINISHED"]);

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
  userRating: emptyToNull(z.coerce.number().int().min(1, "Note entre 1 et 5.").max(5)),
  userStartDate: readingDateSchema,
  userEndDate: readingDateSchema,
  status: bookStatusSchema,
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
    .max(2 * 1024 * 1024, "Fichier CSV trop volumineux (2 Mo max)."),
});
