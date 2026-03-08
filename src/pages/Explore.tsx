import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { useOverpassChargers } from "@/hooks/useOverpassChargers";
import { useChargers, Charger } from "@/hooks/useChargers";
import { useOCMChargers, OCMCharger } from "@/hooks/useOCMChargers";
import ChargerCard from "@/components/ChargerCard";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, SlidersHorizontal, LocateFixed, Loader2,
  Battery, X, Zap, Plug, Star, IndianRupee, Clock, Shield,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

type AvailStatus = "available" | "occupied" | "unknown";

function getAvailabilityStatus(charger: Charger): AvailStatus {
  if (charger.source === "osm") return "unknown";
  if (charger.source === "ocm") {
    const s = (charger as any).ocmStatus;
    if (s === "available") return "available";
    if (s === "unavailable") return "occupied";
    return "unknown";
  }
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

function makeOcmIcon(status: AvailStatus) {
  const c = statusColors[status];
  return new L.DivIcon({
    html: `<div style="width:12px;height:12px;border-radius:50%;background:${c};border:2px solid hsl(210,20%,6%);box-shadow:0 0 6px ${c}30;"></div>`,
    className: "",
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

const userIcon = new L.DivIcon({
  html: `<div style="width:14px;height:14px;border-radius:50%;background:hsl(155,80%,45%);border:3px solid white;box-shadow:0 0 12px hsl(155,80%,45%,0.5);"></div>`,
  className: "",
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

/* ── OCM Detail Card ── */
const OCMDetailCard = ({ charger, onClose }: { charger: OCMCharger; onClose: () => void }) => (
  <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
    <div className="p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant={charger.status === "available" ? "default" : "secondary"}
              className={cn(
                "text-[10px] px-2 py-0",
                charger.status === "available" && "bg-primary/20 text-primary border-primary/30",
                charger.status === "unavailable" && "bg-destructive/20 text-destructive border-destructive/30"
              )}
            >
              {charger.status === "available" ? "● Available" : charger.status === "unavailable" ? "● Offline" : "● Status Unknown"}
            </Badge>
            {charger.is_free && (
              <Badge variant="outline" className="text-[10px] px-2 py-0 text-primary border-primary/30">FREE</Badge>
            )}
          </div>
          <h3 className="font-heading text-base font-bold truncate">{charger.name}</h3>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{charger.address}</p>
        </div>
        <button onClick={onClose} className="ml-2 p-1 hover:bg-muted rounded-lg transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Operator & Verification */}
      {charger.operator && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
          <Shield className="w-3 h-3" />
          <span>{charger.operator}</span>
          {charger.last_verified && (
            <span className="text-[10px]">· Verified {new Date(charger.last_verified).toLocaleDateString()}</span>
          )}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-muted/50 rounded-lg p-2 text-center">
          <Zap className="w-3.5 h-3.5 mx-auto text-primary mb-0.5" />
          <p className="text-xs font-bold">{charger.power_kw > 0 ? `${charger.power_kw} kW` : "N/A"}</p>
          <p className="text-[9px] text-muted-foreground">Power</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-2 text-center">
          <IndianRupee className="w-3.5 h-3.5 mx-auto text-primary mb-0.5" />
          <p className="text-xs font-bold">{charger.pricing ? charger.pricing.substring(0, 15) : charger.is_free ? "Free" : "N/A"}</p>
          <p className="text-[9px] text-muted-foreground">Cost</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-2 text-center">
          <Star className="w-3.5 h-3.5 mx-auto text-primary mb-0.5" />
          <p className="text-xs font-bold">{charger.rating ?? "N/A"}</p>
          <p className="text-[9px] text-muted-foreground">{charger.review_count} reviews</p>
        </div>
      </div>

      {/* Connector Types */}
      {charger.connections.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Plug className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Connectors</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {charger.connections.map((conn, i) => (
              <Badge key={i} variant="outline" className="text-[10px] px-2 py-0.5 font-normal">
                {conn.type} {conn.power_kw > 0 && `· ${conn.power_kw}kW`} {conn.quantity > 1 && `×${conn.quantity}`}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      {charger.reviews.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Star className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Recent Reviews</span>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {charger.reviews.slice(0, 3).map((rev, i) => (
              <div key={i} className="bg-muted/30 rounded-lg p-2">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-medium">{rev.user}</span>
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className={cn("w-2.5 h-2.5", j < rev.rating ? "text-primary fill-primary" : "text-muted-foreground/30")} />
                    ))}
                  </div>
                </div>
                {rev.comment && <p className="text-[10px] text-muted-foreground line-clamp-2">{rev.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigate Button */}
      <Button
        size="sm"
        className="w-full mt-3 rounded-xl text-xs font-semibold"
        onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${charger.latitude},${charger.longitude}`, "_blank")}
      >
        Navigate to Charger
      </Button>
    </div>
  </div>
);

/* ── OCM List Card ── */
const OCMListCard = ({ charger, onClick }: { charger: OCMCharger; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="w-full text-left bg-card/50 border border-border/30 hover:border-primary/30 rounded-xl p-3 transition-all"
  >
    <div className="flex items-start justify-between mb-1">
      <h4 className="text-sm font-semibold truncate flex-1">{charger.name}</h4>
      <Badge
        variant="secondary"
        className={cn(
          "text-[9px] px-1.5 py-0 ml-2 shrink-0",
          charger.status === "available" && "bg-primary/20 text-primary",
          charger.status === "unavailable" && "bg-destructive/20 text-destructive"
        )}
      >
        {charger.status === "available" ? "●" : charger.status === "unavailable" ? "●" : "○"} {charger.status}
      </Badge>
    </div>
    <p className="text-[11px] text-muted-foreground truncate">{charger.address}</p>
    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
      {charger.power_kw > 0 && <span className="flex items-center gap-0.5"><Zap className="w-2.5 h-2.5" />{charger.power_kw}kW</span>}
      {charger.connections.length > 0 && <span className="flex items-center gap-0.5"><Plug className="w-2.5 h-2.5" />{charger.connections.length} types</span>}
      {charger.pricing && <span className="flex items-center gap-0.5"><IndianRupee className="w-2.5 h-2.5" />{charger.pricing.substring(0, 12)}</span>}
      {charger.is_free && <span className="text-primary font-semibold">FREE</span>}
      {charger.rating && <span className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5" />{charger.rating}</span>}
      {charger.distance_km && <span>{charger.distance_km.toFixed(1)}km</span>}
    </div>
  </button>
);

const Explore = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [powerFilter, setPowerFilter] = useState("all");
  const [selected, setSelected] = useState<Charger | null>(null);
  const [selectedOCM, setSelectedOCM] = useState<OCMCharger | null>(null);
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
  const { chargers: ocmChargers, loading: ocmLoading, fetchChargers: fetchOCMChargers } = useOCMChargers();

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const isLoading = vsLoading || osmLoading || ocmLoading;

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

  // Filter OCM chargers
  const filteredOCM = ocmChargers.filter((c) => {
    if (search) {
      const q = search.toLowerCase();
      if (!c.name.toLowerCase().includes(q) && !c.address.toLowerCase().includes(q) && !(c.operator || "").toLowerCase().includes(q)) return false;
    }
    if (powerFilter === "fast" && c.power_kw < 11) return false;
    if (powerFilter === "standard" && c.power_kw >= 11) return false;
    return true;
  });

  const allChargers = [...voltshareChargers, ...osmAsChargers];
  const totalCount = allChargers.length + filteredOCM.length;

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
        const center = map.getCenter();
        fetchOSMChargers({ south: bounds.getSouth(), west: bounds.getWest(), north: bounds.getNorth(), east: bounds.getEast() });
        fetchOCMChargers(center.lat, center.lng, 15);
      }, 500);
    };
    map.on("moveend", onMoveEnd);
    setTimeout(() => {
      const bounds = map.getBounds();
      const center = map.getCenter();
      fetchOSMChargers({ south: bounds.getSouth(), west: bounds.getWest(), north: bounds.getNorth(), east: bounds.getEast() });
      fetchOCMChargers(center.lat, center.lng, 15);
    }, 300);

    return () => { clearTimeout(debounceTimer); map.off("moveend", onMoveEnd); map.remove(); mapRef.current = null; clusterGroupRef.current = null; };
  }, []);

  useEffect(() => {
    if (!mapRef.current || userLat == null || userLng == null) return;
    if (userMarkerRef.current) { userMarkerRef.current.setLatLng([userLat, userLng]); }
    else { userMarkerRef.current = L.marker([userLat, userLng], { icon: userIcon }).addTo(mapRef.current); }
    mapRef.current.setView([userLat, userLng], 13);
    // Also fetch OCM for user location
    fetchOCMChargers(userLat, userLng, 15);
  }, [userLat, userLng]);

  useEffect(() => {
    if (!mapRef.current || !clusterGroupRef.current) return;
    clusterGroupRef.current.clearLayers();

    // Add VoltShare + OSM chargers
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
      marker.on("click", () => { setSelected(c); setSelectedOCM(null); });
      clusterGroupRef.current!.addLayer(marker);
    });

    // Add OCM chargers
    filteredOCM.forEach((c) => {
      const status: AvailStatus = c.status === "available" ? "available" : c.status === "unavailable" ? "occupied" : "unknown";
      const icon = makeOcmIcon(status);
      const marker = L.marker([c.latitude, c.longitude], { icon });
      const statusColor = statusColors[status];
      const connectorText = c.connections.slice(0, 3).map(cn => cn.type).join(", ");
      marker.bindPopup(`
        <div style="min-width:220px;padding:4px;font-family:'DM Sans',sans-serif;">
          <p style="margin:0;font-size:14px;font-weight:700;font-family:'Plus Jakarta Sans',sans-serif;">${c.name}</p>
          <p style="margin:3px 0 4px;font-size:12px;color:hsl(210,10%,50%);">${c.address}</p>
          ${c.operator ? `<p style="margin:0 0 4px;font-size:11px;color:hsl(210,10%,60%);">by ${c.operator}</p>` : ""}
          <p style="margin:0;font-size:12px;font-weight:600;color:${statusColor};">● ${c.status}</p>
          <div style="font-size:12px;color:hsl(210,10%,60%);margin-top:6px;display:flex;gap:10px;flex-wrap:wrap;">
            ${c.power_kw > 0 ? `<span>⚡ ${c.power_kw} kW</span>` : ""}
            ${c.pricing ? `<span>💰 ${c.pricing.substring(0, 20)}</span>` : c.is_free ? `<span style="color:hsl(155,80%,45%);">FREE</span>` : ""}
            ${c.rating ? `<span>★ ${c.rating}</span>` : ""}
          </div>
          ${connectorText ? `<p style="margin:6px 0 0;font-size:11px;color:hsl(210,10%,55%);">🔌 ${connectorText}</p>` : ""}
          <a href="https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}" target="_blank" style="display:inline-block;background:hsl(155,80%,45%);color:hsl(210,20%,4%);padding:6px 16px;font-size:12px;font-weight:600;text-decoration:none;font-family:'DM Sans',sans-serif;border-radius:8px;margin-top:8px;">Navigate</a>
        </div>
      `);
      marker.on("click", () => { setSelectedOCM(c); setSelected(null); });
      clusterGroupRef.current!.addLayer(marker);
    });
  }, [allChargers, filteredOCM]);

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
            placeholder="Search chargers, operators, locations..."
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
          {(osmLoading || ocmLoading) && <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" />Loading chargers...</span>}
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
              {isLoading ? "Searching..." : `${totalCount} chargers found`}
            </span>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span>{voltshareChargers.length} VoltShare</span>
              <span>{filteredOCM.length} OCM</span>
              <span>{osmAsChargers.length} OSM</span>
            </div>
          </div>

          <div className="p-3 space-y-2">
            {/* OCM chargers with rich data first */}
            {filteredOCM.map((c) => (
              <OCMListCard key={`ocm-${c.ocm_id}`} charger={c} onClick={() => { setSelectedOCM(c); setSelected(null); }} />
            ))}
            {/* VoltShare + OSM chargers */}
            {allChargers.map((c) => (
              <ChargerCard key={c.id} charger={c} compact onSelect={(ch) => {
                setSelected(ch);
                setSelectedOCM(null);
                if (ch.source === "voltshare") navigate(`/charger/${ch.id}`);
              }} />
            ))}
          </div>

          {!isLoading && totalCount === 0 && (
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
              { color: "bg-destructive", label: "Busy / Offline" },
              { color: "bg-muted-foreground", label: "Unknown" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className={cn("w-2.5 h-2.5 rounded-full", l.color)} />
                {l.label}
              </div>
            ))}
            <div className="border-t border-border/50 pt-1.5 mt-1.5 space-y-1">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="w-3.5 h-3.5 rounded-full border-[3px] border-foreground/20 bg-primary scale-75" />
                VoltShare
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="w-3 h-3 rounded-full border-2 border-foreground/20 bg-muted-foreground scale-75" />
                OCM / OSM
              </div>
            </div>
          </div>

          {/* Mobile list */}
          <div className="lg:hidden absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border/50 max-h-[35vh] overflow-y-auto p-3 space-y-2">
            {filteredOCM.slice(0, 4).map((c) => (
              <OCMListCard key={`ocm-m-${c.ocm_id}`} charger={c} onClick={() => { setSelectedOCM(c); setSelected(null); }} />
            ))}
            {allChargers.slice(0, 4).map((c) => (
              <ChargerCard key={c.id} charger={c} compact onSelect={(ch) => {
                setSelected(ch);
                setSelectedOCM(null);
                if (ch.source === "voltshare") navigate(`/charger/${ch.id}`);
              }} />
            ))}
          </div>

          {/* Selected OCM detail popup */}
          {selectedOCM && (
            <div className="absolute right-3 top-3 w-80 z-[1000] animate-slide-in-right">
              <OCMDetailCard charger={selectedOCM} onClose={() => setSelectedOCM(null)} />
            </div>
          )}

          {/* Selected VoltShare/OSM popup */}
          {selected && !selectedOCM && (
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
