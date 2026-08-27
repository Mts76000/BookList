import { describe, expect, it } from "vitest";
import { parsePaginationParams, toPaginated } from "@/lib/pagination";

describe("parsePaginationParams", () => {
  it("defaults to page 1 and limit 20 when absent", () => {
    const params = parsePaginationParams(new Request("http://localhost/api/items"));
    expect(params).toEqual({ page: 1, limit: 20, offset: 0 });
  });

  it("reads page and limit from the query string", () => {
    const params = parsePaginationParams(new Request("http://localhost/api/items?page=3&limit=10"));
    expect(params).toEqual({ page: 3, limit: 10, offset: 20 });
  });

  it("clamps limit to the maximum of 100", () => {
    const params = parsePaginationParams(new Request("http://localhost/api/items?limit=1000"));
    expect(params.limit).toBe(100);
  });

  it("clamps page to a minimum of 1 for invalid input", () => {
    const params = parsePaginationParams(new Request("http://localhost/api/items?page=-5"));
    expect(params.page).toBe(1);
  });
});

describe("toPaginated", () => {
  it("computes totalPages from total and limit", () => {
    const result = toPaginated([1, 2, 3], 45, { page: 1, limit: 20, offset: 0 });
    expect(result.pagination).toEqual({ page: 1, limit: 20, total: 45, totalPages: 3 });
  });

  it("returns at least 1 total page even when total is 0", () => {
    const result = toPaginated([], 0, { page: 1, limit: 20, offset: 0 });
    expect(result.pagination.totalPages).toBe(1);
  });
});
