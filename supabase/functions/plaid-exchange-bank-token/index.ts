import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

const log = (step: string, details?: unknown) =>
  console.log(`[PLAID-EXCHANGE-BANK] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);

// Map Plaid top-level category to our purchase_category enum
function mapCategory(plaidCategories: string[]): string {
  if (!plaidCategories?.length) return "other";
  const top = (plaidCategories[0] ?? "").toLowerCase();
  const sub = (plaidCategories[1] ?? "").toLowerCase();

  if (top.includes("food") || top.includes("restaurant") || sub.includes("restaurant") || sub.includes("coffee")) return "dining";
  if (top.includes("travel") || sub.includes("airline") || sub.includes("hotel")) return "travel";
  if (top.includes("transport") || sub.includes("taxi") || sub.includes("gas station") || sub.includes("parking")) return "transportation";
  if (top.includes("recreation") || top.includes("entertainment") || sub.includes("movie") || sub.includes("sport")) return "entertainment";
  if (top.includes("shops") || top.includes("shopping") || sub.includes("superstore")) return "shopping";
  if (sub.includes("groceries") || sub.includes("supermarket")) return "groceries";
  if (top.includes("healthcare") || sub.includes("pharmacy") || sub.includes("hospital")) return "health";
  if (top.includes("service") && (sub.includes("internet") || sub.includes("phone") || sub.includes("electric") || sub.includes("gas"))) return "utilities";
  if (sub.includes("subscription") || sub.includes("streaming")) return "subscriptions";
  if (top.includes("shops")) return "shopping";
  return "other";
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    log("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Authenticate user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      log("Auth failed", { error: userError?.message });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Service role client for sensitive DB ops
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
    const plaidBaseUrl = `https://${plaidEnv}.plaid.com`;

    if (!plaidClientId || !plaidSecret) {
      return new Response(JSON.stringify({ error: "Plaid credentials not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Step 1: Exchange public token for access token
    log("Exchanging public token");
    const exchangeRes = await fetch(`${plaidBaseUrl}/item/public_token/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: plaidClientId, secret: plaidSecret, public_token }),
    });
    if (!exchangeRes.ok) {
      const body = await exchangeRes.text();
      log("Exchange error", { status: exchangeRes.status, body });
      return new Response(JSON.stringify({ error: "Failed to exchange token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 502,
      });
    }
    const { access_token, item_id } = await exchangeRes.json();
    log("Token exchanged", { item_id });

    // Step 2: Get institution info
    let institutionName: string | null = null;
    let institutionId: string | null = null;
    try {
      const itemRes = await fetch(`${plaidBaseUrl}/item/get`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: plaidClientId, secret: plaidSecret, access_token }),
      });
      if (itemRes.ok) {
        const itemData = await itemRes.json();
        institutionId = itemData.item?.institution_id ?? null;
        if (institutionId) {
          const instRes = await fetch(`${plaidBaseUrl}/institutions/get_by_id`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ client_id: plaidClientId, secret: plaidSecret, institution_id: institutionId, country_codes: ["US"] }),
          });
          if (instRes.ok) {
            const instData = await instRes.json();
            institutionName = instData.institution?.name ?? null;
          }
        }
      }
    } catch { log("Could not fetch institution info, continuing"); }

    // Step 3: Store plaid_item (access token is sensitive — service role only)
    const { data: plaidItem, error: itemInsertError } = await supabaseAdmin
      .from("plaid_items")
      .insert({ user_id: user.id, item_id, access_token, institution_id: institutionId, institution_name: institutionName })
      .select("id")
      .single();

    if (itemInsertError || !plaidItem) {
      log("Failed to store plaid item", { error: itemInsertError?.message });
      return new Response(JSON.stringify({ error: "Failed to store linked account" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Step 4: Get accounts with balances
    log("Fetching accounts");
    const balanceRes = await fetch(`${plaidBaseUrl}/accounts/balance/get`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: plaidClientId, secret: plaidSecret, access_token }),
    });

    const linkedAccounts: Array<{ id: string; name: string; type: string; mask: string | null }> = [];

    if (balanceRes.ok) {
      const balanceData = await balanceRes.json();
      const accounts = balanceData.accounts ?? [];
      log("Accounts fetched", { count: accounts.length });

      for (const acct of accounts) {
        const { data: linked, error: acctErr } = await supabaseAdmin
          .from("linked_bank_accounts")
          .upsert({
            user_id: user.id,
            plaid_item_id: plaidItem.id,
            plaid_account_id: acct.account_id,
            account_name: acct.official_name ?? acct.name,
            account_type: acct.subtype ?? acct.type,
            institution_name: institutionName,
            mask: acct.mask ?? null,
            current_balance: acct.balances?.current ?? null,
            available_balance: acct.balances?.available ?? null,
            balance_synced_at: new Date().toISOString(),
          }, { onConflict: "user_id,plaid_account_id" })
          .select("id, account_name, account_type, mask")
          .single();

        if (!acctErr && linked) {
          linkedAccounts.push({ id: linked.id, name: linked.account_name, type: linked.account_type, mask: linked.mask });
        }
      }
    }

    // Step 5: Sync recent transactions (last 30 days)
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    log("Syncing transactions", { startDate, endDate });
    let importedCount = 0;

    try {
      const txRes = await fetch(`${plaidBaseUrl}/transactions/get`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: plaidClientId,
          secret: plaidSecret,
          access_token,
          start_date: startDate,
          end_date: endDate,
          options: { count: 250, offset: 0 },
        }),
      });

      if (txRes.ok) {
        const txData = await txRes.json();
        const transactions = (txData.transactions ?? []).filter(
          (tx: { pending: boolean; amount: number }) => !tx.pending && tx.amount > 0 // only confirmed debits
        );
        log("Transactions fetched", { count: transactions.length });

        // Find linked_bank_account id for each Plaid account_id
        const accountIdMap: Record<string, string> = {};
        for (const acct of linkedAccounts) {
          // We need plaid_account_id → linked_bank_account.id mapping
          const { data: dbAcct } = await supabaseAdmin
            .from("linked_bank_accounts")
            .select("id, plaid_account_id")
            .eq("plaid_item_id", plaidItem.id)
            .single();
          if (dbAcct) accountIdMap[dbAcct.plaid_account_id] = dbAcct.id;
        }

        for (const tx of transactions) {
          const linkedAccountId = accountIdMap[tx.account_id] ?? null;
          const { error: insertError } = await supabaseAdmin
            .from("purchases")
            .insert({
              user_id: user.id,
              item_name: tx.merchant_name ?? tx.name,
              amount: Math.abs(tx.amount),
              category: mapCategory(tx.category ?? []),
              purchase_date: tx.date,
              source: "plaid",
              plaid_transaction_id: tx.transaction_id,
              linked_account_id: linkedAccountId,
              frequency: "one-time",
            });

          if (!insertError) importedCount++;
          // Duplicate (unique constraint violation) = already imported, skip silently
        }
        log("Transactions imported", { importedCount });
      }
    } catch (txErr) {
      log("Transaction sync failed (non-fatal)", { error: txErr instanceof Error ? txErr.message : String(txErr) });
    }

    return new Response(JSON.stringify({
      accounts: linkedAccounts,
      transactions_imported: importedCount,
      institution_name: institutionName,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    log("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: "Failed to link bank account" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
