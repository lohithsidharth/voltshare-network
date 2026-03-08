import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { mockChargers, Charger } from "@/data/mockChargers";
import ChargerCard from "@/components/ChargerCard";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Fix leaflet default icon
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const chargerIcon = new L.DivIcon({
  html: `<div style="background:hsl(213,100%,50%);width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 20px hsl(213,100%,50%,0.5);border:2px solid white;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
  </div>`,
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const Explore = () => {
  const [search, setSearch] = useState("");
  const [powerFilter, setPowerFilter] = useState("all");
  const [selected, setSelected] = useState<Charger | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const filtered = useMemo(
    () =>
      mockChargers.filter((c) => {
        const matchSearch =
          c.title.toLowerCase().includes(search.toLowerCase()) ||
          c.address.toLowerCase().includes(search.toLowerCase());
        const matchPower =
          powerFilter === "all" || (powerFilter === "fast" ? c.power >= 11 : c.power < 11);
        return matchSearch && matchPower;
      }),
    [search, powerFilter],
  );

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [12.9352, 77.6245],
      zoom: 12,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(map);

    mapRef.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    filtered.forEach((c) => {
      const marker = L.marker([c.latitude, c.longitude], { icon: chargerIcon });
      marker.bindPopup(`
        <div style="min-width:200px;padding:4px 2px;">
          <h3 style="margin:0 0 6px 0;font-size:14px;font-weight:600;">${c.title}</h3>
          <div style="font-size:12px;opacity:.8;display:flex;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
            <span>${c.power}kW</span>
            <span>₹${c.pricePerKwh}/kWh</span>
            <span>★ ${c.rating}</span>
          </div>
          <p style="margin:0;font-size:12px;opacity:.7;">${c.address}</p>
        </div>
      `);
      marker.on("click", () => setSelected(c));
      marker.addTo(markersLayerRef.current!);
    });

    if (filtered.length > 0) {
      const bounds = L.latLngBounds(filtered.map((c) => [c.latitude, c.longitude] as [number, number]));
      mapRef.current.fitBounds(bounds.pad(0.15));
    }
  }, [filtered]);

  return (
    <div className="pt-16 h-screen flex flex-col">
      <div className="glass border-b border-border px-4 py-3 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search chargers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-muted border-none"
          />
        </div>
        <Select value={powerFilter} onValueChange={setPowerFilter}>
          <SelectTrigger className="w-40 bg-muted border-none">
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Power" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Power</SelectItem>
            <SelectItem value="standard">Standard (&lt;11kW)</SelectItem>
            <SelectItem value="fast">Fast (≥11kW)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-96 border-r border-border overflow-y-auto p-4 space-y-3 hidden lg:block">
          <p className="text-sm text-muted-foreground mb-2">{filtered.length} chargers found</p>
          {filtered.map((c) => (
            <ChargerCard key={c.id} charger={c} compact onSelect={setSelected} />
          ))}
        </div>

        <div className="flex-1 relative">
          <div ref={mapContainerRef} className="h-full w-full" />

          <div className="lg:hidden absolute bottom-0 left-0 right-0 glass rounded-t-2xl max-h-[40vh] overflow-y-auto p-4 space-y-3">
            {filtered.map((c) => (
              <ChargerCard key={c.id} charger={c} compact onSelect={setSelected} />
            ))}
          </div>

          {selected && (
            <div className="hidden md:block absolute right-4 top-4 w-80">
              <ChargerCard charger={selected} onSelect={setSelected} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Explore;
