import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[REVENUECAT-WEBHOOK] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Validate authorization header
    const webhookKey = Deno.env.get("REVENUECAT_WEBHOOK_AUTH_KEY");
    if (webhookKey) {
      const authHeader = req.headers.get("Authorization") ?? "";
      // Accept: "Bearer <key>", or just "<key>" directly
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
      if (token !== webhookKey) {
        log("Unauthorized request", { receivedHeader: authHeader ? "(present but mismatched)" : "(missing)" });
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json();
    const event = body.event;
    if (!event) {
      log("No event in body");
      return new Response(JSON.stringify({ error: "No event" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eventType: string = event.type;
    const appUserId: string = event.app_user_id;
    log("Event received", { eventType, appUserId });

    // Events we don't need to update the DB for
    if (eventType === "SUBSCRIBER_ALIAS") {
      log("Alias event - no action needed");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (eventType === "BILLING_ISSUE_DETECTED") {
      log("Billing issue detected", { appUserId });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Determine IAP status from the event
    let iapActive = false;
    let iapProductId: string | null = null;
    let iapExpiresAt: string | null = null;

    const grantEvents = ["INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION"];
    const revokeEvents = ["CANCELLATION", "EXPIRATION"];

    if (grantEvents.includes(eventType)) {
      iapActive = true;
      iapProductId = event.product_id ?? null;
      iapExpiresAt = event.expiration_at_ms
        ? new Date(event.expiration_at_ms).toISOString()
        : null;
      log("Granting Pro access", { iapProductId, iapExpiresAt });
    } else if (revokeEvents.includes(eventType)) {
      iapActive = false;
      iapProductId = event.product_id ?? null;
      iapExpiresAt = event.expiration_at_ms
        ? new Date(event.expiration_at_ms).toISOString()
        : null;
      log("Revoking Pro access", { iapProductId, iapExpiresAt });
    } else {
      log("Unhandled event type, skipping DB update", { eventType });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update profiles table using app_user_id (which is the Supabase user ID)
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        iap_active: iapActive,
        iap_product_id: iapProductId,
        iap_expires_at: iapExpiresAt,
        iap_updated_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq("user_id", appUserId);

    if (updateError) {
      log("Error updating profile", { error: updateError.message });
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log("Profile updated successfully", { appUserId, iapActive });
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
