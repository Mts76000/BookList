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
    let searchQuery = isbn ? `isbn:${isbn}` : query
    
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&maxResults=10&printType=books`,
      {
        headers: {
          "Accept": "application/json",
        },
      }
    )

    if (!response.ok) {
      throw new Error("Google Books API error")
    }

    const data = await response.json()

    const books = data.items?.map((item: any) => ({
      id: item.id,
      title: item.volumeInfo.title || "Sans titre",
      authors: item.volumeInfo.authors || ["Auteur inconnu"],
      description: item.volumeInfo.description || null,
      coverUrl: item.volumeInfo.imageLinks?.thumbnail || null,
      pageCount: item.volumeInfo.pageCount || null,
      publishedDate: item.volumeInfo.publishedDate || null,
      isbn: item.volumeInfo.industryIdentifiers?.[0]?.identifier || null,
      genres: item.volumeInfo.categories || null,
    })) || []

    return NextResponse.json({ books })
  } catch (error) {
    console.error("Google Books API error:", error)
    return NextResponse.json(
      { error: "Failed to search books" },
      { status: 500 }
    )
  }
}
