import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit } from "../_shared/rate-limiter.ts";
import { sanitizeUUID, sanitizeEmail, invalidInputResponse } from "../_shared/input-sanitizer.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SYNC-NOVAWEALTH] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const rateLimited = checkRateLimit(req, corsHeaders);
  if (rateLimited) return rateLimited;

  try {
    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const body = await req.json();
    const user_id = sanitizeUUID(body.user_id);
    const email = sanitizeEmail(body.email);

    // Ensure the caller is requesting for themselves
    if (user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!email) return invalidInputResponse("email", corsHeaders);

    log("Checking NovaWealth subscription", { userId, email });

    // Call the external NovaWealth verify endpoint
    const webhookSecret = Deno.env.get("NOVAWEALTH_WEBHOOK_SECRET");
    if (!webhookSecret) {
      log("NOVAWEALTH_WEBHOOK_SECRET not set");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const verifyUrl = Deno.env.get("NOVAWEALTH_VERIFY_URL");
    if (!verifyUrl) {
      log("NOVAWEALTH_VERIFY_URL not set");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let novaSubscriber = false;
    let nwResponseData: Record<string, unknown> = {};
    try {
      const nwRes = await fetch(verifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webhook-secret": webhookSecret,
        },
        body: JSON.stringify({ user_email: email }),
      });

      if (nwRes.ok) {
        const nwData = await nwRes.json();
        nwResponseData = nwData;
        novaSubscriber = nwData.novawealth_subscriber === true || nwData.subscription_tier === "paid";
        log("NovaWealth API response", { status: nwRes.status, novaSubscriber, nwData });
      } else {
        const errText = await nwRes.text();
        log("NovaWealth API error", { status: nwRes.status, body: errText });
      }
    } catch (err) {
      log("NovaWealth API call failed", { error: err instanceof Error ? err.message : String(err) });
    }

    // Upsert into user_access
    const { error: upsertError } = await supabase
      .from("user_access")
      .upsert(
        {
          id: userId,
          email,
          novawealth_subscriber: novaSubscriber,
          last_novawealth_check: new Date().toISOString(),
        },
        { onConflict: "id", ignoreDuplicates: false }
      );

    if (upsertError) {
      log("Upsert error", { error: upsertError.message });
      return new Response(JSON.stringify({ error: upsertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log("Access synced successfully", { userId, novaSubscriber });

    return new Response(
      JSON.stringify({ novawealth_subscriber: novaSubscriber, synced: true, ...nwResponseData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
