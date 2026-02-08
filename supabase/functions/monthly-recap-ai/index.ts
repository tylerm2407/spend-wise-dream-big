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

    const prompt = `Here is a user's monthly spending recap for ${monthLabel}:

- Total spent: $${totalSpent.toFixed(2)}
- Monthly income: ${monthlyIncome ? `$${monthlyIncome.toFixed(2)}` : "not set"}
- Savings rate: ${savingsRate !== null ? `${savingsRate}%` : "unknown"}
- Number of purchases: ${purchaseCount}
- Daily average: $${dailyAverage.toFixed(2)}
- No-spend days: ${daysWithNoPurchases}
- Compared to last month: ${comparedToLastMonth !== null ? `${comparedToLastMonth > 0 ? "+" : ""}${comparedToLastMonth}% (last month was $${lastMonthTotal.toFixed(2)})` : "no previous data"}
- Category breakdown: ${categorySummary || "none"}
- Active goals: ${goalSummary || "none set"}

Write a brief, personalized monthly spending summary (3-5 short paragraphs, use markdown). Be encouraging but honest. Include:
1. A quick overview of their month
2. One specific area where they're doing well
3. One or two concrete, actionable suggestions to save more money (reference their actual categories and amounts)
4. If they have goals, mention how their spending habits affect goal progress and what they could change
5. End with a motivating one-liner

Keep it friendly, concise, and specific to THEIR data. Don't be generic. Use dollar amounts from their data.`;

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
