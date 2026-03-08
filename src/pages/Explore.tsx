import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { useOverpassChargers } from "@/hooks/useOverpassChargers";
import { useChargers, Charger } from "@/hooks/useChargers";
import { useOCMChargers, OCMCharger } from "@/hooks/useOCMChargers";
import ChargerCard from "@/components/ChargerCard";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, SlidersHorizontal, LocateFixed, Loader2,
  Battery, X, Zap, Plug, Star, IndianRupee, Shield,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const DEFAULT_CENTER: [number, number] = [12.9716, 77.5946];
const DEFAULT_ZOOM = 12;

/* ── Leaflet Icons ── */
const makeIcon = (color: string, size: number) =>
  L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #0a0f1a;"></div>`,
  });

const ICON_VOLTSHARE_AVAILABLE = makeIcon("#40d88e", 20);
const ICON_VOLTSHARE_OCCUPIED = makeIcon("#e05252", 20);
const ICON_OSM = makeIcon("#7a8494", 12);
const ICON_OCM_AVAILABLE = makeIcon("#40d88e", 16);
const ICON_OCM_OCCUPIED = makeIcon("#e05252", 16);
const ICON_OCM_UNKNOWN = makeIcon("#7a8494", 16);
const ICON_USER = makeIcon("#40d88e", 18);

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

      {charger.operator && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
          <Shield className="w-3 h-3" />
          <span>{charger.operator}</span>
          {charger.last_verified && (
            <span className="text-[10px]">· Verified {new Date(charger.last_verified).toLocaleDateString()}</span>
          )}
        </div>
      )}

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
        {charger.status}
      </Badge>
    </div>
    <p className="text-[11px] text-muted-foreground truncate">{charger.address}</p>
    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
      {charger.power_kw > 0 && <span className="flex items-center gap-0.5"><Zap className="w-2.5 h-2.5" />{charger.power_kw}kW</span>}
      {charger.connections.length > 0 && <span className="flex items-center gap-0.5"><Plug className="w-2.5 h-2.5" />{charger.connections.length} types</span>}
      {charger.is_free && <span className="text-primary font-semibold">FREE</span>}
      {charger.rating && <span className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5" />{charger.rating}</span>}
      {charger.distance_km && <span>{charger.distance_km.toFixed(1)}km</span>}
    </div>
  </button>
);

/* ── Map event handler ── */
const MapEvents = ({ onMoveEnd }: { onMoveEnd: (bounds: L.LatLngBounds, center: L.LatLng) => void }) => {
  useMapEvents({
    moveend: (e) => {
      const map = e.target;
      onMoveEnd(map.getBounds(), map.getCenter());
    },
  });
  return null;
};

/* ── Fly to location helper ── */
const FlyTo = ({ center, zoom }: { center: [number, number]; zoom?: number }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom ?? map.getZoom(), { duration: 1 });
  }, [center[0], center[1]]);
  return null;
};

/* ── Imperative Marker Cluster layer ── */
interface ClusterItem {
  id: string;
  lat: number;
  lng: number;
  icon: L.DivIcon;
  onClick: () => void;
}

const MarkerClusterLayer = ({ items }: { items: ClusterItem[] }) => {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    if (!clusterRef.current) {
      clusterRef.current = (L as any).markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 60,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
      });
      map.addLayer(clusterRef.current);
    }

    const group = clusterRef.current!;
    group.clearLayers();

    items.forEach((item) => {
      const marker = L.marker([item.lat, item.lng], { icon: item.icon });
      marker.on("click", item.onClick);
      group.addLayer(marker);
    });

    return () => {
      // cleanup on unmount
    };
  }, [items, map]);

  useEffect(() => {
    return () => {
      if (clusterRef.current) {
        map.removeLayer(clusterRef.current);
      }
    };
  }, [map]);

  return null;
};


  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [powerFilter, setPowerFilter] = useState("all");
  const [selected, setSelected] = useState<Charger | null>(null);
  const [selectedOCM, setSelectedOCM] = useState<OCMCharger | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const { data: voltshareChargers = [], isLoading: vsLoading } = useChargers({
    search,
    powerFilter: powerFilter as "all" | "standard" | "fast",
    lat: userLat,
    lng: userLng,
  });

  const { chargers: osmChargers, loading: osmLoading, fetchChargers: fetchOSMChargers } = useOverpassChargers();
  const { chargers: ocmChargers, loading: ocmLoading, fetchChargers: fetchOCMChargers } = useOCMChargers();

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

  // Get user location
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

  // Fetch OCM when user location changes
  useEffect(() => {
    if (userLat != null && userLng != null) {
      fetchOCMChargers(userLat, userLng, 15);
      setFlyTarget([userLat, userLng]);
    }
  }, [userLat, userLng]);

  const onMapMoveEnd = useCallback((bounds: L.LatLngBounds, center: L.LatLng) => {
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    fetchOSMChargers({ south: sw.lat, west: sw.lng, north: ne.lat, east: ne.lng });
    fetchOCMChargers(center.lat, center.lng, 15);
  }, []);

  const handleLocateMe = () => {
    if ("geolocation" in navigator) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
          setLocating(false);
          setFlyTarget([pos.coords.latitude, pos.coords.longitude]);
        },
        () => setLocating(false),
        { timeout: 8000 }
      );
    }
  };

  const getChargerIcon = (charger: Charger) => {
    const avail = (charger.availability || "").toLowerCase();
    const isAvail = charger.is_active && avail !== "occupied" && avail !== "offline";
    if (charger.source === "osm") return ICON_OSM;
    return isAvail ? ICON_VOLTSHARE_AVAILABLE : ICON_VOLTSHARE_OCCUPIED;
  };

  const getOCMIcon = (charger: OCMCharger) => {
    if (charger.status === "available") return ICON_OCM_AVAILABLE;
    if (charger.status === "unavailable") return ICON_OCM_OCCUPIED;
    return ICON_OCM_UNKNOWN;
  };

  const mapCenter = useMemo<[number, number]>(() => {
    if (userLat != null && userLng != null) return [userLat, userLng];
    return DEFAULT_CENTER;
  }, [userLat, userLng]);

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
            {filteredOCM.map((c) => (
              <OCMListCard key={`ocm-${c.ocm_id}`} charger={c} onClick={() => {
                setSelectedOCM(c); setSelected(null);
                setFlyTarget([c.latitude, c.longitude]);
              }} />
            ))}
            {allChargers.map((c) => (
              <ChargerCard key={c.id} charger={c} compact onSelect={(ch) => {
                setSelected(ch); setSelectedOCM(null);
                setFlyTarget([ch.latitude, ch.longitude]);
                if (ch.source === "voltshare") navigate(`/charger/${ch.id}`);
              }} />
            ))}
          </div>

          {!isLoading && totalCount === 0 && (
            <div className="text-center py-16 px-4">
              <Battery className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No chargers found</p>
              <p className="text-xs text-muted-foreground mt-1">Try a different location or expand the map</p>
            </div>
          )}
        </div>

        {/* Leaflet Map */}
        <div className="flex-1 relative">
          <MapContainer
            center={mapCenter}
            zoom={DEFAULT_ZOOM}
            style={{ width: "100%", height: "100%" }}
            zoomControl={false}
            ref={mapRef}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <MapEvents onMoveEnd={onMapMoveEnd} />
            {flyTarget && <FlyTo center={flyTarget} />}

            {/* User location */}
            {userLat != null && userLng != null && (
              <Marker position={[userLat, userLng]} icon={ICON_USER} />
            )}

            {/* Clustered charger markers */}
            <MarkerClusterGroup
              chunkedLoading
              maxClusterRadius={60}
              spiderfyOnMaxZoom
              showCoverageOnHover={false}
            >
              {allChargers
                .filter((c) => c.latitude != null && c.longitude != null)
                .map((c) => (
                  <Marker
                    key={c.id}
                    position={[c.latitude, c.longitude]}
                    icon={getChargerIcon(c)}
                    eventHandlers={{
                      click: () => {
                        if (c.source === "voltshare") {
                          navigate(`/charger/${c.id}`);
                        } else {
                          setSelected(c);
                          setSelectedOCM(null);
                        }
                      },
                    }}
                  />
                ))}
              {filteredOCM
                .filter((c) => c.latitude != null && c.longitude != null)
                .map((c) => (
                  <Marker
                    key={`ocm-${c.ocm_id}`}
                    position={[c.latitude, c.longitude]}
                    icon={getOCMIcon(c)}
                    eventHandlers={{
                      click: () => {
                        setSelectedOCM(c);
                        setSelected(null);
                      },
                    }}
                  />
                ))}
            </MarkerClusterGroup>
          </MapContainer>

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
          </div>

          {/* Mobile list */}
          <div className="lg:hidden absolute bottom-0 left-0 right-0 z-[1000] bg-background/95 backdrop-blur-sm border-t border-border/50 max-h-[35vh] overflow-y-auto p-3 space-y-2">
            {filteredOCM.slice(0, 4).map((c) => (
              <OCMListCard key={`ocm-m-${c.ocm_id}`} charger={c} onClick={() => { setSelectedOCM(c); setSelected(null); }} />
            ))}
            {allChargers.slice(0, 4).map((c) => (
              <ChargerCard key={c.id} charger={c} compact onSelect={(ch) => {
                setSelected(ch); setSelectedOCM(null);
                if (ch.source === "voltshare") navigate(`/charger/${ch.id}`);
              }} />
            ))}
          </div>

          {/* Selected OCM detail panel */}
          {selectedOCM && (
            <div className="absolute right-3 top-3 w-80 z-[1000] animate-slide-in-right hidden md:block">
              <OCMDetailCard charger={selectedOCM} onClose={() => setSelectedOCM(null)} />
            </div>
          )}

          {/* Selected VoltShare/OSM panel */}
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
