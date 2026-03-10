import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { verifyUser } from "../_shared/auth-helper.ts";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PLAID-DISCONNECT] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { user, error: authError } = await verifyUser(req);
    if (authError || !user) {
      logStep("Auth failed", { error: authError });
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

    const { plaid_item_id } = await req.json();
    if (!plaid_item_id) {
      return new Response(JSON.stringify({ error: "plaid_item_id is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Fetch the plaid_item — must belong to this user
    const { data: plaidItem, error: itemError } = await supabaseAdmin
      .from("plaid_items")
      .select("id, access_token")
      .eq("id", plaid_item_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (itemError || !plaidItem) {
      logStep("Plaid item not found or unauthorized", { plaid_item_id, userId });
      return new Response(JSON.stringify({ error: "Item not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Revoke the Plaid access token
    const plaidClientId = Deno.env.get("PLAID_CLIENT_ID");
    const plaidSecret = Deno.env.get("PLAID_SECRET");
    const plaidEnv = Deno.env.get("PLAID_ENV") ?? "sandbox";
    const plaidBaseUrl = `https://${plaidEnv}.plaid.com`;

    if (plaidClientId && plaidSecret) {
      try {
        const removeRes = await fetch(`${plaidBaseUrl}/item/remove`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: plaidClientId,
            secret: plaidSecret,
            access_token: plaidItem.access_token,
          }),
        });
        if (!removeRes.ok) {
          const body = await removeRes.text();
          logStep("Plaid item/remove failed (non-fatal)", { status: removeRes.status, body });
        } else {
          logStep("Plaid access token revoked");
        }
      } catch (err) {
        logStep("Plaid remove request failed (non-fatal)", { error: err instanceof Error ? err.message : String(err) });
      }
    }

    // Nullify plaid columns on investment_accounts linked to this item
    await supabaseAdmin
      .from("investment_accounts")
      .update({
        plaid_item_id: null,
        plaid_account_id: null,
        plaid_balance: null,
        plaid_balance_synced_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("plaid_item_id", plaid_item_id)
      .eq("user_id", userId);

    // Delete linked_bank_accounts for this item
    await supabaseAdmin
      .from("linked_bank_accounts")
      .delete()
      .eq("plaid_item_id", plaid_item_id)
      .eq("user_id", userId);

    // Delete the plaid_item record
    const { error: deleteError } = await supabaseAdmin
      .from("plaid_items")
      .delete()
      .eq("id", plaid_item_id)
      .eq("user_id", userId);

    if (deleteError) {
      logStep("Failed to delete plaid_item", { error: deleteError.message });
      return new Response(JSON.stringify({ error: "Failed to disconnect account" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    logStep("Disconnected successfully", { plaid_item_id });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in plaid-disconnect", { message: errorMessage });
    return new Response(JSON.stringify({ error: "Failed to disconnect account" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
