type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let callsSinceCleanup = 0;

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

/** Prosty limiter dla pojedynczej instancji aplikacji. */
export function takeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): RateLimitResult {
  callsSinceCleanup += 1;
  if (callsSinceCleanup >= 1000) {
    callsSinceCleanup = 0;
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
  }

  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function clientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ??
    "unknown"
  );
}
