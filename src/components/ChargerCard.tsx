import { Charger } from "@/hooks/useChargers";
import { Zap, Star, MapPin, Globe, Circle, Heart, ShieldCheck } from "lucide-react";
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

const statusConfig: Record<AvailStatus, { label: string; bgClass: string; textClass: string }> = {
  available: { label: "Available", bgClass: "bg-green-500/15", textClass: "text-green-400" },
  occupied: { label: "Occupied", bgClass: "bg-red-500/15", textClass: "text-red-400" },
  unknown: { label: "Unknown", bgClass: "bg-muted/50", textClass: "text-muted-foreground" },
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
        "glass-light rounded-xl overflow-hidden hover:border-primary/30 transition-all cursor-pointer",
        compact ? "p-3" : "p-5",
        recommended && "ring-2 ring-secondary/50"
      )}
      onClick={() => onSelect?.(charger)}
    >
      {recommended && (
        <div className="flex items-center gap-1 text-secondary text-[10px] font-semibold mb-2">
          <Zap className="w-3 h-3" />Recommended for you
        </div>
      )}

      {/* Image preview */}
      {!compact && charger.images && charger.images.length > 0 && (
        <div className="mb-3 -mx-5 -mt-5 h-32 overflow-hidden">
          <img
            src={charger.images[0]}
            alt={charger.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {charger.source === "osm" ? (
              <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Globe className="w-2.5 h-2.5" /> OSM
              </span>
            ) : (
              <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/20 text-primary border border-primary/30">
                <Zap className="w-2.5 h-2.5" /> VoltShare
              </span>
            )}
            <h3 className={cn("font-heading font-semibold truncate", compact ? "text-sm" : "text-base")}>{charger.title}</h3>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{charger.address}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
          {charger.source === "voltshare" && user && (
            <button onClick={handleFavorite} className="focus:outline-none">
              <Heart className={cn("w-4 h-4 transition-colors", isFav ? "text-red-500 fill-red-500" : "text-muted-foreground hover:text-red-400")} />
            </button>
          )}
          {charger.rating != null && charger.rating > 0 && (
            <div className="flex items-center gap-1 text-secondary text-sm font-medium">
              <Star className="w-3.5 h-3.5 fill-secondary" />
              {charger.rating}
            </div>
          )}
          <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold", sc.bgClass, sc.textClass)}>
            <Circle className="w-2 h-2 fill-current" />
            {sc.label}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3 flex-wrap">
        {charger.power > 0 && (
          <span className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-primary" />{charger.power} kW
          </span>
        )}
        {charger.source === "voltshare" && charger.price_per_kwh > 0 && (
          <span>₹{charger.price_per_kwh}/kWh</span>
        )}
        {charger.operator && <span className="text-xs opacity-70">{charger.operator}</span>}
      </div>

      {!compact && charger.source === "voltshare" && (
        <Button size="sm" className="w-full" onClick={handleBookNow}>
          Book Now
        </Button>
      )}
    </div>
  );
};

export default ChargerCard;
