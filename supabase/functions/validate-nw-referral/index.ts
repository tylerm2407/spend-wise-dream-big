import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { checkRateLimit } from "../_shared/rate-limiter.ts";
import { sanitizeReferralCode, sanitizeUUID } from "../_shared/input-sanitizer.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const SOURCE_APP = "costclarity";
const NW_API_BASE = "https://dbwuegchdysuocbpsprd.supabase.co/functions/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const rateLimited = checkRateLimit(req, corsHeaders);
  if (rateLimited) return rateLimited;

  try {
    const crossAppSecret = Deno.env.get("CROSS_APP_SECRET");
    if (!crossAppSecret) throw new Error("CROSS_APP_SECRET not configured");

    const body = await req.json();
    const referral_code = sanitizeReferralCode(body.referral_code);
    const referred_user_id = sanitizeUUID(body.referred_user_id);

    if (!referral_code) {
      return new Response(
        JSON.stringify({ valid: false, reason: "no_code_provided" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Proxy to NovaWealth validate-referral with server secret
    const validateRes = await fetch(`${NW_API_BASE}/validate-referral`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-secret": crossAppSecret,
      },
      body: JSON.stringify({
        referral_code,
        source_app: SOURCE_APP,
        referred_user_id: referred_user_id || null,
      }),
    });

    const data = await validateRes.json();
    console.log("[VALIDATE-NW-REFERRAL]", JSON.stringify(data));

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[VALIDATE-NW-REFERRAL] ERROR:", msg);
    return new Response(
      JSON.stringify({ valid: false, reason: "server_error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
