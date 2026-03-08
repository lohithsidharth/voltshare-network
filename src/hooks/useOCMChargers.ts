import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface OCMConnection {
  type: string;
  power_kw: number;
  current_type: string | null;
  quantity: number;
  status: string;
}

export interface OCMReview {
  user: string;
  rating: number;
  comment: string;
  date: string;
}

export interface OCMCharger {
  ocm_id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distance_km: number | null;
  power_kw: number;
  connections: OCMConnection[];
  status: "available" | "unavailable" | "planned" | "unknown";
  operator: string | null;
  usage_type: string | null;
  pricing: string | null;
  is_free: boolean;
  rating: number | null;
  review_count: number;
  reviews: OCMReview[];
  opening_hours: string | null;
  last_verified: string | null;
  source: "ocm";
}

export function useOCMChargers() {
  const [chargers, setChargers] = useState<OCMCharger[]>([]);
  const [loading, setLoading] = useState(false);
  const lastKeyRef = useRef<string>("");

  const fetchChargers = useCallback(async (lat: number, lng: number, radius = 10) => {
    const key = `${lat.toFixed(3)},${lng.toFixed(3)},${radius}`;
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ocm-chargers", {
        body: { lat, lng, radius, maxResults: 50 },
      });

      if (error) {
        console.error("OCM fetch error:", error);
        return;
      }

      if (data?.success) {
        setChargers(data.chargers || []);
      }
    } catch (err) {
      console.error("OCM fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { chargers, loading, fetchChargers };
}
