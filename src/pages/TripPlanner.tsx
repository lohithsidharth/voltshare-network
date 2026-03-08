import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  MapPin,
  Navigation,
  Loader2,
  Zap,
  Clock,
  Route,
  Battery,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// Fix leaflet default icon
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const startIcon = new L.DivIcon({
  html: `<div style="background:hsl(142,71%,45%);width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 20px hsl(142,71%,45%,0.5);border:3px solid white;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="none"><circle cx="12" cy="12" r="8"/></svg>
  </div>`,
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const endIcon = new L.DivIcon({
  html: `<div style="background:hsl(0,84%,60%);width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 20px hsl(0,84%,60%,0.5);border:3px solid white;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
  </div>`,
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const chargerStopIcon = new L.DivIcon({
  html: `<div style="background:hsl(38,92%,50%);width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 15px hsl(38,92%,50%,0.5);border:2px solid white;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
  </div>`,
  className: "",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

interface GeoResult {
  lat: string;
  lon: string;
  display_name: string;
}

interface ChargerStop {
  lat: number;
  lng: number;
  name: string;
  distanceFromStart: number; // km
}

interface RouteInfo {
  distanceKm: number;
  durationMin: number;
  coordinates: [number, number][];
  stops: ChargerStop[];
}

// Geocode using Nominatim
async function geocode(query: string): Promise<GeoResult[]> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
    { headers: { "User-Agent": "VoltShare/1.0" } }
  );
  return res.json();
}

// Get route from OSRM
async function getRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<{ distanceKm: number; durationMin: number; coordinates: [number, number][] }> {
  const res = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`
  );
  const data = await res.json();
  if (!data.routes?.length) throw new Error("No route found");
  const route = data.routes[0];
  return {
    distanceKm: route.distance / 1000,
    durationMin: route.duration / 60,
    coordinates: route.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]),
  };
}

// Find chargers along route using Overpass
async function findChargersAlongRoute(
  coordinates: [number, number][],
  bufferKm: number = 5
): Promise<{ lat: number; lng: number; name: string }[]> {
  // Sample points along route (every ~30km or at least 10 points)
  const totalPoints = coordinates.length;
  const step = Math.max(1, Math.floor(totalPoints / 20));
  const samplePoints: [number, number][] = [];
  for (let i = 0; i < totalPoints; i += step) {
    samplePoints.push(coordinates[i]);
  }
  samplePoints.push(coordinates[totalPoints - 1]);

  // Build around queries for each sample point
  const aroundQueries = samplePoints
    .map((p) => `node["amenity"="charging_station"](around:${bufferKm * 1000},${p[0]},${p[1]});`)
    .join("\n");

  const query = `[out:json][timeout:25];(\n${aroundQueries}\n);out body;`;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) throw new Error("Overpass API error");
  const data = await res.json();

  // Deduplicate by OSM ID
  const seen = new Set<number>();
  return (data.elements || [])
    .filter((el: any) => {
      if (!el.lat || !el.lon || seen.has(el.id)) return false;
      seen.add(el.id);
      return true;
    })
    .map((el: any) => ({
      lat: el.lat,
      lng: el.lon,
      name: el.tags?.name || el.tags?.operator || el.tags?.brand || "EV Charger",
    }));
}

// Calculate distance between two points (km)
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Select optimal charging stops based on range
function selectChargingStops(
  routeCoords: [number, number][],
  chargers: { lat: number; lng: number; name: string }[],
  rangeKm: number
): ChargerStop[] {
  if (chargers.length === 0 || routeCoords.length < 2) return [];

  // Calculate cumulative distance along route
  const cumDist: number[] = [0];
  for (let i = 1; i < routeCoords.length; i++) {
    cumDist.push(
      cumDist[i - 1] + haversine(routeCoords[i - 1][0], routeCoords[i - 1][1], routeCoords[i][0], routeCoords[i][1])
    );
  }
  const totalDist = cumDist[cumDist.length - 1];

  // For each charger, find its approximate distance along the route
  const chargersWithDist = chargers.map((c) => {
    let minDist = Infinity;
    let routeProgress = 0;
    for (let i = 0; i < routeCoords.length; i += Math.max(1, Math.floor(routeCoords.length / 200))) {
      const d = haversine(c.lat, c.lng, routeCoords[i][0], routeCoords[i][1]);
      if (d < minDist) {
        minDist = d;
        routeProgress = cumDist[i];
      }
    }
    return { ...c, distanceFromStart: routeProgress, distFromRoute: minDist };
  });

  // Filter chargers within 5km of route and sort by route progress
  const nearRoute = chargersWithDist
    .filter((c) => c.distFromRoute < 5)
    .sort((a, b) => a.distanceFromStart - b.distanceFromStart);

  if (nearRoute.length === 0) return [];

  // Greedy: pick charger stops every ~80% of range
  const usableRange = rangeKm * 0.8;
  const stops: ChargerStop[] = [];
  let currentPos = 0;

  while (currentPos + usableRange < totalDist) {
    const targetDist = currentPos + usableRange;
    // Find the charger closest to the target distance
    let bestCharger = nearRoute[0];
    let bestDiff = Infinity;
    for (const c of nearRoute) {
      if (c.distanceFromStart <= currentPos + 10) continue; // skip chargers we've passed
      const diff = Math.abs(c.distanceFromStart - targetDist);
      if (diff < bestDiff && c.distanceFromStart > currentPos + 20) {
        bestDiff = diff;
        bestCharger = c;
      }
    }
    if (bestCharger.distanceFromStart <= currentPos + 10) break; // no more chargers ahead
    stops.push({
      lat: bestCharger.lat,
      lng: bestCharger.lng,
      name: bestCharger.name,
      distanceFromStart: Math.round(bestCharger.distanceFromStart),
    });
    currentPos = bestCharger.distanceFromStart;
  }

  return stops;
}

const TripPlanner = () => {
  const [startQuery, setStartQuery] = useState("");
  const [endQuery, setEndQuery] = useState("");
  const [startSuggestions, setStartSuggestions] = useState<GeoResult[]>([]);
  const [endSuggestions, setEndSuggestions] = useState<GeoResult[]>([]);
  const [startCoord, setStartCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [endCoord, setEndCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [range, setRange] = useState(300);
  const [loading, setLoading] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [error, setError] = useState("");
  const [showStops, setShowStops] = useState(true);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
    }).addTo(map);

    mapRef.current = map;
    routeLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Geocode helpers
  const handleStartSearch = useCallback((val: string) => {
    setStartQuery(val);
    setStartCoord(null);
    clearTimeout(debounceTimerRef.current);
    if (val.length < 3) { setStartSuggestions([]); return; }
    debounceTimerRef.current = setTimeout(async () => {
      const results = await geocode(val);
      setStartSuggestions(results);
    }, 400);
  }, []);

  const handleEndSearch = useCallback((val: string) => {
    setEndQuery(val);
    setEndCoord(null);
    clearTimeout(debounceTimerRef.current);
    if (val.length < 3) { setEndSuggestions([]); return; }
    debounceTimerRef.current = setTimeout(async () => {
      const results = await geocode(val);
      setEndSuggestions(results);
    }, 400);
  }, []);

  const selectStart = (r: GeoResult) => {
    setStartCoord({ lat: parseFloat(r.lat), lng: parseFloat(r.lon) });
    setStartQuery(r.display_name.split(",").slice(0, 2).join(","));
    setStartSuggestions([]);
  };

  const selectEnd = (r: GeoResult) => {
    setEndCoord({ lat: parseFloat(r.lat), lng: parseFloat(r.lon) });
    setEndQuery(r.display_name.split(",").slice(0, 2).join(","));
    setEndSuggestions([]);
  };

  const planTrip = async () => {
    if (!startCoord || !endCoord) {
      setError("Please select both start and destination");
      return;
    }
    setError("");
    setLoading(true);
    setRouteInfo(null);

    try {
      const route = await getRoute(startCoord.lat, startCoord.lng, endCoord.lat, endCoord.lng);
      const chargers = await findChargersAlongRoute(route.coordinates, 5);
      const stops = selectChargingStops(route.coordinates, chargers, range);

      const info: RouteInfo = { ...route, stops };
      setRouteInfo(info);

      // Draw on map
      if (routeLayerRef.current && mapRef.current) {
        routeLayerRef.current.clearLayers();

        // Route polyline
        const polyline = L.polyline(route.coordinates, {
          color: "hsl(213,100%,50%)",
          weight: 4,
          opacity: 0.8,
        });
        routeLayerRef.current.addLayer(polyline);

        // Start marker
        routeLayerRef.current.addLayer(
          L.marker([startCoord.lat, startCoord.lng], { icon: startIcon }).bindPopup("Start")
        );

        // End marker
        routeLayerRef.current.addLayer(
          L.marker([endCoord.lat, endCoord.lng], { icon: endIcon }).bindPopup("Destination")
        );

        // Charging stops
        stops.forEach((s, i) => {
          routeLayerRef.current!.addLayer(
            L.marker([s.lat, s.lng], { icon: chargerStopIcon }).bindPopup(
              `<div style="min-width:150px;"><strong>Stop ${i + 1}: ${s.name}</strong><br/><span style="font-size:12px;opacity:.7;">${s.distanceFromStart} km from start</span></div>`
            )
          );
        });

        mapRef.current.fitBounds(polyline.getBounds().pad(0.1));
      }
    } catch (err: any) {
      setError(err.message || "Failed to plan trip");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-16 h-screen flex flex-col">
      {/* Controls panel */}
      <div className="glass border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <Route className="w-5 h-5 text-primary" />
          <h1 className="font-heading font-bold text-lg text-foreground">Trip Planner</h1>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {/* Start */}
          <div className="relative flex-1 min-w-[200px]">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
            <Input
              placeholder="Start location..."
              value={startQuery}
              onChange={(e) => handleStartSearch(e.target.value)}
              className="pl-10 bg-muted border-none"
            />
            {startSuggestions.length > 0 && (
              <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {startSuggestions.map((s, i) => (
                  <button
                    key={i}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors truncate text-foreground"
                    onClick={() => selectStart(s)}
                  >
                    {s.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* End */}
          <div className="relative flex-1 min-w-[200px]">
            <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
            <Input
              placeholder="Destination..."
              value={endQuery}
              onChange={(e) => handleEndSearch(e.target.value)}
              className="pl-10 bg-muted border-none"
            />
            {endSuggestions.length > 0 && (
              <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {endSuggestions.map((s, i) => (
                  <button
                    key={i}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors truncate text-foreground"
                    onClick={() => selectEnd(s)}
                  >
                    {s.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Range slider */}
          <div className="flex items-center gap-2 min-w-[180px]">
            <Battery className="w-4 h-4 text-muted-foreground" />
            <Slider
              value={[range]}
              onValueChange={([v]) => setRange(v)}
              min={100}
              max={600}
              step={25}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap w-16 text-right">{range} km</span>
          </div>

          <Button onClick={planTrip} disabled={loading} className="glow-primary">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Route className="w-4 h-4 mr-2" />}
            Plan Trip
          </Button>
        </div>

        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar with route info */}
        {routeInfo && (
          <div className="w-80 border-r border-border overflow-y-auto p-4 space-y-4 hidden lg:block">
            <div className="glass rounded-xl p-4 space-y-3">
              <h3 className="font-heading font-semibold text-foreground">Route Summary</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Route className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Distance</p>
                    <p className="font-medium text-foreground">{Math.round(routeInfo.distanceKm)} km</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="font-medium text-foreground">
                      {Math.floor(routeInfo.durationMin / 60)}h {Math.round(routeInfo.durationMin % 60)}m
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-secondary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Charging Stops</p>
                    <p className="font-medium text-foreground">{routeInfo.stops.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Battery className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Vehicle Range</p>
                    <p className="font-medium text-foreground">{range} km</p>
                  </div>
                </div>
              </div>
            </div>

            {routeInfo.stops.length > 0 && (
              <div className="space-y-2">
                <button
                  className="flex items-center justify-between w-full text-sm font-semibold text-foreground"
                  onClick={() => setShowStops(!showStops)}
                >
                  <span>Charging Stops</span>
                  {showStops ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showStops && (
                  <div className="space-y-2">
                    {/* Start */}
                    <div className="flex items-start gap-3 p-3 glass rounded-lg">
                      <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Start</p>
                        <p className="text-xs text-muted-foreground">{startQuery}</p>
                      </div>
                    </div>

                    {routeInfo.stops.map((stop, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 glass rounded-lg">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "hsl(38,92%,50%,0.2)" }}>
                          <Zap className="w-3 h-3" style={{ color: "hsl(38,92%,50%)" }} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{stop.name}</p>
                          <p className="text-xs text-muted-foreground">{stop.distanceFromStart} km from start</p>
                        </div>
                      </div>
                    ))}

                    {/* End */}
                    <div className="flex items-start gap-3 p-3 glass rounded-lg">
                      <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Destination</p>
                        <p className="text-xs text-muted-foreground">{endQuery}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {routeInfo.stops.length === 0 && routeInfo.distanceKm <= range && (
              <div className="glass rounded-xl p-4 text-center">
                <Battery className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">No charging needed!</p>
                <p className="text-xs text-muted-foreground">Your vehicle range covers this trip.</p>
              </div>
            )}

            {routeInfo.stops.length === 0 && routeInfo.distanceKm > range && (
              <div className="glass rounded-xl p-4 text-center">
                <Zap className="w-8 h-8 text-destructive mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">No chargers found along route</p>
                <p className="text-xs text-muted-foreground">Try increasing your search range or check alternate routes.</p>
              </div>
            )}
          </div>
        )}

        {/* Map */}
        <div className="flex-1 relative">
          <div ref={mapContainerRef} className="h-full w-full" />

          {/* Mobile route summary */}
          {routeInfo && (
            <div className="lg:hidden absolute bottom-0 left-0 right-0 glass rounded-t-2xl p-4 space-y-2 max-h-[35vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <span className="font-heading font-semibold text-sm text-foreground">
                  {Math.round(routeInfo.distanceKm)} km · {Math.floor(routeInfo.durationMin / 60)}h{Math.round(routeInfo.durationMin % 60)}m
                </span>
                <span className="text-xs text-muted-foreground">
                  {routeInfo.stops.length} charging stop{routeInfo.stops.length !== 1 ? "s" : ""}
                </span>
              </div>
              {routeInfo.stops.map((stop, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <Zap className="w-3 h-3 flex-shrink-0" style={{ color: "hsl(38,92%,50%)" }} />
                  <span className="text-foreground truncate">{stop.name}</span>
                  <span className="text-muted-foreground ml-auto">{stop.distanceFromStart}km</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TripPlanner;
