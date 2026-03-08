import { useEffect, useRef, useState, useCallback } from "react";
import { GoogleMap, useJsApiLoader, MarkerF, PolylineF, InfoWindowF } from "@react-google-maps/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  MapPin, Navigation, Loader2, Zap, Clock, Route, Battery,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LIBRARIES, DARK_MAP_STYLES } from "@/lib/googleMaps";

const containerStyle = { width: "100%", height: "100%" };

interface GeoResult {
  lat: string;
  lon: string;
  display_name: string;
}

interface ChargerStop {
  lat: number;
  lng: number;
  name: string;
  distanceFromStart: number;
}

interface RouteInfo {
  distanceKm: number;
  durationMin: number;
  path: google.maps.LatLngLiteral[];
  stops: ChargerStop[];
}

async function geocode(query: string): Promise<GeoResult[]> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
    { headers: { "User-Agent": "VoltShare/1.0" } }
  );
  return res.json();
}

async function findChargersAlongRoute(
  coordinates: google.maps.LatLngLiteral[],
  bufferKm: number = 5
): Promise<{ lat: number; lng: number; name: string }[]> {
  const totalPoints = coordinates.length;
  const step = Math.max(1, Math.floor(totalPoints / 20));
  const samplePoints: google.maps.LatLngLiteral[] = [];
  for (let i = 0; i < totalPoints; i += step) {
    samplePoints.push(coordinates[i]);
  }
  samplePoints.push(coordinates[totalPoints - 1]);

  const aroundQueries = samplePoints
    .map((p) => `node["amenity"="charging_station"](around:${bufferKm * 1000},${p.lat},${p.lng});`)
    .join("\n");

  const query = `[out:json][timeout:25];(\n${aroundQueries}\n);out body;`;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) return [];
  const data = await res.json();

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

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function selectChargingStops(
  routeCoords: google.maps.LatLngLiteral[],
  chargers: { lat: number; lng: number; name: string }[],
  rangeKm: number
): ChargerStop[] {
  if (chargers.length === 0 || routeCoords.length < 2) return [];

  const cumDist: number[] = [0];
  for (let i = 1; i < routeCoords.length; i++) {
    cumDist.push(cumDist[i - 1] + haversine(routeCoords[i - 1].lat, routeCoords[i - 1].lng, routeCoords[i].lat, routeCoords[i].lng));
  }
  const totalDist = cumDist[cumDist.length - 1];

  const chargersWithDist = chargers.map((c) => {
    let minDist = Infinity;
    let routeProgress = 0;
    for (let i = 0; i < routeCoords.length; i += Math.max(1, Math.floor(routeCoords.length / 200))) {
      const d = haversine(c.lat, c.lng, routeCoords[i].lat, routeCoords[i].lng);
      if (d < minDist) { minDist = d; routeProgress = cumDist[i]; }
    }
    return { ...c, distanceFromStart: routeProgress, distFromRoute: minDist };
  });

  const nearRoute = chargersWithDist.filter((c) => c.distFromRoute < 5).sort((a, b) => a.distanceFromStart - b.distanceFromStart);
  if (nearRoute.length === 0) return [];

  const usableRange = rangeKm * 0.8;
  const stops: ChargerStop[] = [];
  let currentPos = 0;

  while (currentPos + usableRange < totalDist) {
    const targetDist = currentPos + usableRange;
    let bestCharger = nearRoute[0];
    let bestDiff = Infinity;
    for (const c of nearRoute) {
      if (c.distanceFromStart <= currentPos + 10) continue;
      const diff = Math.abs(c.distanceFromStart - targetDist);
      if (diff < bestDiff && c.distanceFromStart > currentPos + 20) { bestDiff = diff; bestCharger = c; }
    }
    if (bestCharger.distanceFromStart <= currentPos + 10) break;
    stops.push({ lat: bestCharger.lat, lng: bestCharger.lng, name: bestCharger.name, distanceFromStart: Math.round(bestCharger.distanceFromStart) });
    currentPos = bestCharger.distanceFromStart;
  }

  return stops;
}

const makeMarkerSvg = (color: string, size: number) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${color}" stroke="white" stroke-width="3"/></svg>`
  )}`;

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

  const mapRef = useRef<google.maps.Map | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

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
    if (!startCoord || !endCoord) { setError("Please select both start and destination"); return; }
    setError("");
    setLoading(true);
    setRouteInfo(null);

    try {
      const directionsService = new google.maps.DirectionsService();
      const result = await directionsService.route({
        origin: startCoord,
        destination: endCoord,
        travelMode: google.maps.TravelMode.DRIVING,
      });

      const route = result.routes[0];
      const leg = route.legs[0];
      const distanceKm = (leg.distance?.value || 0) / 1000;
      const durationMin = (leg.duration?.value || 0) / 60;

      // Decode path
      const path: google.maps.LatLngLiteral[] = route.overview_path.map(p => ({ lat: p.lat(), lng: p.lng() }));

      const chargers = await findChargersAlongRoute(path, 5);
      const stops = selectChargingStops(path, chargers, range);

      const info: RouteInfo = { distanceKm, durationMin, path, stops };
      setRouteInfo(info);

      // Fit bounds
      if (mapRef.current) {
        const bounds = new google.maps.LatLngBounds();
        path.forEach(p => bounds.extend(p));
        mapRef.current.fitBounds(bounds, 60);
      }
    } catch (err: any) {
      setError(err.message || "Failed to plan trip");
    } finally {
      setLoading(false);
    }
  };

  const mapOptions = {
    styles: DARK_MAP_STYLES,
    disableDefaultUI: true,
    zoomControl: true,
    zoomControlOptions: { position: 9 },
  };

  if (!isLoaded) {
    return (
      <div className="pt-16 h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="pt-16 h-screen flex flex-col">
      {/* Controls */}
      <div className="glass border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <Route className="w-5 h-5 text-primary" />
          <h1 className="font-heading font-bold text-lg text-foreground">Trip Planner</h1>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
            <Input placeholder="Start location..." value={startQuery} onChange={(e) => handleStartSearch(e.target.value)} className="pl-10 bg-muted border-none" />
            {startSuggestions.length > 0 && (
              <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {startSuggestions.map((s, i) => (
                  <button key={i} className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors truncate text-foreground" onClick={() => selectStart(s)}>
                    {s.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative flex-1 min-w-[200px]">
            <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
            <Input placeholder="Destination..." value={endQuery} onChange={(e) => handleEndSearch(e.target.value)} className="pl-10 bg-muted border-none" />
            {endSuggestions.length > 0 && (
              <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {endSuggestions.map((s, i) => (
                  <button key={i} className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors truncate text-foreground" onClick={() => selectEnd(s)}>
                    {s.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 min-w-[180px]">
            <Battery className="w-4 h-4 text-muted-foreground" />
            <Slider value={[range]} onValueChange={([v]) => setRange(v)} min={100} max={600} step={25} className="flex-1" />
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
        {/* Sidebar */}
        {routeInfo && (
          <div className="w-80 border-r border-border overflow-y-auto p-4 space-y-4 hidden lg:block">
            <div className="glass rounded-xl p-4 space-y-3">
              <h3 className="font-heading font-semibold text-foreground">Route Summary</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Route className="w-4 h-4 text-primary" />
                  <div><p className="text-xs text-muted-foreground">Distance</p><p className="font-medium text-foreground">{Math.round(routeInfo.distanceKm)} km</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <div><p className="text-xs text-muted-foreground">Duration</p><p className="font-medium text-foreground">{Math.floor(routeInfo.durationMin / 60)}h {Math.round(routeInfo.durationMin % 60)}m</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-secondary" />
                  <div><p className="text-xs text-muted-foreground">Charging Stops</p><p className="font-medium text-foreground">{routeInfo.stops.length}</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <Battery className="w-4 h-4 text-muted-foreground" />
                  <div><p className="text-xs text-muted-foreground">Vehicle Range</p><p className="font-medium text-foreground">{range} km</p></div>
                </div>
              </div>
            </div>

            {routeInfo.stops.length > 0 && (
              <div className="space-y-2">
                <button className="flex items-center justify-between w-full text-sm font-semibold text-foreground" onClick={() => setShowStops(!showStops)}>
                  <span>Charging Stops</span>
                  {showStops ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showStops && (
                  <div className="space-y-2">
                    <div className="flex items-start gap-3 p-3 glass rounded-lg">
                      <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5"><div className="w-2.5 h-2.5 rounded-full bg-green-500" /></div>
                      <div><p className="text-sm font-medium text-foreground">Start</p><p className="text-xs text-muted-foreground">{startQuery}</p></div>
                    </div>
                    {routeInfo.stops.map((stop, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 glass rounded-lg">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "hsl(38,92%,50%,0.2)" }}>
                          <Zap className="w-3 h-3" style={{ color: "hsl(38,92%,50%)" }} />
                        </div>
                        <div><p className="text-sm font-medium text-foreground">{stop.name}</p><p className="text-xs text-muted-foreground">{stop.distanceFromStart} km from start</p></div>
                      </div>
                    ))}
                    <div className="flex items-start gap-3 p-3 glass rounded-lg">
                      <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500" /></div>
                      <div><p className="text-sm font-medium text-foreground">Destination</p><p className="text-xs text-muted-foreground">{endQuery}</p></div>
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
                <p className="text-xs text-muted-foreground">Try increasing your search range.</p>
              </div>
            )}
          </div>
        )}

        {/* Google Map */}
        <div className="flex-1 relative">
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={{ lat: 20.5937, lng: 78.9629 }}
            zoom={5}
            options={mapOptions}
            onLoad={(map) => { mapRef.current = map; }}
          >
            {/* Route polyline */}
            {routeInfo && (
              <PolylineF
                path={routeInfo.path}
                options={{ strokeColor: "#3b82f6", strokeWeight: 4, strokeOpacity: 0.85 }}
              />
            )}

            {/* Start marker */}
            {startCoord && (
              <MarkerF
                position={startCoord}
                icon={{ url: makeMarkerSvg("%2322c55e", 32), scaledSize: new google.maps.Size(32, 32) }}
              />
            )}

            {/* End marker */}
            {endCoord && (
              <MarkerF
                position={endCoord}
                icon={{ url: makeMarkerSvg("%23ef4444", 32), scaledSize: new google.maps.Size(32, 32) }}
              />
            )}

            {/* Charging stop markers */}
            {routeInfo?.stops.map((stop, i) => (
              <MarkerF
                key={i}
                position={{ lat: stop.lat, lng: stop.lng }}
                icon={{ url: makeMarkerSvg("%23f59e0b", 28), scaledSize: new google.maps.Size(28, 28) }}
                title={`Stop ${i + 1}: ${stop.name} (${stop.distanceFromStart}km)`}
              />
            ))}
          </GoogleMap>

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
