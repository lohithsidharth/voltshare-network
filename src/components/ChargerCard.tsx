import { Charger } from "@/hooks/useChargers";
import { Zap, Star, MapPin, Globe, Circle, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface Props {
  charger: Charger;
  compact?: boolean;
  onSelect?: (charger: Charger) => void;
  recommended?: boolean;
}

type AvailStatus = "available" | "occupied" | "unknown";

function getStatus(charger: Charger): AvailStatus {
  if (charger.source === "osm") return "unknown";
  const avail = (charger.availability || "").toLowerCase();
  if (avail === "occupied" || avail === "offline" || avail === "unavailable") return "occupied";
  if (avail === "available" || avail === "open" || charger.is_active) return "available";
  return "unknown";
}

const statusConfig: Record<AvailStatus, { label: string; dotClass: string; bgClass: string; textClass: string }> = {
  available: { label: "Available", dotClass: "bg-secondary", bgClass: "bg-secondary/10", textClass: "text-secondary" },
  occupied: { label: "Busy", dotClass: "bg-destructive", bgClass: "bg-destructive/10", textClass: "text-destructive" },
  unknown: { label: "Unknown", dotClass: "bg-muted-foreground", bgClass: "bg-muted", textClass: "text-muted-foreground" },
};

const ChargerCard = ({ charger, compact, onSelect, recommended }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const status = getStatus(charger);
  const sc = statusConfig[status];
  const isFav = charger.source === "voltshare" && isFavorite(charger.id);

  const handleBookNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (charger.source === "voltshare") navigate(`/charger/${charger.id}`);
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { navigate("/auth"); return; }
    toggleFavorite(charger.id);
  };

  return (
    <div
      className={cn(
        "glass-card rounded-2xl overflow-hidden transition-all cursor-pointer group",
        compact ? "p-3.5" : "p-5",
        recommended ? "border-glow ring-1 ring-secondary/30" : "hover:border-primary/15"
      )}
      onClick={() => onSelect?.(charger)}
    >
      {recommended && (
        <div className="flex items-center gap-1.5 text-secondary text-[11px] font-semibold mb-2.5">
          <div className="w-4 h-4 rounded-full bg-secondary/15 flex items-center justify-center">
            <Zap className="w-2.5 h-2.5" />
          </div>
          Recommended for you
        </div>
      )}

      {/* Image preview */}
      {!compact && charger.images && charger.images.length > 0 && (
        <div className="mb-4 -mx-5 -mt-5 h-36 overflow-hidden relative">
          <img src={charger.images[0]} alt={charger.title} className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
        </div>
      )}

      <div className="flex items-start justify-between mb-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            {charger.source === "osm" ? (
              <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-volt-warning/15 text-volt-warning">
                <Globe className="w-2.5 h-2.5" /> OSM
              </span>
            ) : (
              <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-primary/15 text-primary">
                <Zap className="w-2.5 h-2.5" /> VoltShare
              </span>
            )}
            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold", sc.bgClass, sc.textClass)}>
              <span className={cn("w-1.5 h-1.5 rounded-full", sc.dotClass)} />
              {sc.label}
            </span>
          </div>
          <h3 className={cn("font-heading font-bold truncate", compact ? "text-sm" : "text-base")}>{charger.title}</h3>
          <div className="flex items-center gap-1 text-muted-foreground text-xs mt-1">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{charger.address}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0 ml-3">
          {charger.source === "voltshare" && user && (
            <button onClick={handleFavorite} className="focus:outline-none p-1 rounded-lg hover:bg-accent transition-colors">
              <Heart className={cn("w-4 h-4 transition-colors", isFav ? "text-destructive fill-destructive" : "text-muted-foreground")} />
            </button>
          )}
          {charger.rating != null && charger.rating > 0 && (
            <div className="flex items-center gap-1 text-secondary text-sm font-semibold">
              <Star className="w-3.5 h-3.5 fill-secondary" />
              {charger.rating}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3 flex-wrap">
        {charger.power > 0 && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent text-xs">
            <Zap className="w-3 h-3 text-primary" />{charger.power} kW
          </span>
        )}
        {charger.source === "voltshare" && charger.price_per_kwh > 0 && (
          <span className="px-2 py-0.5 rounded-md bg-accent text-xs">₹{charger.price_per_kwh}/kWh</span>
        )}
        {charger.operator && <span className="text-xs opacity-70">{charger.operator}</span>}
      </div>

      {!compact && charger.source === "voltshare" && (
        <Button size="sm" className="w-full rounded-xl font-semibold" onClick={handleBookNow}>
          Book Now
        </Button>
      )}
    </div>
  );
};

export default ChargerCard;
