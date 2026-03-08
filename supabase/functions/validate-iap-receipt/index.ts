import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit } from "../_shared/rate-limiter.ts";
import { sanitizeString } from "../_shared/input-sanitizer.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[VALIDATE-IAP-RECEIPT] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const rateLimited = checkRateLimit(req, corsHeaders);
  if (rateLimited) return rateLimited;

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const rcApiKey = Deno.env.get("REVENUECAT_API_KEY");
    if (!rcApiKey) throw new Error("REVENUECAT_API_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const body = await req.json();
    const app_user_id = sanitizeString(body.app_user_id, 200);
    const rcUserId = app_user_id || user.id;
    logStep("Checking RevenueCat subscriber", { rcUserId });

    const rcRes = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(rcUserId)}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${rcApiKey}`,
        },
      }
    );

    if (!rcRes.ok) {
      const errText = await rcRes.text();
      throw new Error(`RevenueCat API error: ${rcRes.status} - ${errText}`);
    }

    const rcData = await rcRes.json();
    logStep("RevenueCat subscriber data received");

    const entitlements = rcData.subscriber?.entitlements || {};
    const proEntitlement = entitlements["pro"] || entitlements["Pro"] || entitlements["premium"] || entitlements["Premium"];

    let hasActiveIAP = false;
    let expiresDate: string | null = null;
    let productIdentifier: string | null = null;

    if (proEntitlement) {
      const expires = proEntitlement.expires_date;
      if (expires) {
        hasActiveIAP = new Date(expires) > new Date();
        expiresDate = expires;
      } else {
        hasActiveIAP = true;
      }
      productIdentifier = proEntitlement.product_identifier || null;
    }

    logStep("Entitlement check", { hasActiveIAP, expiresDate, productIdentifier });

    if (hasActiveIAP) {
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ nova_wealth_user: false })
        .eq("user_id", user.id);

      if (updateError) {
        logStep("Profile update warning", { error: updateError.message });
      }
    }

    return new Response(
      JSON.stringify({
        has_active_iap: hasActiveIAP,
        expires_date: expiresDate,
        product_identifier: productIdentifier,
        entitlements: Object.keys(entitlements),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
