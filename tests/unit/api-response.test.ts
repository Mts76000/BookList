import { describe, expect, it } from "vitest";
import { apiSuccess, apiError } from "@/lib/api-response";

describe("apiSuccess", () => {
  it("returns the standard success envelope with a 200 default status", async () => {
    const res = apiSuccess({ id: 1 });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true, data: { id: 1 } });
  });

  it("includes an optional message and a custom status", async () => {
    const res = apiSuccess({ id: 1 }, "Created.", 201);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ success: true, data: { id: 1 }, message: "Created." });
  });
});

describe("apiError", () => {
  it("maps each error code to its default HTTP status", async () => {
    const res = apiError("NOT_FOUND", "Missing.");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({
      success: false,
      error: { code: "NOT_FOUND", message: "Missing." },
    });
  });

  it("never includes a details key when none is passed", async () => {
    const res = apiError("VALIDATION_ERROR", "Bad input.");
    const body = await res.json();
    expect(body.error).not.toHaveProperty("details");
  });

  it("includes details when passed", async () => {
    const res = apiError("VALIDATION_ERROR", "Bad input.", { field: "email" });
    const body = await res.json();
    expect(body.error.details).toEqual({ field: "email" });
  });

  it("allows overriding the default status code", async () => {
    const res = apiError("INTERNAL_ERROR", "Oops.", undefined, 503);
    expect(res.status).toBe(503);
  });
});
