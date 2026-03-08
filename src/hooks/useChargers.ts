import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Charger {
  id: string;
  host_id: string;
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  power: number;
  price_per_kwh: number;
  availability: string | null;
  rating: number | null;
  review_count: number | null;
  images: string[] | null;
  is_active: boolean | null;
  source: "voltshare" | "osm";
  operator?: string | null;
  socket_types?: string[];
}

interface UseChargersOptions {
  search?: string;
  powerFilter?: "all" | "standard" | "fast";
  lat?: number | null;
  lng?: number | null;
  radiusM?: number;
}

async function fetchVoltShareChargers(search?: string, powerFilter?: string, lat?: number | null, lng?: number | null, radiusM?: number): Promise<Charger[]> {
  let results: Charger[];

  if (lat != null && lng != null) {
    const { data, error } = await supabase.rpc("nearby_chargers", {
      lat,
      lng,
      radius_m: radiusM || 10000,
      max_results: 100,
    });
    if (error) throw error;
    results = (data ?? []).map((d: any) => ({
      ...d,
      images: d.images ?? null,
      is_active: d.is_active ?? true,
      source: "voltshare" as const,
    }));
  } else {
    let query = supabase
      .from("chargers")
      .select("id, host_id, title, address, latitude, longitude, power, price_per_kwh, availability, rating, review_count, images, is_active")
      .eq("is_active", true)
      .order("rating", { ascending: false });

    if (search) {
      query = query.or(`title.ilike.%${search}%,address.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    results = (data ?? []).map((d) => ({ ...d, source: "voltshare" as const }));
  }

  return applyFilters(results, search, powerFilter);
}

async function fetchOSMChargers(lat: number, lng: number, radiusM: number): Promise<Charger[]> {
  const { data, error } = await supabase.functions.invoke("overpass-chargers", {
    body: { lat, lng, radius: Math.min(radiusM, 5000) },
  });

  if (error || !data?.chargers) return [];

  return data.chargers.map((c: any) => ({
    id: `osm-${c.osm_id}`,
    host_id: "",
    title: c.name,
    address: c.address,
    latitude: c.latitude,
    longitude: c.longitude,
    power: c.power || 0,
    price_per_kwh: 0,
    availability: c.opening_hours,
    rating: null,
    review_count: null,
    images: null,
    is_active: true,
    source: "osm" as const,
    operator: c.operator,
    socket_types: c.socket_types,
  }));
}

export function useChargers({ search, powerFilter, lat, lng, radiusM = 10000 }: UseChargersOptions = {}) {
  return useQuery({
    queryKey: ["chargers", search, powerFilter, lat, lng, radiusM],
    queryFn: async (): Promise<Charger[]> => {
      const effectiveLat = lat ?? 12.9716;
      const effectiveLng = lng ?? 77.5946;

      const [voltshare, osm] = await Promise.all([
        fetchVoltShareChargers(search, powerFilter, lat, lng, radiusM),
        fetchOSMChargers(effectiveLat, effectiveLng, radiusM),
      ]);

      // Merge, with VoltShare chargers first
      let merged = [...voltshare, ...applyFilters(osm, search, powerFilter)];
      return merged;
    },
    staleTime: 60_000,
  });
}

function applyFilters(chargers: Charger[], search?: string, powerFilter?: string): Charger[] {
  let results = chargers;
  if (search) {
    const q = search.toLowerCase();
    results = results.filter(
      (c) => c.title.toLowerCase().includes(q) || c.address.toLowerCase().includes(q)
    );
  }
  if (powerFilter && powerFilter !== "all") {
    results = results.filter((c) =>
      powerFilter === "fast" ? c.power >= 11 : c.power < 11
    );
  }
  return results;
}
