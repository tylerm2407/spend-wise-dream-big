/**
 * Simple in-memory rate limiter for edge functions.
 * Uses a sliding window approach with per-IP tracking.
 * Note: In serverless, memory resets per cold start, so this is best-effort.
 * For persistent rate limiting, use the DB-backed version below.
 */

const requestCounts = new Map<string, { count: number; windowStart: number }>();

export interface RateLimitConfig {
  windowMs: number;   // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

// Default: 30 requests per minute
const DEFAULT_CONFIG: RateLimitConfig = { windowMs: 60_000, maxRequests: 30 };

// Stricter for AI/expensive endpoints: 10 per minute
export const AI_RATE_LIMIT: RateLimitConfig = { windowMs: 60_000, maxRequests: 10 };

// Very strict for auth-sensitive endpoints: 5 per minute
export const AUTH_RATE_LIMIT: RateLimitConfig = { windowMs: 60_000, maxRequests: 5 };

// Webhook endpoints: 60 per minute (higher for automated systems)
export const WEBHOOK_RATE_LIMIT: RateLimitConfig = { windowMs: 60_000, maxRequests: 60 };

/**
 * Check if a request should be rate limited.
 * Returns null if allowed, or a Response if blocked.
 */
export function checkRateLimit(
  req: Request,
  corsHeaders: Record<string, string>,
  config: RateLimitConfig = DEFAULT_CONFIG
): Response | null {
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("cf-connecting-ip")
    || req.headers.get("x-real-ip")
    || "unknown";

  const now = Date.now();
  const key = `${clientIp}`;
  const entry = requestCounts.get(key);

  if (!entry || now - entry.windowStart > config.windowMs) {
    // New window
    requestCounts.set(key, { count: 1, windowStart: now });
    return null;
  }

  entry.count++;

  if (entry.count > config.maxRequests) {
    const retryAfterSec = Math.ceil((entry.windowStart + config.windowMs - now) / 1000);
    return new Response(
      JSON.stringify({
        error: "rate_limit_exceeded",
        message: "Too many requests. Please try again later.",
        retry_after_seconds: retryAfterSec,
      }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": String(retryAfterSec),
        },
      }
    );
  }

  return null;
}

// Cleanup stale entries periodically (every 5 min)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of requestCounts) {
    if (now - entry.windowStart > 300_000) {
      requestCounts.delete(key);
    }
  }
}, 300_000);
