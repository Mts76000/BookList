import { describe, expect, it } from "vitest";
import { isOptimizedCoverUrl } from "@/lib/cover-hosts";

describe("isOptimizedCoverUrl", () => {
  it("accepte les couvertures de Google Books et d'Open Library", () => {
    expect(isOptimizedCoverUrl("https://books.google.com/books/content?id=abc&zoom=1")).toBe(true);
    expect(isOptimizedCoverUrl("https://covers.openlibrary.org/b/id/123-L.jpg")).toBe(true);
    expect(isOptimizedCoverUrl("https://ia801601.us.archive.org/view/123.jpg")).toBe(true);
    expect(isOptimizedCoverUrl("https://archive.org/download/123.jpg")).toBe(true);
  });

  it("refuse les autres sites, même quand leur adresse contient un hôte autorisé", () => {
    expect(isOptimizedCoverUrl("https://m.media-amazon.com/images/I/cover.jpg")).toBe(false);
    expect(isOptimizedCoverUrl("https://books.google.com.evil.example/cover.jpg")).toBe(false);
    expect(isOptimizedCoverUrl("https://evil.example/?u=books.google.com")).toBe(false);
    expect(isOptimizedCoverUrl("https://notarchive.org/cover.jpg")).toBe(false);
  });

  it("refuse le HTTP en clair et les URL invalides", () => {
    expect(isOptimizedCoverUrl("http://books.google.com/books/content?id=abc")).toBe(false);
    expect(isOptimizedCoverUrl("pas une url")).toBe(false);
  });
});
