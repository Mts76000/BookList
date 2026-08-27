import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

/** In-memory fallback limiter, used whenever Upstash Redis isn't configured (dev/test). */
class MemoryRatelimit {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  async limitKey(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return { success: true, remaining: this.limit - 1, reset: now + this.windowMs };
    }

    bucket.count += 1;
    return {
      success: bucket.count <= this.limit,
      remaining: Math.max(0, this.limit - bucket.count),
      reset: bucket.resetAt,
    };
  }
}

const upstashConfigured = Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);

const redis = upstashConfigured
  ? new Redis({ url: env.UPSTASH_REDIS_REST_URL!, token: env.UPSTASH_REDIS_REST_TOKEN! })
  : null;

/**
 * Creates a rate limiter for a given action (e.g. "login", "register"). Backed by
 * Upstash Redis in production when UPSTASH_REDIS_REST_URL/TOKEN are set; falls back to
 * an in-memory limiter otherwise (fine for dev/test/single-instance, not for multi-instance prod).
 */
export function createRateLimiter(name: string, limit: number, windowSeconds: number) {
  if (redis) {
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      prefix: `ratelimit:${name}`,
    });
    return {
      check: async (identifier: string): Promise<RateLimitResult> => {
        const result = await ratelimit.limit(identifier);
        return { success: result.success, remaining: result.remaining, reset: result.reset };
      },
    };
  }

  const memory = new MemoryRatelimit(limit, windowSeconds * 1000);
  return { check: (identifier: string) => memory.limitKey(`${name}:${identifier}`) };
}
