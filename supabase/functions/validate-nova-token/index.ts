import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, AUTH_RATE_LIMIT } from "../_shared/rate-limiter.ts";
import { sanitizeString } from "../_shared/input-sanitizer.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const NW_VALIDATE_URL = "https://dbwuegchdysuocbpsprd.supabase.co/functions/v1/validate-auth-token";

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[VALIDATE-NOVA-TOKEN] ${step}${d}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const rateLimited = checkRateLimit(req, corsHeaders, AUTH_RATE_LIMIT);
  if (rateLimited) return rateLimited;

  const localAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const body = await req.json();

    const nwAnonKey = Deno.env.get("NOVAWEALTH_ANON_KEY");
    if (!nwAnonKey) throw new Error("NovaWealth integration not configured");

    const token = sanitizeString(body.token, 5000);
    if (!token) throw new Error("No token provided");
    log("Token received, validating against NovaWealth");

    // Step 1: Call NovaWealth's validate-auth-token endpoint
    const validateRes = await fetch(NW_VALIDATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: nwAnonKey,
        Authorization: `Bearer ${nwAnonKey}`,
      },
      body: JSON.stringify({ token }),
    });

    const validateData = await validateRes.json();
    if (!validateData.valid) {
      throw new Error("Invalid or expired token");
    }

    const email = validateData.email;
    const tier = sanitizeString(validateData.tier, 50) ?? "free";
    log("NovaWealth token valid", { email });

    // Action: validate-only — just return user info, no Supabase user creation
    if (body.action === "validate-only") {
      return new Response(JSON.stringify({
        valid: true,
        email,
        tier,
        user_id: validateData.user_id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Step 2: Find or create local user
    const { data: allUsers } = await localAdmin.auth.admin.listUsers();
    const existingUser = allUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      log("Existing local user found", { userId });
    } else {
      const randomPassword = crypto.randomUUID() + crypto.randomUUID();
      const { data: newUser, error: createError } = await localAdmin.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true,
      });
      if (createError || !newUser.user) {
        throw new Error(`Failed to create user: ${createError?.message}`);
      }
      userId = newUser.user.id;
      log("New local user created", { userId });
    }

    // Step 3: Mark as Nova Wealth user with Pro access
    await localAdmin
      .from("profiles")
      .update({ nova_wealth_user: true })
      .eq("user_id", userId);
    log("Profile updated with nova_wealth_user flag");

    // Step 4: Generate magic link for local sign-in
    const { data: linkData, error: linkError } = await localAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkError || !linkData) {
      throw new Error(`Failed to generate session: ${linkError?.message}`);
    }

    log("Magic link generated successfully");

    return new Response(JSON.stringify({
      success: true,
      email,
      tier,
      user_id: userId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: errorMessage });
    // Only surface safe error messages to clients
    const safeMessages = ["No token provided", "Invalid or expired token", "NovaWealth integration not configured"];
    const clientMessage = safeMessages.includes(errorMessage) ? errorMessage : "Token validation failed";
    return new Response(JSON.stringify({ error: clientMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
