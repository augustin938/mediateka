/**
 * lib/rate-limit.ts — простой in-memory rate limiter.
 * Использование: const { success } = limits.search(req);
 * if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
 */

interface RateLimitEntry { count: number; resetTime: number; }
const store = new Map<string, RateLimitEntry>();

if (typeof setInterval !== "undefined") {
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetTime < now) store.delete(key);
    }
  }, 5 * 60 * 1000);
  cleanupInterval.unref?.();
}

export function rateLimit(req: Request, namespace: string, limit = 60, windowSec = 60) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ?? "unknown";
  const key = `${namespace}:${ip}`;
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const entry = store.get(key);

  if (!entry || entry.resetTime < now) {
    store.set(key, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: limit - 1, reset: now + windowMs };
  }
  if (entry.count >= limit) {
    return { success: false, remaining: 0, reset: entry.resetTime };
  }
  entry.count++;
  return { success: true, remaining: limit - entry.count, reset: entry.resetTime };
}

export const limits = {
  search:       (req: Request) => rateLimit(req, "search",       30,   60),
  quiz:         (req: Request) => rateLimit(req, "quiz",         20,   60),
  api:          (req: Request) => rateLimit(req, "api",         100,   60),
  profileWrite: (req: Request) => rateLimit(req, "profileWrite", 10,   60),
  friends:      (req: Request) => rateLimit(req, "friends",      20, 3600),
};
