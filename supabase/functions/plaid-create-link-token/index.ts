import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit } from "../_shared/rate-limiter.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PLAID-CREATE-LINK-TOKEN] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const rateLimited = checkRateLimit(req, corsHeaders);
  if (rateLimited) return rateLimited;

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      logStep("Auth failed", { error: userError?.message });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const userId = user.id;
    logStep("User authenticated", { userId });

    const plaidClientId = Deno.env.get("PLAID_CLIENT_ID");
    const plaidSecret = Deno.env.get("PLAID_SECRET");
    const plaidEnv = Deno.env.get("PLAID_ENV") ?? "sandbox";

    if (!plaidClientId || !plaidSecret) {
      logStep("Missing Plaid credentials");
      return new Response(JSON.stringify({ error: "Plaid credentials not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const plaidBaseUrl = `https://${plaidEnv}.plaid.com`;
    logStep("Calling Plaid link/token/create", { plaidEnv, userId });

    const plaidRes = await fetch(`${plaidBaseUrl}/link/token/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: plaidClientId,
        secret: plaidSecret,
        client_name: "CostClarity",
        user: { client_user_id: userId },
        products: ["investments"],
        country_codes: ["US"],
        language: "en",
      }),
    });

    if (!plaidRes.ok) {
      const errBody = await plaidRes.text();
      logStep("Plaid API error", { status: plaidRes.status, body: errBody });
      return new Response(JSON.stringify({ error: "Failed to create link token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 502,
      });
    }

    const plaidData = await plaidRes.json();
    logStep("Link token created successfully");

    return new Response(JSON.stringify({ link_token: plaidData.link_token }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in plaid-create-link-token", { message: errorMessage });
    return new Response(JSON.stringify({ error: "Failed to create link token" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
