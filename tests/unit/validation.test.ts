import { describe, expect, it } from "vitest";
import { z } from "zod";
import { validateBody } from "@/lib/validation";

const schema = z.object({ email: z.email(), age: z.number().min(18) });

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("validateBody", () => {
  it("returns parsed data on success", async () => {
    const result = await validateBody(schema, jsonRequest({ email: "a@b.com", age: 20 }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ email: "a@b.com", age: 20 });
    }
  });

  it("returns a VALIDATION_ERROR response for invalid fields", async () => {
    const result = await validateBody(schema, jsonRequest({ email: "not-an-email", age: 10 }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(body.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("returns a VALIDATION_ERROR response for a malformed JSON body", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not-json",
    });
    const result = await validateBody(schema, request);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(400);
    }
  });
});
