import { useState, useCallback, useRef } from "react";

export interface OverpassCharger {
  id: string;
  lat: number;
  lng: number;
  name: string;
  operator?: string;
  power?: number;
  socket_types?: string[];
  address?: string;
}

interface Bounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export function useOverpassChargers() {
  const [chargers, setChargers] = useState<OverpassCharger[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastBoundsRef = useRef<string>("");

  const fetchChargers = useCallback(async (bounds: Bounds) => {
    const boundsKey = `${bounds.south.toFixed(3)},${bounds.west.toFixed(3)},${bounds.north.toFixed(3)},${bounds.east.toFixed(3)}`;
    if (boundsKey === lastBoundsRef.current) return;
    lastBoundsRef.current = boundsKey;

    // Abort previous request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const query = `[out:json][timeout:15];node["amenity"="charging_station"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});out body;`;
      
      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`Overpass error: ${response.status}`);
      const data = await response.json();

      const results: OverpassCharger[] = (data.elements || [])
        .filter((el: any) => el.lat && el.lon)
        .map((el: any) => {
          const tags = el.tags || {};
          return {
            id: `osm-${el.id}`,
            lat: el.lat,
            lng: el.lon,
            name: tags.name || tags.operator || tags.brand || "EV Charger",
            operator: tags.operator || tags.brand || undefined,
            power: parsePower(tags["socket:type2:output"] || tags["socket:chademo:output"] || tags["socket:ccs2:output"] || tags.socket_output || ""),
            socket_types: extractSockets(tags),
            address: [tags["addr:street"], tags["addr:housenumber"], tags["addr:city"]].filter(Boolean).join(", ") || undefined,
          };
        });

      setChargers(results);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Overpass fetch error:", err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return { chargers, loading, fetchChargers };
}

function parsePower(str: string): number {
  const match = str.match(/([\d.]+)\s*kW/i);
  return match ? parseFloat(match[1]) : 0;
}

function extractSockets(tags: Record<string, string>): string[] {
  return Object.keys(tags)
    .filter((k) => k.startsWith("socket:") && !k.includes("output") && !k.includes("voltage") && !k.includes("current"))
    .map((k) => k.replace("socket:", ""))
    .filter((s) => tags[`socket:${s}`] !== "0");
}
