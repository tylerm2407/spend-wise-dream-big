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
     if (!authHeader) throw new Error("No authorization header provided");
     logStep("Authorization header found");
 
     const token = authHeader.replace("Bearer ", "");
     logStep("Authenticating user with token");
     
     const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
     if (userError) throw new Error(`Authentication error: ${userError.message}`);
     const user = userData.user;
     if (!user?.email) throw new Error("User not authenticated or email not available");
     logStep("User authenticated", { userId: user.id, email: user.email });
 
     // Get user's created_at date to calculate trial status
     const userCreatedAt = new Date(user.created_at);
     const trialEndDate = new Date(userCreatedAt);
     trialEndDate.setDate(trialEndDate.getDate() + 30);
     const now = new Date();
     const isInTrial = now < trialEndDate;
     const trialDaysRemaining = isInTrial 
       ? Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
       : 0;
 
     logStep("Trial status calculated", { 
       userCreatedAt: userCreatedAt.toISOString(), 
       trialEndDate: trialEndDate.toISOString(),
       isInTrial,
       trialDaysRemaining 
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
         has_access: isInTrial
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
 
     // User has access if they're subscribed OR in trial
     const hasAccess = hasActiveSub || isInTrial;
 
     return new Response(JSON.stringify({
       subscribed: hasActiveSub,
       product_id: productId,
       subscription_end: subscriptionEnd,
       is_in_trial: isInTrial,
       trial_days_remaining: trialDaysRemaining,
       trial_end_date: trialEndDate.toISOString(),
       has_access: hasAccess
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