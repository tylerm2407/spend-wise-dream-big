import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    
    // Use getClaims for fast JWT validation
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      logStep("Auth failed", { error: claimsError?.message });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;
    const userCreatedAtRaw = claimsData.claims.iat; // We'll need to fetch created_at from profile or getUser
    logStep("User authenticated via claims", { userId, email: userEmail });

    // Fetch full user to get created_at for trial calculation
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Failed to fetch user data" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    const user = userData.user;

    // Get user's profile for referral bonus days + IAP status
    const { data: profileData } = await supabaseClient
      .from("profiles")
      .select("referral_bonus_days, nova_wealth_user, iap_active, iap_product_id, iap_expires_at")
      .eq("user_id", user.id)
      .maybeSingle();

    const referralBonusDays = profileData?.referral_bonus_days ?? 0;
    const isNovaWealthUser = profileData?.nova_wealth_user ?? false;
    logStep("Profile flags", { referralBonusDays, isNovaWealthUser });

    // Nova Wealth users always get Pro access
    if (isNovaWealthUser) {
      logStep("Nova Wealth user - granting Pro access");
      return new Response(JSON.stringify({
        subscribed: false,
        is_in_trial: false,
        trial_days_remaining: 0,
        has_pro_access: true,
        is_nova_wealth: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Calculate 30-day Pro trial from account creation
    const userCreatedAt = new Date(user.created_at);
    const trialEndDate = new Date(userCreatedAt);
    trialEndDate.setDate(trialEndDate.getDate() + 30 + referralBonusDays);
    const now = new Date();
    const isInTrial = now < trialEndDate;
    const trialDaysRemaining = isInTrial 
      ? Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    logStep("Trial status calculated", { 
      userCreatedAt: userCreatedAt.toISOString(), 
      trialEndDate: trialEndDate.toISOString(),
      isInTrial,
      trialDaysRemaining,
      referralBonusDays
    });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ 
        subscribed: false,
        is_in_trial: isInTrial,
        trial_days_remaining: trialDaysRemaining,
        trial_end_date: trialEndDate.toISOString(),
        has_pro_access: isInTrial,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const hasActiveSub = subscriptions.data.length > 0;
    let productId = null;
    let subscriptionEnd = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      logStep("Active subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd });
      productId = subscription.items.data[0].price.product;
      logStep("Determined subscription product", { productId });
    } else {
      logStep("No active subscription found");
    }

    // Check IAP status from profiles table (synced by revenuecat-webhook)
    let hasActiveIAP = profileData?.iap_active ?? false;
    let iapExpiresDate: string | null = profileData?.iap_expires_at ?? null;

    // If iap_active but expired, treat as inactive
    if (hasActiveIAP && iapExpiresDate && new Date(iapExpiresDate) < new Date()) {
      hasActiveIAP = false;
    }
    logStep("IAP status from DB", { hasActiveIAP, iapExpiresDate });

    // Pro access = Stripe subscribed OR in trial OR IAP active
    const hasProAccess = hasActiveSub || isInTrial || hasActiveIAP;

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      subscription_end: subscriptionEnd,
      is_in_trial: isInTrial,
      trial_days_remaining: trialDaysRemaining,
      trial_end_date: trialEndDate.toISOString(),
      has_pro_access: hasProAccess,
      has_active_iap: hasActiveIAP,
      iap_expires_date: iapExpiresDate,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
