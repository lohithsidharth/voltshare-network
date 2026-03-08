import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { mockChargers, Charger } from "@/data/mockChargers";
import ChargerCard from "@/components/ChargerCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal, Zap, Star, MapPin } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Fix leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
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

  const filtered = mockChargers.filter((c) => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) || c.address.toLowerCase().includes(search.toLowerCase());
    const matchPower = powerFilter === "all" || (powerFilter === "fast" ? c.power >= 11 : c.power < 11);
    return matchSearch && matchPower;
  });

  return (
    <div className="pt-16 h-screen flex flex-col">
      {/* Search bar */}
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
        {/* Sidebar */}
        <div className="w-96 border-r border-border overflow-y-auto p-4 space-y-3 hidden lg:block">
          <p className="text-sm text-muted-foreground mb-2">{filtered.length} chargers found</p>
          {filtered.map((c) => (
            <ChargerCard key={c.id} charger={c} compact onSelect={setSelected} />
          ))}
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <MapContainer
            center={[12.9352, 77.6245]}
            zoom={12}
            className="h-full w-full"
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {filtered.map((c) => (
              <Marker key={c.id} position={[c.latitude, c.longitude]} icon={chargerIcon}>
                <Popup className="!rounded-xl">
                  <div className="p-1 min-w-[200px]">
                    <h3 className="font-semibold text-sm">{c.title}</h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-0.5"><Zap className="w-3 h-3" />{c.power}kW</span>
                      <span>₹{c.pricePerKwh}/kWh</span>
                      <span className="flex items-center gap-0.5"><Star className="w-3 h-3" />{c.rating}</span>
                    </div>
                    <p className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />{c.address}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Mobile charger list overlay */}
          <div className="lg:hidden absolute bottom-0 left-0 right-0 glass rounded-t-2xl max-h-[40vh] overflow-y-auto p-4 space-y-3">
            {filtered.map((c) => (
              <ChargerCard key={c.id} charger={c} compact onSelect={setSelected} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Explore;
