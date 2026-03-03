import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SOURCE_APP = "costclarity";
const NW_API_BASE = "https://dbwuegchdysuocbpsprd.supabase.co/functions/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const crossAppSecret = Deno.env.get("CROSS_APP_SECRET");
    if (!crossAppSecret) throw new Error("CROSS_APP_SECRET not configured");

    const body = await req.json();
    const { referral_code, referred_user_id } = body;

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
        referral_code: referral_code.toUpperCase(),
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
