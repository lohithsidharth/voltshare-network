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
  Search, SlidersHorizontal, LocateFixed, Loader2, Zap,
  Star, IndianRupee, Battery, X, Bell,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Fix leaflet default icon
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
  available: "hsl(135,100%,55%)",
  occupied: "hsl(0,84%,60%)",
  unknown: "hsl(215,18%,55%)",
};

function makeVoltshareIcon(status: AvailStatus) {
  const dot = statusColors[status];
  return new L.DivIcon({
    html: `<div style="position:relative;background:hsl(213,100%,50%);width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;border:2px solid hsla(0,0%,100%,0.2);">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
      <span style="position:absolute;top:-2px;right:-2px;width:8px;height:8px;border-radius:50%;background:${dot};border:2px solid hsl(222,47%,7%);"></span>
    </div>`,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function makeOsmIcon(status: AvailStatus) {
  const dot = statusColors[status];
  return new L.DivIcon({
    html: `<div style="position:relative;background:hsl(38,92%,50%);width:24px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;border:2px solid hsla(0,0%,100%,0.15);">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
      <span style="position:absolute;top:-2px;right:-2px;width:7px;height:7px;border-radius:50%;background:${dot};border:2px solid hsl(222,47%,7%);"></span>
    </div>`,
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

const userIcon = new L.DivIcon({
  html: `<div style="background:hsl(213,100%,50%);width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 0 20px hsl(213,100%,50%,0.5);"></div>`,
  className: "",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
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
      id: c.id,
      host_id: "",
      title: c.name,
      address: c.address || "OpenStreetMap",
      latitude: c.lat,
      longitude: c.lng,
      power: c.power || 0,
      price_per_kwh: 0,
      availability: null,
      rating: null,
      review_count: null,
      images: null,
      is_active: true,
      source: "osm" as const,
      operator: c.operator,
      socket_types: c.socket_types,
    }));

  const allChargers = [...voltshareChargers, ...osmAsChargers];

  // Smart matching
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

  const fetchForBounds = useCallback(() => {
    if (!mapRef.current) return;
    const bounds = mapRef.current.getBounds();
    fetchOSMChargers({
      south: bounds.getSouth(),
      west: bounds.getWest(),
      north: bounds.getNorth(),
      east: bounds.getEast(),
    });
  }, [fetchOSMChargers]);

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

    const map = L.map(mapContainerRef.current, {
      center: [12.9716, 77.5946],
      zoom: 12,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    mapRef.current = map;
    clusterGroupRef.current = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `<div style="background:hsl(213,100%,50%);width:42px;height:42px;border-radius:14px;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:14px;font-family:Outfit,sans-serif;box-shadow:0 0 20px hsl(213,100%,50%,0.4);border:2px solid hsla(0,0%,100%,0.2);">${count}</div>`,
          className: "",
          iconSize: [42, 42],
          iconAnchor: [21, 21],
        });
      },
    });
    map.addLayer(clusterGroupRef.current);

    let debounceTimer: ReturnType<typeof setTimeout>;
    const onMoveEnd = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const bounds = map.getBounds();
        fetchOSMChargers({
          south: bounds.getSouth(),
          west: bounds.getWest(),
          north: bounds.getNorth(),
          east: bounds.getEast(),
        });
      }, 500);
    };
    map.on("moveend", onMoveEnd);

    setTimeout(() => {
      const bounds = map.getBounds();
      fetchOSMChargers({
        south: bounds.getSouth(),
        west: bounds.getWest(),
        north: bounds.getNorth(),
        east: bounds.getEast(),
      });
    }, 300);

    return () => {
      clearTimeout(debounceTimer);
      map.off("moveend", onMoveEnd);
      map.remove();
      mapRef.current = null;
      clusterGroupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || userLat == null || userLng == null) return;
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLat, userLng]);
    } else {
      userMarkerRef.current = L.marker([userLat, userLng], { icon: userIcon })
        .bindPopup("<div class='font-heading font-semibold text-sm'>You are here</div>")
        .addTo(mapRef.current);
    }
    mapRef.current.setView([userLat, userLng], 13);
  }, [userLat, userLng]);

  useEffect(() => {
    if (!mapRef.current || !clusterGroupRef.current) return;
    clusterGroupRef.current.clearLayers();

    allChargers.forEach((c) => {
      const status = getAvailabilityStatus(c);
      const icon = c.source === "osm" ? makeOsmIcon(status) : makeVoltshareIcon(status);
      const marker = L.marker([c.latitude, c.longitude], { icon });
      const sourceTag = c.source === "osm"
        ? `<span style="background:hsl(38,92%,50%,0.15);color:hsl(38,92%,50%);padding:2px 8px;border-radius:6px;font-size:10px;font-weight:600;">OSM</span>`
        : `<span style="background:hsl(213,100%,50%,0.15);color:hsl(213,100%,50%);padding:2px 8px;border-radius:6px;font-size:10px;font-weight:600;">VoltShare</span>`;
      const statusLabel = status === "available" ? `<span style="color:hsl(135,100%,55%)">● Available</span>` : status === "occupied" ? `<span style="color:hsl(0,84%,60%)">● Busy</span>` : `<span style="color:hsl(215,18%,55%)">● Unknown</span>`;
      const priceInfo = c.source === "voltshare" && c.price_per_kwh > 0 ? `<span>₹${c.price_per_kwh}/kWh</span>` : "";
      const bookBtn = c.source === "voltshare" ? `<div style="margin-top:8px;"><a href="/charger/${c.id}" style="display:inline-block;background:hsl(213,100%,50%);color:white;padding:6px 16px;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;">Book Now</a></div>` : "";
      marker.bindPopup(`
        <div style="min-width:210px;padding:4px;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
            ${sourceTag}
            <h3 style="margin:0;font-size:14px;font-weight:700;font-family:Outfit,sans-serif;">${c.title}</h3>
          </div>
          <div style="font-size:11px;margin-bottom:8px;font-weight:600;">${statusLabel}</div>
          <div style="font-size:12px;opacity:.7;display:flex;gap:10px;flex-wrap:wrap;margin-bottom:6px;">
            ${c.power > 0 ? `<span>⚡ ${c.power}kW</span>` : ""}
            ${priceInfo}
            ${c.rating ? `<span>★ ${c.rating}</span>` : ""}
          </div>
          <p style="margin:0;font-size:11px;opacity:.5;">${c.address}</p>
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

  const nearbyCount = allChargers.filter(c => {
    if (userLat == null || userLng == null) return false;
    const dist = Math.sqrt(Math.pow(c.latitude - userLat, 2) + Math.pow(c.longitude - userLng, 2)) * 111;
    return dist < 1;
  }).length;

  return (
    <div className="pt-16 h-screen flex flex-col">
      {/* Search bar */}
      <div className="glass border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search charger location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-accent/50 border-none rounded-xl h-10"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className={cn("rounded-xl gap-2", showFilters && "bg-primary/10 border-primary/30 text-primary")}
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
        </Button>
        <Button variant="outline" size="icon" className="rounded-xl" onClick={handleLocateMe} disabled={locating}>
          {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
        </Button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="glass border-b border-border/50 px-4 py-3 flex items-center gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <Battery className="w-4 h-4 text-primary" />
            <Select value={powerFilter} onValueChange={setPowerFilter}>
              <SelectTrigger className="w-36 bg-accent/50 border-none rounded-xl h-9 text-xs">
                <SelectValue placeholder="Charger Speed" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Speeds</SelectItem>
                <SelectItem value="standard">Standard (&lt;11kW)</SelectItem>
                <SelectItem value="fast">Fast (≥11kW)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {osmLoading && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading stations...
            </div>
          )}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-[380px] border-r border-border/50 overflow-y-auto p-4 space-y-3 hidden lg:block bg-background/50">
          {/* Nearby alert */}
          {nearbyCount > 0 && (
            <div className="glass-card rounded-2xl p-4 flex items-center gap-3 border-glow mb-4 animate-fade-in">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm font-semibold">{nearbyCount} chargers within 1 km</p>
                <p className="text-xs text-muted-foreground">Community charging available nearby</p>
              </div>
            </div>
          )}

          {/* Smart recommendation */}
          {recommendedCharger && (
            <div className="mb-4">
              <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Zap className="w-3 h-3" /> Best Charger Near You
              </p>
              <ChargerCard charger={recommendedCharger} compact recommended onSelect={(c) => {
                if (c.source === "voltshare") navigate(`/charger/${c.id}`);
                else setSelected(c);
              }} />
            </div>
          )}

          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Searching..." : `${allChargers.length} chargers found`}
            </p>
            <div className="flex gap-2">
              <span className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                <span className="w-2 h-2 rounded-sm bg-primary" />{voltshareChargers.length} VoltShare
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                <span className="w-2 h-2 rounded-sm bg-volt-warning" />{osmAsChargers.length} OSM
              </span>
            </div>
          </div>

          {allChargers.map((c) => (
            <ChargerCard key={c.id} charger={c} compact onSelect={(ch) => {
              setSelected(ch);
              if (ch.source === "voltshare") navigate(`/charger/${ch.id}`);
            }} />
          ))}

          {!isLoading && allChargers.length === 0 && (
            <div className="text-center py-12">
              <Battery className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground font-medium">No EV chargers nearby</p>
              <p className="text-xs text-muted-foreground mt-1">Try expanding the search radius</p>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <div ref={mapContainerRef} className="h-full w-full" />

          {/* Map legend */}
          <div className="absolute top-4 left-4 z-[1000]">
            <div className="glass rounded-xl px-3.5 py-2.5 space-y-1.5">
              {[
                { color: "bg-secondary", label: "Available" },
                { color: "bg-destructive", label: "Busy" },
                { color: "bg-muted-foreground", label: "Unknown" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className={cn("w-2.5 h-2.5 rounded-full", l.color)} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>

          {/* Mobile bottom sheet */}
          <div className="lg:hidden absolute bottom-0 left-0 right-0 glass rounded-t-2xl max-h-[40vh] overflow-y-auto p-4 space-y-3">
            {allChargers.slice(0, 10).map((c) => (
              <ChargerCard key={c.id} charger={c} compact onSelect={(ch) => {
                setSelected(ch);
                if (ch.source === "voltshare") navigate(`/charger/${ch.id}`);
              }} />
            ))}
          </div>

          {/* Selected charger popup */}
          {selected && (
            <div className="hidden md:block absolute right-4 top-4 w-80 z-[1000] animate-slide-in-right">
              <div className="relative">
                <button
                  className="absolute -top-2 -right-2 z-10 w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center hover:bg-accent"
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
