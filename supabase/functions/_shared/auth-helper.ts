import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

/**
 * Verifies the Bearer JWT from an edge function request.
 * Uses auth.getUser() — the correct Supabase edge function auth pattern.
 * Returns { user } on success or { error } on failure.
 */
export async function verifyUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { user: null, error: "Missing authorization header" };
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error } = await supabaseClient.auth.getUser();
  if (error || !user) {
    return { user: null, error: error?.message ?? "Unauthorized" };
  }

  return { user, error: null };
}
