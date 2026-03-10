import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit } from "../_shared/rate-limiter.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PLAID-EXCHANGE-TOKEN] ${step}${detailsStr}`);
};

const INVESTMENT_TYPES = new Set(["investment", "brokerage"]);
const INVESTMENT_SUBTYPES = new Set([
  "roth", "traditional ira", "401k", "brokerage", "ira", "403b", "457b",
  "pension", "retirement", "roth 401k", "sep ira", "simple ira", "ugma",
  "utma", "variable annuity",
]);

function mapSubtypeToAccountType(
  subtype: string | null
): "roth_ira" | "traditional_ira" | "401k" | "brokerage" | "savings" | "other" {
  const s = (subtype ?? "").toLowerCase();
  if (s === "roth" || s === "roth 401k") return "roth_ira";
  if (s === "traditional ira" || s === "ira" || s === "sep ira" || s === "simple ira") return "traditional_ira";
  if (s === "401k" || s === "403b" || s === "457b") return "401k";
  if (s === "brokerage") return "brokerage";
  if (s === "savings" || s === "money market" || s === "cd") return "savings";
  return "other";
}

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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      logStep("Auth failed", { error: claimsError?.message });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const userId = claimsData.claims.sub as string;
    logStep("User authenticated", { userId });

    // Service role client for DB operations (plaid_items has restrictive RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { public_token } = await req.json();
    if (!public_token) {
      return new Response(JSON.stringify({ error: "public_token is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
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

    // Step 1: Exchange public token for access token
    logStep("Exchanging public token");
    const exchangeRes = await fetch(`${plaidBaseUrl}/item/public_token/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: plaidClientId,
        secret: plaidSecret,
        public_token,
      }),
    });

    if (!exchangeRes.ok) {
      const errBody = await exchangeRes.text();
      logStep("Exchange error", { status: exchangeRes.status, body: errBody });
      return new Response(JSON.stringify({ error: "Failed to exchange token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 502,
      });
    }

    const { access_token, item_id } = await exchangeRes.json();
    logStep("Token exchanged", { item_id });

    // Step 2: Get accounts with balances
    logStep("Fetching account balances");
    const balanceRes = await fetch(`${plaidBaseUrl}/accounts/balance/get`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: plaidClientId,
        secret: plaidSecret,
        access_token,
      }),
    });

    if (!balanceRes.ok) {
      const errBody = await balanceRes.text();
      logStep("Balance fetch error", { status: balanceRes.status, body: errBody });
      return new Response(JSON.stringify({ error: "Failed to fetch account balances" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 502,
      });
    }

    const balanceData = await balanceRes.json();
    const allAccounts: Array<{
      account_id: string;
      balances: { current: number | null; available: number | null };
      name: string;
      official_name: string | null;
      type: string;
      subtype: string | null;
      mask: string | null;
    }> = balanceData.accounts ?? [];

    logStep("Accounts fetched", { count: allAccounts.length });

    // Filter to investment/retirement accounts
    const investmentAccounts = allAccounts.filter(
      (a) => INVESTMENT_TYPES.has(a.type) || INVESTMENT_SUBTYPES.has((a.subtype ?? "").toLowerCase())
    );

    logStep("Investment accounts filtered", { count: investmentAccounts.length });

    if (investmentAccounts.length === 0) {
      return new Response(
        JSON.stringify({ accounts: [], message: "No investment accounts found in this institution." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Step 3: Get institution info from Plaid item metadata
    const institutionId = balanceData.item?.institution_id ?? null;
    // Fetch institution name separately from Plaid if we have an institution_id
    let institutionName: string | null = null;
    if (institutionId && plaidClientId && plaidSecret) {
      try {
        const instRes = await fetch(`${plaidBaseUrl}/institutions/get_by_id`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: plaidClientId,
            secret: plaidSecret,
            institution_id: institutionId,
            country_codes: ["US"],
          }),
        });
        if (instRes.ok) {
          const instData = await instRes.json();
          institutionName = instData.institution?.name ?? null;
        }
      } catch {
        logStep("Could not fetch institution name, continuing");
      }
    }

    // Step 4: Store plaid_item (service role — access token is sensitive)
    const { data: plaidItem, error: itemInsertError } = await supabaseAdmin
      .from("plaid_items")
      .insert({
        user_id: userId,
        item_id,
        access_token,
        institution_id: institutionId,
        institution_name: institutionName,
      })
      .select("id")
      .single();

    if (itemInsertError || !plaidItem) {
      logStep("Failed to insert plaid_item", { error: itemInsertError?.message });
      return new Response(JSON.stringify({ error: "Failed to store linked item" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    logStep("Plaid item stored", { plaidItemId: plaidItem.id });

    // Step 5: Upsert investment_accounts for each Plaid account
    const syncedAt = new Date().toISOString();
    const linkedAccounts = [];

    for (const plaidAccount of investmentAccounts) {
      const accountType = mapSubtypeToAccountType(plaidAccount.subtype);
      const accountName = plaidAccount.official_name ?? plaidAccount.name;
      const balance = plaidAccount.balances.current ?? plaidAccount.balances.available ?? null;

      // Check if account already exists for this user + plaid_account_id
      const { data: existing } = await supabaseAdmin
        .from("investment_accounts")
        .select("id")
        .eq("user_id", userId)
        .eq("plaid_account_id", plaidAccount.account_id)
        .maybeSingle();

      let savedAccount;

      if (existing) {
        const { data: updated, error: updateError } = await supabaseAdmin
          .from("investment_accounts")
          .update({
            plaid_item_id: plaidItem.id,
            plaid_balance: balance,
            plaid_balance_synced_at: syncedAt,
            updated_at: syncedAt,
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (updateError) {
          logStep("Failed to update account", { error: updateError.message, accountId: existing.id });
          continue;
        }
        savedAccount = updated;
        logStep("Updated existing investment account", { accountId: existing.id });
      } else {
        const { data: inserted, error: insertError } = await supabaseAdmin
          .from("investment_accounts")
          .insert({
            user_id: userId,
            account_name: accountName,
            account_type: accountType,
            institution_name: institutionName,
            is_default: false,
            plaid_item_id: plaidItem.id,
            plaid_account_id: plaidAccount.account_id,
            plaid_balance: balance,
            plaid_balance_synced_at: syncedAt,
          })
          .select()
          .single();

        if (insertError) {
          logStep("Failed to insert account", { error: insertError.message });
          continue;
        }
        savedAccount = inserted;
        logStep("Created new investment account", { accountId: inserted.id });
      }

      // Return account without exposing access_token
      linkedAccounts.push({
        id: savedAccount.id,
        account_name: savedAccount.account_name,
        account_type: savedAccount.account_type,
        institution_name: savedAccount.institution_name,
        plaid_account_id: savedAccount.plaid_account_id,
        plaid_balance: savedAccount.plaid_balance,
        plaid_balance_synced_at: savedAccount.plaid_balance_synced_at,
      });
    }

    logStep("Exchange complete", { linkedCount: linkedAccounts.length });

    return new Response(JSON.stringify({ accounts: linkedAccounts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in plaid-exchange-token", { message: errorMessage });
    return new Response(JSON.stringify({ error: "Failed to link account" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
