import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[APPLY-REFERRAL] ${step}${detailsStr}`);
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { referral_code } = await req.json();
    if (!referral_code) throw new Error("Referral code is required");
    logStep("Referral code received", { referral_code });

    // Find the referrer's profile by code
    const { data: referrerProfile, error: referrerError } = await supabaseClient
      .from("profiles")
      .select("id, user_id, referral_bonus_days")
      .eq("referral_code", referral_code.toUpperCase())
      .single();

    if (referrerError || !referrerProfile) {
      throw new Error("Invalid referral code");
    }
    logStep("Referrer found", { referrerId: referrerProfile.id });

    // Prevent self-referral
    if (referrerProfile.user_id === user.id) {
      throw new Error("You cannot refer yourself");
    }

    // Check if this user was already referred
    const { data: existingReferral } = await supabaseClient
      .from("referrals")
      .select("id")
      .eq("referred_user_id", user.id)
      .maybeSingle();

    if (existingReferral) {
      throw new Error("You have already been referred");
    }

    // Get the current user's profile
    const { data: currentProfile } = await supabaseClient
      .from("profiles")
      .select("id, referred_by")
      .eq("user_id", user.id)
      .single();

    if (currentProfile?.referred_by) {
      throw new Error("You have already used a referral code");
    }

    // Create the referral record
    const { error: insertError } = await supabaseClient
      .from("referrals")
      .insert({
        referrer_id: referrerProfile.id,
        referred_user_id: user.id,
      });

    if (insertError) throw new Error(`Failed to create referral: ${insertError.message}`);
    logStep("Referral record created");

    // Update the current user's profile to mark who referred them
    await supabaseClient
      .from("profiles")
      .update({ referred_by: referrerProfile.id })
      .eq("user_id", user.id);

    // Count total referrals for the referrer
    const { count } = await supabaseClient
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_id", referrerProfile.id);

    const totalReferrals = count ?? 0;
    logStep("Total referrals for referrer", { totalReferrals });

    // Calculate bonus days: 30 days per 5 referrals
    const earnedRewards = Math.floor(totalReferrals / 5);
    const newBonusDays = earnedRewards * 30;

    // Update referrer's bonus days
    await supabaseClient
      .from("profiles")
      .update({ referral_bonus_days: newBonusDays })
      .eq("id", referrerProfile.id);

    logStep("Referrer bonus days updated", { newBonusDays });

    // Mark referrals as rewarded where applicable
    if (totalReferrals % 5 === 0 && totalReferrals > 0) {
      await supabaseClient
        .from("referrals")
        .update({ rewarded: true })
        .eq("referrer_id", referrerProfile.id)
        .eq("rewarded", false);

      logStep("Referrals marked as rewarded");
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Referral code applied successfully!",
      referrer_total_referrals: totalReferrals,
      referrer_bonus_days: newBonusDays,
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
