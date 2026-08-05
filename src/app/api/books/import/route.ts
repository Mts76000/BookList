import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { parseCsv, csvRowsToObjects } from "@/lib/csv"
import { validateBookInput } from "@/lib/validation"
import { getClientIp, rateLimit } from "@/lib/rate-limit"

const MAX_ROWS = 500
const MAX_CSV_SIZE = 2 * 1024 * 1024 // 2 Mo

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { success } = rateLimit(`books-import:${getClientIp(request)}:${session.user.id}`, {
      limit: 5,
      windowMs: 10 * 60_000,
    })
    if (!success) {
      return NextResponse.json(
        { error: "Trop d'imports. Réessayez dans quelques minutes." },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { csv } = body

    if (typeof csv !== "string" || !csv.trim()) {
      return NextResponse.json({ error: "Fichier CSV requis" }, { status: 400 })
    }

    if (csv.length > MAX_CSV_SIZE) {
      return NextResponse.json({ error: "Fichier CSV trop volumineux (2 Mo max)" }, { status: 400 })
    }

    const rows = csvRowsToObjects(parseCsv(csv))

    if (rows.length === 0) {
      return NextResponse.json({ error: "Aucune ligne à importer" }, { status: 400 })
    }

    if (rows.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `Trop de lignes (max ${MAX_ROWS} par import)` },
        { status: 400 }
      )
    }

    const errors: { line: number; message: string }[] = []
    const toCreate: ReturnType<typeof validateBookInput>[] = []

    rows.forEach((row, index) => {
      try {
        const fields = validateBookInput(
          {
            title: row.title,
            author: row.author,
            isbn: row.isbn || undefined,
            description: row.description || undefined,
            coverUrl: row.coverUrl || undefined,
            pageCount: row.pageCount || undefined,
            genre: row.genre || undefined,
            publishedDate: row.publishedDate || undefined,
            userRating: row.userRating || undefined,
            userStartDate: row.userStartDate || undefined,
            userEndDate: row.userEndDate || undefined,
            status: row.status || undefined,
          },
          { requireTitleAuthor: true }
        )
        toCreate.push(fields)
      } catch (validationError) {
        errors.push({
          line: index + 2, // +1 pour l'en-tête, +1 pour l'index 0-based
          message: validationError instanceof Error ? validationError.message : "Ligne invalide",
        })
      }
    })

    if (toCreate.length > 0) {
      await prisma.book.createMany({
        data: toCreate.map((fields) => ({
          title: fields.title!,
          author: fields.author!,
          isbn: fields.isbn ?? null,
          description: fields.description ?? null,
          coverUrl: fields.coverUrl ?? null,
          pageCount: fields.pageCount ?? null,
          genre: fields.genre ?? null,
          publishedDate: fields.publishedDate ?? null,
          userRating: fields.userRating ?? null,
          userStartDate: fields.userStartDate ?? null,
          userEndDate: fields.userEndDate ?? null,
          status: fields.status ?? "FINISHED",
          userId: session.user.id,
        })),
        skipDuplicates: true,
      })
    }

    return NextResponse.json({
      imported: toCreate.length,
      failed: errors.length,
      errors,
    })
  } catch (error) {
    console.error("CSV import error:", error)
    return NextResponse.json({ error: "Échec de l'import" }, { status: 500 })
  }
}
