import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");
    const userId = userData.user.id;

    const { grocery_list_id, stores, lat, lng } = await req.json();
    if (!grocery_list_id || !stores || !Array.isArray(stores) || stores.length === 0) {
      throw new Error("grocery_list_id and stores array are required");
    }

    // Fetch the grocery list
    const { data: list, error: listError } = await supabase
      .from("grocery_lists")
      .select("*")
      .eq("id", grocery_list_id)
      .eq("user_id", userId)
      .single();

    if (listError || !list) throw new Error("Grocery list not found");

    const items = list.items as Array<{ name: string; quantity: number; unit: string }>;
    const apiKey = Deno.env.get("PRICESAPI_API_KEY");
    if (!apiKey) throw new Error("PRICESAPI_API_KEY not configured");

    const storeResults = [];

    for (const store of stores) {
      const storeItems = [];
      let total = 0;

      for (const item of items) {
        try {
          const query = encodeURIComponent(`${item.name} ${store.name}`);
          const resp = await fetch(
            `https://api.pricesapi.com/v1/search?q=${query}&source=google_shopping&country=us`,
            { headers: { "Authorization": `Bearer ${apiKey}` } }
          );

          if (!resp.ok) {
            // Fallback: try without store name
            const fallbackResp = await fetch(
              `https://api.pricesapi.com/v1/search?q=${encodeURIComponent(item.name)}&source=google_shopping&country=us`,
              { headers: { "Authorization": `Bearer ${apiKey}` } }
            );
            
            if (!fallbackResp.ok) {
              storeItems.push({
                item_name: item.name,
                price: null,
                currency: "USD",
                source_product_title: null,
                url: null,
              });
              continue;
            }
            
            const fallbackData = await fallbackResp.json();
            const product = fallbackData.results?.[0];
            if (product) {
              const price = (product.price || 0) * (item.quantity || 1);
              total += price;
              storeItems.push({
                item_name: item.name,
                price: Math.round(price * 100) / 100,
                currency: product.currency || "USD",
                source_product_title: product.title || product.name || null,
                url: product.url || null,
              });
            } else {
              storeItems.push({
                item_name: item.name,
                price: null,
                currency: "USD",
                source_product_title: null,
                url: null,
              });
            }
            continue;
          }

          const data = await resp.json();
          const product = data.results?.[0];

          if (product) {
            const price = (product.price || 0) * (item.quantity || 1);
            total += price;
            storeItems.push({
              item_name: item.name,
              price: Math.round(price * 100) / 100,
              currency: product.currency || "USD",
              source_product_title: product.title || product.name || null,
              url: product.url || null,
            });
          } else {
            storeItems.push({
              item_name: item.name,
              price: null,
              currency: "USD",
              source_product_title: null,
              url: null,
            });
          }
        } catch (err) {
          console.error(`Error fetching price for ${item.name} at ${store.name}:`, err);
          storeItems.push({
            item_name: item.name,
            price: null,
            currency: "USD",
            source_product_title: null,
            url: null,
          });
        }
      }

      storeResults.push({
        store_id: store.place_id,
        store_name: store.name,
        distance_miles: store.distance_miles,
        items: storeItems,
        total_price: Math.round(total * 100) / 100,
      });
    }

    // Find best store
    const validStores = storeResults.filter((s) => s.total_price > 0);
    const bestStore = validStores.length > 0
      ? validStores.reduce((a, b) => a.total_price < b.total_price ? a : b)
      : null;

    // Save comparison
    const { data: comparison, error: compError } = await supabase
      .from("grocery_price_comparisons")
      .insert({
        user_id: userId,
        grocery_list_id,
        location_lat: lat || 0,
        location_lng: lng || 0,
        store_results: storeResults,
        best_store_name: bestStore?.store_name || null,
        best_store_total_price: bestStore?.total_price || null,
      })
      .select()
      .single();

    if (compError) {
      console.error("Error saving comparison:", compError);
    }

    return new Response(JSON.stringify({
      store_results: storeResults,
      best_store_name: bestStore?.store_name || null,
      best_store_total_price: bestStore?.total_price || null,
      comparison_id: comparison?.id || null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[estimate-grocery-prices] ERROR:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
