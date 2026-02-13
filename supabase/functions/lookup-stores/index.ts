import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    const { product, zipCode, category } = await req.json();

    if (!product || typeof product !== 'string') {
      return new Response(
        JSON.stringify({ error: "Product name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      console.log("Firecrawl not configured, returning mock data");
      // Return realistic fallback data when Firecrawl isn't available
      return new Response(
        JSON.stringify({
          stores: getDefaultStores(product, category, zipCode),
          source: "default"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Search for stores with the product and location
    const searchQuery = zipCode 
      ? `${product} price near ${zipCode} stores`
      : `${product} price comparison stores`;

    console.log("Searching with Firecrawl:", searchQuery);

    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 5,
      }),
    });

    if (!response.ok) {
      console.error("Firecrawl search error:", response.status);
      // Fallback to default stores
      return new Response(
        JSON.stringify({
          stores: getDefaultStores(product, category, zipCode),
          source: "default"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchResults = await response.json();
    console.log("Firecrawl results:", JSON.stringify(searchResults).slice(0, 500));

    // Parse search results into store data
    const stores = parseSearchResults(searchResults, product, category, zipCode);

    return new Response(
      JSON.stringify({ stores, source: "firecrawl" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in lookup-stores:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function parseSearchResults(results: any, product: string, category: string, zipCode?: string): any[] {
  const stores: any[] = [];
  
  if (!results?.data || !Array.isArray(results.data)) {
    return getDefaultStores(product, category, zipCode);
  }

  // Extract store information from search results
  for (const result of results.data.slice(0, 4)) {
    const url = result.url || '';
    const title = result.title || '';
    const description = result.description || '';
    
    // Try to identify store from URL
    let storeName = 'Store';
    let storeType = 'retail';
    
    if (url.includes('walmart')) {
      storeName = 'Walmart';
      storeType = 'superstore';
    } else if (url.includes('target')) {
      storeName = 'Target';
      storeType = 'superstore';
    } else if (url.includes('costco')) {
      storeName = 'Costco';
      storeType = 'warehouse';
    } else if (url.includes('amazon')) {
      storeName = 'Amazon';
      storeType = 'online';
    } else if (url.includes('aldi')) {
      storeName = 'Aldi';
      storeType = 'discount';
    } else if (url.includes('kroger')) {
      storeName = 'Kroger';
      storeType = 'grocery';
    } else if (url.includes('traderjoes') || url.includes('trader-joes')) {
      storeName = 'Trader Joe\'s';
      storeType = 'specialty';
    } else if (url.includes('wholefood')) {
      storeName = 'Whole Foods';
      storeType = 'organic';
    }

    // Try to extract price from description
    const priceMatch = description.match(/\$(\d+\.?\d*)/);
    const estimatedPrice = priceMatch ? parseFloat(priceMatch[1]) : null;

    stores.push({
      name: storeName,
      type: storeType,
      url: url,
      estimatedPrice,
      location: zipCode ? `Near ${zipCode}` : 'Multiple locations',
      source: 'web'
    });
  }

  // If we didn't find enough stores, add defaults
  if (stores.length < 2) {
    return getDefaultStores(product, category, zipCode);
  }

  return stores;
}

function getDefaultStores(product: string, category?: string, zipCode?: string): any[] {
  const locationSuffix = zipCode ? ` near ${zipCode}` : '';
  
  // Category-specific store recommendations
  const categoryStores: Record<string, any[]> = {
    groceries: [
      { name: 'Aldi', type: 'discount', savings: '25-40%', location: `Multiple locations${locationSuffix}` },
      { name: 'Costco', type: 'warehouse', savings: '20-35%', location: `Membership required${locationSuffix}` },
      { name: 'Walmart', type: 'superstore', savings: '15-25%', location: `Supercenter${locationSuffix}` },
    ],
    dining: [
      { name: 'Home cooking', type: 'alternative', savings: '60-80%', location: 'Your kitchen' },
      { name: 'Meal prep services', type: 'service', savings: '30-50%', location: 'HelloFresh, Blue Apron' },
      { name: 'Fast casual', type: 'restaurant', savings: '20-40%', location: `Chipotle, Panera${locationSuffix}` },
    ],
    shopping: [
      { name: 'Amazon', type: 'online', savings: '10-30%', location: 'Online' },
      { name: 'Target', type: 'superstore', savings: '15-25%', location: `Store${locationSuffix}` },
      { name: 'Thrift stores', type: 'secondhand', savings: '50-80%', location: `Goodwill, Savers${locationSuffix}` },
    ],
    entertainment: [
      { name: 'Matinee shows', type: 'timing', savings: '30-50%', location: 'Before 5pm' },
      { name: 'Streaming services', type: 'alternative', savings: '60-80%', location: 'Netflix, Disney+' },
      { name: 'Library', type: 'free', savings: '100%', location: `Public library${locationSuffix}` },
    ],
    subscriptions: [
      { name: 'Annual plans', type: 'billing', savings: '15-25%', location: 'Pay yearly instead' },
      { name: 'Family plans', type: 'sharing', savings: '40-60%', location: 'Split with others' },
      { name: 'Free alternatives', type: 'alternative', savings: '100%', location: 'Open source options' },
    ],
  };

  // Default generic stores
  const defaultStores = [
    { name: 'Walmart', type: 'superstore', savings: '15-25%', location: `Supercenter${locationSuffix}` },
    { name: 'Amazon', type: 'online', savings: '10-20%', location: 'Online with Prime' },
    { name: 'Costco', type: 'warehouse', savings: '20-30%', location: `Membership required${locationSuffix}` },
  ];

  return categoryStores[category || ''] || defaultStores;
}
