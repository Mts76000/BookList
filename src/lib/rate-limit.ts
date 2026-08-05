// Rate limiter en mémoire, simple et sans dépendance externe.
// Suffisant pour une instance unique (Coolify/Docker). Si l'app est
// scalée horizontalement, il faudra migrer vers un store partagé (Redis).

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

// Nettoyage périodique pour éviter une fuite mémoire
setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key)
  }
}, 5 * 60 * 1000).unref?.()

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) return forwardedFor.split(",")[0].trim()
  return request.headers.get("x-real-ip") || "unknown"
}

/**
 * Retourne { success: false } si la limite est dépassée pour cette clé.
 */
export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): { success: boolean; remaining: number } {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { success: true, remaining: limit - 1 }
  }

  if (bucket.count >= limit) {
    return { success: false, remaining: 0 }
  }

  bucket.count += 1
  return { success: true, remaining: limit - bucket.count }
}
