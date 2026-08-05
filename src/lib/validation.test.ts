import { describe, expect, it } from "vitest"
import { validateBookInput } from "./validation"

describe("validateBookInput", () => {
  it("requires title and author on create", () => {
    expect(() => validateBookInput({}, { requireTitleAuthor: true })).toThrow("Titre invalide")
    expect(() =>
      validateBookInput({ title: "Dune" }, { requireTitleAuthor: true })
    ).toThrow("Auteur invalide")
  })

  it("accepts a valid minimal book", () => {
    const result = validateBookInput(
      { title: "Dune", author: "Frank Herbert" },
      { requireTitleAuthor: true }
    )
    expect(result.title).toBe("Dune")
    expect(result.author).toBe("Frank Herbert")
  })

  it("rejects an invalid cover URL", () => {
    expect(() => validateBookInput({ coverUrl: "javascript:alert(1)" })).toThrow(
      "URL de couverture invalide"
    )
  })

  it("accepts a valid https cover URL", () => {
    const result = validateBookInput({ coverUrl: "https://example.com/cover.jpg" })
    expect(result.coverUrl).toBe("https://example.com/cover.jpg")
  })

  it("rejects an out-of-range rating", () => {
    expect(() => validateBookInput({ userRating: 6 })).toThrow("Note invalide")
    expect(() => validateBookInput({ userRating: 0 })).toThrow("Note invalide")
  })

  it("accepts a valid rating", () => {
    const result = validateBookInput({ userRating: 4 })
    expect(result.userRating).toBe(4)
  })

  it("rejects a negative or excessive page count", () => {
    expect(() => validateBookInput({ pageCount: -1 })).toThrow("Nombre de pages invalide")
    expect(() => validateBookInput({ pageCount: 999_999 })).toThrow("Nombre de pages invalide")
  })

  it("parses null/empty fields to null", () => {
    const result = validateBookInput({ isbn: "", description: null, coverUrl: "" })
    expect(result.isbn).toBeNull()
    expect(result.description).toBeNull()
    expect(result.coverUrl).toBeNull()
  })

  it("rejects an invalid date", () => {
    expect(() => validateBookInput({ userStartDate: "not-a-date" })).toThrow(
      "Date de début invalide"
    )
  })

  it("accepts a valid date", () => {
    const result = validateBookInput({ userStartDate: "2024-01-01" })
    expect(result.userStartDate).toBeInstanceOf(Date)
  })

  it("rejects dates far in the future", () => {
    const farFuture = new Date()
    farFuture.setFullYear(farFuture.getFullYear() + 5)
    expect(() =>
      validateBookInput({ userEndDate: farFuture.toISOString() })
    ).toThrow("Date de fin invalide")
  })
})
