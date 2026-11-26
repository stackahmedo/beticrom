import type { Context, Next } from "hono";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function rateLimit(options: { windowMs: number; max: number; keyPrefix: string }) {
  return async (c: Context, next: Next) => {
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      c.req.header("x-real-ip") ||
      "local";
    const key = `${options.keyPrefix}:${ip}`;
    const now = Date.now();
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      await next();
      return;
    }

    if (existing.count >= options.max) {
      const retryAfterSec = Math.ceil((existing.resetAt - now) / 1000);
      c.header("Retry-After", String(retryAfterSec));
      return c.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests. Please try again later.",
          },
        },
        429
      );
    }

    existing.count += 1;
    await next();
  };
}

export function clearRateLimitBuckets(): void {
  buckets.clear();
}
