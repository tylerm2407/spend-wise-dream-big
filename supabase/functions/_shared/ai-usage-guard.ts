import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Cost configuration (all values in cents) ──────────────────────────
export const AI_COST_CAP_HARD_CENTS = 1000; // $10.00
export const AI_COST_CAP_SOFT_CENTS = 500;  // $5.00

// Per-call cost estimates (cents) – adjust as pricing changes
export const AI_COST_ESTIMATES = {
  // Chat completions (Gemini Flash / similar)
  chatFlash: 3,        // ~3¢ per call (avg ~1k input + 500 output tokens)
  chatPro: 8,          // ~8¢ per call (larger model)
  // Receipt scanning (vision model)
  receiptScan: 5,      // ~5¢ per call (image + text)
  // Simple / embedding tasks
  simple: 1,           // ~1¢ per call
} as const;

/** Estimate chat cost in cents from token counts. Fallback to fixed estimate. */
export function estimateChatCostCents(
  inputTokens?: number,
  outputTokens?: number,
  model: "flash" | "pro" = "flash"
): number {
  if (inputTokens != null && outputTokens != null) {
    // Gemini Flash: ~$0.10/1M input, ~$0.40/1M output → micro-cents
    // Gemini Pro:   ~$1.25/1M input, ~$5.00/1M output
    if (model === "flash") {
      return Math.max(1, Math.ceil((inputTokens * 0.01 + outputTokens * 0.04) / 100));
    }
    return Math.max(1, Math.ceil((inputTokens * 0.125 + outputTokens * 0.5) / 100));
  }
  return model === "pro" ? AI_COST_ESTIMATES.chatPro : AI_COST_ESTIMATES.chatFlash;
}

export type UsageCheckResult = "ok" | "soft_cap" | "hard_cap";

const AI_LIMIT_RESPONSE = {
  error: "ai_limit_reached",
  message:
    "You've reached your monthly AI usage limit. To keep costs under control, further AI features are paused for this month.",
  limit_dollars: AI_COST_CAP_SOFT_CENTS / 100,
};

/**
 * Check and atomically record AI usage for a user.
 * Uses a SECURITY DEFINER database function for atomicity.
 * Returns 'ok' | 'soft_cap' | 'hard_cap'.
 */
export async function checkAndRecordAiUsage(
  userId: string,
  estimatedCostCents: number
): Promise<UsageCheckResult> {
  // Use service role client so the SECURITY DEFINER function can run
  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await serviceClient.rpc("check_and_record_ai_usage", {
    p_user_id: userId,
    p_estimated_cost_cents: estimatedCostCents,
  });

  if (error) {
    console.error("AI usage check error:", error);
    // Fail-open vs fail-closed: fail-closed for safety
    return "hard_cap";
  }

  return (data as UsageCheckResult) || "hard_cap";
}

/** Build a standard 429 response for AI limit reached */
export function aiLimitResponse(corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(AI_LIMIT_RESPONSE), {
    status: 429,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
