import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  checkAndRecordAiUsage,
  aiLimitResponse,
  AI_COST_ESTIMATES,
} from "../_shared/ai-usage-guard.ts";
import { checkRateLimit, AI_RATE_LIMIT } from "../_shared/rate-limiter.ts";
import { sanitizeBase64Image } from "../_shared/input-sanitizer.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

interface ReceiptData {
  merchant?: string;
  total?: number;
  date?: string;
  items?: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
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
    const image = sanitizeBase64Image(body.image);

    if (!image) {
      return new Response(
        JSON.stringify({ error: 'No valid image provided (max 10MB)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── AI usage guard ──
    const usageResult = await checkAndRecordAiUsage(userId, AI_COST_ESTIMATES.receiptScan);
    if (usageResult !== 'ok') {
      return aiLimitResponse(corsHeaders);
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this receipt image and extract the following information in JSON format:
- merchant: The store/restaurant name
- total: The total amount paid (as a number, no currency symbol)
- date: The date in YYYY-MM-DD format if visible
- items: Array of item names purchased (top 5 max)

Return ONLY valid JSON, no markdown or explanation. If you can't read something, omit that field.
Example: {"merchant": "Starbucks", "total": 5.75, "date": "2025-02-05", "items": ["Latte", "Muffin"]}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${image}`
                }
              }
            ]
          }
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', errorText);
      throw new Error('Failed to analyze receipt');
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '';
    
    let receiptData: ReceiptData = {};
    try {
      const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
      receiptData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      const totalMatch = content.match(/total["\s:]+(\d+\.?\d*)/i);
      const merchantMatch = content.match(/merchant["\s:]+["']?([^"'\n,}]+)/i);
      
      if (totalMatch) receiptData.total = parseFloat(totalMatch[1]);
      if (merchantMatch) receiptData.merchant = merchantMatch[1].trim();
    }

    return new Response(
      JSON.stringify(receiptData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Scan receipt error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process receipt' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
