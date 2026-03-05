import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit } from "../_shared/rate-limiter.ts";
import { sanitizeReferralCode, sanitizeUUID, sanitizeString, invalidInputResponse } from "../_shared/input-sanitizer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SOURCE_APP = "costclarity";
const NW_API_BASE = "https://dbwuegchdysuocbpsprd.supabase.co/functions/v1";

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[TRACK-NW-REFERRAL] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const rateLimited = checkRateLimit(req, corsHeaders);
  if (rateLimited) return rateLimited;

  try {
    const crossAppSecret = Deno.env.get("CROSS_APP_SECRET");
    if (!crossAppSecret) throw new Error("CROSS_APP_SECRET not configured");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Invalid auth token");

    const userId = userData.user.id;
    const body = await req.json();
    const referral_code = sanitizeReferralCode(body.referral_code);
    const referral_code_id = sanitizeUUID(body.referral_code_id);
    const referrer_user_id = sanitizeUUID(body.referrer_user_id);
    const event = sanitizeString(body.event, 50);

    const validEvents = ["signup", "subscription_created", "first_payment"];

    log("Tracking referral", { userId, referral_code, event });

    if (!referral_code || !referrer_user_id || !event || !validEvents.includes(event)) {
      return invalidInputResponse("referral_code, referrer_user_id, or event", corsHeaders);
    }

    // Call NovaWealth track-referral endpoint (server-to-server)
    const trackRes = await fetch(`${NW_API_BASE}/track-referral`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-secret": crossAppSecret,
      },
      body: JSON.stringify({
        referral_code,
        referral_code_id: referral_code_id || null,
        referrer_user_id,
        referred_user_id: userId,
        source_app: SOURCE_APP,
        event,
      }),
    });

    const trackData = await trackRes.json();
    log("Track response", trackData);

    if (!trackRes.ok) {
      throw new Error(trackData.error || "Failed to track referral");
    }

    return new Response(JSON.stringify(trackData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
