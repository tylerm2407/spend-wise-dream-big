import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  checkAndRecordAiUsage,
  aiLimitResponse,
  AI_COST_ESTIMATES,
} from "../_shared/ai-usage-guard.ts";
import { checkRateLimit, AI_RATE_LIMIT } from "../_shared/rate-limiter.ts";
import { sanitizeString, sanitizePositiveNumber, sanitizeNumber } from "../_shared/input-sanitizer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const rateLimited = checkRateLimit(req, corsHeaders, AI_RATE_LIMIT);
  if (rateLimited) return rateLimited;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = claimsData.claims.sub as string;

    const body = await req.json();
    const totalSpent = sanitizePositiveNumber(body.totalSpent, 10_000_000) ?? 0;
    const monthlyIncome = sanitizePositiveNumber(body.monthlyIncome, 10_000_000);
    const savingsRate = sanitizeNumber(body.savingsRate, -1000, 100);
    const dailyAverage = sanitizePositiveNumber(body.dailyAverage, 100_000) ?? 0;
    const comparedToLastMonth = sanitizeNumber(body.comparedToLastMonth, -1000, 10000);
    const lastMonthTotal = sanitizePositiveNumber(body.lastMonthTotal, 10_000_000) ?? 0;
    const monthLabel = sanitizeString(body.monthLabel, 50) ?? "This Month";
    const daysWithNoPurchases = sanitizePositiveNumber(body.daysWithNoPurchases, 31) ?? 0;
    const purchaseCount = sanitizePositiveNumber(body.purchaseCount, 10000) ?? 0;
    const categoryBreakdown = Array.isArray(body.categoryBreakdown) ? body.categoryBreakdown.slice(0, 20) : [];
    const goalProgress = Array.isArray(body.goalProgress) ? body.goalProgress.slice(0, 10) : [];

    // ── AI usage guard ──
    const usageResult = await checkAndRecordAiUsage(userId, AI_COST_ESTIMATES.chatFlash);
    if (usageResult !== 'ok') {
      return aiLimitResponse(corsHeaders);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const categorySummary = categoryBreakdown
      .map(
        (c: { name: string; amount: number; count: number }) =>
          `${String(c.name).slice(0, 50)}: $${Number(c.amount || 0).toFixed(2)} (${Number(c.count || 0)} purchases)`
      )
      .join(", ");

    const goalSummary = goalProgress
      .map(
        (g: { name: string; current: number; target: number; progress: number }) =>
          `"${String(g.name).slice(0, 100)}": ${Number(g.progress || 0)}% complete ($${Number(g.current || 0).toFixed(0)} of $${Number(g.target || 0).toFixed(0)})`
      )
      .join("; ");

    const prompt = `Monthly spending recap for ${monthLabel}:

- Total: $${totalSpent.toFixed(2)} | Daily avg: $${dailyAverage.toFixed(2)} | Purchases: ${purchaseCount} | No-spend days: ${daysWithNoPurchases}
- Income: ${monthlyIncome ? `$${monthlyIncome.toFixed(2)}` : "not set"} | Savings rate: ${savingsRate !== null ? `${savingsRate}%` : "unknown"}
- vs Last month: ${comparedToLastMonth !== null ? `${comparedToLastMonth > 0 ? "+" : ""}${comparedToLastMonth}% ($${lastMonthTotal.toFixed(2)})` : "no data"}
- Categories: ${categorySummary || "none"}
- Goals: ${goalSummary || "none set"}

Write a short, punchy monthly summary (2-3 paragraphs max, use markdown). Structure it as:

1. **Quick month overview** (1-2 sentences with their actual numbers)
2. **Cheaper alternatives for their top spending categories** — For each of their top 2-3 categories, suggest 1-2 specific, actionable swaps (e.g. "Your $${(categoryBreakdown?.[0]?.amount || 0).toFixed(0)} on dining — try meal-prepping lunches or switching from Starbucks to brewing at home to save ~40%"). Be brand-specific and practical.
3. **Goal acceleration** — If they have goals, calculate how much faster they'd reach them by adopting your suggested swaps. Be specific: "Switching to home coffee alone could add ~$X/month toward your [goal name], getting you there Y weeks sooner." If no goals, skip this.

Keep it under 150 words total. Be direct, specific to THEIR data, and reference actual dollar amounts.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content:
                "You are a friendly personal finance coach inside a spending tracker app called True Cost. Be warm, specific, and actionable. Never use filler. Reference the user's actual numbers.",
            },
            { role: "user", content: prompt },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const summary =
      data.choices?.[0]?.message?.content || "Unable to generate summary.";

    return new Response(JSON.stringify({ summary }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("monthly-recap-ai error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
