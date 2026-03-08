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
  Battery, X, Zap,
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
  available: "hsl(155,80%,45%)",
  occupied: "hsl(0,65%,50%)",
  unknown: "hsl(210,10%,50%)",
};

function makeVoltshareIcon(status: AvailStatus) {
  const c = statusColors[status];
  return new L.DivIcon({
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${c};border:3px solid hsl(210,20%,6%);box-shadow:0 0 8px ${c}40;"></div>`,
    className: "",
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function makeOsmIcon(status: AvailStatus) {
  const c = statusColors[status];
  return new L.DivIcon({
    html: `<div style="width:10px;height:10px;border-radius:50%;background:${c};border:2px solid hsl(210,20%,6%);opacity:0.7;"></div>`,
    className: "",
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
}

const userIcon = new L.DivIcon({
  html: `<div style="width:14px;height:14px;border-radius:50%;background:hsl(155,80%,45%);border:3px solid white;box-shadow:0 0 12px hsl(155,80%,45%,0.5);"></div>`,
  className: "",
  iconSize: [14, 14],
  iconAnchor: [7, 7],
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
          html: `<div style="background:hsl(155,80%,45%);width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:hsl(210,20%,4%);font-weight:700;font-size:12px;font-family:'DM Sans',sans-serif;box-shadow:0 0 12px hsl(155,80%,45%,0.3);">${count}</div>`,
          className: "", iconSize: [32, 32], iconAnchor: [16, 16],
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
      const statusText = status === "available" ? "Available" : status === "occupied" ? "Busy" : "Unknown";
      const statusColor = statusColors[status];
      const bookBtn = c.source === "voltshare" ? `<a href="/charger/${c.id}" style="display:inline-block;background:hsl(155,80%,45%);color:hsl(210,20%,4%);padding:6px 16px;font-size:12px;font-weight:600;text-decoration:none;font-family:'DM Sans',sans-serif;border-radius:8px;margin-top:8px;">Book Now</a>` : "";
      marker.bindPopup(`
        <div style="min-width:200px;padding:4px;font-family:'DM Sans',sans-serif;">
          <p style="margin:0;font-size:14px;font-weight:700;font-family:'Plus Jakarta Sans',sans-serif;">${c.title}</p>
          <p style="margin:3px 0 8px;font-size:12px;color:hsl(210,10%,50%);">${c.address}</p>
          <p style="margin:0;font-size:12px;font-weight:600;color:${statusColor};">● ${statusText}</p>
          <div style="font-size:12px;color:hsl(210,10%,60%);margin-top:6px;display:flex;gap:10px;">
            ${c.power > 0 ? `<span>${c.power} kW</span>` : ""}
            ${c.source === "voltshare" && c.price_per_kwh > 0 ? `<span>₹${c.price_per_kwh}/kWh</span>` : ""}
            ${c.rating ? `<span>★ ${c.rating}</span>` : ""}
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
    <div className="pt-16 h-screen flex flex-col">
      {/* Search Bar */}
      <div className="border-b border-border/50 px-4 py-3 flex items-center gap-3 bg-background/80 backdrop-blur-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search chargers by location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 bg-card border-border rounded-xl text-sm"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className={cn("rounded-xl h-10 gap-2 text-sm font-medium px-4", showFilters && "text-primary border-primary")}
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
        </Button>
        <Button variant="outline" size="icon" className="rounded-xl h-10 w-10" onClick={handleLocateMe} disabled={locating}>
          {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
        </Button>
      </div>

      {showFilters && (
        <div className="border-b border-border/50 px-4 py-2.5 flex items-center gap-3 bg-background/80 backdrop-blur-sm">
          <Select value={powerFilter} onValueChange={setPowerFilter}>
            <SelectTrigger className="w-40 bg-card border-border rounded-xl h-9 text-sm">
              <SelectValue placeholder="Charger Speed" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Speeds</SelectItem>
              <SelectItem value="standard">Standard (&lt;11 kW)</SelectItem>
              <SelectItem value="fast">Fast (11+ kW)</SelectItem>
            </SelectContent>
          </Select>
          {osmLoading && <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" />Loading chargers...</span>}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-[360px] border-r border-border/50 overflow-y-auto hidden lg:block bg-background/50">
          {recommendedCharger && (
            <div className="border-b border-border/50 p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Zap className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">Best Match For You</span>
              </div>
              <ChargerCard charger={recommendedCharger} compact recommended onSelect={(c) => {
                if (c.source === "voltshare") navigate(`/charger/${c.id}`);
                else setSelected(c);
              }} />
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <span className="text-xs text-muted-foreground font-medium">
              {isLoading ? "Searching..." : `${allChargers.length} chargers found`}
            </span>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span>{voltshareChargers.length} VoltShare</span>
              <span>{osmAsChargers.length} OSM</span>
            </div>
          </div>

          <div className="p-3 space-y-2">
            {allChargers.map((c) => (
              <ChargerCard key={c.id} charger={c} compact onSelect={(ch) => {
                setSelected(ch);
                if (ch.source === "voltshare") navigate(`/charger/${ch.id}`);
              }} />
            ))}
          </div>

          {!isLoading && allChargers.length === 0 && (
            <div className="text-center py-16 px-4">
              <Battery className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No chargers found</p>
              <p className="text-xs text-muted-foreground mt-1">Try searching a different location or expanding the map</p>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <div ref={mapContainerRef} className="h-full w-full" />

          {/* Legend */}
          <div className="absolute top-3 left-3 z-[1000] bg-card/90 backdrop-blur-sm border border-border/50 rounded-xl px-3 py-2.5 space-y-1.5">
            {[
              { color: "bg-primary", label: "Available" },
              { color: "bg-destructive", label: "Busy" },
              { color: "bg-muted-foreground", label: "Unknown" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className={cn("w-2.5 h-2.5 rounded-full", l.color)} />
                {l.label}
              </div>
            ))}
          </div>

          {/* Mobile list */}
          <div className="lg:hidden absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border/50 max-h-[35vh] overflow-y-auto p-3 space-y-2">
            {allChargers.slice(0, 8).map((c) => (
              <ChargerCard key={c.id} charger={c} compact onSelect={(ch) => {
                setSelected(ch);
                if (ch.source === "voltshare") navigate(`/charger/${ch.id}`);
              }} />
            ))}
          </div>

          {/* Selected popup */}
          {selected && (
            <div className="hidden md:block absolute right-3 top-3 w-80 z-[1000] animate-slide-in-right">
              <div className="relative">
                <button
                  className="absolute -top-2 -right-2 z-10 w-7 h-7 bg-card border border-border/50 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
                  onClick={() => setSelected(null)}
                >
                  <X className="w-3.5 h-3.5" />
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
