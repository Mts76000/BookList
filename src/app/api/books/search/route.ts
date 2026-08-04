import { NextResponse } from "next/server"

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)

      // Retry sur les erreurs serveur temporaires (503, 502, 504)
      if ([502, 503, 504].includes(response.status) && attempt < maxRetries - 1) {
        const delay = 300 * Math.pow(2, attempt) // backoff exponentiel: 300ms, 600ms, 1200ms
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      return response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown fetch error")
      if (attempt < maxRetries - 1) {
        const delay = 300 * Math.pow(2, attempt)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error("Failed after retries")
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")
  const isbn = searchParams.get("isbn")

  if (!query && !isbn) {
    return NextResponse.json(
      { error: "Query or ISBN is required" },
      { status: 400 }
    )
  }

  try {
    let searchQuery = ""
    
    if (isbn) {
      // Nettoyer l'ISBN (enlever les tirets et espaces)
      const cleanIsbn = isbn.replace(/[-\s]/g, "")
      searchQuery = `isbn:${cleanIsbn}`
    } else if (query) {
      searchQuery = query
    }
    
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY
    const buildUrl = (q: string) =>
      apiKey
        ? `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=10&printType=books&key=${apiKey}`
        : `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=10&printType=books`

    // Premier essai : recherche exacte par isbn:...
    let response = await fetchWithRetry(buildUrl(searchQuery), {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 3600 },
    })

    // Si la recherche exacte par ISBN est vide, on relance une recherche
    // générale avec le numéro nu. L'index `isbn:` est strict et certains
    // codes scannés n'y sont pas référencés, alors qu'un simple match de
    // chaîne ramène le bon ouvrage.
    if (isbn && response.ok) {
      const firstTry = await response.clone().json()
      if (!firstTry.items?.length) {
        const fallbackResponse = await fetchWithRetry(buildUrl(cleanIsbn), {
          headers: { Accept: "application/json" },
          next: { revalidate: 3600 },
        })
        if (fallbackResponse.ok) response = fallbackResponse
      }
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Google Books API error:", response.status, errorText)
      
      // Gérer spécifiquement l'erreur 429 (quota dépassé)
      if (response.status === 429) {
        return NextResponse.json(
          { 
            error: "API_LIMIT_EXCEEDED",
            message: "Le quota de l'API Google Books est dépassé. Veuillez utiliser la saisie manuelle ou configurer une clé API.",
            books: []
          },
          { status: 200 } // On retourne 200 pour permettre le fallback
        )
      }

      // Erreurs serveur temporaires (503, 502, 504) après épuisement des retries
      if ([502, 503, 504].includes(response.status)) {
        return NextResponse.json(
          {
            error: "API_UNAVAILABLE",
            message: "Le service Google Books est temporairement indisponible. Réessayez dans quelques instants ou utilisez la saisie manuelle.",
            books: []
          },
          { status: 200 }
        )
      }
      
      throw new Error(`Google Books API error: ${response.status}`)
    }

    const data = await response.json()

    if (!data.items) {
      return NextResponse.json({ books: [] })
    }

    const books = data.items.map((item: any) => {
      const volumeInfo = item.volumeInfo || {}
      
      // Trouver le bon ISBN (ISBN-13 prioritaire sur ISBN-10)
      let foundIsbn = null
      if (volumeInfo.industryIdentifiers) {
        const isbn13 = volumeInfo.industryIdentifiers.find((id: any) => id.type === "ISBN_13")
        const isbn10 = volumeInfo.industryIdentifiers.find((id: any) => id.type === "ISBN_10")
        foundIsbn = isbn13?.identifier || isbn10?.identifier || null
      }

      return {
        id: item.id,
        title: volumeInfo.title || "Sans titre",
        authors: volumeInfo.authors || ["Auteur inconnu"],
        description: volumeInfo.description || null,
        coverUrl: volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail || null,
        pageCount: volumeInfo.pageCount || null,
        publishedDate: volumeInfo.publishedDate || null,
        isbn: foundIsbn,
        genres: volumeInfo.categories || null,
      }
    })

    return NextResponse.json({ books })
  } catch (error) {
    console.error("Google Books API error:", error)
    return NextResponse.json(
      { 
        error: "API_ERROR",
        message: "Erreur lors de la recherche. Veuillez utiliser la saisie manuelle.",
        books: []
      },
      { status: 200 } // On retourne 200 pour permettre le fallback
    )
  }
}
