import { describe, expect, it } from "vitest";
import { createRateLimiter } from "@/lib/rate-limit";

describe("createRateLimiter (in-memory fallback)", () => {
  it("allows requests up to the limit and blocks the next one", async () => {
    const limiter = createRateLimiter("test-action", 3, 60);
    const key = `user-${Math.random()}`;

    expect((await limiter.check(key)).success).toBe(true);
    expect((await limiter.check(key)).success).toBe(true);
    expect((await limiter.check(key)).success).toBe(true);
    expect((await limiter.check(key)).success).toBe(false);
  });

  it("tracks separate identifiers independently", async () => {
    const limiter = createRateLimiter("test-action-2", 1, 60);
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;

    expect((await limiter.check(a)).success).toBe(true);
    expect((await limiter.check(b)).success).toBe(true);
    expect((await limiter.check(a)).success).toBe(false);
  });
});
