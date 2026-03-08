import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Create a seed host user via admin API
    const seedEmail = "seed-host@voltshare.local";
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    let hostId: string;

    const existing = existingUsers?.users?.find((u) => u.email === seedEmail);
    if (existing) {
      hostId = existing.id;
    } else {
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email: seedEmail,
        email_confirm: true,
        user_metadata: { display_name: "VoltShare Demo Host" },
      });
      if (createErr || !newUser.user) {
        throw new Error("Failed to create seed user: " + createErr?.message);
      }
      hostId = newUser.user.id;

      // Assign host role
      await supabase.from("user_roles").insert({ user_id: hostId, role: "host" });
      await supabase.from("profiles").upsert({
        user_id: hostId,
        display_name: "VoltShare Demo Host",
      }, { onConflict: "user_id" });
    }

    // Check if chargers already seeded
    const { count } = await supabase.from("chargers").select("*", { count: "exact", head: true }).eq("host_id", hostId);
    if (count && count > 0) {
      return new Response(JSON.stringify({ success: true, message: `Already seeded (${count} chargers)`, host_id: hostId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chargers = [
      { title: "Home Charger – HSR Layout", address: "123 HSR Layout, Sector 2, Bangalore", latitude: 12.9121, longitude: 77.6446, power: 7.4, price_per_kwh: 10, availability: "8 AM – 10 PM", rating: 4.8, review_count: 24 },
      { title: "Fast Charger – Koramangala", address: "456 Koramangala 5th Block, Bangalore", latitude: 12.9352, longitude: 77.6245, power: 22, price_per_kwh: 15, availability: "24/7", rating: 4.6, review_count: 18 },
      { title: "Standard Outlet – Indiranagar", address: "789 Indiranagar 100ft Road, Bangalore", latitude: 12.9784, longitude: 77.6408, power: 3.3, price_per_kwh: 8, availability: "6 AM – 11 PM", rating: 4.9, review_count: 31 },
      { title: "Garage Charger – Whitefield", address: "321 Whitefield Main Road, Bangalore", latitude: 12.9698, longitude: 77.7500, power: 7.4, price_per_kwh: 12, availability: "9 AM – 9 PM", rating: 4.5, review_count: 12 },
      { title: "Solar-Powered – Electronic City", address: "555 Electronic City Phase 1, Bangalore", latitude: 12.8456, longitude: 77.6603, power: 11, price_per_kwh: 9, availability: "7 AM – 8 PM", rating: 4.7, review_count: 22 },
      { title: "Mall Charger – MG Road", address: "UB City Mall, MG Road, Bangalore", latitude: 12.9716, longitude: 77.5946, power: 50, price_per_kwh: 18, availability: "10 AM – 10 PM", rating: 4.4, review_count: 45 },
      { title: "Apartment Charger – JP Nagar", address: "Prestige Ozone, JP Nagar 7th Phase, Bangalore", latitude: 12.8900, longitude: 77.5850, power: 7.4, price_per_kwh: 11, availability: "6 AM – 12 AM", rating: 4.6, review_count: 16 },
      { title: "Office Charger – Marathahalli", address: "Kadubeesanahalli, Marathahalli, Bangalore", latitude: 12.9563, longitude: 77.7010, power: 22, price_per_kwh: 14, availability: "8 AM – 8 PM", rating: 4.3, review_count: 9 },
      { title: "Residential Charger – Jayanagar", address: "4th Block, Jayanagar, Bangalore", latitude: 12.9250, longitude: 77.5838, power: 3.3, price_per_kwh: 7, availability: "24/7", rating: 4.8, review_count: 28 },
      { title: "Tech Park Charger – Bellandur", address: "Ecoworld, Bellandur, Bangalore", latitude: 12.9260, longitude: 77.6762, power: 50, price_per_kwh: 16, availability: "7 AM – 11 PM", rating: 4.5, review_count: 35 },
      { title: "Community Charger – Yelahanka", address: "New Town, Yelahanka, Bangalore", latitude: 13.1005, longitude: 77.5963, power: 7.4, price_per_kwh: 10, availability: "6 AM – 10 PM", rating: 4.2, review_count: 8 },
      { title: "Condo Charger – Sarjapur Road", address: "Rainbow Drive, Sarjapur Road, Bangalore", latitude: 12.9080, longitude: 77.7390, power: 11, price_per_kwh: 13, availability: "24/7", rating: 4.7, review_count: 19 },
    ];

    const rows = chargers.map((c) => ({ ...c, host_id: hostId, is_active: true }));
    const { error: insertErr } = await supabase.from("chargers").insert(rows);
    if (insertErr) throw new Error("Insert failed: " + insertErr.message);

    return new Response(JSON.stringify({ success: true, message: `Seeded ${chargers.length} chargers`, host_id: hostId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
