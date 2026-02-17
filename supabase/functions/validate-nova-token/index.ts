import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const NW_VALIDATE_URL = "https://dbwuegchdysuocbpsprd.supabase.co/functions/v1/validate-auth-token";
const NW_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRid3VlZ2NoZHlzdW9jYnBzcHJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNzYyMTAsImV4cCI6MjA4Njc1MjIxMH0.6LEKjLXhaxeRublNoAITpVVueHwpUPuLxS0sbgcTUlE";

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[VALIDATE-NOVA-TOKEN] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const localAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { token } = await req.json();
    if (!token) throw new Error("No token provided");
    log("Token received, validating against NovaWealth");

    // Step 1: Call NovaWealth's validate-auth-token endpoint
    const validateRes = await fetch(NW_VALIDATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: NW_ANON_KEY,
        Authorization: `Bearer ${NW_ANON_KEY}`,
      },
      body: JSON.stringify({ token }),
    });

    const validateData = await validateRes.json();
    if (!validateData.valid) {
      throw new Error(validateData.error || "Invalid or expired token");
    }

    const email = validateData.email;
    log("NovaWealth token valid", { email });

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

    const tokenHash = linkData.properties?.hashed_token;
    log("Magic link generated successfully");

    return new Response(JSON.stringify({
      success: true,
      email,
      token_hash: tokenHash,
      user_id: userId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
