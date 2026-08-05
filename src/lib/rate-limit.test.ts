import { describe, expect, it } from "vitest"
import { rateLimit } from "./rate-limit"

describe("rateLimit", () => {
  it("allows requests under the limit", () => {
    const key = `test-${Math.random()}`
    const result = rateLimit(key, { limit: 3, windowMs: 60_000 })
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(2)
  })

  it("blocks requests once the limit is reached", () => {
    const key = `test-${Math.random()}`
    rateLimit(key, { limit: 2, windowMs: 60_000 })
    rateLimit(key, { limit: 2, windowMs: 60_000 })
    const third = rateLimit(key, { limit: 2, windowMs: 60_000 })
    expect(third.success).toBe(false)
    expect(third.remaining).toBe(0)
  })

  it("tracks separate keys independently", () => {
    const keyA = `test-a-${Math.random()}`
    const keyB = `test-b-${Math.random()}`
    rateLimit(keyA, { limit: 1, windowMs: 60_000 })
    const resultB = rateLimit(keyB, { limit: 1, windowMs: 60_000 })
    expect(resultB.success).toBe(true)
  })

  it("resets after the window expires", async () => {
    const key = `test-${Math.random()}`
    rateLimit(key, { limit: 1, windowMs: 10 })
    await new Promise((resolve) => setTimeout(resolve, 20))
    const result = rateLimit(key, { limit: 1, windowMs: 10 })
    expect(result.success).toBe(true)
  })
})
