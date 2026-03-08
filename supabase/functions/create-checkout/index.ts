import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { checkRateLimit, AUTH_RATE_LIMIT } from "../_shared/rate-limiter.ts";
import { sanitizeReferralCode, sanitizePriceId, sanitizeUUID } from "../_shared/input-sanitizer.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const DEFAULT_PRICE_ID = "price_1T1WqDAmUZkn8na4hChXph3w";
const NW_REFERRAL_COUPON = "jPSNu7Zh";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const rateLimited = checkRateLimit(req, corsHeaders, AUTH_RATE_LIMIT);
  if (rateLimited) return rateLimited;

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    // Parse and sanitize request body
    let referralCode: string | null = null;
    let referrerId: string | null = null;
    let isUnauthenticated = false;
    let priceId: string = DEFAULT_PRICE_ID;
    try {
      const body = await req.json();
      referralCode = sanitizeReferralCode(body.referral_code);
      referrerId = sanitizeUUID(body.referrer_id);
      isUnauthenticated = body.unauthenticated === true;
      const sanitizedPriceId = sanitizePriceId(body.price_id);
      if (sanitizedPriceId) {
        priceId = sanitizedPriceId;
      }
    } catch {
      // No body or invalid JSON — proceed without extras
    }
    logStep("Request data", { referralCode, referrerId, isUnauthenticated, priceId });

    let userEmail: string | undefined;
    let customerId: string | undefined;

    const authHeader = req.headers.get("Authorization");
    if (authHeader && !isUnauthenticated) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      const user = data.user;
      if (user?.email) {
        userEmail = user.email;
        logStep("User authenticated", { userId: user.id, email: user.email });
      }
    }

    if (!isUnauthenticated && !userEmail) {
      throw new Error("User not authenticated or email not available");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    if (userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Found existing customer", { customerId });
      }
    }

    const origin = req.headers.get("origin") || "https://spend-wise-dream-big.lovable.app";

    // Build session params
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/subscription-success`,
      cancel_url: `${origin}/signup`,
      subscription_data: {
        trial_period_days: 30,
      },
    };

    // Apply referral coupon only if valid referral data provided
    // Referral coupons should only be applied to monthly plans
    if (referralCode && referrerId && priceId === DEFAULT_PRICE_ID) {
      sessionParams.discounts = [{ coupon: NW_REFERRAL_COUPON }];
      sessionParams.metadata = {
        referrer_id: referrerId,
        referral_code: referralCode,
      };
      logStep("Applying referral coupon", { coupon: NW_REFERRAL_COUPON, referralCode });
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
