import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { useOverpassChargers, OverpassCharger } from "@/hooks/useOverpassChargers";
import { useChargers, Charger } from "@/hooks/useChargers";
import ChargerCard from "@/components/ChargerCard";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal, LocateFixed, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

// Availability status helpers
type AvailStatus = "available" | "occupied" | "unknown";

function getAvailabilityStatus(charger: Charger): AvailStatus {
  if (charger.source === "osm") return "unknown";
  const avail = (charger.availability || "").toLowerCase();
  if (avail === "occupied" || avail === "offline" || avail === "unavailable") return "occupied";
  if (avail === "available" || avail === "open" || charger.is_active) return "available";
  return "unknown";
}

const statusColors: Record<AvailStatus, string> = {
  available: "hsl(142,71%,45%)",
  occupied: "hsl(0,84%,60%)",
  unknown: "hsl(220,9%,46%)",
};

function makeVoltshareIcon(status: AvailStatus) {
  const dot = statusColors[status];
  return new L.DivIcon({
    html: `<div style="position:relative;background:hsl(213,100%,50%);width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 20px hsl(213,100%,50%,0.5);border:2px solid white;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
      <span style="position:absolute;top:-2px;right:-2px;width:10px;height:10px;border-radius:50%;background:${dot};border:2px solid white;box-shadow:0 0 6px ${dot};"></span>
    </div>`,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function makeOsmIcon(status: AvailStatus) {
  const dot = statusColors[status];
  return new L.DivIcon({
    html: `<div style="position:relative;background:hsl(38,92%,50%);width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 15px hsl(38,92%,50%,0.5);border:2px solid white;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
      <span style="position:absolute;top:-2px;right:-2px;width:9px;height:9px;border-radius:50%;background:${dot};border:2px solid white;box-shadow:0 0 6px ${dot};"></span>
    </div>`,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

const userIcon = new L.DivIcon({
  html: `<div style="background:hsl(142,71%,45%);width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 0 15px hsl(142,71%,45%,0.6);"></div>`,
  className: "",
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const Explore = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [powerFilter, setPowerFilter] = useState("all");
  const [selected, setSelected] = useState<Charger | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);

  // VoltShare chargers from DB
  const { data: voltshareChargers = [], isLoading: vsLoading } = useChargers({
    search,
    powerFilter: powerFilter as "all" | "standard" | "fast",
    lat: userLat,
    lng: userLng,
  });

  // OSM chargers from Overpass (bounds-based)
  const { chargers: osmChargers, loading: osmLoading, fetchChargers: fetchOSMChargers } = useOverpassChargers();

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const isLoading = vsLoading || osmLoading;

  // Convert OSM chargers to Charger type for sidebar display
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

  // Fetch OSM chargers based on current map bounds
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

  // Detect user location on mount
  useEffect(() => {
    if ("geolocation" in navigator) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
          setLocating(false);
        },
        () => setLocating(false),
        { timeout: 8000 }
      );
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [12.9716, 77.5946],
      zoom: 12,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(map);

    mapRef.current = map;
    clusterGroupRef.current = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `<div style="background:hsl(213,100%,50%);width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:14px;box-shadow:0 0 20px hsl(213,100%,50%,0.5);border:2px solid white;">${count}</div>`,
          className: "",
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });
      },
    });
    map.addLayer(clusterGroupRef.current);

    // Fetch chargers on map move/zoom with debounce
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

    // Initial fetch
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

  // Update user marker when location changes
  useEffect(() => {
    if (!mapRef.current || userLat == null || userLng == null) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLat, userLng]);
    } else {
      userMarkerRef.current = L.marker([userLat, userLng], { icon: userIcon })
        .bindPopup("You are here")
        .addTo(mapRef.current);
    }
    mapRef.current.setView([userLat, userLng], 13);
  }, [userLat, userLng]);

  // Update markers when chargers change
  useEffect(() => {
    if (!mapRef.current || !clusterGroupRef.current) return;

    clusterGroupRef.current.clearLayers();

    allChargers.forEach((c) => {
      const status = getAvailabilityStatus(c);
      const icon = c.source === "osm" ? makeOsmIcon(status) : makeVoltshareIcon(status);
      const marker = L.marker([c.latitude, c.longitude], { icon });
      const sourceTag = c.source === "osm"
        ? `<span style="background:hsl(38,92%,50%);color:white;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600;">OSM</span>`
        : `<span style="background:hsl(213,100%,50%);color:white;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600;">VoltShare</span>`;
      const statusLabel = status === "available" ? "🟢 Available" : status === "occupied" ? "🔴 Occupied" : "⚫ Unknown";
      const priceInfo = c.source === "voltshare" && c.price_per_kwh > 0
        ? `<span>₹${c.price_per_kwh}/kWh</span>` : "";
      const operatorInfo = c.source === "osm" && (c as any).operator
        ? `<p style="margin:2px 0 0;font-size:11px;opacity:.6;">${(c as any).operator}</p>` : "";
      marker.bindPopup(`
        <div style="min-width:200px;padding:4px 2px;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            ${sourceTag}
            <h3 style="margin:0;font-size:14px;font-weight:600;">${c.title}</h3>
          </div>
          <div style="font-size:11px;margin-bottom:6px;font-weight:600;color:${statusColors[status]};">${statusLabel}</div>
          <div style="font-size:12px;opacity:.8;display:flex;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
            ${c.power > 0 ? `<span>${c.power}kW</span>` : ""}
            ${priceInfo}
            ${c.rating ? `<span>★ ${c.rating}</span>` : ""}
          </div>
          <p style="margin:0;font-size:12px;opacity:.7;">${c.address}</p>
          ${operatorInfo}
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
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
          setLocating(false);
        },
        () => setLocating(false),
        { timeout: 8000 }
      );
    }
  };

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
        <Button variant="outline" size="icon" onClick={handleLocateMe} disabled={locating}>
          {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
        </Button>
        {osmLoading && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Loading stations...</span>
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-96 border-r border-border overflow-y-auto p-4 space-y-3 hidden lg:block">
          <p className="text-sm text-muted-foreground mb-2">
            {isLoading ? "Loading chargers..." : `${allChargers.length} chargers found`}
          </p>
          {allChargers.map((c) => (
            <ChargerCard key={c.id} charger={c} compact onSelect={setSelected} />
          ))}
        </div>

        <div className="flex-1 relative">
          <div ref={mapContainerRef} className="h-full w-full" />

          {/* Source count badge */}
          <div className="absolute top-4 left-4 z-[1000] flex gap-2">
            <div className="glass rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs font-medium">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(38,92%,50%)" }} />
              <span className="text-foreground">{osmAsChargers.length} OSM</span>
            </div>
            <div className="glass rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs font-medium">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(213,100%,50%)" }} />
              <span className="text-foreground">{voltshareChargers.length} VoltShare</span>
            </div>
          </div>

          <div className="lg:hidden absolute bottom-0 left-0 right-0 glass rounded-t-2xl max-h-[40vh] overflow-y-auto p-4 space-y-3">
            {allChargers.map((c) => (
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
