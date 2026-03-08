import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { checkRateLimit } from "../_shared/rate-limiter.ts";
import { sanitizeLat, sanitizeLng, sanitizeNumber, invalidInputResponse } from "../_shared/input-sanitizer.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const rateLimited = checkRateLimit(req, corsHeaders);
  if (rateLimited) return rateLimited;

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");

    const body = await req.json();
    const lat = sanitizeLat(body.lat);
    const lng = sanitizeLng(body.lng);
    const radius = sanitizeNumber(body.radius, 100, 50000) ?? 10000;

    if (lat === null || lng === null) return invalidInputResponse("lat/lng", corsHeaders);

    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY not configured");

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=supermarket&key=${apiKey}`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("Places API error:", data);
      throw new Error(`Places API error: ${data.status}`);
    }

    const stores = (data.results || []).slice(0, 7).map((place: any) => {
      const storeLat = place.geometry.location.lat;
      const storeLng = place.geometry.location.lng;
      const R = 3958.8;
      const dLat = (storeLat - lat) * Math.PI / 180;
      const dLng = (storeLng - lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat * Math.PI / 180) * Math.cos(storeLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return {
        place_id: place.place_id,
        name: place.name,
        address: place.vicinity,
        distance_miles: Math.round(distance * 10) / 10,
        lat: storeLat,
        lng: storeLng,
      };
    }).sort((a: any, b: any) => a.distance_miles - b.distance_miles);

    return new Response(JSON.stringify({ stores }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[nearby-stores] ERROR:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
