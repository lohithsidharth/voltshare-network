const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lng, radius = 10, maxResults = 50 } = await req.json();

    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ error: "lat and lng are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const distanceKm = Math.min(radius, 50);
    const limit = Math.min(maxResults, 100);

    const url = `https://api.openchargemap.io/v3/poi/?output=json&latitude=${lat}&longitude=${lng}&distance=${distanceKm}&distanceunit=KM&maxresults=${limit}&compact=true&verbose=false`;

    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 10000);

    const response = await fetch(url, {
      headers: { "User-Agent": "VoltShare/1.0" },
      signal: ctrl.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: true, count: 0, chargers: [], fallback: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    const chargers = (data || []).map((poi: any) => {
      const addr = poi.AddressInfo || {};
      const connections = (poi.Connections || []).map((conn: any) => ({
        type: conn.ConnectionType?.Title || "Unknown",
        power_kw: conn.PowerKW || 0,
        current_type: conn.CurrentType?.Title || null,
        quantity: conn.Quantity || 1,
        status: conn.StatusType?.Title || "Unknown",
      }));

      const maxPower = Math.max(0, ...connections.map((c: any) => c.power_kw || 0));

      // Determine availability status
      let status = "unknown";
      if (poi.StatusType) {
        const st = poi.StatusType.Title?.toLowerCase() || "";
        if (st.includes("operational") || st.includes("available")) status = "available";
        else if (st.includes("not operational") || st.includes("temporarily unavailable")) status = "unavailable";
        else if (st.includes("planned")) status = "planned";
      }

      // Usage cost
      let pricing = null;
      if (poi.UsageCost) {
        pricing = poi.UsageCost;
      }

      return {
        ocm_id: poi.ID,
        name: addr.Title || "EV Charging Station",
        address: [addr.AddressLine1, addr.Town, addr.StateOrProvince].filter(Boolean).join(", ") || "Unknown",
        latitude: addr.Latitude,
        longitude: addr.Longitude,
        distance_km: addr.Distance || null,
        power_kw: maxPower,
        connections,
        status,
        operator: poi.OperatorInfo?.Title || null,
        usage_type: poi.UsageType?.Title || null,
        pricing,
        is_free: poi.UsageType?.IsPayAtLocation === false && !poi.UsageCost,
        rating: poi.UserComments?.length > 0
          ? Math.round((poi.UserComments.reduce((s: number, c: any) => s + (c.Rating || 0), 0) / poi.UserComments.length) * 10) / 10
          : null,
        review_count: poi.UserComments?.length || 0,
        reviews: (poi.UserComments || []).slice(0, 5).map((c: any) => ({
          user: c.UserName || "Anonymous",
          rating: c.Rating || 0,
          comment: c.Comment || "",
          date: c.DateCreated,
        })),
        opening_hours: null,
        last_verified: poi.DateLastVerified || null,
        source: "ocm",
      };
    }).filter((c: any) => c.latitude && c.longitude);

    return new Response(
      JSON.stringify({ success: true, count: chargers.length, chargers }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("OCM fetch error:", err);
    return new Response(
      JSON.stringify({ success: true, count: 0, chargers: [], fallback: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
