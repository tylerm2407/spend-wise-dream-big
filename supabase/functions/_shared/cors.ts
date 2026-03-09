/**
 * Shared CORS helper — restricts Access-Control-Allow-Origin to known domains
 * instead of the unsafe wildcard "*".
 *
 * Mobile (Capacitor) requests don't send an Origin header, so they are
 * unaffected by this restriction and will always receive valid CORS headers.
 */

const CORS_ALLOW_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";

/** All domains allowed to call these functions from a browser. */
const ALLOWED_ORIGINS: string[] = [
  "https://costclaritypro.com",
  "https://www.costclaritypro.com",
  "https://spend-wise-dream-big.lovable.app",
  "https://costclarity.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

/**
 * Returns CORS headers scoped to the request's Origin.
 * If the origin is not in the allowlist the first allowed origin is used,
 * which browsers will reject — preventing cross-origin abuse.
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const isAllowed =
    ALLOWED_ORIGINS.includes(origin) ||
    /^https:\/\/[a-z0-9-]+--[a-z0-9-]+\.lovable\.app$/.test(origin) ||
    origin.endsWith(".lovable.app");
  const allowedOrigin = isAllowed ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": CORS_ALLOW_HEADERS,
    "Vary": "Origin",
  };
}

/** For webhook endpoints that receive requests from external services (Stripe, RevenueCat). */
export const webhookCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};
