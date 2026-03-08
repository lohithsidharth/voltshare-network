const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lng, radius = 10000 } = await req.json();

    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ error: "lat and lng are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Overpass QL query for EV charging stations within radius
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="charging_station"](around:${radius},${lat},${lng});
        way["amenity"="charging_station"](around:${radius},${lat},${lng});
      );
      out center body;
    `;

    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data = await response.json();
    const elements: OverpassElement[] = data.elements || [];

    const chargers = elements
      .map((el) => {
        const elLat = el.lat ?? el.center?.lat;
        const elLon = el.lon ?? el.center?.lon;
        if (!elLat || !elLon) return null;

        const tags = el.tags || {};
        return {
          osm_id: el.id,
          name: tags.name || tags.operator || tags.brand || "EV Charging Station",
          address: [tags["addr:street"], tags["addr:housenumber"], tags["addr:city"]]
            .filter(Boolean)
            .join(", ") || tags["addr:full"] || "OpenStreetMap",
          latitude: elLat,
          longitude: elLon,
          power: parsePower(tags.socket_output || tags["socket:type2:output"] || tags["socket:chademo:output"] || tags["socket:ccs2:output"] || ""),
          operator: tags.operator || tags.brand || null,
          capacity: parseInt(tags.capacity || "0") || null,
          socket_types: extractSockets(tags),
          fee: tags.fee === "yes",
          opening_hours: tags.opening_hours || null,
          source: "osm" as const,
        };
      })
      .filter(Boolean);

    return new Response(
      JSON.stringify({ success: true, count: chargers.length, chargers }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Overpass fetch error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function parsePower(str: string): number {
  const match = str.match(/([\d.]+)\s*kW/i);
  return match ? parseFloat(match[1]) : 0;
}

function extractSockets(tags: Record<string, string>): string[] {
  const socketKeys = Object.keys(tags).filter(
    (k) => k.startsWith("socket:") && !k.includes("output") && !k.includes("voltage") && !k.includes("current")
  );
  return socketKeys.map((k) => k.replace("socket:", "")).filter((s) => tags[`socket:${s}`] !== "0");
}
