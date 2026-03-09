import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  checkAndRecordAiUsage,
  aiLimitResponse,
  AI_COST_ESTIMATES,
} from "../_shared/ai-usage-guard.ts";
import { checkRateLimit, AI_RATE_LIMIT } from "../_shared/rate-limiter.ts";
import { sanitizeString, sanitizeZipCode, sanitizePositiveNumber, invalidInputResponse } from "../_shared/input-sanitizer.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth first so rate limit key is scoped per user, not just IP
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

    // Rate limit scoped to user ID + IP to prevent abuse across shared IPs and IP rotation
    const rateLimited = checkRateLimit(req, corsHeaders, AI_RATE_LIMIT, userId);
    if (rateLimited) return rateLimited;

    const body = await req.json();
    const product = sanitizeString(body.product, 200);
    const zipCode = sanitizeZipCode(body.zipCode);
    const category = sanitizeString(body.category, 50);
    const originalPrice = sanitizePositiveNumber(body.originalPrice, 100000);

    if (!product) {
      return invalidInputResponse("product", corsHeaders);
    }

    // ── AI usage guard ──
    const usageResult = await checkAndRecordAiUsage(userId, AI_COST_ESTIMATES.chatFlash);
    if (usageResult !== 'ok') {
      return aiLimitResponse(corsHeaders);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const locationContext = zipCode 
      ? `The user is located in zip code ${zipCode}. Include specific store locations near this area.`
      : 'Suggest nationally available stores.';

    const priceContext = originalPrice 
      ? `The original item costs approximately $${originalPrice}.`
      : '';

    const categoryContext = category 
      ? `This is in the "${category}" category.`
      : '';

    const systemPrompt = `You are a helpful savings assistant that suggests cheaper alternatives to products with REAL store information.
${locationContext}
${priceContext}
${categoryContext}

When given a product or purchase, respond with 2-3 cheaper alternatives.

IMPORTANT: Use the suggest_alternatives tool to return your response in a structured format.

For each alternative, provide:
- name: The specific alternative product/brand name (e.g., "Great Value Coffee" not just "Store brand")
- description: Why it's a good alternative (1 sentence)
- estimated_savings: Dollar amount or percentage saved (e.g., "$3.50" or "30%")
- estimated_price: The approximate price of the alternative (e.g., "$4.99")
- store_name: Specific store name (e.g., "Walmart", "Aldi", "Target", "Costco")
- store_location: Location hint (e.g., "Supercenter locations", "Most grocery stores")
- tip: A quick actionable tip for the user

Be practical, realistic, and use real brand names and stores. Focus on commonly available alternatives at major retailers.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Find cheaper alternatives to: ${product}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_alternatives",
              description: "Return 2-3 cheaper alternatives with real store information",
              parameters: {
                type: "object",
                properties: {
                  alternatives: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Specific alternative product/brand name" },
                        description: { type: "string", description: "Why this is a good alternative" },
                        estimated_savings: { type: "string", description: "Dollar amount or percentage saved" },
                        estimated_price: { type: "string", description: "Approximate price of alternative" },
                        store_name: { type: "string", description: "Specific store name (Walmart, Aldi, Target, etc.)" },
                        store_location: { type: "string", description: "Location hint or availability" },
                        tip: { type: "string", description: "Quick actionable tip" },
                      },
                      required: ["name", "description", "estimated_savings", "store_name", "tip"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["alternatives"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_alternatives" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to get suggestions. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "suggest_alternatives") {
      return new Response(
        JSON.stringify({ error: "Unexpected response format" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const alternatives = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify(alternatives),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in suggest-alternatives:", error);
    return new Response(
      JSON.stringify({ error: "Failed to get suggestions. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
