// Validation stricte des champs "livre" partagée entre create (POST) et update (PATCH).

export const BOOK_STATUSES = ["TO_READ", "READING", "FINISHED"] as const
export type BookStatus = (typeof BOOK_STATUSES)[number]

export interface BookInput {
  title?: unknown
  author?: unknown
  isbn?: unknown
  description?: unknown
  coverUrl?: unknown
  pageCount?: unknown
  genre?: unknown
  publishedDate?: unknown
  userRating?: unknown
  userStartDate?: unknown
  userEndDate?: unknown
  status?: unknown
}

export interface ValidatedBookFields {
  title?: string
  author?: string
  isbn?: string | null
  description?: string | null
  coverUrl?: string | null
  pageCount?: number | null
  genre?: string | null
  publishedDate?: string | null
  userRating?: number | null
  userStartDate?: Date | null
  userEndDate?: Date | null
  status?: BookStatus
}

const MAX_TEXT_LENGTH = 500
const MAX_DESCRIPTION_LENGTH = 10_000
const MAX_URL_LENGTH = 2000

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

/**
 * Valide les champs d'un livre. Lance une erreur avec un message utilisateur
 * si un champ est invalide. `requireTitleAuthor` doit être true à la création.
 */
export function validateBookInput(
  body: BookInput,
  { requireTitleAuthor = false }: { requireTitleAuthor?: boolean } = {}
): ValidatedBookFields {
  const result: ValidatedBookFields = {}

  if (requireTitleAuthor || body.title !== undefined) {
    if (!isNonEmptyString(body.title) || body.title.length > MAX_TEXT_LENGTH) {
      throw new Error("Titre invalide")
    }
    result.title = body.title.trim()
  }

  if (requireTitleAuthor || body.author !== undefined) {
    if (!isNonEmptyString(body.author) || body.author.length > MAX_TEXT_LENGTH) {
      throw new Error("Auteur invalide")
    }
    result.author = body.author.trim()
  }

  if (body.isbn !== undefined) {
    if (body.isbn === null || body.isbn === "") {
      result.isbn = null
    } else if (typeof body.isbn === "string" && body.isbn.length <= 32) {
      result.isbn = body.isbn.trim()
    } else {
      throw new Error("ISBN invalide")
    }
  }

  if (body.description !== undefined) {
    if (body.description === null || body.description === "") {
      result.description = null
    } else if (typeof body.description === "string" && body.description.length <= MAX_DESCRIPTION_LENGTH) {
      result.description = body.description
    } else {
      throw new Error("Description invalide")
    }
  }

  if (body.coverUrl !== undefined) {
    if (body.coverUrl === null || body.coverUrl === "") {
      result.coverUrl = null
    } else if (typeof body.coverUrl === "string" && body.coverUrl.length <= MAX_URL_LENGTH && isValidUrl(body.coverUrl)) {
      result.coverUrl = body.coverUrl.replace(/^http:/, "https:")
    } else {
      throw new Error("URL de couverture invalide")
    }
  }

  if (body.pageCount !== undefined) {
    if (body.pageCount === null || body.pageCount === "") {
      result.pageCount = null
    } else {
      const parsed = Number(body.pageCount)
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100_000) {
        throw new Error("Nombre de pages invalide")
      }
      result.pageCount = Math.floor(parsed)
    }
  }

  if (body.genre !== undefined) {
    if (body.genre === null || body.genre === "") {
      result.genre = null
    } else if (typeof body.genre === "string" && body.genre.length <= MAX_TEXT_LENGTH) {
      result.genre = body.genre
    } else {
      throw new Error("Genre invalide")
    }
  }

  if (body.publishedDate !== undefined) {
    if (body.publishedDate === null || body.publishedDate === "") {
      result.publishedDate = null
    } else if (typeof body.publishedDate === "string" && body.publishedDate.length <= 32) {
      result.publishedDate = body.publishedDate
    } else {
      throw new Error("Date de publication invalide")
    }
  }

  if (body.userRating !== undefined) {
    if (body.userRating === null || body.userRating === "") {
      result.userRating = null
    } else {
      const parsed = Number(body.userRating)
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
        throw new Error("Note invalide")
      }
      result.userRating = parsed
    }
  }

  if (body.userStartDate !== undefined) {
    result.userStartDate = parseOptionalDate(body.userStartDate, "Date de début invalide")
  }

  if (body.userEndDate !== undefined) {
    result.userEndDate = parseOptionalDate(body.userEndDate, "Date de fin invalide")
  }

  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !BOOK_STATUSES.includes(body.status as BookStatus)) {
      throw new Error("Statut invalide")
    }
    result.status = body.status as BookStatus
  }

  return result
}

function parseOptionalDate(value: unknown, errorMessage: string): Date | null {
  if (value === null || value === "") return null
  if (typeof value !== "string") throw new Error(errorMessage)
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error(errorMessage)
  const minDate = new Date("1000-01-01")
  const maxDate = new Date(Date.now() + 1000 * 60 * 60 * 24) // pas plus d'un jour dans le futur
  if (date < minDate || date > maxDate) throw new Error(errorMessage)
  return date
}
