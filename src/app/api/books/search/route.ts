import { NextResponse } from "next/server"

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
    const url = apiKey 
      ? `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&maxResults=10&printType=books&key=${apiKey}`
      : `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&maxResults=10&printType=books`
    
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
      },
      next: { revalidate: 3600 } // Cache pendant 1 heure
    })

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
