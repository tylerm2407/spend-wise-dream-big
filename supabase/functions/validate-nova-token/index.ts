import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VALIDATE-NOVA-TOKEN] ${step}${detailsStr}`);
};

async function hmacSign(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const crossAppSecret = Deno.env.get("CROSS_APP_SECRET");
    if (!crossAppSecret) throw new Error("CROSS_APP_SECRET is not set");

    const { token } = await req.json();
    if (!token) throw new Error("No token provided");
    logStep("Token received");

    // Decode token
    let decoded: { email: string; timestamp: number; signature: string };
    try {
      decoded = JSON.parse(atob(token));
    } catch {
      throw new Error("Invalid token format");
    }

    const { email, timestamp, signature } = decoded;
    if (!email || !timestamp || !signature) {
      throw new Error("Token missing required fields");
    }
    logStep("Token decoded", { email, timestamp });

    // Check expiry (5 minutes)
    const now = Date.now();
    const age = now - timestamp;
    if (age > 5 * 60 * 1000) {
      throw new Error("Token expired");
    }
    if (age < 0) {
      throw new Error("Token timestamp is in the future");
    }
    logStep("Token age valid", { ageMs: age });

    // Verify HMAC signature
    const expectedSignature = await hmacSign(email + timestamp, crossAppSecret);
    if (signature !== expectedSignature) {
      throw new Error("Invalid token signature");
    }
    logStep("Signature verified");

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check if user exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      logStep("Existing user found", { userId });
    } else {
      // Auto-create account with random password
      const randomPassword = crypto.randomUUID() + crypto.randomUUID();
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true,
      });
      if (createError || !newUser.user) {
        throw new Error(`Failed to create user: ${createError?.message}`);
      }
      userId = newUser.user.id;
      logStep("New user created", { userId });
    }

    // Mark as Nova Wealth user
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ nova_wealth_user: true })
      .eq("user_id", userId);

    if (profileError) {
      logStep("Warning: failed to update profile", { error: profileError.message });
    }

    // Generate a magic link to sign the user in
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (linkError || !linkData) {
      throw new Error(`Failed to generate session: ${linkError?.message}`);
    }

    logStep("Magic link generated successfully");

    // Extract the token hash from the link properties
    const tokenHash = linkData.properties?.hashed_token;
    
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
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
