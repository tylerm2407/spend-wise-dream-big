// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  "https://spend-wise-dream-big.lovable.app",
  "https://costclarity.app", // future custom domain
  "http://localhost:5173",
  "http://localhost:3000",
];

export function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

// Webhook endpoints that accept requests from external services (Stripe, RevenueCat)
// keep using wildcard CORS since the origin is not a browser
export const webhookCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};
