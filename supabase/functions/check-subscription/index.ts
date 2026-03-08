import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit } from "../_shared/rate-limiter.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const rateLimited = checkRateLimit(req, corsHeaders);
  if (rateLimited) return rateLimited;

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
    logStep("User authenticated via claims", { userId, email: userEmail });

    // Get user's profile for referral bonus days + IAP status
    const { data: profileData } = await supabaseClient
      .from("profiles")
      .select("referral_bonus_days, nova_wealth_user, iap_active, iap_product_id, iap_expires_at, created_at")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(userId);
    if (userError || !userData.user) {
      logStep("Failed to fetch user via admin", { error: userError?.message });
      return new Response(JSON.stringify({ error: "Failed to fetch user data" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    const user = userData.user;

    const referralBonusDays = profileData?.referral_bonus_days ?? 0;
    const isNovaWealthUser = profileData?.nova_wealth_user ?? false;
    logStep("Profile flags", { referralBonusDays, isNovaWealthUser });

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

    let hasActiveIAP = profileData?.iap_active ?? false;
    let iapExpiresDate: string | null = profileData?.iap_expires_at ?? null;

    if (hasActiveIAP && iapExpiresDate && new Date(iapExpiresDate) < new Date()) {
      hasActiveIAP = false;
    }
    logStep("IAP status from DB", { hasActiveIAP, iapExpiresDate });

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
