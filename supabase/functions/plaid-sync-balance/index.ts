import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit } from "../_shared/rate-limiter.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PLAID-SYNC-BALANCE] ${step}${detailsStr}`);
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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { account_id } = await req.json();
    if (!account_id) {
      return new Response(JSON.stringify({ error: "account_id is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Fetch the investment account (must belong to this user)
    const { data: account, error: accountError } = await supabaseAdmin
      .from("investment_accounts")
      .select("id, plaid_account_id, plaid_item_id")
      .eq("id", account_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (accountError || !account) {
      logStep("Account not found", { account_id, userId });
      return new Response(JSON.stringify({ error: "Account not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    if (!account.plaid_account_id || !account.plaid_item_id) {
      return new Response(JSON.stringify({ error: "Account is not linked to Plaid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Fetch the plaid_item using service role (access token is sensitive)
    const { data: plaidItem, error: itemError } = await supabaseAdmin
      .from("plaid_items")
      .select("access_token")
      .eq("id", account.plaid_item_id)
      .maybeSingle();

    if (itemError || !plaidItem) {
      logStep("Plaid item not found", { plaidItemId: account.plaid_item_id });
      return new Response(JSON.stringify({ error: "Plaid item not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

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
    logStep("Fetching balance from Plaid", { plaidAccountId: account.plaid_account_id });

    const balanceRes = await fetch(`${plaidBaseUrl}/accounts/balance/get`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: plaidClientId,
        secret: plaidSecret,
        access_token: plaidItem.access_token,
      }),
    });

    if (!balanceRes.ok) {
      const errBody = await balanceRes.text();
      logStep("Plaid balance fetch error", { status: balanceRes.status, body: errBody });
      return new Response(JSON.stringify({ error: "Failed to fetch balance from Plaid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 502,
      });
    }

    const balanceData = await balanceRes.json();
    const matchedAccount = (balanceData.accounts ?? []).find(
      (a: { account_id: string }) => a.account_id === account.plaid_account_id
    );

    if (!matchedAccount) {
      logStep("Account not found in Plaid response", { plaidAccountId: account.plaid_account_id });
      return new Response(JSON.stringify({ error: "Account not found in Plaid response" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    const balance = matchedAccount.balances?.current ?? matchedAccount.balances?.available ?? null;
    const syncedAt = new Date().toISOString();

    logStep("Balance fetched", { balance, syncedAt });

    // Update investment_account with new balance
    const { error: updateError } = await supabaseAdmin
      .from("investment_accounts")
      .update({
        plaid_balance: balance,
        plaid_balance_synced_at: syncedAt,
        updated_at: syncedAt,
      })
      .eq("id", account_id);

    if (updateError) {
      logStep("Failed to update balance", { error: updateError.message });
      return new Response(JSON.stringify({ error: "Failed to update balance" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    logStep("Balance synced successfully");

    return new Response(JSON.stringify({ balance, synced_at: syncedAt }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in plaid-sync-balance", { message: errorMessage });
    return new Response(JSON.stringify({ error: "Failed to sync balance" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
