import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { checkRateLimit, AUTH_RATE_LIMIT } from "../_shared/rate-limiter.ts";
import { sanitizeReferralCode, invalidInputResponse } from "../_shared/input-sanitizer.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[APPLY-REFERRAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limit
  const rateLimited = checkRateLimit(req, corsHeaders, AUTH_RATE_LIMIT);
  if (rateLimited) return rateLimited;

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

    const body = await req.json();
    const referral_code = sanitizeReferralCode(body.referral_code);
    if (!referral_code) return invalidInputResponse("referral_code", corsHeaders);
    logStep("Referral code received", { referral_code });

    // Find the referrer's profile by code
    const { data: referrerProfile, error: referrerError } = await supabaseClient
      .from("profiles")
      .select("id, user_id, referral_bonus_days")
      .eq("referral_code", referral_code)
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

    // Mark referrals as rewarded and send email when milestone hit
    if (totalReferrals % 5 === 0 && totalReferrals > 0) {
      await supabaseClient
        .from("referrals")
        .update({ rewarded: true })
        .eq("referrer_id", referrerProfile.id)
        .eq("rewarded", false);

      logStep("Referrals marked as rewarded");

      await sendMilestoneEmail(supabaseClient, referrerProfile.user_id, totalReferrals, newBonusDays);
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

async function sendMilestoneEmail(
  supabaseClient: ReturnType<typeof createClient>,
  referrerUserId: string,
  totalReferrals: number,
  totalBonusDays: number,
) {
  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      logStep("RESEND_API_KEY not configured, skipping milestone email");
      return;
    }

    const { data: referrerAuth, error: authError } = await supabaseClient.auth.admin.getUserById(referrerUserId);
    if (authError || !referrerAuth?.user?.email) {
      logStep("Could not retrieve referrer email", { error: authError?.message });
      return;
    }

    const referrerEmail = referrerAuth.user.email;
    const milestoneNumber = totalReferrals / 5;
    logStep("Sending milestone email", { referrerEmail, milestoneNumber, totalBonusDays });

    const resend = new Resend(resendApiKey);
    const { error: emailError } = await resend.emails.send({
      from: "SpendWise <onboarding@resend.dev>",
      to: [referrerEmail],
      subject: `🎉 You earned 30 more free days! (Milestone #${milestoneNumber})`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #0f172a; color: #e2e8f0; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 48px;">🏆</span>
          </div>
          <h1 style="text-align: center; color: #f1f5f9; font-size: 24px; margin-bottom: 8px;">
            Milestone Unlocked!
          </h1>
          <p style="text-align: center; color: #94a3b8; font-size: 16px; margin-bottom: 32px;">
            You just hit <strong style="color: #a78bfa;">${totalReferrals} referrals</strong> — amazing!
          </p>
          <div style="background: linear-gradient(135deg, #7c3aed, #6d28d9); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <p style="color: #e9d5ff; font-size: 14px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Reward Earned</p>
            <p style="color: #ffffff; font-size: 32px; font-weight: bold; margin: 0;">+30 Free Days</p>
          </div>
          <div style="background: #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="color: #94a3b8;">Total Referrals</span>
              <span style="color: #f1f5f9; font-weight: 600;">${totalReferrals}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
              <span style="color: #94a3b8;">Milestones Reached</span>
              <span style="color: #f1f5f9; font-weight: 600;">${milestoneNumber}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #94a3b8;">Total Bonus Days</span>
              <span style="color: #a78bfa; font-weight: 600;">${totalBonusDays} days</span>
            </div>
          </div>
          <p style="text-align: center; color: #64748b; font-size: 13px;">
            Keep sharing your referral code to earn even more free days!<br/>
            Next milestone: ${totalReferrals + 5} referrals → +30 more days
          </p>
        </div>
      `,
    });

    if (emailError) {
      logStep("Failed to send milestone email", { error: emailError });
    } else {
      logStep("Milestone email sent successfully", { referrerEmail });
    }
  } catch (err) {
    logStep("Error sending milestone email", { error: err instanceof Error ? err.message : String(err) });
  }
}
