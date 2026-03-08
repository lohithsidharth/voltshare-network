import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { useOverpassChargers } from "@/hooks/useOverpassChargers";
import { useChargers, Charger } from "@/hooks/useChargers";
import ChargerCard from "@/components/ChargerCard";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, SlidersHorizontal, LocateFixed, Loader2,
  Battery, X,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

type AvailStatus = "available" | "occupied" | "unknown";

function getAvailabilityStatus(charger: Charger): AvailStatus {
  if (charger.source === "osm") return "unknown";
  const avail = (charger.availability || "").toLowerCase();
  if (avail === "occupied" || avail === "offline" || avail === "unavailable") return "occupied";
  if (avail === "available" || avail === "open" || charger.is_active) return "available";
  return "unknown";
}

const statusColors: Record<AvailStatus, string> = {
  available: "hsl(145,100%,42%)",
  occupied: "hsl(0,65%,50%)",
  unknown: "hsl(0,0%,45%)",
};

function makeVoltshareIcon(status: AvailStatus) {
  const c = statusColors[status];
  return new L.DivIcon({
    html: `<div style="width:10px;height:10px;border-radius:1px;background:${c};border:2px solid hsl(0,0%,4%);"></div>`,
    className: "",
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
}

function makeOsmIcon(status: AvailStatus) {
  const c = statusColors[status];
  return new L.DivIcon({
    html: `<div style="width:8px;height:8px;border-radius:50%;background:${c};border:2px solid hsl(0,0%,4%);opacity:0.7;"></div>`,
    className: "",
    iconSize: [8, 8],
    iconAnchor: [4, 4],
  });
}

const userIcon = new L.DivIcon({
  html: `<div style="width:10px;height:10px;border-radius:50%;background:hsl(145,100%,42%);border:2px solid white;"></div>`,
  className: "",
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

const Explore = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [powerFilter, setPowerFilter] = useState("all");
  const [selected, setSelected] = useState<Charger | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const { data: voltshareChargers = [], isLoading: vsLoading } = useChargers({
    search,
    powerFilter: powerFilter as "all" | "standard" | "fast",
    lat: userLat,
    lng: userLng,
  });

  const { chargers: osmChargers, loading: osmLoading, fetchChargers: fetchOSMChargers } = useOverpassChargers();

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const isLoading = vsLoading || osmLoading;

  const osmAsChargers: Charger[] = osmChargers
    .filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !(c.address || "").toLowerCase().includes(q)) return false;
      }
      if (powerFilter === "fast" && (c.power || 0) < 11) return false;
      if (powerFilter === "standard" && (c.power || 0) >= 11) return false;
      return true;
    })
    .map((c) => ({
      id: c.id, host_id: "", title: c.name, address: c.address || "OpenStreetMap",
      latitude: c.lat, longitude: c.lng, power: c.power || 0, price_per_kwh: 0,
      availability: null, rating: null, review_count: null, images: null,
      is_active: true, source: "osm" as const, operator: c.operator, socket_types: c.socket_types,
    }));

  const allChargers = [...voltshareChargers, ...osmAsChargers];

  const recommendedCharger = useMemo(() => {
    const available = allChargers.filter(c => c.source === "voltshare" && c.is_active);
    if (available.length === 0 || (userLat == null && userLng == null)) return null;
    const scored = available.map(c => {
      let score = 0;
      if (userLat != null && userLng != null) {
        const dist = Math.sqrt(Math.pow(c.latitude - userLat, 2) + Math.pow(c.longitude - userLng, 2)) * 111000;
        score += Math.max(0, 40 - (dist / 250));
      }
      if (c.price_per_kwh > 0) score += Math.max(0, 20 - c.price_per_kwh);
      score += Math.min(20, c.power * 1.5);
      if (c.rating) score += c.rating * 4;
      return { charger: c, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.charger || null;
  }, [allChargers, userLat, userLng]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); setLocating(false); },
        () => setLocating(false),
        { timeout: 8000 }
      );
    }
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, { center: [12.9716, 77.5946], zoom: 12, zoomControl: false });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; OSM &copy; CARTO',
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapRef.current = map;
    clusterGroupRef.current = L.markerClusterGroup({
      maxClusterRadius: 50, spiderfyOnMaxZoom: true, showCoverageOnHover: false,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `<div style="background:hsl(145,100%,42%);width:28px;height:28px;display:flex;align-items:center;justify-content:center;color:hsl(0,0%,2%);font-weight:600;font-size:11px;font-family:'JetBrains Mono',monospace;">${count}</div>`,
          className: "", iconSize: [28, 28], iconAnchor: [14, 14],
        });
      },
    });
    map.addLayer(clusterGroupRef.current);

    let debounceTimer: ReturnType<typeof setTimeout>;
    const onMoveEnd = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const bounds = map.getBounds();
        fetchOSMChargers({ south: bounds.getSouth(), west: bounds.getWest(), north: bounds.getNorth(), east: bounds.getEast() });
      }, 500);
    };
    map.on("moveend", onMoveEnd);
    setTimeout(() => {
      const bounds = map.getBounds();
      fetchOSMChargers({ south: bounds.getSouth(), west: bounds.getWest(), north: bounds.getNorth(), east: bounds.getEast() });
    }, 300);

    return () => { clearTimeout(debounceTimer); map.off("moveend", onMoveEnd); map.remove(); mapRef.current = null; clusterGroupRef.current = null; };
  }, []);

  useEffect(() => {
    if (!mapRef.current || userLat == null || userLng == null) return;
    if (userMarkerRef.current) { userMarkerRef.current.setLatLng([userLat, userLng]); }
    else { userMarkerRef.current = L.marker([userLat, userLng], { icon: userIcon }).addTo(mapRef.current); }
    mapRef.current.setView([userLat, userLng], 13);
  }, [userLat, userLng]);

  useEffect(() => {
    if (!mapRef.current || !clusterGroupRef.current) return;
    clusterGroupRef.current.clearLayers();
    allChargers.forEach((c) => {
      const status = getAvailabilityStatus(c);
      const icon = c.source === "osm" ? makeOsmIcon(status) : makeVoltshareIcon(status);
      const marker = L.marker([c.latitude, c.longitude], { icon });
      const statusText = status === "available" ? "ONLINE" : status === "occupied" ? "BUSY" : "UNKNOWN";
      const statusColor = status === "available" ? "hsl(145,100%,42%)" : status === "occupied" ? "hsl(0,65%,50%)" : "hsl(0,0%,45%)";
      const bookBtn = c.source === "voltshare" ? `<a href="/charger/${c.id}" style="display:inline-block;background:hsl(145,100%,42%);color:hsl(0,0%,2%);padding:4px 12px;font-size:10px;font-weight:600;text-decoration:none;font-family:'JetBrains Mono',monospace;letter-spacing:0.05em;margin-top:8px;">BOOK</a>` : "";
      marker.bindPopup(`
        <div style="min-width:180px;padding:2px;font-family:'Inter',sans-serif;">
          <p style="margin:0;font-size:13px;font-weight:600;font-family:'Space Grotesk',sans-serif;">${c.title}</p>
          <p style="margin:2px 0 6px;font-size:10px;color:hsl(0,0%,45%);">${c.address}</p>
          <p style="margin:0;font-size:10px;font-weight:600;color:${statusColor};font-family:'JetBrains Mono',monospace;letter-spacing:0.05em;">${statusText}</p>
          <div style="font-size:11px;color:hsl(0,0%,60%);margin-top:4px;display:flex;gap:8px;">
            ${c.power > 0 ? `<span>${c.power}kW</span>` : ""}
            ${c.source === "voltshare" && c.price_per_kwh > 0 ? `<span>₹${c.price_per_kwh}/kWh</span>` : ""}
            ${c.rating ? `<span>★${c.rating}</span>` : ""}
          </div>
          ${bookBtn}
        </div>
      `);
      marker.on("click", () => setSelected(c));
      clusterGroupRef.current!.addLayer(marker);
    });
  }, [allChargers]);

  const handleLocateMe = () => {
    if ("geolocation" in navigator) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); setLocating(false); },
        () => setLocating(false),
        { timeout: 8000 }
      );
    }
  };

  return (
    <div className="pt-12 h-screen flex flex-col">
      {/* Search */}
      <div className="border-b border-border px-4 py-2 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 bg-card border-border rounded-sm text-sm font-mono"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className={cn("rounded-sm h-8 gap-1.5 text-[11px] font-mono", showFilters && "text-primary border-primary")}
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal className="w-3 h-3" />
          FILTER
        </Button>
        <Button variant="outline" size="icon" className="rounded-sm h-8 w-8" onClick={handleLocateMe} disabled={locating}>
          {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />}
        </Button>
      </div>

      {showFilters && (
        <div className="border-b border-border px-4 py-2 flex items-center gap-2">
          <Select value={powerFilter} onValueChange={setPowerFilter}>
            <SelectTrigger className="w-32 bg-card border-border rounded-sm h-7 text-[11px] font-mono">
              <SelectValue placeholder="Speed" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ALL</SelectItem>
              <SelectItem value="standard">STANDARD</SelectItem>
              <SelectItem value="fast">FAST</SelectItem>
            </SelectContent>
          </Select>
          {osmLoading && <span className="text-[10px] font-mono text-muted-foreground ml-auto">LOADING...</span>}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-[340px] border-r border-border overflow-y-auto hidden lg:block">
          {recommendedCharger && (
            <div className="border-b border-border p-3">
              <p className="font-mono text-[10px] tracking-wider text-primary mb-2">▸ BEST MATCH</p>
              <ChargerCard charger={recommendedCharger} compact recommended onSelect={(c) => {
                if (c.source === "voltshare") navigate(`/charger/${c.id}`);
                else setSelected(c);
              }} />
            </div>
          )}

          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="font-mono text-[10px] tracking-wider text-muted-foreground">
              {isLoading ? "SEARCHING..." : `${allChargers.length} RESULTS`}
            </span>
            <div className="flex gap-3 font-mono text-[10px] tracking-wider text-muted-foreground">
              <span>{voltshareChargers.length} VS</span>
              <span>{osmAsChargers.length} OSM</span>
            </div>
          </div>

          <div className="divide-y divide-border">
            {allChargers.map((c) => (
              <div key={c.id} className="p-2">
                <ChargerCard charger={c} compact onSelect={(ch) => {
                  setSelected(ch);
                  if (ch.source === "voltshare") navigate(`/charger/${ch.id}`);
                }} />
              </div>
            ))}
          </div>

          {!isLoading && allChargers.length === 0 && (
            <div className="text-center py-16">
              <Battery className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="font-mono text-[11px] text-muted-foreground">NO CHARGERS FOUND</p>
              <p className="text-[11px] text-muted-foreground mt-1">Try expanding search radius</p>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <div ref={mapContainerRef} className="h-full w-full" />

          {/* Legend */}
          <div className="absolute top-3 left-3 z-[1000] bg-card border border-border px-2.5 py-2 space-y-1">
            {[
              { color: "bg-primary", label: "ONLINE" },
              { color: "bg-destructive", label: "BUSY" },
              { color: "bg-muted-foreground", label: "UNKNOWN" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-2 font-mono text-[9px] tracking-wider text-muted-foreground">
                <span className={cn("w-2 h-2", l.color)} />
                {l.label}
              </div>
            ))}
          </div>

          {/* Mobile list */}
          <div className="lg:hidden absolute bottom-0 left-0 right-0 bg-background border-t border-border max-h-[35vh] overflow-y-auto divide-y divide-border">
            {allChargers.slice(0, 8).map((c) => (
              <div key={c.id} className="p-2">
                <ChargerCard charger={c} compact onSelect={(ch) => {
                  setSelected(ch);
                  if (ch.source === "voltshare") navigate(`/charger/${ch.id}`);
                }} />
              </div>
            ))}
          </div>

          {/* Selected popup */}
          {selected && (
            <div className="hidden md:block absolute right-3 top-3 w-72 z-[1000] animate-slide-in-right">
              <div className="relative">
                <button
                  className="absolute -top-1 -right-1 z-10 w-5 h-5 bg-card border border-border flex items-center justify-center"
                  onClick={() => setSelected(null)}
                >
                  <X className="w-3 h-3" />
                </button>
                <ChargerCard charger={selected} onSelect={(ch) => {
                  if (ch.source === "voltshare") navigate(`/charger/${ch.id}`);
                }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Explore;
