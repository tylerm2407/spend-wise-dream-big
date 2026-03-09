import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, WEBHOOK_RATE_LIMIT } from "../_shared/rate-limiter.ts";

// Webhooks are server-to-server — no CORS headers needed
const corsHeaders = {
  "Content-Type": "application/json",
};

/** Constant-time string comparison to prevent timing attacks */
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  if (aBytes.length !== bBytes.length) {
    await crypto.subtle.digest("SHA-256", aBytes);
    return false;
  }
  const aKey = await crypto.subtle.importKey("raw", aBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const aHash = await crypto.subtle.sign("HMAC", aKey, bBytes);
  const bKey = await crypto.subtle.importKey("raw", bBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bHash = await crypto.subtle.sign("HMAC", bKey, aBytes);
  const aView = new Uint8Array(aHash);
  const bView = new Uint8Array(bHash);
  let diff = 0;
  for (let i = 0; i < aView.length; i++) diff |= aView[i] ^ bView[i];
  return diff === 0;
}

/** Validate iap_expires_at is a sane timestamp (between 2020 and 2100) */
function sanitizeExpiresAt(ms: unknown): string | null {
  if (ms === null || ms === undefined) return null;
  const num = Number(ms);
  if (isNaN(num)) return null;
  const MIN_MS = 1577836800000; // 2020-01-01
  const MAX_MS = 4102444800000; // 2100-01-01
  if (num < MIN_MS || num > MAX_MS) return null;
  return new Date(num).toISOString();
}

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[REVENUECAT-WEBHOOK] ${step}${d}`);
};

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  const rateLimited = checkRateLimit(req, corsHeaders, WEBHOOK_RATE_LIMIT);
  if (rateLimited) return rateLimited;

  try {
    // Validate authorization header using constant-time comparison to prevent timing attacks
    const webhookKey = Deno.env.get("REVENUECAT_WEBHOOK_AUTH_KEY") ?? "";
    if (webhookKey) {
      const authHeader = req.headers.get("Authorization") ?? "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
      if (!(await timingSafeEqual(token, webhookKey))) {
        log("Unauthorized request");
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: corsHeaders,
        });
      }
    }

    const body = await req.json();
    const event = body.event;
    if (!event) {
      log("No event in body");
      return new Response(JSON.stringify({ error: "No event" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const eventType: string = String(event.type || "").slice(0, 50);
    const appUserId: string = String(event.app_user_id || "").slice(0, 100);
    log("Event received", { eventType, appUserId });

    if (eventType === "SUBSCRIBER_ALIAS") {
      log("Alias event - no action needed");
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    if (eventType === "BILLING_ISSUE_DETECTED") {
      log("Billing issue detected", { appUserId });
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    let iapActive = false;
    let iapProductId: string | null = null;
    let iapExpiresAt: string | null = null;

    const grantEvents = ["INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION"];
    const revokeEvents = ["CANCELLATION", "EXPIRATION"];

    if (grantEvents.includes(eventType)) {
      iapActive = true;
      iapProductId = event.product_id ? String(event.product_id).slice(0, 100) : null;
      iapExpiresAt = sanitizeExpiresAt(event.expiration_at_ms);
      log("Granting Pro access", { iapProductId, iapExpiresAt });
    } else if (revokeEvents.includes(eventType)) {
      iapActive = false;
      iapProductId = event.product_id ? String(event.product_id).slice(0, 100) : null;
      iapExpiresAt = sanitizeExpiresAt(event.expiration_at_ms);
      log("Revoking Pro access", { iapProductId, iapExpiresAt });
    } else {
      log("Unhandled event type, skipping DB update", { eventType });
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

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
      return new Response(JSON.stringify({ error: "Database error" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    log("Profile updated successfully", { appUserId, iapActive });
    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
