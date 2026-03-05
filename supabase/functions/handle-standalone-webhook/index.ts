import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, WEBHOOK_RATE_LIMIT } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STANDALONE-WEBHOOK] ${step}${d}`);
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

  const rateLimited = checkRateLimit(req, corsHeaders, WEBHOOK_RATE_LIMIT);
  if (rateLimited) return rateLimited;

  try {
    // Validate webhook secret
    const webhookSecret = Deno.env.get("NOVAWEALTH_WEBHOOK_SECRET");
    const incomingSecret = req.headers.get("x-webhook-secret") ?? "";

    if (!webhookSecret || incomingSecret !== webhookSecret) {
      log("Unauthorized request");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    const eventType: string = String(event.type || "").slice(0, 50);
    const appUserId: string = String(event.app_user_id || "").slice(0, 100);
    log("Event received", { eventType, appUserId });

    if (eventType === "SUBSCRIBER_ALIAS" || eventType === "BILLING_ISSUE_DETECTED") {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const grantEvents = ["INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION"];
    const revokeEvents = ["CANCELLATION", "EXPIRATION"];

    let standaloneActive = false;
    if (grantEvents.includes(eventType)) {
      standaloneActive = true;
      log("Granting standalone access", { appUserId });
    } else if (revokeEvents.includes(eventType)) {
      standaloneActive = false;
      log("Revoking standalone access", { appUserId });
    } else {
      log("Unhandled event type", { eventType });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: upsertError } = await supabase
      .from("user_access")
      .upsert(
        {
          id: appUserId,
          standalone_subscriber: standaloneActive,
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

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        iap_active: standaloneActive,
        iap_product_id: event.product_id ? String(event.product_id).slice(0, 100) : null,
        iap_expires_at: event.expiration_at_ms
          ? new Date(event.expiration_at_ms).toISOString()
          : null,
        iap_updated_at: new Date().toISOString(),
      } as Record<string, unknown>)
      .eq("user_id", appUserId);

    if (profileError) {
      log("Profile update error (non-fatal)", { error: profileError.message });
    }

    log("Standalone access updated", { appUserId, standaloneActive });
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
