import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      totalSpent,
      monthlyIncome,
      savingsRate,
      categoryBreakdown,
      dailyAverage,
      comparedToLastMonth,
      lastMonthTotal,
      monthLabel,
      goalProgress,
      daysWithNoPurchases,
      purchaseCount,
    } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const categorySummary = (categoryBreakdown || [])
      .map(
        (c: { name: string; amount: number; count: number }) =>
          `${c.name}: $${c.amount.toFixed(2)} (${c.count} purchases)`
      )
      .join(", ");

    const goalSummary = (goalProgress || [])
      .map(
        (g: { name: string; current: number; target: number; progress: number }) =>
          `"${g.name}": ${g.progress}% complete ($${g.current.toFixed(0)} of $${g.target.toFixed(0)})`
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
